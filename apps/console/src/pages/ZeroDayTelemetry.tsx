import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, TrendingUp, DollarSign, Zap, Target, CheckCircle, AlertTriangle } from 'lucide-react';
import './ZeroDayIntake.css';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LeadScore {
    email: string;
    score: number;
    factors: string[];
    last_updated: string;
    recommendation: 'disqualify' | 'nurture' | 'engage_now';
}

interface FunnelStage {
    entered: number;
    converted: number;
    conversion_rate_pct: number;
}

interface TelemetryMetrics {
    funnel?: {
        overall_conversion_rate_pct: number;
        total_events: number;
        avg_deal_velocity_days: number;
        stages: Record<string, FunnelStage>;
    };
    revenue?: {
        total_revenue_usd: number;
    };
    lead_scores?: LeadScore[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ZeroDayTelemetry() {
    const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
    const [leadScores, setLeadScores] = useState<LeadScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'funnel' | 'leads' | 'pipeline'>('funnel');

    const loadMetrics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/analytics/dashboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    period_start: new Date(Date.now() - 30 * 86400000).toISOString(),
                    period_end: new Date().toISOString(),
                    output_format: 'json'
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setMetrics(data);
            if (data.lead_scores) setLeadScores(data.lead_scores);
        } catch (err) {
            console.error('Failed to load telemetry:', err);
            setError('Telemetry endpoint unavailable — showing demo data.');
            // Demo data for dev mode
            setMetrics({
                funnel: {
                    overall_conversion_rate_pct: 34,
                    total_events: 147,
                    avg_deal_velocity_days: 5.2,
                    stages: {
                        'intake_started':     { entered: 147, converted: 89, conversion_rate_pct: 60.5 },
                        'intake_completed':   { entered: 89,  converted: 61, conversion_rate_pct: 68.5 },
                        'proposal_viewed':    { entered: 61,  converted: 44, conversion_rate_pct: 72.1 },
                        'proposal_accepted':  { entered: 44,  converted: 28, conversion_rate_pct: 63.6 },
                        'contract_signed':    { entered: 28,  converted: 22, conversion_rate_pct: 78.6 },
                        'deposit_received':   { entered: 22,  converted: 20, conversion_rate_pct: 90.9 },
                    }
                },
                revenue: { total_revenue_usd: 148500 },
            });
            setLeadScores([
                { email: 'jaymee@studio.com',  score: 95, factors: ['+30 intake_completed', '+40 proposal_accepted', '+25 contract_signed'], last_updated: new Date().toISOString(), recommendation: 'engage_now' },
                { email: 'mark@creatives.io',  score: 55, factors: ['+30 intake_completed', '+15 proposal_viewed'], last_updated: new Date().toISOString(), recommendation: 'nurture' },
                { email: 'nina@photogroup.ca', score: 10, factors: ['+10 intake_started'], last_updated: new Date().toISOString(), recommendation: 'disqualify' },
                { email: 'tom@agency.co',      score: 80, factors: ['+30 intake_completed', '+40 proposal_accepted'], last_updated: new Date().toISOString(), recommendation: 'engage_now' },
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadMetrics(); }, [loadMetrics]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: 'rgba(245,240,232,0.4)' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Zap size={24} />
                </motion.div>
                Loading Zero-Day Telemetry…
            </div>
        );
    }

    const f = metrics?.funnel;
    const r = metrics?.revenue;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#f5f0e8' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                    <Activity style={{ color: '#b87333' }} />
                    Zero-Day GTM Telemetry
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {error && <span style={{ fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Demo</span>}
                    <button
                        onClick={loadMetrics}
                        style={{ padding: '8px 16px', background: 'rgba(184,115,51,0.15)', border: '1px solid rgba(184,115,51,0.3)', borderRadius: '8px', color: '#b87333', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard title="Funnel Conversion" value={`${f?.overall_conversion_rate_pct ?? 0}%`} icon={<TrendingUp size={18} />} trend="+12%" trendUp />
                <StatCard title="Active Prospects" value={f?.total_events ?? 0} icon={<Users size={18} />} trend="Steady" />
                <StatCard title="Deal Velocity" value={`${f?.avg_deal_velocity_days ?? 0}d`} icon={<Activity size={18} />} trend="-2d" trendUp />
                <StatCard title="Revenue Pipeline" value={r?.total_revenue_usd ? `$${r.total_revenue_usd.toLocaleString()}` : '$0'} icon={<DollarSign size={18} />} trend="+5%" trendUp />
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
                {(['funnel', 'leads', 'pipeline'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '8px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                            background: activeTab === tab ? 'rgba(184,115,51,0.2)' : 'transparent',
                            color: activeTab === tab ? '#b87333' : 'rgba(245,240,232,0.5)',
                            fontWeight: activeTab === tab ? 700 : 400,
                            fontSize: '13px', textTransform: 'capitalize', transition: 'all 0.2s',
                        }}
                    >
                        {tab === 'leads' ? 'Lead Scores' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'funnel' && (
                    <motion.div key="funnel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,240,232,0.08)', borderRadius: '16px', padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', margin: '0 0 1.5rem' }}>Execution Funnel — Last 30 Days</h2>
                            {Object.entries(f?.stages ?? {}).map(([stage, data]) => (
                                <div key={stage} style={{ marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(245,240,232,0.6)', marginBottom: '6px' }}>
                                        <span style={{ textTransform: 'replace', letterSpacing: '0.5px' }}>{stage.replace(/_/g, ' ')}</span>
                                        <span style={{ fontWeight: 600, color: '#f5f0e8' }}>{data.converted}/{data.entered} · <span style={{ color: '#b87333' }}>{data.conversion_rate_pct}%</span></span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <motion.div
                                            style={{ height: '100%', background: 'linear-gradient(90deg, #b87333, #d4956a)', borderRadius: '4px' }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${data.conversion_rate_pct}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'leads' && (
                    <motion.div key="leads" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,240,232,0.08)', borderRadius: '16px', padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1.5rem' }}>Live Lead Scores</h2>
                            {leadScores.length === 0 ? (
                                <div style={{ color: 'rgba(245,240,232,0.3)', textAlign: 'center', padding: '3rem' }}>No lead data yet — intake events will appear here.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {leadScores.sort((a, b) => b.score - a.score).map((lead, i) => (
                                        <LeadScoreRow key={lead.email} lead={lead} index={i} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'pipeline' && (
                    <motion.div key="pipeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,240,232,0.08)', borderRadius: '16px', padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1.5rem' }}>Revenue Pipeline</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <PipelineCard label="Total Pipeline" value={`$${(r?.total_revenue_usd ?? 0).toLocaleString()}`} icon={<DollarSign size={20} style={{ color: '#b87333' }} />} />
                                <PipelineCard label="Engage-Now Leads" value={leadScores.filter(l => l.recommendation === 'engage_now').length} icon={<Target size={20} style={{ color: '#22c55e' }} />} />
                                <PipelineCard label="Nurture Queue" value={leadScores.filter(l => l.recommendation === 'nurture').length} icon={<Users size={20} style={{ color: '#f59e0b' }} />} />
                                <PipelineCard label="Avg. Score" value={leadScores.length ? Math.round(leadScores.reduce((s, l) => s + l.score, 0) / leadScores.length) : 0} icon={<CheckCircle size={20} style={{ color: '#a855f7' }} />} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ title, value, icon, trend, trendUp }: { title: string; value: string | number; icon: React.ReactNode; trend: string; trendUp?: boolean }) {
    return (
        <motion.div
            whileHover={{ scale: 1.02, borderColor: 'rgba(184,115,51,0.3)' }}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,240,232,0.08)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', transition: 'border-color 0.2s' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'rgba(245,240,232,0.4)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{title}</span>
                {icon}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f5f0e8', letterSpacing: '-1px' }}>{value}</span>
                <span style={{ fontSize: '12px', color: trendUp ? '#22c55e' : 'rgba(245,240,232,0.4)', fontWeight: 600 }}>{trend}</span>
            </div>
        </motion.div>
    );
}

function LeadScoreRow({ lead, index }: { lead: LeadScore; index: number }) {
    const recColors: Record<string, string> = { engage_now: '#22c55e', nurture: '#f59e0b', disqualify: '#ef4444' };
    const recLabels: Record<string, string> = { engage_now: 'Engage Now', nurture: 'Nurture', disqualify: 'Disqualify' };

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(245,240,232,0.06)' }}
        >
            {/* Score ring */}
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `conic-gradient(${recColors[lead.recommendation]} ${lead.score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#f5f0e8' }}>
                    {lead.score}
                </div>
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#f5f0e8', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email}</div>
                <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.4)' }}>{lead.factors.slice(-2).join(' · ')}</div>
            </div>
            {/* Rec badge */}
            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: `${recColors[lead.recommendation]}20`, color: recColors[lead.recommendation], letterSpacing: '0.5px', flexShrink: 0 }}>
                {recLabels[lead.recommendation]}
            </span>
        </motion.div>
    );
}

function PipelineCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(245,240,232,0.06)', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {icon}
            <div>
                <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f5f0e8' }}>{value}</div>
            </div>
        </div>
    );
}
