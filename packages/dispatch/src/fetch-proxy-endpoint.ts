/**
 * @inception/dispatch â€” Fetch Proxy Endpoint
 * Helix-C wiring: Express endpoint that exposes the MCP fetch_proxy tool
 * as a REST endpoint on the NAS dispatch server.
 *
 * Route: POST /api/proxy/fetch
 * Used by COMET browser to bypass javascript: URL stripping restrictions.
 *
 * NOTE: fetch-proxy logic is inlined here (originally from @inception/mcp-router)
 * to keep the dispatch package self-contained for standalone Docker builds.
 */

import type { Request, Response, Router } from 'express';
import { z } from 'zod';

// â”€â”€â”€ Inlined from @inception/mcp-router/fetch-proxy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FetchProxyRequestSchema = z.object({
    url: z.string().url('Must be a valid URL'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
    headers: z.record(z.string()).optional().default({}),
    body: z.unknown().optional(),
    timeoutMs: z.number().min(100).max(30_000).default(10_000),
});

type FetchProxyRequest = z.infer<typeof FetchProxyRequestSchema>;

interface FetchProxyResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    durationMs: number;
}

const ALLOWED_DOMAINS = [
    '127.0.0.1',
    'localhost',
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
        return ALLOWED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
    } catch { return false; }
}

async function executeFetchProxy(input: FetchProxyRequest): Promise<FetchProxyResponse> {
    const req = FetchProxyRequestSchema.parse(input);
    if (!isAllowed(req.url)) {
        throw new Error(`[fetch-proxy] Domain not in allowlist: ${new URL(req.url).hostname}`);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs);
    const start = Date.now();
    try {
        const res = await fetch(req.url, {
            method: req.method,
            headers: { 'Content-Type': 'application/json', ...req.headers },
            body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
            signal: controller.signal,
        });
        const responseHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => { responseHeaders[k] = v; });
        const ct = res.headers.get('content-type') ?? '';
        const body: unknown = ct.includes('application/json') ? await res.json() : await res.text();
        return { status: res.status, statusText: res.statusText, headers: responseHeaders, body, durationMs: Date.now() - start };
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            throw new Error(`[fetch-proxy] Request to ${req.url} timed out after ${req.timeoutMs}ms`);
        }
        throw err;
    } finally { clearTimeout(timeout); }
}

// â”€â”€â”€ Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchProxyHandler(req: Request, res: Response): Promise<void> {
    const parseResult = FetchProxyRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
        res.status(400).json({ error: 'Invalid fetch proxy request', details: parseResult.error.flatten() });
        return;
    }
    try {
        const result = await executeFetchProxy(parseResult.data);
        res.status(200).json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isDomainError = message.includes('allowlist');
        res.status(isDomainError ? 403 : 502).json({ error: message, url: parseResult.data.url });
    }
}

// â”€â”€â”€ Route Registrar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function registerProxyRoutes(router: Router): Router {
    router.post('/proxy/fetch', fetchProxyHandler);
    return router;
}
