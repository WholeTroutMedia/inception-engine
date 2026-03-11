/**
 * @inception/mcp-router â€” Fetch Proxy Tool
 * Helix-C: MCP bridge allowing COMET browser to POST to external APIs
 * 
 * Resolves P0 pain point: browser strips javascript: URLs, no devtools.
 * COMET routes all outbound HTTP writes through this MCP tool.
 * 
 * Security: All requests are validated against an allowlist of domains.
 */

import { z } from 'zod';

// â”€â”€â”€ Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const FetchProxyRequestSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string()).optional().default({}),
  body: z.unknown().optional(),
  timeoutMs: z.number().min(100).max(30_000).default(10_000),
});

export type FetchProxyRequest = z.infer<typeof FetchProxyRequestSchema>;

export interface FetchProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
}

// â”€â”€â”€ Allowlist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Domains COMET is allowed to proxy through.
 * Add new domains here as needed.
 */
const ALLOWED_DOMAINS = [
  '127.0.0.1',      // NAS dispatch server
  'localhost',          // local dev
  '127.0.0.1',
  'api.perplexity.ai',
  'generativelanguage.googleapis.com',
  'us-central1-run.googleapis.com',
  'gitea.wholetout.media',
  'gitea.creative-liberation-engine.io',
];

function isAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// â”€â”€â”€ Core Function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Execute a proxied HTTP request on behalf of COMET browser.
 * Called by the MCP server when COMET invokes the `fetch_proxy` tool.
 */
export async function executeFetchProxy(
  input: FetchProxyRequest
): Promise<FetchProxyResponse> {
  const req = FetchProxyRequestSchema.parse(input);

  if (!isAllowed(req.url)) {
    throw new Error(
      `[fetch-proxy] Domain not in allowlist: ${new URL(req.url).hostname}. ` +
      `Add it to ALLOWED_DOMAINS in packages/mcp-router/src/fetch-proxy.ts`
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), req.timeoutMs);
  const start = Date.now();

  try {
    const res = await fetch(req.url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers,
      },
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      signal: controller.signal,
    });

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => { responseHeaders[k] = v; });

    let body: unknown;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    return {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
      body,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`[fetch-proxy] Request to ${req.url} timed out after ${req.timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// â”€â”€â”€ MCP Tool Definition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * MCP tool descriptor â€” consumed by the router to register this tool.
 */
export const fetchProxyTool = {
  name: 'fetch_proxy' as const,
  description:
    'Proxy an HTTP request through the AVERI gateway â€” resolves COMET browser API restrictions. ' +
    'Supports GET, POST, PUT, PATCH, DELETE to allowlisted domains only.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Target URL (must be in allowlist)' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'POST' },
      headers: { type: 'object', additionalProperties: { type: 'string' } },
      body: { description: 'Request body (will be JSON-serialized)' },
      timeoutMs: { type: 'number', default: 10000 },
    },
    required: ['url'],
  },
  handler: executeFetchProxy,
};
