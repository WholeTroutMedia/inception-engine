/**
 * MCP Fetch Proxy â€” COMET P0 Fix
 * Allows COMET browser to POST to APIs via a local MCP bridge service.
 * Creative Liberation Engine v5.0.0 (GENESIS)
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ProxyRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface ProxyError {
  error: string;
  code: string;
  url?: string;
}

const ALLOWED_ORIGINS = [
  'http://localhost',
  'http://127.0.0.1',
  'http://127.0.0.1',
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin / no-opener
  return ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed));
}

export async function proxyFetch(req: ProxyRequest): Promise<ProxyResponse> {
  const { url, method = 'GET', headers = {}, body } = req;

  // Validate URL â€” only allow local sovereign stack
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw { error: 'Invalid URL', code: 'INVALID_URL', url } satisfies ProxyError;
  }

  const allowedHosts = ['localhost', '127.0.0.1', '127.0.0.1'];
  if (!allowedHosts.some((h) => parsed.hostname === h)) {
    throw {
      error: 'External URLs are not permitted through the fetch proxy',
      code: 'FORBIDDEN_HOST',
      url,
    } satisfies ProxyError;
  }

  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Proxy-Agent': 'inception-fetch-proxy/1.0',
    ...headers,
  };

  const fetchOptions: RequestInit = {
    method,
    headers: fetchHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(url, fetchOptions);
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  let responseBody: unknown;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  return {
    status: response.status,
    headers: responseHeaders,
    body: responseBody,
  };
}

export function createCORSHeaders(origin: string | undefined): Record<string, string> {
  const allowed = isOriginAllowed(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? (origin ?? '*') : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID',
    'Access-Control-Max-Age': '86400',
  };
}

export async function handleProxyRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const origin = req.headers.origin as string | undefined;
  const corsHeaders = createCORSHeaders(origin);

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let rawBody = '';
  for await (const chunk of req) {
    rawBody += chunk;
  }

  let proxyReq: ProxyRequest;
  try {
    proxyReq = JSON.parse(rawBody) as ProxyRequest;
  } catch {
    res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    return;
  }

  try {
    const result = await proxyFetch(proxyReq);
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (err) {
    const proxyErr = err as ProxyError;
    const statusCode = proxyErr.code === 'FORBIDDEN_HOST' ? 403 : 502;
    res.writeHead(statusCode, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(proxyErr));
  }
}
