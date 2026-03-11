/**
 * Federation Peer Registry — Unit Tests
 *
 * Tests in-memory peer tracking: registration, retrieval,
 * health updates, capability filtering, and removal.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  registerPeer,
  removePeer,
  getPeer,
  getAllPeers,
  getPeersForCapability,
  updatePeerHealth,
  getPeerHealthSummaries,
} from '../federation/peer-registry.js';

// Registry is a module-level Map; clean up peers added in each test
let registeredIds: string[] = [];
function cleanUp() {
  for (const id of registeredIds) removePeer(id);
  registeredIds = [];
}

describe('peer-registry', () => {
  beforeEach(() => {
    cleanUp();
  });

  it('registers a peer and returns it with a generated peerId', () => {
    const peer = registerPeer({ name: 'Node Alpha', endpoint: 'https://alpha.example.com' });
    registeredIds.push(peer.peerId);

    expect(peer.peerId).toBeTruthy();
    expect(peer.name).toBe('Node Alpha');
    expect(peer.endpoint).toBe('https://alpha.example.com');
    expect(peer.status).toBe('active');
    expect(peer.consecutiveFailures).toBe(0);
  });

  it('getPeer retrieves registered peer by id', () => {
    const original = registerPeer({ name: 'Node Beta', endpoint: 'https://beta.example.com' });
    registeredIds.push(original.peerId);

    const fetched = getPeer(original.peerId);
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('Node Beta');
  });

  it('getPeer returns undefined for unknown id', () => {
    expect(getPeer('nonexistent-id')).toBeUndefined();
  });

  it('getAllPeers includes newly registered peers', () => {
    const a = registerPeer({ name: 'A', endpoint: 'https://a.example.com' });
    const b = registerPeer({ name: 'B', endpoint: 'https://b.example.com' });
    registeredIds.push(a.peerId, b.peerId);

    const all = getAllPeers();
    const ids = all.map((p) => p.peerId);
    expect(ids).toContain(a.peerId);
    expect(ids).toContain(b.peerId);
  });

  it('removePeer returns true and removes the peer', () => {
    const peer = registerPeer({ name: 'Temp', endpoint: 'https://temp.example.com' });
    const existed = removePeer(peer.peerId);
    expect(existed).toBe(true);
    expect(getPeer(peer.peerId)).toBeUndefined();
  });

  it('removePeer returns false for unknown id', () => {
    expect(removePeer('ghost-id')).toBe(false);
  });

  it('updatePeerHealth degraded increments consecutiveFailures', () => {
    const peer = registerPeer({ name: 'Node D', endpoint: 'https://d.example.com' });
    registeredIds.push(peer.peerId);

    updatePeerHealth(peer.peerId, { status: 'degraded' });
    const after1 = getPeer(peer.peerId);
    expect(after1?.consecutiveFailures).toBe(1);
    expect(after1?.status).toBe('degraded');

    // Recovery — active resets consecutive failures
    updatePeerHealth(peer.peerId, { status: 'active', agentCount: 1 });
    const recovered = getPeer(peer.peerId);
    expect(recovered?.status).toBe('active');
    expect(recovered?.consecutiveFailures).toBe(0);
  });

  it('updatePeerHealth marks offline after 3 consecutive failures', () => {
    const peer = registerPeer({ name: 'Node E', endpoint: 'https://e.example.com' });
    registeredIds.push(peer.peerId);

    for (let i = 0; i < 3; i++) {
      updatePeerHealth(peer.peerId, { status: 'degraded' });
    }
    const after3 = getPeer(peer.peerId);
    expect(after3?.status).toBe('offline');
    expect(after3?.consecutiveFailures).toBe(3);
  });

  it('updatePeerHealth updates agentCount and queuedCount', () => {
    const peer = registerPeer({ name: 'Node C', endpoint: 'https://c.example.com' });
    registeredIds.push(peer.peerId);

    updatePeerHealth(peer.peerId, { status: 'active', agentCount: 5, queuedCount: 12 });
    const updated = getPeer(peer.peerId);
    expect(updated?.remoteAgentCount).toBe(5);
    expect(updated?.remoteQueuedCount).toBe(12);
  });

  it('getPeersForCapability filters by capability', () => {
    const a = registerPeer({ name: 'A', endpoint: 'https://a.example.com', capabilities: ['forge', 'dispatch'] });
    const b = registerPeer({ name: 'B', endpoint: 'https://b.example.com', capabilities: ['dispatch'] });
    registeredIds.push(a.peerId, b.peerId);

    const forgeOnly = getPeersForCapability('forge');
    const ids = forgeOnly.map((p) => p.peerId);
    expect(ids).toContain(a.peerId);
    expect(ids).not.toContain(b.peerId);
  });

  it('getPeerHealthSummaries omits authToken', () => {
    const peer = registerPeer({
      name: 'Secure',
      endpoint: 'https://secure.example.com',
      authToken: 'super-secret-token',
    });
    registeredIds.push(peer.peerId);

    const summaries = getPeerHealthSummaries();
    const found = summaries.find((s) => s.peerId === peer.peerId);
    expect(found).toBeDefined();
    expect(JSON.stringify(found)).not.toContain('super-secret-token');
  });
});
