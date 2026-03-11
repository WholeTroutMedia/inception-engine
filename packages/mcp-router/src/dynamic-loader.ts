/**
 * MCP Dynamic Loader — hybrid manifest + AlloyDB initialization
 *
 * Boot-time entry point for the MCP registry. Loads static servers from
 * the capability manifest AND merges in any servers stored in AlloyDB
 * (if ALLOYDB_URL is set). Falls back gracefully to manifest-only if
 * AlloyDB is unreachable at boot.
 *
 * After boot, if AlloyDB is available, a periodic 30s sync keeps the
 * in-memory registry updated as agents register new servers at runtime.
 */

import { MCPServerRegistry } from './registry.js';
import { AlloyDBMCPRegistry } from './alloydb-registry.js';
import { manifest } from './manifest.js';
import type { MCPServerManifestEntry } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface DynamicLoaderOptions {
  /** AlloyDB connection URL. If not set, manifest-only mode. */
  alloydbUrl?: string;
  /** Sync interval in ms (default 30s). Only relevant when AlloyDB is active. */
  syncIntervalMs?: number;
  /** Log initialization details. Default: true */
  verbose?: boolean;
}

export interface LoaderResult {
  /** Number of servers loaded from the static manifest */
  manifestCount: number;
  /** Number of additional servers loaded from AlloyDB */
  alloydbCount: number;
  /** Whether the AlloyDB registry is active */
  alloydbActive: boolean;
  /** AlloyDB registry instance (for agent mutations at runtime) */
  alloydbRegistry?: AlloyDBMCPRegistry;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LOADER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize the MCP registry with all available servers.
 *
 * 1. Load all servers from the static capability manifest into the registry.
 * 2. If ALLOYDB_URL is set, initialize AlloyDBMCPRegistry and merge in any
 *    additional servers. Start periodic sync.
 * 3. Return a LoaderResult with counts + the AlloyDB registry handle.
 *
 * @example
 * ```ts
 * const mcpRegistry = new MCPServerRegistry();
 * const { alloydbRegistry } = await initMCPDynamicLoader(mcpRegistry);
 * // alloydbRegistry is now available for agent mutations:
 * // await alloydbRegistry?.registerServer({ server_name: 'my-mcp', command: 'npx', args: ['my-pkg'] });
 * ```
 */
export async function initMCPDynamicLoader(
  registry: MCPServerRegistry,
  opts: DynamicLoaderOptions = {}
): Promise<LoaderResult> {
  const {
    alloydbUrl = process.env['ALLOYDB_URL'],
    syncIntervalMs = 30_000,
    verbose = true,
  } = opts;

  // ── Step 1: Load static manifest ─────────────────────────────────────────
  let manifestCount = 0;

  for (const domainServers of Object.values(manifest.domains) as MCPServerManifestEntry[][]) {
    for (const server of domainServers) {
      if (server.enabled !== false) {
        registry.register(server);
        manifestCount++;
      }
    }
  }

  if (verbose) {
    console.log(`[MCP-DYNAMIC-LOADER] 📋 Manifest loaded: ${manifestCount} servers`);
  }

  // ── Step 2: AlloyDB hybrid merge ──────────────────────────────────────────
  if (!alloydbUrl) {
    if (verbose) {
      console.log('[MCP-DYNAMIC-LOADER] ℹ️  No ALLOYDB_URL — manifest-only mode');
    }
    return { manifestCount, alloydbCount: 0, alloydbActive: false };
  }

  // Parse host from URL (postgresql://user:pass@host:port/db)
  let host: string;
  let port: number | undefined;
  let database: string | undefined;
  let user: string | undefined;
  let password: string | undefined;

  try {
    const url = new URL(alloydbUrl);
    host = url.hostname;
    port = url.port ? parseInt(url.port, 10) : 5432;
    database = url.pathname.replace(/^\//, '') || 'inception';
    user = url.username || 'postgres';
    password = url.password || undefined;
  } catch {
    console.warn('[MCP-DYNAMIC-LOADER] ⚠️  Invalid ALLOYDB_URL — falling back to manifest-only');
    return { manifestCount, alloydbCount: 0, alloydbActive: false };
  }

  const alloydbRegistry = new AlloyDBMCPRegistry({
    host,
    port,
    database,
    user,
    password,
    syncIntervalMs,
  });

  try {
    await alloydbRegistry.initialize();
  } catch (err) {
    console.warn('[MCP-DYNAMIC-LOADER] ⚠️  AlloyDB init failed — manifest-only mode:', err);
    return { manifestCount, alloydbCount: 0, alloydbActive: false };
  }

  // Merge AlloyDB servers — skip if already registered from manifest
  const alloydbEntries = alloydbRegistry.getManifestEntries();
  let alloydbCount = 0;

  for (const entry of alloydbEntries) {
    // Build a full ManifestEntry compatible with the registry
    const fullEntry: MCPServerManifestEntry = {
      id: entry.id,
      name: entry.name ?? entry.id,
      description: entry.description ?? `Dynamic server: ${entry.id}`,
      keywords: entry.keywords ?? [],
      alwaysOn: entry.alwaysOn ?? false,
      priority: entry.priority ?? 5,
      enabled: true,
      transport: (entry.transport as 'stdio' | 'sse' | 'websocket') ?? 'stdio',
      command: entry.command,
      args: entry.args,
      env: entry.env,
    };
    registry.register(fullEntry);
    alloydbCount++;
  }

  if (verbose) {
    console.log(
      `[MCP-DYNAMIC-LOADER] 🗄️  AlloyDB active: ${alloydbCount} additional servers merged` +
        ` (sync every ${syncIntervalMs / 1000}s)`
    );
  }

  // ── Step 3: Continuous sync — re-register any new servers added at runtime ─
  // The AlloyDB registry handles its own internal sync. We hook an additional
  // callback to push new entries into the MCPServerRegistry.
  startContinuousSync(registry, alloydbRegistry, syncIntervalMs, verbose);

  return { manifestCount, alloydbCount, alloydbActive: true, alloydbRegistry };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTINUOUS RUNTIME SYNC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * After boot, periodically pull fresh AlloyDB server rows and register
 * any NEW entries into the MCPServerRegistry so agents can use them
 * immediately without restarting the Genkit server.
 */
function startContinuousSync(
  registry: MCPServerRegistry,
  alloydbRegistry: AlloyDBMCPRegistry,
  intervalMs: number,
  verbose: boolean
): void {
  setInterval(async () => {
    try {
      const entries = alloydbRegistry.getManifestEntries();
      let newCount = 0;
      for (const entry of entries) {
        // register() is idempotent — re-registering same id is a no-op
        const full: MCPServerManifestEntry = {
          id: entry.id,
          name: entry.name ?? entry.id,
          description: entry.description ?? `Dynamic server: ${entry.id}`,
          keywords: entry.keywords ?? [],
          alwaysOn: entry.alwaysOn ?? false,
          priority: entry.priority ?? 5,
          enabled: true,
          transport: (entry.transport as 'stdio' | 'sse' | 'websocket') ?? 'stdio',
          command: entry.command,
          args: entry.args,
          env: entry.env,
        };
        registry.register(full);
        newCount++;
      }
      if (verbose && newCount > 0) {
        console.log(`[MCP-DYNAMIC-LOADER] 🔄 Sync: ${newCount} servers refreshed from AlloyDB`);
      }
    } catch (err) {
      console.warn('[MCP-DYNAMIC-LOADER] ⚠️  Continuous sync error:', err);
    }
  }, intervalMs);
}
