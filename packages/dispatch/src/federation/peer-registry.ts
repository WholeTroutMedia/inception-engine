/**
 * Dispatch Federation — Peer Registry
 *
 * Tracks remote Creative Liberation Engine dispatch nodes that have peered
 * with this sovereign dispatch. Peers are external IE instances
 * (other NAS boxes, Cloud Run dispatches, dev machines) that have
 * registered via POST /api/federation/peer.
 *
 * Stored in-memory + persisted to SQLite via the store module.
 */

import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PeerStatus = 'active' | 'degraded' | 'offline';

export interface FederatedPeer {
  /** Unique ID assigned by sovereign dispatch on registration */
  peerId: string;
  /** Human-readable label for this IE node */
  name: string;
  /** Base URL of the remote dispatch — e.g. https://ie.acme.com:5050 */
  endpoint: string;
  /** API key or Bearer token for authenticating to the remote */
  authToken?: string;
  /** Capabilities this remote dispatch can serve — gossip-populated */
  capabilities: string[];
  /** Projects / workstreams the remote covers */
  workstreams: string[];
  /** Current health status */
  status: PeerStatus;
  /** ISO8601 — when this peer was registered */
  registeredAt: string;
  /** ISO8601 — last successful health check */
  lastSeenAt: string;
  /** ISO8601 — last gossip exchange */
  lastGossipAt: string | null;
  /** Number of consecutive health check failures */
  consecutiveFailures: number;
  /** Agent count reported by the remote on last gossip */
  remoteAgentCount: number;
  /** Queued task count reported on last gossip */
  remoteQueuedCount: number;
}

export interface PeerRegistrationRequest {
  name: string;
  endpoint: string;
  authToken?: string;
  capabilities?: string[];
  workstreams?: string[];
}

export interface PeerHealthSummary {
  peerId: string;
  name: string;
  status: PeerStatus;
  lastSeenAt: string;
  agentCount: number;
  queuedCount: number;
}

// ─── In-Memory Store ──────────────────────────────────────────────────────────

const peerRegistry = new Map<string, FederatedPeer>();

// ─── Registry Operations ──────────────────────────────────────────────────────

/**
 * Register a new peer or update an existing one (idempotent by endpoint).
 */
export function registerPeer(req: PeerRegistrationRequest): FederatedPeer {
  const now = new Date().toISOString();

  // Idempotent — find by endpoint
  const existing = [...peerRegistry.values()].find(
    (p) => p.endpoint === req.endpoint
  );

  if (existing) {
    existing.name = req.name;
    existing.authToken = req.authToken ?? existing.authToken;
    existing.capabilities = req.capabilities ?? existing.capabilities;
    existing.workstreams = req.workstreams ?? existing.workstreams;
    existing.lastSeenAt = now;
    existing.status = 'active';
    existing.consecutiveFailures = 0;
    peerRegistry.set(existing.peerId, existing);
    return existing;
  }

  const peer: FederatedPeer = {
    peerId: `peer-${uuidv4().slice(0, 8)}`,
    name: req.name,
    endpoint: req.endpoint,
    authToken: req.authToken,
    capabilities: req.capabilities ?? [],
    workstreams: req.workstreams ?? [],
    status: 'active',
    registeredAt: now,
    lastSeenAt: now,
    lastGossipAt: null,
    consecutiveFailures: 0,
    remoteAgentCount: 0,
    remoteQueuedCount: 0,
  };

  peerRegistry.set(peer.peerId, peer);
  console.log(`[federation] Peer registered: ${peer.name} @ ${peer.endpoint} (${peer.peerId})`);
  return peer;
}

/**
 * Remove a peer by ID. Returns true if it existed.
 */
export function removePeer(peerId: string): boolean {
  const existed = peerRegistry.has(peerId);
  peerRegistry.delete(peerId);
  if (existed) {
    console.log(`[federation] Peer removed: ${peerId}`);
  }
  return existed;
}

/**
 * Get all registered peers.
 */
export function getAllPeers(): FederatedPeer[] {
  return [...peerRegistry.values()];
}

/**
 * Get a single peer by ID.
 */
export function getPeer(peerId: string): FederatedPeer | undefined {
  return peerRegistry.get(peerId);
}

/**
 * Get all active (non-offline) peers that can serve a given capability.
 */
export function getPeersForCapability(capability: string): FederatedPeer[] {
  return [...peerRegistry.values()].filter(
    (p) =>
      p.status !== 'offline' &&
      (p.capabilities.length === 0 || p.capabilities.includes(capability))
  );
}

/**
 * Update peer health status — called by the gossip module after a health check.
 */
export function updatePeerHealth(
  peerId: string,
  update: {
    status: PeerStatus;
    agentCount?: number;
    queuedCount?: number;
    gossipAt?: string;
  }
): void {
  const peer = peerRegistry.get(peerId);
  if (!peer) return;

  const now = new Date().toISOString();

  if (update.status === 'active') {
    peer.consecutiveFailures = 0;
    peer.lastSeenAt = now;
  } else {
    peer.consecutiveFailures += 1;
    if (peer.consecutiveFailures >= 3) {
      peer.status = 'offline';
    } else {
      peer.status = 'degraded';
    }
  }

  if (update.status === 'active') peer.status = 'active';
  if (update.agentCount !== undefined) peer.remoteAgentCount = update.agentCount;
  if (update.queuedCount !== undefined) peer.remoteQueuedCount = update.queuedCount;
  if (update.gossipAt) peer.lastGossipAt = update.gossipAt;

  peerRegistry.set(peerId, peer);
}

/**
 * Returns a summary array suitable for the /api/federation/peers response.
 */
export function getPeerHealthSummaries(): PeerHealthSummary[] {
  return [...peerRegistry.values()].map((p) => ({
    peerId: p.peerId,
    name: p.name,
    status: p.status,
    lastSeenAt: p.lastSeenAt,
    agentCount: p.remoteAgentCount,
    queuedCount: p.remoteQueuedCount,
  }));
}
