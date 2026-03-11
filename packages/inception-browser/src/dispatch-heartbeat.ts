/**
 * Dispatch Heartbeat — Browser Mesh Coordinator
 *
 * Registers the inception-browser MCP server as a browser-mesh agent in the
 * Creative Liberation Engine Dispatch Server. Set DISPATCH_URL env for production.
 *
 * Fires on boot and every 60 seconds. Fire-and-forget — never blocks startup.
 */

import { nodeRegistry } from './cdp/node-registry.js';

const DISPATCH_URL = process.env.DISPATCH_URL ?? 'http://localhost:5050';
const AGENT_ID = 'browser-mesh';
const HEARTBEAT_INTERVAL_MS = 60_000;

async function postHeartbeat(): Promise<void> {
  const summary = nodeRegistry.summary();
  const nodes = nodeRegistry.getAll();

  const payload = {
    agent_id: AGENT_ID,
    tool: 'inception-browser-mcp',
    capabilities: ['sovereign-browser', 'cdp-attach', 'extension-control', 'browser-mesh'],
    window: 'BM',
    workstream: 'browser-mesh',
    current_task: `Browser mesh active — ${summary.total} node(s), ${summary.busy} busy`,
    status: 'active',
    meta: {
      nodes: nodes.map(n => ({
        id: n.id,
        mode: n.mode,
        browser: n.browser,
        status: n.status,
        tabCount: n.tabs.length,
        agentId: n.agentId,
        taskId: n.taskId,
      })),
      summary,
    },
  };

  await fetch(`${DISPATCH_URL}/api/agents/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });
}

/**
 * Start periodic dispatch heartbeat.
 * Fire-and-forget — errors are logged but never thrown.
 */
export function startDispatchHeartbeat(): void {
  // Boot heartbeat
  postHeartbeat().catch(err =>
    console.error(`[Dispatch] Heartbeat failed (offline? NAS down?): ${err instanceof Error ? err.message : String(err)}`)
  );

  // Recurring heartbeat
  setInterval(() => {
    postHeartbeat().catch(() => void 0); // silent on recurring — only log on boot failure
  }, HEARTBEAT_INTERVAL_MS);

  console.error(`[Dispatch] 🔔 Browser mesh heartbeat started → ${DISPATCH_URL} (every ${HEARTBEAT_INTERVAL_MS / 1000}s)`);
}
