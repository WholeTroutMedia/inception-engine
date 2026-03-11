/**
 * Wire Ingestion MCP â€” MCP Server
 *
 * Exposes three tools to the Creative Liberation Engine:
 *   - wire.query  â€” search by topic, category, source, time
 *   - wire.latest â€” get newest entries
 *   - wire.stats  â€” ingestion health
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Redis } from 'ioredis';
import { WireQuerySchema, WireLatestSchema } from './types.js';
import { queryEntries, latestEntries } from './cache.js';
import { startIngester, stopIngester, getStats } from './ingester.js';
import { FEED_COUNT } from './feeds.js';

const server = new Server(
  { name: 'wire-ingestion-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TOOL DEFINITIONS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'wire_query',
      description:
        'Search live wire feeds. Returns recent articles by topic, category (news|sports|financial|science|literary|tech|government|entertainment|health|business), or source. Covers 100+ real-time feeds.',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Keyword to search in title + summary' },
          category: {
            type: 'string',
            enum: ['news','sports','financial','science','literary','tech','government','entertainment','health','business'],
            description: 'Wire category to filter',
          },
          source: { type: 'string', description: 'Specific source ID (e.g. ap-top, espn-nba)' },
          limit: { type: 'number', description: 'Max results (default 20, max 100)' },
          since: { type: 'string', description: 'ISO 8601 datetime â€” only return entries after this time' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'wire_latest',
      description:
        'Get the newest wire entries across all categories or a specific one. Perfect for a real-time news briefing.',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['news','sports','financial','science','literary','tech','government','entertainment','health','business'],
          },
          limit: { type: 'number', description: 'Max results (default 10, max 50)' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'wire_stats',
      description: 'Get ingestion health stats â€” how many articles fetched, new entries, errors, last run time.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
  ],
}));

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TOOL HANDLERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'wire_query': {
      const query = WireQuerySchema.parse(args ?? {});
      const entries = await queryEntries(query);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count: entries.length,
            query,
            entries: entries.map(e => ({
              title: e.title,
              source: e.source,
              category: e.category,
              url: e.url,
              publishedAt: e.publishedAt,
              summary: e.summary,
            })),
          }, null, 2),
        }],
      };
    }

    case 'wire_latest': {
      const params = WireLatestSchema.parse(args ?? {});
      const entries = await latestEntries(params.category, params.limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count: entries.length,
            entries: entries.map(e => ({
              title: e.title,
              source: e.source,
              category: e.category,
              url: e.url,
              publishedAt: e.publishedAt,
              summary: e.summary,
            })),
          }, null, 2),
        }],
      };
    }

    case 'wire_stats': {
      const s = getStats();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            feeds: FEED_COUNT,
            categories: 10,
            ...s,
          }, null, 2),
        }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HTTP HEALTH SERVER (port 4200)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Satisfies Docker healthcheck + Creative Liberation Engine service monitor.
// Reports Redis connectivity and wire stream key counts.

const HEALTH_PORT = parseInt(process.env['HTTP_PORT'] ?? '4200', 10);
const REDIS_URL_HEALTH = process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379';
const WIRE_CATEGORIES = ['news','sports','financial','science','literary','tech','government','entertainment','health','business'];

async function checkRedisHealth(): Promise<{ ok: boolean; latencyMs: number; streamKeys: Record<string, number> }> {
  const redis = new Redis(REDIS_URL_HEALTH, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 2000 });
  const start = Date.now();
  try {
    await redis.ping();
    const latencyMs = Date.now() - start;
    const streamKeys: Record<string, number> = {};
    for (const cat of WIRE_CATEGORIES) {
      streamKeys[cat] = await redis.xlen(`wire:${cat}`);
    }
    await redis.quit();
    return { ok: true, latencyMs, streamKeys };
  } catch (err) {
    try { await redis.quit(); } catch { /* ignore */ }
    return { ok: false, latencyMs: Date.now() - start, streamKeys: {} };
  }
}

function startHealthServer(): void {
  createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health' || req.url === '/') {
      const health = await checkRedisHealth();
      const status = health.ok ? 200 : 503;
      const totalEntries = Object.values(health.streamKeys).reduce((a, b) => a + b, 0);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: health.ok ? 'ok' : 'degraded',
        service: 'wire-ingestion-mcp',
        redis: { connected: health.ok, latencyMs: health.latencyMs },
        wire: { feeds: FEED_COUNT, categories: WIRE_CATEGORIES.length, cachedEntries: totalEntries, streamKeys: health.streamKeys },
        ts: new Date().toISOString(),
      }));
    } else {
      res.writeHead(404);
      res.end('{"error":"not found"}');
    }
  }).listen(HEALTH_PORT, () => {
    console.error(`[wire-mcp] Health server listening on :${HEALTH_PORT}/health`);
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BOOT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function main(): Promise<void> {
  // Start health HTTP server before MCP transport
  startHealthServer();

  // Start ingestion in background
  startIngester().catch(console.error);

  // Connect MCP transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[wire-mcp] Server ready â€” ${FEED_COUNT} feeds ingesting`);

  // Graceful shutdown
  process.on('SIGINT', () => { stopIngester(); process.exit(0); });
  process.on('SIGTERM', () => { stopIngester(); process.exit(0); });
}

main().catch(console.error);
