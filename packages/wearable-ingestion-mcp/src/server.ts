/**
 * Wearable Ingestion MCP — Main Server
 *
 * Runs two interfaces simultaneously:
 * 1. HTTP server: receives incoming webhooks from wearable devices/apps
 * 2. MCP server: exposes tools for AVERI agents to query/ingest signals
 *
 * Port: 4350 (HTTP)
 * MCP: stdio (for Genkit tool registration)
 */

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { WearableSource, WearableSignal, type WearableSource as WearableSourceType } from './types.js';
import { getAdapter, listAdapters } from './adapters/index.js';
import { classifyIntent, buildDispatchTask } from './router.js';
import { sendToDispatch, pingDispatch } from './dispatch.js';

const PORT = parseInt(process.env.PORT ?? '4350', 10);
const app = express();
app.use(express.json());

// ─── In-memory signal store (recent 500 signals) ──────────────────────────────
const recentSignals: WearableSignal[] = [];
const MAX_SIGNALS = 500;

function storeSignal(signal: WearableSignal) {
  recentSignals.unshift(signal);
  if (recentSignals.length > MAX_SIGNALS) recentSignals.pop();
}

// ─── HTTP Routes ──────────────────────────────────────────────────────────────

/** Health check */
app.get('/health', async (_req, res) => {
  const dispatchOnline = await pingDispatch();
  res.json({
    status: 'ok',
    service: 'wearable-ingestion-mcp',
    port: PORT,
    adapters: listAdapters().map((a) => ({ source: a.source, name: a.name })),
    dispatchOnline,
    signalsStored: recentSignals.length,
    timestamp: new Date().toISOString(),
  });
});

/** Universal wearable webhook endpoint
 *  POST /webhook/:source
 *  e.g. POST /webhook/sandbar_stream
 *       POST /webhook/oura
 */
app.post('/webhook/:source', async (req, res) => {
  const sourceParam = req.params.source;
  const parseResult = WearableSource.safeParse(sourceParam);

  if (!parseResult.success) {
    return res.status(400).json({
      error: `Unknown wearable source: ${sourceParam}`,
      known: WearableSource.options,
    });
  }

  const source = parseResult.data;
  const adapter = getAdapter(source);

  if (!adapter) {
    return res.status(501).json({ error: `No adapter registered for ${source}` });
  }

  const userId = (req.headers['x-user-id'] as string) ?? 'default';

  try {
    const signal = await adapter.parse(req.body, userId);
    const intent = classifyIntent(signal);
    signal.intent = intent;
    signal.processedAt = new Date().toISOString();

    storeSignal(signal);

    const task = buildDispatchTask(signal, intent);
    const result = await sendToDispatch(signal, task, intent);

    console.log(`[wearable] ${source} → intent:${intent} taskId:${result.taskId ?? 'none'}`);

    return res.json({
      received: true,
      signalId: signal.id,
      intent,
      taskId: result.taskId,
    });
  } catch (err) {
    console.error(`[wearable] Parse error for ${source}:`, err);
    return res.status(500).json({ error: 'Signal parse failed', details: String(err) });
  }
});

/** Manual test/simulation endpoint for pre-hardware testing
 *  POST /simulate
 *  Body: { source: 'sandbar_stream', transcript: 'ship the wearable-ingestion-mcp package' }
 */
app.post('/simulate', async (req, res) => {
  const { source = 'sandbar_stream', transcript, type = 'voice_note' } = req.body as {
    source?: WearableSourceType;
    transcript?: string;
    type?: string;
  };

  const simulatedPayload = {
    type,
    id: uuidv4(),
    userId: 'dev',
    transcript,
    capturedAt: new Date().toISOString(),
  };

  const adapter = getAdapter(source);
  if (!adapter) {
    return res.status(400).json({ error: `No adapter for ${source}` });
  }

  const signal = await adapter.parse(simulatedPayload, 'dev');
  const intent = classifyIntent(signal);
  signal.intent = intent;
  signal.processedAt = new Date().toISOString();
  storeSignal(signal);

  const task = buildDispatchTask(signal, intent);
  const result = await sendToDispatch(signal, task, intent);

  return res.json({
    simulated: true,
    signal,
    intent,
    taskId: result.taskId,
  });
});

/** List recent signals */
app.get('/signals', (_req, res) => {
  const limit = parseInt(((_req.query as Record<string, string>)['limit']) ?? '20', 10);
  res.json(recentSignals.slice(0, limit));
});

// ─── MCP Server ───────────────────────────────────────────────────────────────

const mcp = new McpServer({
  name: 'wearable-ingestion-mcp',
  version: '1.0.0',
});

mcp.tool(
  'ingest_wearable_signal',
  'Ingest a normalized wearable signal into the Creative Liberation Engine dispatch pipeline',
  {
    source: z.string().describe('Wearable source identifier (e.g. sandbar_stream, oura)'),
    transcript: z.string().optional().describe('Voice note transcript text'),
    type: z.string().default('voice_note').describe('Signal type'),
    userId: z.string().default('default').describe('User identifier'),
  },
  async ({ source, transcript, type, userId }) => {
    const parseResult = WearableSource.safeParse(source);
    if (!parseResult.success) {
      return { content: [{ type: 'text' as const, text: `Unknown source: ${source}` }] };
    }

    const adapter = getAdapter(parseResult.data);
    if (!adapter) {
      return { content: [{ type: 'text' as const, text: `No adapter for ${source}` }] };
    }

    const payload = { type, id: uuidv4(), userId, transcript, capturedAt: new Date().toISOString() };
    const signal = await adapter.parse(payload, userId);
    const intent = classifyIntent(signal);
    signal.intent = intent;
    storeSignal(signal);

    const task = buildDispatchTask(signal, intent);
    const result = await sendToDispatch(signal, task, intent);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ signalId: signal.id, intent, taskId: result.taskId }),
      }],
    };
  }
);

mcp.tool(
  'list_wearable_signals',
  'List recent wearable signals received by the ingestion layer',
  {
    limit: z.number().default(10).describe('Number of recent signals to return'),
    source: z.string().optional().describe('Filter by source'),
  },
  async ({ limit, source }) => {
    const filtered = source
      ? recentSignals.filter((s) => s.source === source)
      : recentSignals;
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(filtered.slice(0, limit), null, 2) }],
    };
  }
);

mcp.tool(
  'list_wearable_adapters',
  'List all registered wearable device adapters',
  {},
  async () => {
    const adapters = listAdapters().map((a) => ({ source: a.source, name: a.name }));
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(adapters, null, 2) }],
    };
  }
);

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function main() {
  // Detect if running as MCP tool (stdio) vs HTTP server
  const mcpMode = process.argv.includes('--mcp');

  if (mcpMode) {
    const transport = new StdioServerTransport();
    await mcp.connect(transport);
    console.error('[wearable-ingestion-mcp] MCP server running on stdio');
  } else {
    app.listen(PORT, () => {
      console.log(`[wearable-ingestion-mcp] HTTP server listening on port ${PORT}`);
      console.log(`[wearable-ingestion-mcp] Webhook endpoint: POST /webhook/:source`);
      console.log(`[wearable-ingestion-mcp] Simulation endpoint: POST /simulate`);
      console.log(`[wearable-ingestion-mcp] Health: GET /health`);
      console.log(`[wearable-ingestion-mcp] Adapters: ${listAdapters().map((a) => a.source).join(', ')}`);
    });
  }
}

main().catch(console.error);
