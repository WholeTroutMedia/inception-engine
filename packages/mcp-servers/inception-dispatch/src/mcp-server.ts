// Creative Liberation Engine DISPATCH MCP Server â€” Task Routing + Queue Management
// stdio transport for Claude Cowork / Desktop integration
// Ref: Issue #30 HELIX A
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';
const DISPATCH_API = process.env.IE_DISPATCH_API ?? 'http://127.0.0.1:4800';
interface Task { id: string; agent: string; action: string; payload: Record<string, unknown>; priority: string; status: string; }
async function api(path: string, opts: RequestInit = {}): Promise<unknown> {
  const r = await fetch(`${DISPATCH_API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...opts.headers } });
  if (!r.ok) throw new Error(`Dispatch ${r.status}: ${await r.text()}`);
  return r.json();
}
const server = new Server({ name: 'inception-dispatch', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'dispatch.submit_task', description: 'Submit task to IE dispatch queue', inputSchema: { type: 'object' as const, properties: { agent: { type: 'string' }, action: { type: 'string' }, payload: { type: 'object' }, priority: { type: 'string', enum: ['critical','high','normal','low'] } }, required: ['agent','action'] } },
    { name: 'dispatch.get_queue', description: 'Get dispatch queue', inputSchema: { type: 'object' as const, properties: { status: { type: 'string' }, limit: { type: 'number' } } } },
    { name: 'dispatch.get_status', description: 'Get task status by ID', inputSchema: { type: 'object' as const, properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'dispatch.cancel_task', description: 'Cancel a task', inputSchema: { type: 'object' as const, properties: { task_id: { type: 'string' }, reason: { type: 'string' } }, required: ['task_id'] } },
  ],
}));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: a } = req.params;
  const json = (d: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(d, null, 2) }] });
  switch (name) {
    case 'dispatch.submit_task': { const id = uuidv4(); const t = await api('/api/tasks', { method: 'POST', body: JSON.stringify({ id, agent: a?.agent, action: a?.action, payload: a?.payload ?? {}, priority: a?.priority ?? 'normal' }) }) as Task; return json({ status: 'submitted', task_id: t.id ?? id, agent: a?.agent }); }
    case 'dispatch.get_queue': { const p = new URLSearchParams(); if (a?.status && a.status !== 'all') p.set('status', a.status as string); p.set('limit', String(a?.limit ?? 50)); return json(await api(`/api/tasks?${p}`)); }
    case 'dispatch.get_status': return json(await api(`/api/tasks/${a?.task_id}`));
    case 'dispatch.cancel_task': return json(await api(`/api/tasks/${a?.task_id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: a?.reason ?? 'Cancelled' }) }));
    default: throw new Error(`Unknown tool: ${name}`);
  }
});
async function main() { await server.connect(new StdioServerTransport()); console.error('[inception-dispatch] MCP server running on stdio'); }
main().catch((e) => { console.error('[inception-dispatch] Fatal:', e); process.exit(1); });
