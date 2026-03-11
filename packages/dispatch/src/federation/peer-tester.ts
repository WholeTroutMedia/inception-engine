/**
 * Federation Peer Tester
 *
 * CLI utility to verify that a peer IE dispatch node is reachable
 * and responding correctly. Run this before registering a peer
 * to validate connectivity.
 *
 * Usage:
 *   npx tsx src/federation/peer-tester.ts <endpoint> [authToken]
 *
 * Example:
 *   npx tsx src/federation/peer-tester.ts https://ie.acme.com:5050 my-bearer-token
 */

import { registerPeer, getPeer, removePeer } from './peer-registry.js';

const [,, endpoint, authToken] = process.argv;

if (!endpoint) {
  console.error('Usage: peer-tester.ts <endpoint> [authToken]');
  process.exit(1);
}

async function testPeer(url: string, token?: string): Promise<void> {
  console.log(`\n🔬 Federation Peer Test`);
  console.log(`   Endpoint: ${url}`);
  console.log(`   Auth:     ${token ? '*** (provided)' : 'none'}`);
  console.log('');

  // Step 1 — Health check
  process.stdout.write('  [1/4] Health check ... ');
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(`${url}/health`, { signal: controller.signal, headers });
    clearTimeout(t);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const body = (await resp.json()) as Record<string, unknown>;
    console.log(`✅  ${body['status'] ?? 'ok'} (${body['service'] ?? 'unknown'})`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`❌  FAILED — ${msg}`);
    process.exit(1);
  }

  // Step 2 — Status check
  process.stdout.write('  [2/4] Status check ... ');
  let agentCount = 0;
  let queuedCount = 0;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(`${url}/api/status`, { signal: controller.signal, headers });
    clearTimeout(t);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const body = (await resp.json()) as { summary?: { total_agents?: number; queued?: number } };
    agentCount = body.summary?.total_agents ?? 0;
    queuedCount = body.summary?.queued ?? 0;
    console.log(`✅  ${agentCount} agents, ${queuedCount} queued tasks`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`⚠️   Status endpoint failed (non-fatal) — ${msg}`);
  }

  // Step 3 — Register as test peer (then immediately remove)
  process.stdout.write('  [3/4] Register/Remove test ... ');
  const testPeerObj = registerPeer({
    name: 'peer-test-probe',
    endpoint: url,
    authToken: token,
    capabilities: ['test'],
    workstreams: ['test'],
  });
  const fetched = getPeer(testPeerObj.peerId);
  const removed = removePeer(testPeerObj.peerId);
  if (fetched && removed) {
    console.log(`✅  Registry roundtrip OK (${testPeerObj.peerId})`);
  } else {
    console.log(`⚠️   Registry test incomplete`);
  }

  // Step 4 — Latency probe
  process.stdout.write('  [4/4] Latency probe ... ');
  const runs = 3;
  const latencies: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3000);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`${url}/health`, { signal: controller.signal, headers });
      clearTimeout(t);
      latencies.push(Date.now() - start);
    } catch {
      latencies.push(9999);
    }
  }
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const minL = Math.min(...latencies);
  console.log(`✅  avg ${avg}ms  min ${minL}ms  (${runs} pings)`);

  // Summary
  console.log('');
  console.log('─'.repeat(50));
  console.log('✅ PEER REACHABLE — ready to register');
  console.log('');
  console.log('   To register permanently, call:');
  console.log('   POST /api/federation/peer');
  console.log(`   { "name": "My Remote IE", "endpoint": "${url}"${token ? `, "authToken": "..."` : ''} }`);
  console.log('');
}

testPeer(endpoint, authToken).catch((err: unknown) => {
  console.error('[peer-tester] Fatal:', err);
  process.exit(1);
});
