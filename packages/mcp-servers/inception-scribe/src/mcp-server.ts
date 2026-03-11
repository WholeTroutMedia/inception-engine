// Creative Liberation Engine SCRIBE MCP Server — 3-Tier Memory System
// stdio transport for Claude Cowork / Desktop integration
// Wraps packages/memory (bus.ts, chroma.ts, handoff.ts) as MCP tools
// Ref: Issue #30 HELIX B

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';

// ── Storage paths (NAS L1 + Git L3) ────────────────────────────────────────
const NAS_BASE = process.env.IE_NAS_BASE ?? '/volume1/creative-liberation-engine';
const MEMORY_DIR = process.env.IE_MEMORY_DIR ?? path.join(NAS_BASE, 'memory');
const EPISODIC_DIR = path.join(MEMORY_DIR, 'episodic');
const SEMANTIC_DIR = path.join(MEMORY_DIR, 'semantic');
const PROCEDURAL_DIR = path.join(MEMORY_DIR, 'procedural');

// ── Types ───────────────────────────────────────────────────────────────────
type MemoryTier = 'episodic' | 'semantic' | 'procedural';

interface MemoryEntry {
  id: string;
  tier: MemoryTier;
  content: string;
  tags: string[];
  agent_id?: string;
  session_id?: string;
  created_at: string;
  accessed_at: string;
  access_count: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function tierDir(tier: MemoryTier): string {
  switch (tier) {
    case 'episodic': return EPISODIC_DIR;
    case 'semantic': return SEMANTIC_DIR;
    case 'procedural': return PROCEDURAL_DIR;
  }
}

async function ensureDirs() {
  for (const dir of [EPISODIC_DIR, SEMANTIC_DIR, PROCEDURAL_DIR]) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function writeEntry(entry: MemoryEntry): Promise<void> {
  const dir = tierDir(entry.tier);
  await fs.writeFile(path.join(dir, `${entry.id}.json`), JSON.stringify(entry, null, 2));
}

async function readEntry(tier: MemoryTier, id: string): Promise<MemoryEntry | null> {
  try {
    const raw = await fs.readFile(path.join(tierDir(tier), `${id}.json`), 'utf-8');
    return JSON.parse(raw);
  } catch { return null; }
}

async function listEntries(tier: MemoryTier): Promise<MemoryEntry[]> {
  const dir = tierDir(tier);
  try {
    const files = await fs.readdir(dir);
    const entries: MemoryEntry[] = [];
    for (const f of files.filter(f => f.endsWith('.json'))) {
      const raw = await fs.readFile(path.join(dir, f), 'utf-8');
      entries.push(JSON.parse(raw));
    }
    return entries;
  } catch { return []; }
}

function matchesTags(entry: MemoryEntry, tags: string[]): boolean {
  if (!tags.length) return true;
  return tags.some(t => entry.tags.includes(t));
}

function matchesQuery(entry: MemoryEntry, query: string): boolean {
  const q = query.toLowerCase();
  return entry.content.toLowerCase().includes(q) ||
    entry.tags.some(t => t.toLowerCase().includes(q));
}

// ── Tool Definitions ────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'scribe_remember',
    description: 'Store a memory entry into the 3-tier SCRIBE system. Episodic = session context, Semantic = learned patterns, Procedural = automatic behaviors.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The memory content to store' },
        tier: { type: 'string', enum: ['episodic', 'semantic', 'procedural'], description: 'Memory tier (default: episodic)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for retrieval' },
        agent_id: { type: 'string', description: 'Agent that created this memory' },
        session_id: { type: 'string', description: 'Session context' },
      },
      required: ['content'],
    },
  },
  {
    name: 'scribe_recall',
    description: 'Retrieve memories from SCRIBE. Search by query text, tags, or tier. Returns most relevant entries.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (searches content + tags)' },
        tier: { type: 'string', enum: ['episodic', 'semantic', 'procedural'], description: 'Filter by tier (omit for all tiers)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
        limit: { type: 'number', description: 'Max results (default: 10)' },
      },
    },
  },
  {
    name: 'scribe_compact',
    description: 'Trigger memory compaction for a tier. Promotes frequently-accessed episodic memories to semantic, and stable semantic patterns to procedural.',
    inputSchema: {
      type: 'object',
      properties: {
        tier: { type: 'string', enum: ['episodic', 'semantic'], description: 'Tier to compact' },
        threshold: { type: 'number', description: 'Minimum access count for promotion (default: 5)' },
      },
      required: ['tier'],
    },
  },
  {
    name: 'scribe_get_context',
    description: 'Get session context — all episodic memories for a given session, ordered chronologically.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Session ID to retrieve context for' },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'scribe_stats',
    description: 'Get SCRIBE memory system statistics — entry counts, sizes, and tier breakdowns.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ── Tool Handlers ───────────────────────────────────────────────────────────
async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
  const now = () => new Date().toISOString();

  switch (name) {
    case 'scribe_remember': {
      const entry: MemoryEntry = {
        id: uuidv4(),
        tier: (args.tier as MemoryTier) ?? 'episodic',
        content: args.content as string,
        tags: (args.tags as string[]) ?? [],
        agent_id: args.agent_id as string | undefined,
        session_id: args.session_id as string | undefined,
        created_at: now(),
        accessed_at: now(),
        access_count: 0,
      };
      await writeEntry(entry);
      return JSON.stringify({ success: true, id: entry.id, tier: entry.tier });
    }

    case 'scribe_recall': {
      const tier = args.tier as MemoryTier | undefined;
      const tiers: MemoryTier[] = tier ? [tier] : ['episodic', 'semantic', 'procedural'];
      const limit = (args.limit as number) ?? 10;
      const query = (args.query as string) ?? '';
      const tags = (args.tags as string[]) ?? [];

      let results: MemoryEntry[] = [];
      for (const t of tiers) {
        const entries = await listEntries(t);
        results.push(...entries.filter(e =>
          (!query || matchesQuery(e, query)) && matchesTags(e, tags)
        ));
      }

      // Sort by relevance: access_count desc, then recency
      results.sort((a, b) => b.access_count - a.access_count || 
        new Date(b.accessed_at).getTime() - new Date(a.accessed_at).getTime());
      results = results.slice(0, limit);

      // Update access counts
      for (const r of results) {
        r.access_count++;
        r.accessed_at = now();
        await writeEntry(r);
      }

      return JSON.stringify({ count: results.length, memories: results }, null, 2);
    }

    case 'scribe_compact': {
      const tier = args.tier as 'episodic' | 'semantic';
      const threshold = (args.threshold as number) ?? 5;
      const targetTier: MemoryTier = tier === 'episodic' ? 'semantic' : 'procedural';
      const entries = await listEntries(tier);
      const promoted: string[] = [];

      for (const entry of entries) {
        if (entry.access_count >= threshold) {
          // Promote to next tier
          const promoted_entry: MemoryEntry = {
            ...entry,
            id: uuidv4(),
            tier: targetTier,
            created_at: now(),
          };
          await writeEntry(promoted_entry);
          // Remove from source tier
          await fs.unlink(path.join(tierDir(tier), `${entry.id}.json`)).catch(() => {});
          promoted.push(entry.id);
        }
      }

      return JSON.stringify({
        success: true,
        compacted_from: tier,
        promoted_to: targetTier,
        promoted_count: promoted.length,
        promoted_ids: promoted,
      });
    }

    case 'scribe_get_context': {
      const sessionId = args.session_id as string;
      const entries = await listEntries('episodic');
      const sessionEntries = entries
        .filter(e => e.session_id === sessionId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return JSON.stringify({
        session_id: sessionId,
        count: sessionEntries.length,
        context: sessionEntries,
      }, null, 2);
    }

    case 'scribe_stats': {
      const [ep, sem, proc] = await Promise.all([
        listEntries('episodic'),
        listEntries('semantic'),
        listEntries('procedural'),
      ]);
      return JSON.stringify({
        episodic: { count: ep.length },
        semantic: { count: sem.length },
        procedural: { count: proc.length },
        total: ep.length + sem.length + proc.length,
        storage_path: MEMORY_DIR,
      }, null, 2);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ── MCP Server (stdio) ──────────────────────────────────────────────────────
async function main() {
  await ensureDirs();

  const server = new Server(
    { name: 'inception-scribe', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const result = await handleTool(
      req.params.name,
      (req.params.arguments ?? {}) as Record<string, unknown>
    );
    return { content: [{ type: 'text', text: result }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[inception-scribe] MCP server running on stdio');
}

main().catch((err) => {
  console.error('[inception-scribe] Fatal:', err);
  process.exit(1);
});