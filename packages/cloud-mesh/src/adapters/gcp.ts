/**
 * Cloud Mesh — GCP Cloud Run Adapter
 * Routes tasks to a Google Cloud Run service via OIDC-authenticated HTTP.
 * @package cloud-mesh
 */

import type { CloudTarget } from '../types.js';

export interface GcpAdapterConfig {
  serviceUrl: string;
  projectId: string;
  region: string;
  /** GCP service account access token — injected at runtime from metadata server */
  accessToken?: string;
}

export function buildGcpTarget(config: GcpAdapterConfig): CloudTarget {
  return {
    id: `gcp-${config.region}`,
    provider: 'gcp',
    endpoint: `${config.serviceUrl}/api/mesh/execute`,
    region: config.region,
    costPerInvocationUSD: 0.000002,   // GCP Cloud Run: ~$0.000002/request
    avgLatencyMs: 250,
    maxConcurrent: 1000,
    healthCheckUrl: `${config.serviceUrl}/health`,
    authToken: config.accessToken,
    sovereign: false,
  };
}

/** Fetch a GCP access token from the Cloud Run metadata server (when running on GCP) */
export async function fetchGcpAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' } },
    );
    if (!res.ok) return null;
    const data = await res.json() as { access_token: string };
    return data.access_token;
  } catch {
    return null;
  }
}
