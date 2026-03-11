/**
 * apps/console/src/pages/CampaignControl.tsx
 * Console Campaign Control — real-time campaign status, provider health, creative metrics
 * The OS self-awareness layer — see every campaign in every phase, live
 */

import { useState, useEffect, useCallback } from 'react';
import { useServiceHealth, type ServiceDef } from '../hooks/useServiceHealth';
import './CampaignControl.css';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (inline to avoid import chain issues)
// ─────────────────────────────────────────────────────────────────────────────

interface CampaignSummary {
    id: string;
    project_name: string;
    client_id: string;
    status: string;
    assets_produced: number;
    compass_score: number | null;
    created_at: string;
    updated_at: string;
}

interface CampaignStatus {
    campaign_id: string;
    project_name: string;
    status: string;
    assets_produced: number;
    assets_required: number;
    compass_score: number | null;
    dag_progress?: { id: string; type: string; status: string }[];
    updated_at: string;
}

interface ProviderHealth {
    name: string;
    latency_ms: number;
    uptime_pct: number;
    available: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

import { CAMPAIGN_URL } from '../config/env';

const CAMPAIGN_SVC: ServiceDef[] = [
    { id: 'campaign', name: 'Campaign', port: 4006, health: '/health', color: '#C87941', group: 'Services' },
];

const STATUS_COLORS: Record<string, string> = {
    briefing: '#6B7280',
    planning: '#F59E0B',
    directing: '#8B5CF6',
    producing: '#3B82F6',
    validating: '#06B6D4',
    client_review: '#10B981',
    approved: '#22C55E',
    delivered: '#86EFAC',
};

const STATUS_ICONS: Record<string, string> = {
    briefing: '📋', planning: '🗺️', directing: '🎨',
    producing: '⚙️', validating: '🧭', client_review: '👁️',
    approved: '✅', delivered: '🚀',
};

const MOCK_PROVIDERS: ProviderHealth[] = [
    { name: 'FAL.ai', latency_ms: 247, uptime_pct: 99.1, available: true },
    { name: 'Runway Gen-3', latency_ms: 1200, uptime_pct: 94.3, available: true },
    { name: 'ElevenLabs', latency_ms: 340, uptime_pct: 99.8, available: true },
    { name: 'Vertex AI', latency_ms: 890, uptime_pct: 97.1, available: true },
    { name: 'Lyria', latency_ms: 1100, uptime_pct: 96.5, available: true },
    { name: 'TripoSR', latency_ms: 3200, uptime_pct: 93.2, available: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const color = STATUS_COLORS[status] ?? '#9CA3AF';
    const icon = STATUS_ICONS[status] ?? '○';
    return (
        /* --badge-color drives text, bg (13% opacity), border (26% opacity) */
        <span className="cc-status-badge" {...{ style: { '--badge-color': color } as React.CSSProperties }}>
            {icon} {status.replace('_', ' ').toUpperCase()}
        </span>
    );
}

function ProgressBar({ value, max, color = 'var(--accent-1)' }: { value: number; max: number; color?: string }) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    const barColor = pct >= 100 ? '#22C55E' : color;
    return (
        <div className="cc-progress-track">
            {/* width is a percentage — cannot be a static class; color uses --bar-color */}
            <div
                className="cc-progress-fill"
                {...{ style: { width: `${pct}%`, '--bar-color': barColor } as React.CSSProperties }}
            />
        </div>
    );
}

function CompassBadge({ score }: { score: number | null }) {
    if (score === null) return <span className="cc-compass-null">—</span>;
    const color = score >= 90 ? '#22C55E' : score >= 70 ? '#F59E0B' : '#EF4444';
    return (
        <span className="cc-compass" {...{ style: { '--compass-color': color } as React.CSSProperties }}>
            {score}/100
        </span>
    );
}

function ProviderGrid({ providers }: { providers: ProviderHealth[] }) {
    return (
        <div className="cc-provider-grid">
            {providers.map(p => {
                const dotColor = p.available ? '#22C55E' : '#EF4444';
                const dotShadow = p.available ? '#22C55E88' : '#EF444488';
                return (
                    <div key={p.name} className="cc-provider-card">
                        <div className="cc-provider-row">
                            <span className="cc-provider-name">{p.name}</span>
                            <span
                                className="cc-provider-dot"
                                {...{ style: { '--provider-dot-color': dotColor, '--provider-dot-shadow': dotShadow } as React.CSSProperties }}
                            />
                        </div>
                        <div className="cc-provider-latency">{p.latency_ms}ms</div>
                        <div className="cc-provider-uptime">{p.uptime_pct}% uptime</div>
                    </div>
                );
            })}
        </div>
    );
}

function DAGProgress({ nodes }: { nodes: { id: string; type: string; status: string }[] }) {
    const nodeColor = (s: string) => s === 'done' ? '#22C55E' : s === 'running' ? '#3B82F6' : s === 'failed' ? '#EF4444' : '#6B7280';
    return (
        <div className="cc-dag">
            {nodes.map(n => (
                <div
                    key={n.id}
                    className="cc-dag-node"
                    {...{ style: { '--dag-color': nodeColor(n.status) } as React.CSSProperties }}
                >
                    {n.type.replace('_', ' ')}
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CampaignControl() {
    const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
    const [selected, setSelected] = useState<CampaignStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { live: svcLive } = useServiceHealth(CAMPAIGN_SVC, 15_000);
    const campaignSvc = svcLive[0];
    const svcOnline = campaignSvc?.status === 'online';

    const fetchCampaigns = useCallback(async () => {
        for (const base of [CAMPAIGN_URL]) {
            try {
                const res = await fetch(`${base}/campaigns`, { signal: AbortSignal.timeout(3000) });
                if (!res.ok) throw new Error(`${res.status}`);
                const data = await res.json() as { campaigns: CampaignSummary[] };
                setCampaigns(data.campaigns);
                setError(null);
                return;
            } catch { /* try next */ }
        }
        setError('Campaign service unreachable — is it running on NAS or localhost:4006?');
        setLoading(false);
    }, []);

    const fetchStatus = useCallback(async (id: string) => {
        for (const base of [CAMPAIGN_URL]) {
            try {
                const res = await fetch(`${base}/status/${id}`, { signal: AbortSignal.timeout(3000) });
                if (!res.ok) continue;
                const data = await res.json() as CampaignStatus;
                setSelected(data);
                return;
            } catch { /* try next */ }
        }
    }, []);

    useEffect(() => {
        fetchCampaigns();
        const interval = setInterval(fetchCampaigns, 8000);
        return () => clearInterval(interval);
    }, [fetchCampaigns]);

    const activeCampaigns = campaigns.filter(c => !['delivered', 'approved'].includes(c.status));
    const completedCampaigns = campaigns.filter(c => ['delivered', 'approved'].includes(c.status));

    const svcDotColor = svcOnline ? '#22C55E' : campaignSvc?.status === 'checking' ? '#F5A524' : '#EF4444';
    const svcDotShadow = `${svcOnline ? '#22C55E88' : '#EF444488'}`;

    return (
        <div className="cc-root">

            {/* ── HEADER ── */}
            <div className="cc-header">
                <div>
                    <h1 className="cc-h1">Campaign Control</h1>
                    <p className="cc-subtitle">
                        {activeCampaigns.length} active · {completedCampaigns.length} delivered
                    </p>
                </div>
                <div className="cc-svc-status">
                    <span
                        className="cc-svc-dot"
                        {...{ style: { '--svc-dot-color': svcDotColor, '--svc-dot-shadow': svcDotShadow } as React.CSSProperties }}
                    />
                    <span className="cc-svc-text">
                        CAMPAIGN SERVICE {svcOnline ? `ONLINE${campaignSvc?.ms ? ` · ${campaignSvc.ms}ms` : ''}` : campaignSvc?.status === 'checking' ? 'POLLING…' : 'OFFLINE'}
                    </span>
                </div>
            </div>

            {/* ── ACTIVE CAMPAIGNS ── */}
            <div className="cc-panel cc-active-panel">
                <h2 className="cc-panel-title">Active Campaigns</h2>

                {loading && <div className="cc-loading">Loading...</div>}
                {error && <div className="cc-error">{error}</div>}

                {!loading && campaigns.length === 0 && (
                    <div className="cc-empty">
                        No campaigns yet. Create one from a Zero-Day intake session.
                    </div>
                )}

                <div className="cc-campaign-list">
                    {campaigns.map(c => {
                        const isSelected = selected?.campaign_id === c.id;
                        const rowBg = isSelected ? 'rgba(var(--accent-1-rgb), 0.15)' : 'rgba(255,255,255,0.03)';
                        const rowBorder = isSelected ? 'var(--accent-1-glow)' : 'rgba(255,255,255,0.07)';
                        return (
                            <div
                                key={c.id}
                                onClick={() => fetchStatus(c.id)}
                                className="cc-campaign-row"
                                {...{ style: { '--cc-row-bg': rowBg, '--cc-row-border': rowBorder } as React.CSSProperties }}
                            >
                                <div className="cc-campaign-row-top">
                                    <div>
                                        <div className="cc-campaign-name">{c.project_name}</div>
                                        <div className="cc-campaign-client">{c.client_id}</div>
                                    </div>
                                    <div className="cc-campaign-badges">
                                        <StatusBadge status={c.status} />
                                        <CompassBadge score={c.compass_score} />
                                    </div>
                                </div>
                                <ProgressBar value={c.assets_produced} max={3} />
                                <div className="cc-campaign-meta">
                                    {c.assets_produced} assets produced · {new Date(c.updated_at).toLocaleTimeString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── PROVIDER HEALTH ── */}
            <div className="cc-panel">
                <h2 className="cc-panel-title">Provider Health</h2>
                <ProviderGrid providers={MOCK_PROVIDERS} />

                {/* ── METRICS STRIP ── */}
                <div className="cc-metrics-strip">
                    <h2 className="cc-panel-title">30-Day Metrics</h2>
                    {[
                        { label: 'Campaigns', value: campaigns.length.toString() },
                        { label: 'Delivered', value: completedCampaigns.length.toString() },
                        {
                            label: 'Avg COMPASS', value: campaigns.filter(c => c.compass_score !== null).length > 0
                                ? `${Math.round(campaigns.filter(c => c.compass_score !== null).reduce((a, c) => a + (c.compass_score ?? 0), 0) / campaigns.filter(c => c.compass_score !== null).length)}/100`
                                : '—'
                        },
                    ].map(m => (
                        <div key={m.label} className="cc-metric-row">
                            <span className="cc-metric-label">{m.label}</span>
                            <span className="cc-metric-value">{m.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── CAMPAIGN DETAIL ── */}
            {selected && (
                <div className="cc-detail-panel">
                    <div className="cc-detail-header">
                        <h2 className="cc-detail-h2">{selected.project_name}</h2>
                        <div className="cc-detail-actions">
                            <StatusBadge status={selected.status} />
                            <CompassBadge score={selected.compass_score} />
                            <button onClick={() => fetchStatus(selected.campaign_id)} className="cc-refresh-btn">
                                Refresh
                            </button>
                        </div>
                    </div>
                    <div className="cc-detail-progress">
                        <ProgressBar value={selected.assets_produced} max={selected.assets_required} color='var(--accent-1)' />
                        <div className="cc-detail-meta">
                            {selected.assets_produced} / {selected.assets_required} assets
                        </div>
                    </div>
                    {selected.dag_progress && <DAGProgress nodes={selected.dag_progress} />}
                </div>
            )}
        </div>
    );
}
