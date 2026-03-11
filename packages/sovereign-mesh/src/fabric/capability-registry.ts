import type { Tier } from '../schema/index.js';

// ─── Sovereign Fabric — Capability Registry ────────────────────────────────────
// Each compute tier declares what it's capable of.
// The Fabric Router reads the registry to decide WHERE to run any given task.
//
// Capabilities are named strings grouped by tier.
// Tasks declare required capabilities; the router finds the best matching tier.

// ── Capability definitions ────────────────────────────────────────────────────
export type Capability =
  | 'gpu_render'        // RTX GPU — image/video generation, ML inference
  | 'gpu_inference'     // GPU ML inference (faster than CPU by ~20x)
  | 'cpu_heavy'         // High-core-count CPU tasks (32-thread compile, etc.)
  | 'local_storage'     // Fast NVMe write (4TB WD Black)
  | 'docker_host'       // Run Docker containers
  | 'nas_storage'       // Large bulk storage (NAS volumes, media library)
  | 'nas_indexing'      // File indexing on NAS shares
  | 'redis_host'        // Redis server (NAS primary)
  | 'public_egress'     // Serve HTTP to the public internet
  | 'public_auth'       // Handle auth for external users (Firebase)
  | 'cron_host'         // Scheduled job execution
  | 'genkit_flow'       // Run Genkit AI flows
  | 'git_host'          // Self-hosted Git (Forgejo on NAS)
  | 'browser_control'   // Browser automation (workstation)
  | 'low_latency'       // Sub-10ms local response time
  | 'always_on'         // Available 24/7 (NAS stays on)
  | 'global_cdn'        // Globally distributed delivery (Firebase Hosting/GCS)
  | 'serverless_scale'; // Auto-scale to handle burst traffic (Cloud Run)

// ── Tier capability declarations ──────────────────────────────────────────────
export const TIER_CAPABILITIES: Record<Tier, Capability[]> = {
  workstation: [
    'gpu_render',
    'gpu_inference',
    'cpu_heavy',
    'local_storage',
    'browser_control',
    'low_latency',
    'genkit_flow',      // local Genkit dev server
  ],
  nas: [
    'docker_host',
    'nas_storage',
    'nas_indexing',
    'redis_host',
    'cron_host',
    'git_host',
    'always_on',
    'genkit_flow',      // NAS Genkit production server
  ],
  gcp: [
    'public_egress',
    'public_auth',
    'global_cdn',
    'serverless_scale',
    'genkit_flow',      // Cloud Run Genkit
  ],
  mobile: [],           // Mobile tier: consumer only, no hosting capabilities
};

// ── Task capability requirements ──────────────────────────────────────────────
export interface FabricTask {
  id: string;
  label: string;
  requires: Capability[];
  prefers?: Capability[];   // Nice-to-have — breaks ties
  payload: unknown;
}

// ── Capability lookup helpers ─────────────────────────────────────────────────
export function getTierCapabilities(tier: Tier): Set<Capability> {
  return new Set(TIER_CAPABILITIES[tier]);
}

export function tierHasCapability(tier: Tier, cap: Capability): boolean {
  return TIER_CAPABILITIES[tier].includes(cap);
}

export function getCapableTiers(required: Capability[]): Tier[] {
  return (['workstation', 'nas', 'gcp', 'mobile'] as Tier[]).filter(tier =>
    required.every(cap => tierHasCapability(tier, cap))
  );
}

// ── Capability cost model (lower = prefer this tier for this capability) ──────
// Used for tie-breaking when multiple tiers can handle a task.
const TIER_COST: Record<Tier, number> = {
  workstation: 1,   // lowest cost — owned hardware, no metering
  nas: 2,           // low cost — owned hardware, always on
  gcp: 10,          // higher cost — metered, billed per use
  mobile: 99,       // don't route tasks to mobile
};

export function cheapestCapableTier(required: Capability[]): Tier | null {
  const capable = getCapableTiers(required);
  if (capable.length === 0) return null;
  return capable.sort((a, b) => TIER_COST[a] - TIER_COST[b])[0];
}
