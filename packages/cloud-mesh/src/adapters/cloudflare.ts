/**
 * Cloud Mesh — Cloudflare Workers Adapter
 * Routes tasks to a Cloudflare Worker endpoint — global edge, sub-50ms.
 * @package cloud-mesh
 */

import type { CloudTarget } from '../types.js';

export interface CloudflareAdapterConfig {
  workerUrl: string;
  apiToken?: string;
  /** Cloudflare account subdomain, e.g. "wholetrou" for wholetrou.workers.dev */
  accountSubdomain?: string;
}

export function buildCloudflareTarget(
  config: CloudflareAdapterConfig,
): CloudTarget {
  return {
    id: 'cloudflare-global',
    provider: 'cloudflare',
    endpoint: `${config.workerUrl}/execute`,
    costPerInvocationUSD: 0.0000003,  // CF Workers: ~$0.00000030/req after free tier
    avgLatencyMs: 40,                 // sub-50ms globally
    maxConcurrent: 100_000,           // CF handles this for us
    healthCheckUrl: `${config.workerUrl}/health`,
    authToken: config.apiToken,
    sovereign: false,
  };
}
