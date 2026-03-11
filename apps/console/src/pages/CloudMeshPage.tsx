/**
 * CloudMeshPage — Sovereignty Dashboard
 * Wave 38 · Helix C
 *
 * Live view of all active cloud nodes in the @inception/cloud-mesh.
 * Shows per-cloud cost, latency, agent count, and one-click failover controls.
 * Polls /api/federation/peers for federated IE dispatch nodes.
 */

import { useState, useEffect, useCallback } from 'react';
import './CloudMeshPage.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type CloudStatus = 'active' | 'degraded' | 'offline';
type PeerStatus = 'active' | 'degraded' | 'offline';
type ComputeProvider = 'gcp' | 'cloudflare' | 'aws' | 'fly' | 'local' | 'none';

interface CloudNode {
  id: string;
  provider: 'gcp' | 'cloudflare' | 'aws' | 'fly' | 'local';
  label: string;
  status: CloudStatus;
  costPerInvocation: number;
  avgLatencyMs: number;
  jobsRouted: number;
  region?: string;
}

interface FederatedPeer {
  peerId: string;
  name: string;
  status: PeerStatus;
  lastSeenAt: string;
  agentCount: number;
  queuedCount: number;
}

interface ComputeCostSummary {
  totalJobsRun: number;
  totalCostUSD: number;
  avgCostPerJobUSD: number;
  avgLatencyMs: number;
  byProvider: Record<ComputeProvider, { jobs: number; costUSD: number }>;
}

// ─── Provider cost config (static — latency + status come from live health) ───

const COST_MAP: Record<string, number> = {
  'forge-sovereign': 0,
  'forge-cf-edge':   0.0000003,
  'forge-gcp':       0.000002,
  'forge-fly':       0.000015,
  'forge-aws':       0.0000002,
};

import { DISPATCH_URL, FORGE_URL } from '../config/env';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusColor: Record<CloudStatus | PeerStatus, string> = {
  active: '#22d3ee',
  degraded: '#f59e0b',
  offline: '#ef4444',
};

const providerIcon: Record<CloudNode['provider'], string> = {
  gcp: '☁',
  cloudflare: '⚡',
  aws: '△',
  fly: '✈',
  local: '⬡',
};

function formatCost(n: number): string {
  if (n === 0) return '$0';
  if (n < 0.0001) return `$${(n * 1_000_000).toFixed(2)}µ`;
  return `$${n.toFixed(6)}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ─── CloudNodeCard ────────────────────────────────────────────────────────────

function CloudNodeCard({ node, onFailover }: { node: CloudNode; onFailover: (id: string) => void }) {
  return (
    <div className={`cmesh-card cmesh-card--${node.status}`}>
      <div className="cmesh-card-header">
        <span className="cmesh-card-icon">{providerIcon[node.provider]}</span>
        <div>
          <div className="cmesh-card-label">{node.label}</div>
          {node.region && <div className="cmesh-card-region">{node.region}</div>}
        </div>
        <span
          className="cmesh-card-badge"
          style={{ color: statusColor[node.status] }}
        >
          ● {node.status.toUpperCase()}
        </span>
      </div>

      <div className="cmesh-card-metrics">
        <div className="cmesh-metric">
          <span className="cmesh-metric-label">Cost/req</span>
          <span className="cmesh-metric-value">{formatCost(node.costPerInvocation)}</span>
        </div>
        <div className="cmesh-metric">
          <span className="cmesh-metric-label">Avg latency</span>
          <span className="cmesh-metric-value">{node.avgLatencyMs}ms</span>
        </div>
        <div className="cmesh-metric">
          <span className="cmesh-metric-label">Jobs routed</span>
          <span className="cmesh-metric-value">{node.jobsRouted.toLocaleString()}</span>
        </div>
      </div>

      {node.status !== 'active' && (
        <button
          className="cmesh-failover-btn"
          onClick={() => onFailover(node.id)}
        >
          Force Failover →
        </button>
      )}
    </div>
  );
}

// ─── FederationRow ────────────────────────────────────────────────────────────

function FederationRow({ peer }: { peer: FederatedPeer }) {
  return (
    <div className="cmesh-fed-row">
      <span className="cmesh-fed-dot" style={{ color: statusColor[peer.status] }}>●</span>
      <span className="cmesh-fed-name">{peer.name}</span>
      <span className="cmesh-fed-agents">{peer.agentCount} agents</span>
      <span className="cmesh-fed-queued">{peer.queuedCount} queued</span>
      <span className="cmesh-fed-seen">{relativeTime(peer.lastSeenAt)}</span>
    </div>
  );
}

// ─── CloudMeshPage ────────────────────────────────────────────────────────────

export default function CloudMeshPage() {
  const [nodes, setNodes] = useState<CloudNode[]>([]);
  const [peers, setPeers] = useState<FederatedPeer[]>([]);
  const [costs, setCosts] = useState<ComputeCostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [peerForm, setPeerForm] = useState({ name: '', endpoint: '', authToken: '' });
  const [peerFormOpen, setPeerFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchMeshHealth = useCallback(async () => {
    try {
      const resp = await fetch(`${FORGE_URL}/api/mesh/health`);
      if (resp.ok) {
        const data = (await resp.json()) as {
          nodes: Array<{
            id: string; provider: string; label: string; region: string;
            status: CloudStatus; latencyMs: number | null;
          }>;
        };
        setNodes(
          data.nodes.map((n) => ({
            id: n.id,
            provider: n.provider as CloudNode['provider'],
            label: n.label,
            status: n.status,
            region: n.region,
            costPerInvocation: COST_MAP[n.id] ?? 0,
            avgLatencyMs: n.latencyMs ?? 9999,
            jobsRouted: 0,
          }))
        );
      }
    } catch {
      // FORGE offline — silently skip
    }
  }, []);

  const fetchPeers = useCallback(async () => {
    try {
      const resp = await fetch(`${DISPATCH_URL}/api/federation/peers`);
      if (resp.ok) {
        const data = (await resp.json()) as { peers: FederatedPeer[] };
        setPeers(data.peers ?? []);
      }
    } catch {
      // Server offline — silently skip
    }
  }, []);

  const fetchCosts = useCallback(async () => {
    try {
      const resp = await fetch(`${FORGE_URL}/cloud-costs`);
      if (resp.ok) {
        const data = (await resp.json()) as ComputeCostSummary;
        setCosts(data);
      }
    } catch {
      // FORGE offline — silently skip
    }
  }, []);

  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    void Promise.all([fetchMeshHealth(), fetchPeers(), fetchCosts()]).then(() => {
      setLoading(false);
      setLastRefresh(new Date());
    });
    const t = setInterval(() => {
      void fetchMeshHealth();
      void fetchPeers();
      setLastRefresh(new Date());
    }, 30_000);
    return () => clearInterval(t);
  }, [fetchMeshHealth, fetchPeers, fetchCosts]);

  // Real-time SSE: receive mesh_health pushes from dispatch server immediately
  // after gossip cycles or peer register/remove events
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        es = new EventSource(`${DISPATCH_URL}/sse`);
        es.onopen = () => setSseConnected(true);
        es.onerror = () => {
          setSseConnected(false);
          es?.close();
          // Auto-reconnect after 15s
          retryTimer = setTimeout(connect, 15_000);
        };
        es.addEventListener('mesh_health', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data as string) as {
              peers: FederatedPeer[];
            };
            if (Array.isArray(data.peers)) {
              setPeers(data.peers);
              setLastRefresh(new Date());
            }
          } catch { /* malformed event — skip */ }
        });
      } catch {
        // SSE not supported or CSP blocked — fall back to polling
      }
    };

    connect();
    return () => {
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
      setSseConnected(false);
    };
  }, []);


  const handleFailover = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, status: 'active' as CloudStatus } : n
      )
    );
  };

  const registerPeer = async () => {
    if (!peerForm.name || !peerForm.endpoint) return;
    setSaving(true);
    try {
      const resp = await fetch(`${DISPATCH_URL}/api/federation/peer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(peerForm),
      });
      if (resp.ok) {
        setPeerForm({ name: '', endpoint: '', authToken: '' });
        setPeerFormOpen(false);
        await fetchPeers();
      }
    } finally {
      setSaving(false);
    }
  };

  const activeCount = nodes.filter((n) => n.status === 'active').length;
  const activePeers = peers.filter((p) => p.status === 'active').length;

  return (
    <div className="cmesh-page">
      {/* Header */}
      <div className="cmesh-header">
        <div>
          <h1 className="cmesh-title">Cloud Mesh</h1>
          <p className="cmesh-subtitle">
            <span
              title={sseConnected ? 'Live SSE stream active' : 'Polling (SSE offline)'}
              style={{ color: sseConnected ? '#22d3ee' : '#475569', marginRight: 6, fontSize: '0.6rem' }}
            >
              ●
            </span>
            Sovereignty layer · {activeCount}/{nodes.length} providers online
            {peers.length > 0 && ` · ${activePeers}/${peers.length} peers`}
          </p>
        </div>
        <div className="cmesh-header-actions">
          <span className="cmesh-refresh-label">
            Refreshed {relativeTime(lastRefresh.toISOString())}
          </span>
          <button
            className="cmesh-btn"
            onClick={() => { void fetchMeshHealth(); void fetchPeers(); setLastRefresh(new Date()); }}
          >
            ↺ Refresh
          </button>
          <button
            className="cmesh-btn cmesh-btn--primary"
            onClick={() => setPeerFormOpen(true)}
          >
            + Peer Node
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="cmesh-summary">
        <div className="cmesh-summary-stat">
          <span className="cmesh-summary-val">{activeCount}</span>
          <span className="cmesh-summary-label">Active Providers</span>
        </div>
        <div className="cmesh-summary-stat">
          <span className="cmesh-summary-val">
            {formatCost(Math.min(...nodes.map((n) => n.costPerInvocation)))}
          </span>
          <span className="cmesh-summary-label">Cheapest Rate</span>
        </div>
        <div className="cmesh-summary-stat">
          <span className="cmesh-summary-val">
            {Math.min(...nodes.filter((n) => n.status === 'active').map((n) => n.avgLatencyMs))}ms
          </span>
          <span className="cmesh-summary-label">Best Latency</span>
        </div>
        <div className="cmesh-summary-stat">
          <span className="cmesh-summary-val">{activePeers}</span>
          <span className="cmesh-summary-label">Federated Peers</span>
        </div>
        {costs && (
          <>
            <div className="cmesh-summary-stat">
              <span className="cmesh-summary-val">{costs.totalJobsRun.toLocaleString()}</span>
              <span className="cmesh-summary-label">FORGE Jobs</span>
            </div>
            <div className="cmesh-summary-stat">
              <span className="cmesh-summary-val">${costs.totalCostUSD.toFixed(6)}</span>
              <span className="cmesh-summary-label">Total Compute Cost</span>
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div className="cmesh-loading">Connecting to mesh…</div>
      ) : (
        <>
          {/* Cloud provider grid */}
          <div className="cmesh-section-label">CLOUD PROVIDERS</div>
          <div className="cmesh-grid">
            {nodes.map((node) => (
              <CloudNodeCard key={node.id} node={node} onFailover={handleFailover} />
            ))}
          </div>

          {/* Compute cost breakdown from FORGE */}
          {costs && (
            <>
              <div className="cmesh-section-label" style={{ marginTop: '2rem' }}>FORGE COMPUTE SPEND</div>
              <div className="cmesh-grid">
                {(Object.entries(costs.byProvider) as [string, { jobs: number; costUSD: number }][]).filter(
                  ([, v]) => v.jobs > 0
                ).map(([provider, stat]) => (
                  <div key={provider} className="cmesh-card">
                    <div className="cmesh-card-header">
                      <span className="cmesh-card-icon">{(providerIcon as Record<string, string>)[provider] ?? '◎'}</span>
                      <div className="cmesh-card-label" style={{ textTransform: 'capitalize' }}>{provider}</div>
                    </div>
                    <div className="cmesh-card-metrics">
                      <div className="cmesh-metric">
                        <span className="cmesh-metric-label">Jobs</span>
                        <span className="cmesh-metric-value">{stat.jobs}</span>
                      </div>
                      <div className="cmesh-metric">
                        <span className="cmesh-metric-label">Total Cost</span>
                        <span className="cmesh-metric-value">${stat.costUSD.toFixed(8)}</span>
                      </div>
                      <div className="cmesh-metric">
                        <span className="cmesh-metric-label">Avg/Job</span>
                        <span className="cmesh-metric-value">{stat.jobs > 0 ? formatCost(stat.costUSD / stat.jobs) : '$0'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Federation peers */}
          <div className="cmesh-section-label" style={{ marginTop: '2rem' }}>
            FEDERATED IE NODES
          </div>
          {peers.length === 0 ? (
            <div className="cmesh-empty">
              No peer nodes registered yet. Click <strong>+ Peer Node</strong> to add an external IE dispatch.
            </div>
          ) : (
            <div className="cmesh-fed-list">
              {peers.map((peer) => (
                <FederationRow key={peer.peerId} peer={peer} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add peer modal */}
      {peerFormOpen && (
        <div className="cmesh-modal-backdrop" onClick={() => setPeerFormOpen(false)}>
          <div className="cmesh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cmesh-modal-title">Register Peer IE Node</div>
            <label className="cmesh-label">Display name</label>
            <input
              className="cmesh-input"
              value={peerForm.name}
              onChange={(e) => setPeerForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Acme IE — Amsterdam"
            />
            <label className="cmesh-label">Dispatch endpoint</label>
            <input
              className="cmesh-input"
              value={peerForm.endpoint}
              onChange={(e) => setPeerForm((f) => ({ ...f, endpoint: e.target.value }))}
              placeholder="https://ie.acme.com:5050"
            />
            <label className="cmesh-label">Auth token (optional)</label>
            <input
              className="cmesh-input"
              type="password"
              value={peerForm.authToken}
              onChange={(e) => setPeerForm((f) => ({ ...f, authToken: e.target.value }))}
              placeholder="Bearer token"
            />
            <div className="cmesh-modal-actions">
              <button className="cmesh-btn" onClick={() => setPeerFormOpen(false)}>Cancel</button>
              <button
                className="cmesh-btn cmesh-btn--primary"
                onClick={() => void registerPeer()}
                disabled={saving}
              >
                {saving ? 'Registering…' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
