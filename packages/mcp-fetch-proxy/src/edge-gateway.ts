/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare MCP Edge Gateway — Creative Liberation Engine
 *
 * Global entry point for MCP requests. Deployed to 300+ Cloudflare PoPs.
 * Accepts MCP requests from any agent, authenticates via API key,
 * applies per-agent rate limiting, and forwards to sovereign dispatch.
 *
 * Deploy: `wrangler deploy`
 * Endpoint: https://inception-mcp-gateway.<your-subdomain>.workers.dev
 *
 * @package mcp-fetch-proxy
 */

// ─── Environment Bindings ─────────────────────────────────────────────────────

export interface Env {
  /** Cloudflare KV namespace for API key storage */
  API_KEYS: KVNamespace;
  /** Sovereign dispatch URL (via Cloudflare Tunnel) */
  DISPATCH_URL: string;
  /** GCP Cloud Run fallback URL */
  GENKIT_FALLBACK_URL: string;
  /** Shared secret for internal health checks */
  HEALTH_SECRET: string;
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000;   // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 1_000; // 1000 req/min per agent on free tier

class EdgeRateLimiter {
  private counts = new Map<string, { count: number; windowStart: number }>();

  isAllowed(agentId: string): boolean {
    const now = Date.now();
    const entry = this.counts.get(agentId);

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      this.counts.set(agentId, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    entry.count++;
    return true;
  }

  remaining(agentId: string): number {
    const entry = this.counts.get(agentId);
    if (!entry) return RATE_LIMIT_MAX_REQUESTS;
    return Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count);
  }
}

// Note: In production with Durable Objects this would be globally consistent.
// For Workers without DO, we use in-memory (per-isolate) rate limiting.
const rateLimiter = new EdgeRateLimiter();

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function authenticate(
  request: Request,
  env: Env,
): Promise<{ agentId: string } | null> {
  const apiKey = request.headers.get('X-IE-API-Key') ??
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!apiKey) return null;

  // KV lookup: key = API key, value = agentId
  const agentId = await env.API_KEYS.get(apiKey);
  if (!agentId) return null;

  return { agentId };
}

// ─── Dispatch Forwarding ─────────────────────────────────────────────────────

async function forwardToDispatch(
  request: Request,
  env: Env,
  agentId: string,
): Promise<Response> {
  const url = new URL(request.url);
  const body = await request.text();

  // Try sovereign dispatch first (via Cloudflare Tunnel)
  const dispatchUrl = `${env.DISPATCH_URL}${url.pathname}${url.search}`;

  try {
    const response = await fetch(dispatchUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-Agent': agentId,
        'X-IE-Edge': 'cloudflare',
      },
      body: request.method !== 'GET' ? body : undefined,
    });

    if (response.ok) {
      return addCorsHeaders(response);
    }
  } catch {
    // Sovereign dispatch unreachable — fall through to GCP
  }

  // Fallback: GCP Cloud Run Genkit
  try {
    const fallbackUrl = `${env.GENKIT_FALLBACK_URL}${url.pathname}${url.search}`;
    const response = await fetch(fallbackUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-Agent': agentId,
        'X-IE-Edge': 'cloudflare-fallback',
      },
      body: request.method !== 'GET' ? body : undefined,
    });

    return addCorsHeaders(response);
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Both sovereign dispatch and GCP fallback are unreachable',
        timestamp: new Date().toISOString(),
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-IE-API-Key, Authorization');
  return new Response(response.body, { status: response.status, headers });
}

// ─── Worker Entry Point ───────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-IE-API-Key, Authorization',
        },
      });
    }

    // Public health check (no auth required)
    if (url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        service: 'inception-mcp-gateway',
        timestamp: new Date().toISOString(),
        edge: 'cloudflare',
      });
    }

    // Authenticate
    const authResult = await authenticate(request, env);
    if (!authResult) {
      return Response.json(
        { error: 'Unauthorized — provide X-IE-API-Key header' },
        { status: 401 },
      );
    }

    const { agentId } = authResult;

    // Rate limit
    if (!rateLimiter.isAllowed(agentId)) {
      return Response.json(
        {
          error: 'Rate limit exceeded',
          retryAfterMs: RATE_LIMIT_WINDOW_MS,
          agentId,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + RATE_LIMIT_WINDOW_MS),
          },
        },
      );
    }

    // Add rate limit headers to successful responses
    const response = await forwardToDispatch(request, env, agentId);
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Remaining', String(rateLimiter.remaining(agentId)));
    headers.set('X-IE-Agent', agentId);

    return new Response(response.body, { status: response.status, headers });
  },
};
