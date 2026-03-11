/**
 * Cloud Mesh — Fly.io Adapter
 * Routes tasks to a Fly.io app — always-on, persistent daemon suitable
 * for long-running agent work that Cloudflare Workers can't handle.
 * @package cloud-mesh
 */

import type { CloudTarget } from '../types.js';

export interface FlyAdapterConfig {
  appName: string;
  region?: string;
  apiToken?: string;
}

export function buildFlyTarget(config: FlyAdapterConfig): CloudTarget {
  const region = config.region ?? 'iad'; // IAD = Ashburn, VA (closest to your NAS)
  const url = `https://${config.appName}.fly.dev`;

  return {
    id: `fly-${region}`,
    provider: 'fly',
    endpoint: `${url}/api/mesh/execute`,
    region,
    costPerInvocationUSD: 0.000015,   // Fly shared VMs: ~$1.94/mo for 256MB = $0.000015/req estimate
    avgLatencyMs: 80,
    maxConcurrent: 500,
    healthCheckUrl: `${url}/health`,
    authToken: config.apiToken,
    sovereign: false,
  };
}
