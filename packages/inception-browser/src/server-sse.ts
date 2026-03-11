/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMET C1 — NAS MCP SSE Server Entrypoint
 * T-STEALTH-003
 *
 * This module boots the inception-browser MCP server in SSE transport mode,
 * suitable for always-on Docker deployment on NAS. Unlike the local stdio
 * transport (used by Creative Liberation Engine IDE), SSE allows multiple clients to connect
 * over HTTP — including other Creative Liberation Engine windows and the Dispatch Worker.
 *
 * Self-registration: On boot, this process registers with the Dispatch Server
 * as agent_id: "comet-C1" with capability tags for task routing.
 *
 * Then sends a heartbeat every 30s to remain visible in the mesh.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import http from 'node:http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createInceptionBrowserServer } from './server.js';

const AGENT_ID = process.env.COMET_AGENT_ID ?? 'comet-C1';
const WINDOW = process.env.COMET_WINDOW ?? 'C1';
const WORKSTREAM = process.env.COMET_WORKSTREAM ?? 'comet-browser';
const CAPABILITIES = (process.env.COMET_CAPABILITIES ?? 'nas-persistent,web-research,stealth')
  .split(',')
  .map((s) => s.trim());
const PORT = parseInt(process.env.COMET_PORT ?? '7200', 10);
const DISPATCH_URL = process.env.DISPATCH_URL ?? 'http://dispatch:5050';
const HEARTBEAT_INTERVAL_MS = 30_000;

// ── Dispatch Registration ─────────────────────────────────────────────────────

async function registerWithDispatch(currentTask: string = 'idle'): Promise<void> {
  const body = JSON.stringify({
    agent_id: AGENT_ID,
    window: WINDOW,
    workstream: WORKSTREAM,
    capabilities: CAPABILITIES,
    current_task: currentTask,
    tool: 'comet-browser',
    status: 'active',
  });

  try {
    const res = await fetch(`${DISPATCH_URL}/api/agents/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(`[COMET-C1] Dispatch heartbeat returned ${res.status}`);
    }
  } catch (err) {
    // Fire-and-forget: never crash on missed heartbeat
    console.warn(`[COMET-C1] Dispatch heartbeat failed (offline?): ${(err as Error).message}`);
  }
}

// ── MCP SSE Server ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`[COMET-C1] 🚀 Booting NAS Browser Agent`);
  console.log(`[COMET-C1] Agent ID   : ${AGENT_ID}`);
  console.log(`[COMET-C1] Window     : ${WINDOW}`);
  console.log(`[COMET-C1] Workstream : ${WORKSTREAM}`);
  console.log(`[COMET-C1] Port       : ${PORT}`);

  // Create generic MCP server with 60+ tools
  const { server: mcpServer, toolCount, engine } = createInceptionBrowserServer();
  console.log(`[COMET-C1] ✅ Registered ${toolCount} tools`);

  // Track active SSE transports (one per connected client)
  const transports = new Map<string, SSEServerTransport>();

  // SSE HTTP server
  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

    // ── Health check ──────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        agentId: AGENT_ID,
        connections: transports.size,
        uptime: process.uptime(),
      }));
      return;
    }

    // ── SSE Connection endpoint ───────────────────────────────
    if (req.method === 'GET' && url.pathname === '/sse') {
      const sessionId = crypto.randomUUID();
      const transport = new SSEServerTransport(`/messages/${sessionId}`, res);
      transports.set(sessionId, transport);

      res.on('close', () => {
        transports.delete(sessionId);
        console.log(`[COMET-C1] Client disconnected: ${sessionId} (${transports.size} active)`);
      });

      await mcpServer.connect(transport);
      console.log(`[COMET-C1] Client connected: ${sessionId} (${transports.size} active)`);
      return;
    }

    // ── Message receiver for SSE sessions ────────────────────
    const msgMatch = url.pathname.match(/^\/messages\/([^/]+)$/);
    if (req.method === 'POST' && msgMatch) {
      const sessionId = msgMatch[1];
      const transport = transports.get(sessionId);
      if (!transport) {
        res.writeHead(404);
        res.end('Session not found');
        return;
      }
      await transport.handlePostMessage(req, res);
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[COMET-C1] ✅ MCP SSE server listening on :${PORT}`);
    console.log(`[COMET-C1] → SSE endpoint : http://0.0.0.0:${PORT}/sse`);
    console.log(`[COMET-C1] → Health check : http://0.0.0.0:${PORT}/health`);
  });

  // ── Initial dispatch registration ───────────────────────────
  await registerWithDispatch('NAS browser agent — ready for tasks');

  // ── Heartbeat loop ───────────────────────────────────────────
  setInterval(() => {
    void registerWithDispatch(`${transports.size > 0 ? 'active session' : 'idle — waiting for tasks'}`);
  }, HEARTBEAT_INTERVAL_MS);

  // ── Graceful shutdown ────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[COMET-C1] ${signal} received — shutting down gracefully`);
    await engine.close();
    httpServer.close(() => {
      console.log(`[COMET-C1] HTTP server closed`);
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('[COMET-C1] Fatal boot error:', err);
  process.exit(1);
});
