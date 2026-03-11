/**
 * AlloyDB-backed MCP Server Registry
 *
 * Extends the in-memory MCPServerRegistry with AlloyDB persistence.
 * Agents can dynamically register, enable/disable, and query MCP servers
 * through the mcp_registry table in AlloyDB.
 *
 * This is the "self-modifying" registry: agents can add new MCP servers
 * at runtime without human intervention.
 */

import { Pool, type PoolConfig } from 'pg';
import type { MCPServerManifestEntry } from './types.js';

// ── Types ────────────────────────────────────────────────────

export interface AlloyDBRegistryConfig {
  host: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  /** Sync interval in ms (default: 30s) */
  syncIntervalMs?: number;
}

export interface MCPRegistryRow {
  id: string;
  server_name: string;
  transport: 'stdio' | 'sse' | 'streamable-http';
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
  created_by: string;
  created_at: Date;
}

// ── AlloyDB Registry ─────────────────────────────────────────

export class AlloyDBMCPRegistry {
  private pool: Pool;
  private syncTimer?: ReturnType<typeof setInterval>;
  private cache: Map<string, MCPRegistryRow> = new Map();
  private readonly syncIntervalMs: number;

  constructor(config: AlloyDBRegistryConfig) {
    this.syncIntervalMs = config.syncIntervalMs ?? 30_000;

    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port ?? 5432,
      database: config.database ?? 'inception',
      user: config.user ?? 'postgres',
      password: config.password,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: { rejectUnauthorized: false },
    };

    this.pool = new Pool(poolConfig);
  }

  // ── Lifecycle ──────────────────────────────────────────────

  async initialize(): Promise<void> {
    // Ensure schema exists
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS mcp_registry (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        server_name TEXT UNIQUE NOT NULL,
        transport TEXT NOT NULL DEFAULT 'stdio',
        command TEXT NOT NULL,
        args JSONB DEFAULT '[]',
        env JSONB DEFAULT '{}',
        enabled BOOLEAN DEFAULT true,
        created_by TEXT DEFAULT 'system',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Initial sync
    await this.sync();

    // Start periodic sync
    this.syncTimer = setInterval(() => this.sync(), this.syncIntervalMs);
    console.log(`[AlloyDB-Registry] Initialized. ${this.cache.size} servers loaded. Sync every ${this.syncIntervalMs}ms`);
  }

  async shutdown(): Promise<void> {
    if (this.syncTimer) clearInterval(this.syncTimer);
    await this.pool.end();
    console.log('[AlloyDB-Registry] Shut down.');
  }

  // ── Sync ───────────────────────────────────────────────────

  private async sync(): Promise<void> {
    try {
      const { rows } = await this.pool.query<MCPRegistryRow>(
        'SELECT * FROM mcp_registry WHERE enabled = true ORDER BY server_name'
      );
      this.cache.clear();
      for (const row of rows) {
        this.cache.set(row.server_name, row);
      }
    } catch (err) {
      console.error('[AlloyDB-Registry] Sync failed:', err);
    }
  }

  // ── Queries ────────────────────────────────────────────────

  /** Get all enabled servers as manifest entries */
  getManifestEntries(): MCPServerManifestEntry[] {
    return Array.from(this.cache.values()).map(row => ({
      id: row.server_name,
      name: row.server_name,
      description: `Dynamic server: ${row.server_name}`,
      keywords: [],
      alwaysOn: false,
      priority: 5,
      enabled: row.enabled,
      transport: row.transport as 'stdio' | 'sse' | 'websocket',
      command: row.command,
      args: row.args,
      env: row.env,
    }));
  }

  /** Get a single server by name */
  getServer(name: string): MCPRegistryRow | undefined {
    return this.cache.get(name);
  }

  /** List all servers (including disabled) */
  async listAll(): Promise<MCPRegistryRow[]> {
    const { rows } = await this.pool.query<MCPRegistryRow>(
      'SELECT * FROM mcp_registry ORDER BY server_name'
    );
    return rows;
  }

  // ── Mutations (agent-callable) ─────────────────────────────

  /** Register a new MCP server (agents can call this) */
  async registerServer(entry: {
    server_name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    transport?: string;
    created_by?: string;
  }): Promise<MCPRegistryRow> {
    const { rows } = await this.pool.query<MCPRegistryRow>(
      `INSERT INTO mcp_registry (server_name, command, args, env, transport, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (server_name) DO UPDATE SET
         command = EXCLUDED.command,
         args = EXCLUDED.args,
         env = EXCLUDED.env,
         transport = EXCLUDED.transport
       RETURNING *`,
      [
        entry.server_name,
        entry.command,
        JSON.stringify(entry.args ?? []),
        JSON.stringify(entry.env ?? {}),
        entry.transport ?? 'stdio',
        entry.created_by ?? 'agent',
      ]
    );
    // Refresh cache
    await this.sync();
    return rows[0];
  }

  /** Enable or disable a server */
  async setEnabled(serverName: string, enabled: boolean): Promise<void> {
    await this.pool.query(
      'UPDATE mcp_registry SET enabled = $1 WHERE server_name = $2',
      [enabled, serverName]
    );
    await this.sync();
  }

  /** Remove a server from the registry */
  async removeServer(serverName: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM mcp_registry WHERE server_name = $1',
      [serverName]
    );
    await this.sync();
  }

  // ── Health ─────────────────────────────────────────────────

  async health(): Promise<{ status: string; servers: number; connection: string }> {
    try {
      await this.pool.query('SELECT 1');
      return {
        status: 'healthy',
        servers: this.cache.size,
        connection: 'connected',
      };
    } catch {
      return {
        status: 'degraded',
        servers: this.cache.size,
        connection: 'disconnected',
      };
    }
  }
}