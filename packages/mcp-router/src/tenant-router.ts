/**
 * Tenant Router — Multi-Tenant Cloud Run Architecture
 * Creative Liberation Engine v5.0.0 (GENESIS)
 *
 * Implements tenant-aware request routing via X-Tenant-ID header.
 * Pattern: service-per-tenant (lightweight) for v5 launch.
 * Upgrade path: project-per-tenant for strict GCP isolation.
 */

export interface TenantConfig {
  tenantId: string;
  /** Firebase UID or org slug */
  ownerId: string;
  /** Cloud Run service URL for this tenant */
  serviceUrl: string;
  /** Tier determines resource limits */
  tier: 'studio' | 'client' | 'merch';
  /** Whether this tenant has isolated Cloud Run project */
  isolated: boolean;
}

export interface TenantRouteResult {
  tenantId: string;
  serviceUrl: string;
  config: TenantConfig;
}

export interface TenantRegistry {
  get(tenantId: string): TenantConfig | undefined;
  set(tenantId: string, config: TenantConfig): void;
  list(): TenantConfig[];
}

/**
 * In-memory tenant registry — swap for AlloyDB/Firestore in production.
 */
export class InMemoryTenantRegistry implements TenantRegistry {
  private store = new Map<string, TenantConfig>();

  get(tenantId: string): TenantConfig | undefined {
    return this.store.get(tenantId);
  }

  set(tenantId: string, config: TenantConfig): void {
    this.store.set(tenantId, config);
  }

  list(): TenantConfig[] {
    return Array.from(this.store.values());
  }
}

/** Default registry singleton — replaced at runtime via `setTenantRegistry()` */
let _registry: TenantRegistry = new InMemoryTenantRegistry();

export function setTenantRegistry(registry: TenantRegistry): void {
  _registry = registry;
}

export function getTenantRegistry(): TenantRegistry {
  return _registry;
}

/**
 * Resolve the Cloud Run service URL for a given tenant.
 * Falls back to the shared platform service if no isolated tenant service is registered.
 */
export function resolveTenantService(
  tenantId: string,
  fallbackUrl: string
): TenantRouteResult {
  const config = _registry.get(tenantId);

  if (!config) {
    // Auto-create ephemeral config using fallback (shared service)
    const ephemeral: TenantConfig = {
      tenantId,
      ownerId: tenantId,
      serviceUrl: fallbackUrl,
      tier: 'client',
      isolated: false,
    };
    return { tenantId, serviceUrl: fallbackUrl, config: ephemeral };
  }

  return { tenantId, serviceUrl: config.serviceUrl, config };
}

/**
 * Extract X-Tenant-ID from request headers.
 * In order of precedence: header → JWT sub → 'default'
 */
export function extractTenantId(
  headers: Record<string, string | string[] | undefined>
): string {
  const headerVal = headers['x-tenant-id'];
  if (typeof headerVal === 'string' && headerVal.trim()) {
    return headerVal.trim();
  }
  if (Array.isArray(headerVal) && headerVal.length > 0) {
    return headerVal[0];
  }
  return 'default';
}

/**
 * Build the outbound headers for a proxied tenant request.
 * Strips hop-by-hop headers and injects tenant identity.
 */
export function buildTenantHeaders(
  original: Record<string, string | string[] | undefined>,
  tenantId: string
): Record<string, string> {
  const HOP_BY_HOP = new Set([
    'connection', 'keep-alive', 'proxy-authenticate',
    'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade',
  ]);

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(original)) {
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    if (typeof value === 'string') out[key] = value;
    else if (Array.isArray(value)) out[key] = value.join(', ');
  }

  // Inject tenant identity
  out['x-tenant-id'] = tenantId;
  out['x-forwarded-by'] = 'inception-tenant-router/1.0';

  return out;
}

/**
 * Register a new tenant with an isolated Cloud Run service URL.
 * Call this during tenant provisioning (e.g., after Firebase user creation).
 */
export function registerTenant(config: TenantConfig): void {
  _registry.set(config.tenantId, config);
}

/**
 * Derive the Cloud Run service name for a given tenant.
 * Format: ie-{tier}-{tenantId-truncated}
 */
export function deriveServiceName(tenantId: string, tier: TenantConfig['tier']): string {
  const slug = tenantId.replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 20);
  return `ie-${tier}-${slug}`;
}
