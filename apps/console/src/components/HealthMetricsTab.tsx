import { useState, useEffect } from 'react';
import { DISPATCH_URL } from '../config/env';
import './HealthMetricsTab.css';

const DISPATCH = DISPATCH_URL;
const NAS_IP = DISPATCH.replace(/^https?:\/\/([^:/]+).*$/, '$1');

interface Svc { name: string; port: number; health: string; status: 'online' | 'offline' | 'checking'; ms?: number; color: string; group: string }

interface CreatorProductivityData {
    workflowSparklines: { type: string; points: number[]; avgMinutes: number; color: string }[]
    topExceptions: { message: string; count: number; autoResolved: number; escalated: number }[]
    caseResolutionRate: { day: string; rate: number }[]
    totalWorkflows: number
    avgResolutionSec: number
}

const GENESIS_SERVICES: Svc[] = [
    { name: 'Genkit AI', port: 4100, health: '/health', status: 'checking', color: '#F5A524', group: 'AI' },
    { name: 'Dispatch', port: 5050, health: '/health', status: 'checking', color: '#22c55e', group: 'Core' },
    { name: 'Gateway', port: 3080, health: '/health', status: 'checking', color: '#9B72CF', group: 'Core' },
    { name: 'Redis', port: 5050, health: '/health/redis', status: 'checking', color: '#ef4444', group: 'Core' },
    { name: 'Relay MCP', port: 5100, health: '/health', status: 'checking', color: '#4285F4', group: 'Services' },
    { name: 'Ghost QA', port: 6000, health: '/health', status: 'checking', color: '#ef4444', group: 'Services' },
    { name: 'Campaign', port: 4006, health: '/health', status: 'checking', color: '#FF6B35', group: 'Services' },
    { name: 'Zero-Day', port: 9000, health: '/health', status: 'checking', color: '#C17D4A', group: 'Services' },
    { name: 'Blueprints', port: 4200, health: '/health', status: 'checking', color: '#22D3EE', group: 'Services' },
];

async function checkSvcHealth(svc: Svc): Promise<Svc> {
    const t0 = Date.now()
    const nasBase = `http://${NAS_IP}:${svc.port}`
    try {
        const r = await fetch(`${nasBase}${svc.health}`, { signal: AbortSignal.timeout(2500) })
        if (r.ok || r.status === 204) return { ...svc, status: 'online', ms: Date.now() - t0 }
    } catch { /* try localhost */ }
    try {
        const r = await fetch(`http://localhost:${svc.port}${svc.health}`, { signal: AbortSignal.timeout(1500) })
        if (r.ok || r.status === 204) return { ...svc, status: 'online', ms: Date.now() - t0 }
    } catch { /* offline */ }
    return { ...svc, status: 'offline' }
}

const Pulse = ({ ok, size = 6 }: { ok: boolean; size?: number }) => (
    <span className={`hm-pulse hm-pulse-${ok ? 'ok' : 'err'}-${size}`} />
);

function Spark({ points, color }: { points: number[]; color: string }) {
    const max = Math.max(...points, 1);
    const w = 80;
    const h = 28;
    const pts = points.map((v, i) => {
        const x = (i / Math.max(points.length - 1, 1)) * w;
        const y = h - (v / max) * h;
        return `${x},${y}`;
    }).join(' ');
    
    return (
        <svg width={w} height={h} style={{ overflow: 'visible' }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx={pts.split(' ').at(-1)?.split(',')[0] ?? 0} cy={pts.split(' ').at(-1)?.split(',')[1] ?? 0} r="2.5" fill={color} />
        </svg>
    )
}

function CreatorProductivity() {
    const [metrics, setMetrics] = useState<CreatorProductivityData | null>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const baseUrl = isLocalhost ? '/api/genkit' : `http://${NAS_IP}:4100`;
                const res = await fetch(`${baseUrl}/dira/metrics`);
                if (res.ok) setMetrics(await res.json());
            } catch (error) {
                // Silent
            }
        };
        fetchMetrics();
        const t = setInterval(fetchMetrics, 15000);
        return () => clearInterval(t);
    }, []);

    if (!metrics) {
        return <div className="cp-loading">Syncing neural telemetry...</div>;
    }

    return (
        <div className="cp-container">
            <div className="cp-stats-grid">
                <div className="cp-stat-box">
                    <div className="cp-stat-val">{metrics.totalWorkflows}</div>
                    <div className="cp-stat-lbl">workflows (7d)</div>
                </div>
                <div className="cp-stat-box">
                    <div className="cp-stat-val" style={{ color: '#22c55e' }}>{metrics.avgResolutionSec.toFixed(1)}s</div>
                    <div className="cp-stat-lbl">avg resolve time</div>
                </div>
            </div>
            
            <div className="cp-spark-grid">
                {metrics.workflowSparklines.map(c => (
                    <div key={c.type} className="cp-spark">
                        <div className="cp-spark-head">
                            <span style={{ color: c.color }}>● {c.type}</span>
                        </div>
                        <Spark points={c.points.length > 0 ? c.points : [0]} color={c.color} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function HealthMetricsTab() {
    const [services, setServices] = useState<Svc[]>(GENESIS_SERVICES);

    const poll = async () => {
        const results = await Promise.all(GENESIS_SERVICES.map(s => checkSvcHealth(s)));
        setServices(results);
    };

    useEffect(() => {
        poll();
        const iv = setInterval(poll, 10_000);
        return () => clearInterval(iv);
    }, []);

    return (
        <div className="hm-pane">
            <div className="pane-header">
                <div className="pane-title">SYSTEM HEALTH & METRICS</div>
                <div className="pane-actions">
                    <button onClick={poll} className="pane-btn" title="Refresh">↻</button>
                </div>
            </div>

            <div className="hm-section">
                <div className="hm-sec-title">DIRA-04 PRODUCTIVITY</div>
                <CreatorProductivity />
            </div>

            <div className="hm-section">
                <div className="hm-sec-title">GENESIS SERVICES</div>
                <div className="hm-svc-grid">
                    {services.map((svc) => {
                        const isOnline = svc.status === 'online';
                        return (
                            <div key={svc.name} className={`hm-svc ${isOnline ? '' : 'hm-svc-offline'}`} style={{ borderLeftColor: isOnline ? svc.color : 'transparent' }}>
                                <div className="hm-svc-name">
                                    <Pulse ok={isOnline} />
                                    {svc.name}
                                </div>
                                <div className="hm-svc-port">
                                    {isOnline ? <span style={{color: '#fff'}}>{svc.ms}ms</span> : 'offline'} · :{svc.port}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
