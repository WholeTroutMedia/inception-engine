#!/usr/bin/env node
/**
 * inception-scribe MCP Server
 *
 * Exposes SCRIBE v2 memory and context-paging as MCP tools consumable
 * by Claude Cowork or any MCP-compatible client.
 *
 * Tools:
 *   scribe.remember    — Store a memory entry (key, value, tags, ttl)
 *   scribe.recall      — Retrieve memories by key, tag, or semantic query
 *   scribe.context     — Get paged context window for current session
 *   scribe.forget      — Remove a memory entry by key
 *   scribe.handoff     — Generate HANDOFF.md from current session state
 *
 * @package scribe-mcp
 * @issue #30 — Phase A
 * @agent COMET (AURORA hive)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// —— Types ——————————————————————————————————

export interface MemoryEntry {
  key: string;
  value: string;
  tags: string[];
  timestamp: string;
  ttl?: number;       // seconds, null = permanent
  source: string;     // agent ID that created this
  session?: string;
}

export interface ContextPage {
  pageIndex: number;
  totalPages: number;
  entries: MemoryEntry[];
  tokenEstimate: number;
  sessionId: string;
}

import * as fs from 'fs';
import * as path from 'path';

// —— In-Memory Store (Phase A — upgrades to AlloyDB/Redis in Phase B) ———

const BUFFER_PATH = path.resolve(process.cwd(), '.agents/scribe-buffer.json');
let memoryStore: Map<string, MemoryEntry> = new Map();

// Load initial state
try {
  if (fs.existsSync(BUFFER_PATH)) {
    const data = JSON.parse(fs.readFileSync(BUFFER_PATH, 'utf-8'));
    memoryStore = new Map(Object.entries(data));
  }
} catch (e) {
  console.warn('[SCRIBE-MCP] Failed to load buffer:', e);
}

function persistStore() {
  try {
    fs.mkdirSync(path.dirname(BUFFER_PATH), { recursive: true });
    fs.writeFileSync(BUFFER_PATH, JSON.stringify(Object.fromEntries(memoryStore), null, 2), 'utf-8');
  } catch (e) {
    console.error('[SCRIBE-MCP] Failed to flush to disk', e);
  }
}

const PAGE_SIZE = 20;
let sessionId = `session-${Date.now()}`;

function generateKey(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// —— MCP Server Setup ————————————————————————

const server = new Server(
  { name: 'inception-scribe', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

// —— Tool Definitions ————————————————————————

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'scribe.remember',
      description: 'Store a memory entry in SCRIBE. Supports key-value pairs with optional tags and TTL.',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Memory key (auto-generated if omitted)' },
          value: { type: 'string', description: 'Content to remember' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Categorization tags' },
          ttl: { type: 'number', description: 'Time-to-live in seconds (null = permanent)' },
          source: { type: 'string', description: 'Agent ID storing this memory' },
        },
        required: ['value'],
      },
    },
    {
      name: 'scribe.recall',
      description: 'Retrieve memories by key, tag filter, or text search.',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Exact key lookup' },
          tag: { type: 'string', description: 'Filter by tag' },
          query: { type: 'string', description: 'Text search across values' },
          limit: { type: 'number', description: 'Max results (default 10)' },
        },
      },
    },
    {
      name: 'scribe.context',
      description: 'Get paged context window for current session. Returns entries with token estimates for context management.',
      inputSchema: {
        type: 'object',
        properties: {
          page: { type: 'number', description: 'Page index (0-based, default 0)' },
          pageSize: { type: 'number', description: 'Entries per page (default 20)' },
          sessionFilter: { type: 'string', description: 'Filter to specific session' },
        },
      },
    },
    {
      name: 'scribe.forget',
      description: 'Remove a memory entry by key.',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Key of memory to remove' },
        },
        required: ['key'],
      },
    },
    {
      name: 'scribe.handoff',
      description: 'Generate a HANDOFF.md document from current session state, including all memories tagged with the session.',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent generating the handoff' },
          phase: { type: 'string', description: 'Current phase (IDEATE/PLAN/SHIP/VALIDATE)' },
          summary: { type: 'string', description: 'Session summary' },
        },
        required: ['agentId', 'summary'],
      },
    },
  ],
}));

// —— Resource Definitions (session metadata) ——

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: `scribe://session/${sessionId}`,
      name: 'Current SCRIBE Session',
      description: `Active memory session with ${memoryStore.size} entries`,
      mimeType: 'application/json',
    },
  ],
}));

// —— Tool Handlers ——————————————————————————

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'scribe.remember': {
      const key = (args?.key as string) || generateKey();
      const entry: MemoryEntry = {
        key,
        value: args?.value as string,
        tags: (args?.tags as string[]) || [],
        timestamp: new Date().toISOString(),
        ttl: args?.ttl as number | undefined,
        source: (args?.source as string) || 'unknown',
        session: sessionId,
      };
      memoryStore.set(key, entry);
      persistStore();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ stored: true, key, totalMemories: memoryStore.size }),
        }],
      };
    }

    case 'scribe.recall': {
      let results: MemoryEntry[] = [];
      const limit = (args?.limit as number) || 10;

      if (args?.key) {
        const entry = memoryStore.get(args.key as string);
        if (entry) results.push(entry);
      } else {
        const allEntries = Array.from(memoryStore.values());
        if (args?.tag) {
          results = allEntries.filter(e => e.tags.includes(args!.tag as string));
        } else if (args?.query) {
          const q = (args.query as string).toLowerCase();
          results = allEntries.filter(e =>
            e.value.toLowerCase().includes(q) || e.key.toLowerCase().includes(q)
          );
        } else {
          results = allEntries;
        }
      }

      // Evict expired entries
      const now = Date.now();
      results = results.filter(e => {
        if (!e.ttl) return true;
        const created = new Date(e.timestamp).getTime();
        return (now - created) < (e.ttl * 1000);
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ count: Math.min(results.length, limit), results: results.slice(0, limit) }),
        }],
      };
    }

    case 'scribe.context': {
      const page = (args?.page as number) || 0;
      const size = (args?.pageSize as number) || PAGE_SIZE;
      let entries = Array.from(memoryStore.values());

      if (args?.sessionFilter) {
        entries = entries.filter(e => e.session === args!.sessionFilter);
      }

      // Sort by timestamp descending (most recent first)
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const totalPages = Math.ceil(entries.length / size);
      const paged = entries.slice(page * size, (page + 1) * size);
      const tokenEstimate = paged.reduce((sum, e) => sum + estimateTokens(e.value), 0);

      const contextPage: ContextPage = {
        pageIndex: page,
        totalPages,
        entries: paged,
        tokenEstimate,
        sessionId,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(contextPage) }],
      };
    }

    case 'scribe.forget': {
      const deleted = memoryStore.delete(args?.key as string);
      if (deleted) persistStore();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ deleted, key: args?.key, remaining: memoryStore.size }),
        }],
      };
    }

    case 'scribe.handoff': {
      const sessionEntries = Array.from(memoryStore.values())
        .filter(e => e.session === sessionId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const handoff = [
        `# HANDOFF: ${args?.agentId} Session`,
        '',
        `**From:** ${args?.agentId}`,
        `**Phase:** ${args?.phase || 'SHIP'}`,
        `**Timestamp:** ${new Date().toISOString()}`,
        `**Memories:** ${sessionEntries.length}`,
        '',
        '## Summary',
        '',
        args?.summary as string,
        '',
        '## Session Memories',
        '',
        '| Key | Tags | Value (truncated) |',
        '| ---- | ---- | ---- |',
        ...sessionEntries.map(e =>
          `| ${e.key} | ${e.tags.join(', ')} | ${e.value.slice(0, 80)}${e.value.length > 80 ? '...' : ''} |`
        ),
      ].join('\n');

      return {
        content: [{ type: 'text', text: handoff }],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

// —— Start Server ————————————————————————————

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[SCRIBE-MCP] Server started — SCRIBE v2 memory layer online');
}

main().catch(console.error);
