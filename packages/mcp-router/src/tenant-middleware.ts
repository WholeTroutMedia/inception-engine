/**
 * Tenant Router Middleware — Cloud Run HTTP Request Integration
 * Creative Liberation Engine v5.0.0 (GENESIS)
 *
 * Drop-in middleware for any Node.js HTTP server (express or http.createServer).
 * Extracts X-Tenant-ID, resolves tenant config, injects downstream headers.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  extractTenantId,
  resolveTenantService,
  buildTenantHeaders,
  type TenantRouteResult,
} from './tenant-router.js';

export interface TenantMiddlewareOptions {
  /** Cloud Run URL of the shared/fallback service */
  fallbackServiceUrl: string;
  /** Called after tenant is resolved — use to attach tenantId to your request context */
  onTenantResolved?: (result: TenantRouteResult, req: IncomingMessage) => void;
}

/**
 * Attach tenant context to a raw Node.js IncomingMessage.
 * Returns the resolved TenantRouteResult for use in downstream routing.
 */
export function applyTenantContext(
  req: IncomingMessage,
  opts: TenantMiddlewareOptions
): TenantRouteResult {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const tenantId = extractTenantId(headers);
  const result = resolveTenantService(tenantId, opts.fallbackServiceUrl);
  const outboundHeaders = buildTenantHeaders(headers, tenantId);

  // Attach resolved headers back onto the request object for proxy use
  (req as unknown as Record<string, unknown>)._tenantHeaders = outboundHeaders;
  (req as unknown as Record<string, unknown>)._tenantResult = result;

  opts.onTenantResolved?.(result, req);

  return result;
}

/**
 * Express-style middleware factory.
 * Usage: app.use(tenantMiddleware({ fallbackServiceUrl: '...' }))
 */
export function tenantMiddleware(opts: TenantMiddlewareOptions) {
  return function (
    req: IncomingMessage,
    _res: ServerResponse,
    next: () => void
  ): void {
    applyTenantContext(req, opts);
    next();
  };
}

export {
  extractTenantId,
  resolveTenantService,
  buildTenantHeaders,
  registerTenant,
  deriveServiceName,
  setTenantRegistry,
  getTenantRegistry,
  InMemoryTenantRegistry,
  type TenantConfig,
  type TenantRouteResult,
  type TenantRegistry,
} from './tenant-router.js';
