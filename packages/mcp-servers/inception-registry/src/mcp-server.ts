// Creative Liberation Engine REGISTRY MCP Server â€” Agent Status + Hive State
// stdio transport for Claude Cowork / Desktop integration
// Reads from .averi/boot.json + .averi/agents/ + dispatch server REST API
// Ref: Issue #30 HELIX D

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const DISPATCH_URL = process.env.IE_DISPATCH_URL ?? 'http://127.0.0.1:5050';
const AVERI_DIR = process.env.IE_AVERI_DIR ?? path.resolve('.averi');

async function fetchJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

const HIVE_MAP: Record<string, string[]> = {
  AURORA: ['COMET', 'BOLT', 'PIXEL', 'ECHO', 'ATLAS', 'NOVA'],
  KEEPER: ['SCRIBE', 'ARCHIVIST', 'CURATOR', 'LIBRARIAN', 'INDEXER', 'CHRONICLE'],
  FORGE: ['ANVIL', 'HAMMER', 'KILN', 'PRESS', 'LATHE', 'MOLD'],
  SENTINEL: ['GUARD', 'WATCH', 'SHIELD', 'PATROL', 'BEACON', 'WARD'],
  SAGE: ['ORACLE', 'MENTOR', 'SAGE', 'TUTOR', 'GUIDE', 'PROPHET'],
  NEXUS: ['RELAY', 'BRIDGE', 'LINK', 'ROUTER', 'SWITCH', 'HUB'],
};

const TOOLS = [
  { name: 'registry_get_agents', description: 'Get all registered agents with live status from dispatch server.', inputSchema: { type: 'object', properties: {} } },
  { name: 'registry_get_hive', description: 'Get agents in a specific hive.', inputSchema: { type: 'object', properties: { hive_name: { type: 'string' } }, required: ['hive_name'] } },
  { name: 'registry_get_modes', description: 'Get IDEATE/PLAN/SHIP/VALIDATE pipeline status.', inputSchema: { type: 'object', properties: {} } },
  { name: 'registry_invoke_agent', description: 'Delegate a task to a specific agent via dispatch.', inputSchema: { type: 'object', properties: { agent_name: { type: 'string' }, task_title: { type: 'string' }, task_description: { type: 'string' }, project: { type: 'string' }, workstream: { type: 'string' } }, required: ['agent_name', 'task_title'] } },
  { name: 'registry_get_boot_config', description: 'Read .averi/boot.json system configuration.', inputSchema: { type: 'object', properties: {} } },
  { name: 'registry_get_charters', description: 'List agent charter files from .averi/agents/.', inputSchema: { type: 'object', properties: {} } },
];

async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'registry_get_agents': {
      try { return JSON.stringify(await fetchJSON(`${DISPATCH_URL}/api/agents`), null, 2); }
      catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
    case 'registry_get_hive': {
      const h = (args.hive_name as string).toUpperCase();
      const members = HIVE_MAP[h];
      if (!members) return JSON.stringify({ error: `Unknown hive: ${h}`, available: Object.keys(HIVE_MAP) });
      try {
        const all = await fetchJSON(`${DISPATCH_URL}/api/agents`) as any;
        const found = [...(all.active??[]),...(all.idle??[]),...(all.stale??[])].filter((a:any)=>members.some(m=>a.agent_id?.toUpperCase().includes(m)));
        return JSON.stringify({ hive: h, members, registered: found }, null, 2);
      } catch { return JSON.stringify({ hive: h, members, registered: [] }); }
    }
    case 'registry_get_modes': {
      try {
        const s = await fetchJSON(`${DISPATCH_URL}/api/status`) as any;
        return JSON.stringify({ modes: ['IDEATE','PLAN','SHIP','VALIDATE'], current: 'SHIP', summary: s.summary }, null, 2);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
    case 'registry_invoke_agent': {
      try {
        const r = await fetch(`${DISPATCH_URL}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: args.task_title, project: args.project ?? 'brainchild-v5', workstream: args.workstream ?? 'general', delegated_by: 'registry-mcp', assigned_to_agent: args.agent_name, priority: 'P1', description: args.task_description }) });
        return JSON.stringify(await r.json(), null, 2);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
    case 'registry_get_boot_config': {
      try { return await fs.readFile(path.join(AVERI_DIR, 'boot.json'), 'utf-8'); }
      catch { return JSON.stringify({ error: 'boot.json not found' }); }
    }
    case 'registry_get_charters': {
      try {
        const files = await fs.readdir(path.join(AVERI_DIR, 'agents'));
        return JSON.stringify({ count: files.length, files }, null, 2);
      } catch { return JSON.stringify({ count: 0, files: [] }); }
    }
    default: return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

async function main() {
  const server = new Server({ name: 'inception-registry', version: '1.0.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const result = await handleTool(req.params.name, (req.params.arguments ?? {}) as Record<string, unknown>);
    return { content: [{ type: 'text', text: result }] };
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[inception-registry] MCP server running on stdio');
}

main().catch((err) => { console.error('[inception-registry] Fatal:', err); process.exit(1); });