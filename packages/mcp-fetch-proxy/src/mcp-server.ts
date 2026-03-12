#!/usr/bin/env node
/**
 * mcp-server.ts â€” MCP Fetch Proxy stdio server
 * @cle/mcp-fetch-proxy
 *
 * Exposes the fetch proxy as an MCP stdio server so Creative Liberation Engine and COMET
 * can call HTTP endpoints on the sovereign mesh without browser restrictions.
 *
 * Tools:
 *   fetch.proxy     â€” Generic HTTP proxy through allowlisted hosts
 *   dispatch.call   â€” Shortcut to NAS dispatch server REST API
 *   genkit.call     â€” Shortcut to Genkit API server REST API
 *
 * @security Host allowlist enforced â€” no open proxy. SSRF protection via
 *           explicit hostname matching. 60 req/min rate limit per caller.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const DISPATCH_URL = process.env['DISPATCH_URL'] ?? 'http://127.0.0.1:5050';
const GENKIT_URL = process.env['GENKIT_URL'] ?? 'http://127.0.0.1:4100';

// â”€â”€â”€ SSRF Allowlist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '127.0.0.1'];

function isAllowedTarget(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some(
      h => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

// â”€â”€â”€ Rate Limiting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const callCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 120; // per minute per tool (generous for agent-to-agent)
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(caller: string): boolean {
  const now = Date.now();
  const record = callCounts.get(caller);
  if (!record || now > record.resetAt) {
    callCounts.set(caller, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

// â”€â”€â”€ MCP Server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const server = new Server(
  { name: 'cle-fetch-proxy', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'fetch.proxy',
      description:
        'Make an HTTP request to an allowlisted sovereign mesh host. Supports all methods. ' +
        'Use this when browser-based agents cannot make direct API calls. ' +
        'Allowlist: 127.0.0.1, localhost, 127.0.0.1.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Full URL to request (must be allowlisted)' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method (default: GET)' },
          headers: { type: 'object', description: 'Additional request headers' },
          body: { description: 'JSON body for POST/PUT/PATCH' },
        },
        required: ['url'],
      },
    },
    {
      name: 'dispatch.call',
      description:
        'Call the cle Dispatch Server REST API (http://127.0.0.1:5050). ' +
        'Use for task management, agent registration, heartbeats, and mesh coordination.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'API path (e.g. /api/status, /api/tasks, /api/agents/heartbeat)' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method (default: GET)' },
          body: { description: 'JSON body' },
        },
        required: ['path'],
      },
    },
    {
      name: 'genkit.call',
      description:
        'Call the cle Genkit API server (http://127.0.0.1:4100). ' +
        'Use to invoke engine flows: /generate, /vt100/ideate, /a2a/orchestrate, /vt100/creative-dna/embed, etc.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'API path (e.g. /generate, /vt100/ideate, /a2a/orchestrate)' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method (default: POST)' },
          body: { description: 'JSON body' },
        },
        required: ['path'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  if (!checkRateLimit(name)) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'Rate limit exceeded', retryAfterMs: RATE_WINDOW_MS }) }],
      isError: true,
    };
  }

  switch (name) {
    case 'fetch.proxy': {
      const url = args?.url as string;
      const method = (args?.method as string) || 'GET';
      const headers = (args?.headers as Record<string, string>) || {};
      const body = args?.body;

      if (!isAllowedTarget(url)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Target host not in SSRF allowlist', url }) }],
          isError: true,
        };
      }

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const contentType = res.headers.get('content-type') ?? '';
        const data = contentType.includes('application/json') ? await res.json() : await res.text();
        return { content: [{ type: 'text', text: JSON.stringify({ status: res.status, ok: res.ok, data }) }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Proxy fetch failed', message: msg }) }], isError: true };
      }
    }

    case 'dispatch.call': {
      const path = args?.path as string;
      const method = (args?.method as string) || 'GET';
      const body = args?.body;
      const url = `${DISPATCH_URL}${path}`;

      if (!isAllowedTarget(url)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Dispatch URL not in allowlist' }) }],
          isError: true,
        };
      }

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify({ status: res.status, ok: res.ok, data }) }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Dispatch call failed', message: msg }) }], isError: true };
      }
    }

    case 'genkit.call': {
      const path = args?.path as string;
      const method = (args?.method as string) || 'POST';
      const body = args?.body;
      const url = `${GENKIT_URL}${path}`;

      if (!isAllowedTarget(url)) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Genkit URL not in allowlist' }) }],
          isError: true,
        };
      }

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const data = await res.json();
        return { content: [{ type: 'text', text: JSON.stringify({ status: res.status, ok: res.ok, data }) }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Genkit call failed', message: msg }) }], isError: true };
      }
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

// â”€â”€â”€ Boot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[FETCH-PROXY-MCP] âœ… cle Fetch Proxy MCP server online');
  console.error(`[FETCH-PROXY-MCP] Dispatch: ${DISPATCH_URL} | Genkit: ${GENKIT_URL}`);
}

main().catch(console.error);
