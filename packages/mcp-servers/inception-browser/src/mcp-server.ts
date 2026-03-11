// Creative Liberation Engine BROWSER MCP Server â€” Web Automation
// Ref: Issue #30 HELIX C
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
const BROWSER_API = process.env.IE_BROWSER_API ?? 'http://127.0.0.1:4900';
async function api(path: string, opts: RequestInit = {}): Promise<unknown> {
  const r = await fetch(`${BROWSER_API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...opts.headers } });
  if (!r.ok) throw new Error(`Browser ${r.status}: ${await r.text()}`);
  return r.json();
}
const server = new Server({ name: 'inception-browser', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'browser.navigate', description: 'Navigate to URL and return content', inputSchema: { type: 'object' as const, properties: { url: { type: 'string' }, wait_for: { type: 'string' } }, required: ['url'] } },
    { name: 'browser.search', description: 'Search web and return results', inputSchema: { type: 'object' as const, properties: { query: { type: 'string' }, num_results: { type: 'number' } }, required: ['query'] } },
    { name: 'browser.extract', description: 'Extract data from page', inputSchema: { type: 'object' as const, properties: { selector: { type: 'string' }, attribute: { type: 'string' } }, required: ['selector'] } },
    { name: 'browser.screenshot', description: 'Screenshot page or element', inputSchema: { type: 'object' as const, properties: { selector: { type: 'string' }, format: { type: 'string', enum: ['png','jpeg'] } } } },
  ],
}));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: a } = req.params;
  const json = (d: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(d, null, 2) }] });
  switch (name) {
    case 'browser.navigate': return json(await api('/api/navigate', { method: 'POST', body: JSON.stringify({ url: a?.url, wait_for: a?.wait_for }) }));
    case 'browser.search': return json(await api('/api/search', { method: 'POST', body: JSON.stringify({ query: a?.query, num_results: a?.num_results ?? 5 }) }));
    case 'browser.extract': return json(await api('/api/extract', { method: 'POST', body: JSON.stringify({ selector: a?.selector, attribute: a?.attribute ?? 'textContent' }) }));
    case 'browser.screenshot': {
      const s = await api('/api/screenshot', { method: 'POST', body: JSON.stringify({ selector: a?.selector, format: a?.format ?? 'png' }) }) as { base64: string; mime: string };
      return { content: [{ type: 'image' as const, data: s.base64, mimeType: s.mime ?? 'image/png' }] };
    }
    default: throw new Error(`Unknown tool: ${name}`);
  }
});
async function main() { await server.connect(new StdioServerTransport()); console.error('[inception-browser] MCP server running on stdio'); }
main().catch((e) => { console.error('[inception-browser] Fatal:', e); process.exit(1); });
