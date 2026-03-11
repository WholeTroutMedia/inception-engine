/**
 * Dispatch Federation — Gossip Protocol
 *
 * Periodically polls registered peers for their health status and
 * capability/queue metrics. Uses a lightweight REST ping against
 * each peer's /api/status endpoint. Updates the peer-registry
 * with fresh data.
 *
 * Gossip interval: 30 seconds (configurable).
 * Failure threshold: 3 consecutive failures → mark offline.
 */

import {
  getAllPeers,
  updatePeerHealth,
  type PeerStatus,
} from './peer-registry.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GossipConfig {
  /** How often to poll peers in milliseconds. Default: 30_000 */
  intervalMs?: number;
  /** HTTP request timeout in milliseconds. Default: 5_000 */
  timeoutMs?: number;
}

export interface RemoteStatusSnapshot {
  summary: {
    queued: number;
    active: number;
    total_agents: number;
  };
  active_agents: Array<{ agent_id: string; capabilities?: string[] }>;
}

// ─── Gossip Worker ────────────────────────────────────────────────────────────

export class FederationGossip {
  private readonly intervalMs: number;
  private readonly timeoutMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  /** Optional callback invoked after each gossip cycle completes. */
  onCycleComplete?: () => void;

  constructor(config: GossipConfig = {}) {
    this.intervalMs = config.intervalMs ?? 30_000;
    this.timeoutMs = config.timeoutMs ?? 5_000;
  }

  /** Start the gossip loop. Idempotent. */
  start(): void {
    if (this.running) return;
    this.running = true;
    console.log(
      `[gossip] Started — polling ${this.intervalMs / 1000}s interval`
    );
    // Run immediately, then schedule
    void this.runCycle();
    this.timer = setInterval(() => void this.runCycle(), this.intervalMs);
  }

  /** Stop the gossip loop. */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[gossip] Stopped');
  }

  /** Run one gossip cycle — ping all registered peers. */
  private async runCycle(): Promise<void> {
    const peers = getAllPeers();
    if (peers.length === 0) return;

    const now = new Date().toISOString();
    console.log(`[gossip] Cycle — pinging ${peers.length} peer(s)`);

    await Promise.allSettled(
      peers.map(async (peer) => {
        const url = `${peer.endpoint}/api/status`;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            this.timeoutMs
          );

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (peer.authToken) {
            headers['Authorization'] = `Bearer ${peer.authToken}`;
          }

          const resp = await fetch(url, {
            signal: controller.signal,
            headers,
          });
          clearTimeout(timeoutId);

          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
          }

          const data = (await resp.json()) as RemoteStatusSnapshot;
          const agentCount = data.summary?.total_agents ?? 0;
          const queuedCount = data.summary?.queued ?? 0;

          updatePeerHealth(peer.peerId, {
            status: 'active' as PeerStatus,
            agentCount,
            queuedCount,
            gossipAt: now,
          });

          console.log(
            `[gossip] ✅ ${peer.name} — agents:${agentCount} queued:${queuedCount}`
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          updatePeerHealth(peer.peerId, {
            status: 'degraded' as PeerStatus,
          });
          console.warn(
            `[gossip] ⚠️  ${peer.name} unreachable: ${message}`
          );
        }
      })
    );

    // Notify caller (e.g. SSE broadcast) that cycle is complete
    try { this.onCycleComplete?.(); } catch { /* ok */ }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let gossipInstance: FederationGossip | null = null;

/**
 * Get or create the singleton gossip worker.
 * Call startGossip() once at server boot after registering peers.
 */
export function getGossip(config?: GossipConfig): FederationGossip {
  if (!gossipInstance) {
    gossipInstance = new FederationGossip(config);
  }
  return gossipInstance;
}

export function startGossip(config?: GossipConfig): FederationGossip {
  const g = getGossip(config);
  g.start();
  return g;
}

export function stopGossip(): void {
  gossipInstance?.stop();
}
