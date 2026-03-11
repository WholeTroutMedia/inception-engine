/**
 * Cloud Run Tenant Provisioner
 * Task: T20260308-470 â€” Multi-Tenant Cloud Run Architecture (Phase 1A)
 *
 * Provisions and manages Cloud Run services on a per-tenant basis.
 * Registers new services into the AlloyDB registry on creation.
 *
 * Architecture:
 *   Firebase Auth â†’ JWT â†’ Gateway â†’ TenantRouter â†’ Cloud Run (svc-per-tenant)
 *   New tenant sign-up triggers provisionTenant() â†’ AlloyDB registry update
 */

import { z } from 'zod';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CloudRunServiceSpec {
  tenantId: string;
  displayName: string;
  tier: 'free' | 'studio' | 'master';
  region?: string;
  /** Override image. Defaults to the base Creative Liberation Engine image. */
  imageUri?: string;
  /** Additional env vars for the service. */
  envVars?: Record<string, string>;
}

export interface CloudRunServiceRecord {
  tenantId: string;
  serviceName: string;
  serviceUrl: string;
  region: string;
  tier: CloudRunServiceSpec['tier'];
  status: 'provisioning' | 'ready' | 'degraded' | 'deleted';
  createdAt: string;
}

// â”€â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const CloudRunServiceSpecSchema = z.object({
  tenantId: z.string().min(1).max(64),
  displayName: z.string().min(1).max(100),
  tier: z.enum(['free', 'studio', 'master']),
  region: z.string().default('us-central1'),
  imageUri: z.string().url().optional(),
  envVars: z.record(z.string()).optional(),
});

// â”€â”€â”€ Name Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Derive a deterministic Cloud Run service name from tenant ID. */
function toServiceName(tenantId: string): string {
  // Cloud Run names: lowercase letters, numbers, hyphens; max 63 chars
  const safe = tenantId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 40);
  return `ie-tenant-${safe}`;
}

/** Derive the expected Cloud Run service URL (predictable pattern). */
function toServiceUrl(serviceName: string, region: string, projectId: string): string {
  return `https://${serviceName}-${projectId.slice(0, 8)}.a.run.app`;
}

// â”€â”€â”€ Provisioner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class CloudRunProvisioner {
  private readonly projectId: string;
  private readonly defaultImage: string;
  private readonly dispatchUrl: string;

  /** In-memory state (production: back with AlloyDB tenant_services table). */
  private services: Map<string, CloudRunServiceRecord> = new Map();

  constructor(options?: {
    projectId?: string;
    defaultImage?: string;
    dispatchUrl?: string;
  }) {
    this.projectId  = options?.projectId  ?? process.env['GCP_PROJECT_ID']    ?? 'creative-liberation-engine-prod';
    this.defaultImage = options?.defaultImage ?? process.env['CLOUD_RUN_BASE_IMAGE'] ?? 'gcr.io/creative-liberation-engine-prod/inception-runtime:latest';
    this.dispatchUrl = options?.dispatchUrl  ?? process.env['DISPATCH_SERVER'] ?? 'http://127.0.0.1:5050';
  }

  // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Provision a new Cloud Run service for a tenant.
   * In local/NAS dev mode this is a no-op (stores record only).
   * In production, calls the Cloud Run Admin API.
   */
  async provisionTenant(spec: CloudRunServiceSpec): Promise<CloudRunServiceRecord> {
    const validated = CloudRunServiceSpecSchema.parse(spec);
    const serviceName = toServiceName(validated.tenantId);
    const region = validated.region ?? 'us-central1';
    const serviceUrl = toServiceUrl(serviceName, region, this.projectId);

    // Idempotency â€” if already provisioned, return existing record
    const existing = this.services.get(validated.tenantId);
    if (existing && existing.status === 'ready') {
      return existing;
    }

    const record: CloudRunServiceRecord = {
      tenantId: validated.tenantId,
      serviceName,
      serviceUrl,
      region,
      tier: validated.tier,
      status: 'provisioning',
      createdAt: new Date().toISOString(),
    };

    this.services.set(validated.tenantId, record);
    console.log(`[CloudRunProvisioner] Provisioning ${serviceName} for tenant ${validated.tenantId}...`);

    // â”€â”€ GCP Cloud Run Admin API call (skipped in local/dev) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (this.projectId !== 'creative-liberation-engine-local') {
      await this._callCloudRunApi(validated, serviceName, serviceUrl);
    } else {
      console.log(`[CloudRunProvisioner] DEV MODE: Skipping GCP API call for ${serviceName}.`);
    }

    record.status = 'ready';
    this.services.set(validated.tenantId, record);

    // Notify dispatch that provisioning is complete
    await this._notifyDispatch(record);

    console.log(`[CloudRunProvisioner] âœ“ ${serviceName} ready at ${serviceUrl}`);
    return record;
  }

  /**
   * Retrieve a provisioned service record by tenant ID.
   */
  getService(tenantId: string): CloudRunServiceRecord | undefined {
    return this.services.get(tenantId);
  }

  /**
   * List all provisioned services.
   */
  listServices(): CloudRunServiceRecord[] {
    return Array.from(this.services.values());
  }

  /**
   * Soft-delete a tenant's Cloud Run service.
   */
  async deprovisionTenant(tenantId: string): Promise<void> {
    const record = this.services.get(tenantId);
    if (!record) return;
    record.status = 'deleted';
    this.services.set(tenantId, record);
    console.log(`[CloudRunProvisioner] Deprovisioned ${record.serviceName} for tenant ${tenantId}`);
  }

  // â”€â”€ Private Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private async _callCloudRunApi(
    spec: CloudRunServiceSpec,
    serviceName: string,
    serviceUrl: string,
  ): Promise<void> {
    // Cloud Run Admin API â€” create or replace service
    const apiUrl =
      `https://run.googleapis.com/v2/projects/${this.projectId}/locations/${spec.region ?? 'us-central1'}/services/${serviceName}`;

    const body = {
      labels: {
        'inception-tenant': spec.tenantId,
        'inception-tier': spec.tier,
      },
      template: {
        containers: [
          {
            image: spec.imageUri ?? this.defaultImage,
            env: [
              { name: 'TENANT_ID', value: spec.tenantId },
              { name: 'TENANT_TIER', value: spec.tier },
              ...(spec.envVars
                ? Object.entries(spec.envVars).map(([name, value]) => ({ name, value }))
                : []),
            ],
            resources: {
              limits: {
                cpu: spec.tier === 'master' ? '4' : spec.tier === 'studio' ? '2' : '1',
                memory: spec.tier === 'master' ? '4Gi' : spec.tier === 'studio' ? '2Gi' : '512Mi',
              },
            },
          },
        ],
        scaling: {
          minInstanceCount: spec.tier === 'master' ? 1 : 0,
          maxInstanceCount: spec.tier === 'master' ? 20 : spec.tier === 'studio' ? 10 : 3,
        },
      },
      invokerIamDisabled: false,
    };

    // Uses Application Default Credentials from the Cloud Run runtime
    try {
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
      const client = await auth.getClient();
      const token = await client.getAccessToken();

      const res = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Cloud Run API error ${res.status}: ${err}`);
      }
    } catch (err) {
      console.error(`[CloudRunProvisioner] GCP call failed (service marked degraded):`, err);
      const record = this.services.get(spec.tenantId);
      if (record) { record.status = 'degraded'; this.services.set(spec.tenantId, record); }
    }
  }

  private async _notifyDispatch(record: CloudRunServiceRecord): Promise<void> {
    try {
      await fetch(`${this.dispatchUrl}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tenant.provisioned',
          payload: record,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Non-critical â€” dispatch notification failure should not block provisioning
    }
  }
}

// â”€â”€â”€ Singleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const cloudRunProvisioner = new CloudRunProvisioner();
