/**
 * Federation Mesh Health Broadcaster
 *
 * Exports a function that, when called, pushes the current health
 * summary of all federated peers as an SSE event to all connected
 * browser console clients.
 *
 * Called automatically:
 *  - After every gossip cycle (from gossip.ts)
 *  - On-demand via GET /api/mesh-health (REST endpoint)
 *
 * Integrates with the dispatch server's broadcastEvent() function.
 */

import { getPeerHealthSummaries } from './peer-registry.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MeshHealthEvent {
  timestamp: string;
  totalPeers: number;
  activePeers: number;
  degradedPeers: number;
  offlinePeers: number;
  peers: ReturnType<typeof getPeerHealthSummaries>;
}

// ─── Broadcaster ─────────────────────────────────────────────────────────────

/** Build the current health snapshot */
export function buildMeshHealthSnapshot(): MeshHealthEvent {
  const peers = getPeerHealthSummaries();
  return {
    timestamp: new Date().toISOString(),
    totalPeers: peers.length,
    activePeers: peers.filter((p) => p.status === 'active').length,
    degradedPeers: peers.filter((p) => p.status === 'degraded').length,
    offlinePeers: peers.filter((p) => p.status === 'offline').length,
    peers,
  };
}

/**
 * Call this after every gossip cycle to push fresh health data
 * to all SSE clients. Pass in the broadcastEvent function from
 * the dispatch server to avoid circular imports.
 */
export function broadcastMeshHealth(
  broadcastFn: (event: string, data: unknown) => void
): void {
  const snapshot = buildMeshHealthSnapshot();
  if (snapshot.totalPeers > 0) {
    broadcastFn('mesh_health', snapshot);
  }
}
