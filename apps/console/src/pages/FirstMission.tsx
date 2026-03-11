/**
 * FirstMission — First-Run Phase 5 + Ambient Dashboard Phase 6
 * T20260306-696: First Mission workflow & Ambient Dashboard
 *
 * Surfaces the user's first actionable task after onboarding, then
 * transitions into an ambient-mode live dashboard overlay.
 */

import { useState, useEffect, useRef } from 'react';
import './FirstMission.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MissionTemplate {
    id: string;
    title: string;
    description: string;
    icon: string;
    flow: string;
    estimatedTime: string;
    tags: string[];
    category: 'create' | 'analyze' | 'deploy' | 'explore';
}

interface AmbientMetric {
    label: string;
    value: string;
    delta?: string;
    positive?: boolean;
    sparkline?: number[];
}

// ── Mission Templates ─────────────────────────────────────────────────────────

const MISSION_TEMPLATES: MissionTemplate[] = [
    {
        id: 'zero-day-intake',
        title: 'Launch a Zero-Day Intake Session',
        description: 'Start an AI-powered client onboarding session — extract project intent, generate a creative brief, and auto-draft a LEX contract.',
        icon: '⚡',
        flow: '/zero-day',
        estimatedTime: '8 min',
        tags: ['AI', 'Client', 'GTM'],
        category: 'create',
    },
    {
        id: 'brand-campaign',
        title: 'Generate a Brand Campaign',
        description: 'Turn a prompt into a full launch campaign — visuals, copy, social posts, and media assets — in one autonomous run.',
        icon: '🎯',
        flow: '/campaign',
        estimatedTime: '12 min',
        tags: ['Generative', 'Media', 'Campaign'],
        category: 'create',
    },
    {
        id: 'explore-agents',
        title: 'Explore the Agent Catalog',
        description: 'Browse all 40+ agents in the Creative Liberation Engine — see their hive assignments, capabilities, and current operational status.',
        icon: '🧠',
        flow: '/agents',
        estimatedTime: '3 min',
        tags: ['Agents', 'AVERI', 'Discovery'],
        category: 'explore',
    },
    {
        id: 'design-sandbox',
        title: 'Open the Design Sandbox',
        description: 'Start a guided or freeform design session — live token editing, VERA-DESIGN scoring, and variant comparison.',
        icon: '🎨',
        flow: '/design-sandbox',
        estimatedTime: '5 min',
        tags: ['Design', 'Tokens', 'UI'],
        category: 'create',
    },
    {
        id: 'dispatch-center',
        title: 'View the Dispatch Queue',
        description: 'See all active tasks across the GENESIS stack — claim work, monitor progress, and coordinate across IDE windows.',
        icon: '📋',
        flow: '/dispatch',
        estimatedTime: '2 min',
        tags: ['Tasks', 'Dispatch', 'Multi-Helix'],
        category: 'analyze',
    },
    {
        id: 'deploy-genesis',
        title: 'Deploy the GENESIS Stack',
        description: 'Trigger a full NAS deploy of all 20+ services — Docker Compose orchestration with live log streaming.',
        icon: '🚀',
        flow: '/settings#deploy',
        estimatedTime: '15 min',
        tags: ['Deploy', 'Docker', 'NAS'],
        category: 'deploy',
    },
];

const AMBIENT_METRICS: AmbientMetric[] = [
    { label: 'Active Agents', value: '12', delta: '+3', positive: true, sparkline: [8, 9, 10, 9, 11, 12, 12] },
    { label: 'Tasks Dispatched', value: '247', delta: '+18', positive: true, sparkline: [200, 210, 218, 225, 230, 240, 247] },
    { label: 'Sessions Today', value: '6', delta: '+2', positive: true, sparkline: [2, 3, 3, 4, 5, 5, 6] },
    { label: 'Uptime', value: '99.8%', delta: '0', positive: true, sparkline: [99, 99, 100, 99, 100, 100, 99.8] },
];



// ── Component ─────────────────────────────────────────────────────────────────

interface FirstMissionProps {
    onComplete: () => void;
    onBack: () => void;
}

export function FirstMission({ onComplete, onBack }: FirstMissionProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [phase, setPhase] = useState<'mission' | 'ambient'>('mission');
    const [, setAmbientTick] = useState(0);
    const tickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    // Ambient ticker — simulates live metrics refreshing
    useEffect(() => {
        if (phase === 'ambient') {
            tickRef.current = setInterval(() => setAmbientTick(t => t + 1), 4000);
        }
        return () => clearInterval(tickRef.current);
    }, [phase]);

    const selectedMission = MISSION_TEMPLATES.find(m => m.id === selected);
    const [filter, setFilter] = useState<MissionTemplate['category'] | 'all'>('all');
    const filtered = filter === 'all' ? MISSION_TEMPLATES : MISSION_TEMPLATES.filter(m => m.category === filter);

    if (phase === 'ambient') {
        return (
            <div className="ambient-dashboard">
                <div className="ambient-header">
                    <div className="ambient-logo">◈ CREATIVE LIBERATION ENGINE</div>
                    <div className="ambient-status">
                        <span className="ambient-pulse" />
                        GENESIS ONLINE
                    </div>
                    <button className="ambient-exit-btn" onClick={() => setPhase('mission')}>
                        ← Back to Missions
                    </button>
                </div>

                <div className="ambient-metrics">
                    {AMBIENT_METRICS.map((metric, i) => (
                        <div key={metric.label} className="ambient-metric-card" ref={el => { if (el) el.style.animationDelay = `${i * 0.1}s`; }}>
                            <div className="ambient-metric-value">
                                {metric.value}
                                {metric.delta && (
                                    <span className={`ambient-metric-delta ${metric.positive ? 'positive' : 'negative'}`}>
                                        {metric.delta}
                                    </span>
                                )}
                            </div>
                            <div className="ambient-metric-label">{metric.label}</div>
                            {metric.sparkline && (
                                <svg className="ambient-sparkline" viewBox={`0 0 ${metric.sparkline.length * 10} 20`} preserveAspectRatio="none">
                                    <polyline
                                        points={metric.sparkline.map((v, idx) => {
                                            const min = Math.min(...metric.sparkline!);
                                            const max = Math.max(...metric.sparkline!);
                                            const range = max - min || 1;
                                            const y = 18 - ((v - min) / range) * 16;
                                            return `${idx * 10},${y}`;
                                        }).join(' ')}
                                        fill="none"
                                        stroke="rgba(245,158,11,0.6)"
                                        strokeWidth="1.5"
                                    />
                                </svg>
                            )}
                        </div>
                    ))}
                </div>

                <div className="ambient-live-feed">
                    <div className="ambient-feed-title">Live Activity</div>
                    {[
                        { time: 'just now', msg: 'ATHENA completed design token audit — score 91/100' },
                        { time: '12s ago', msg: 'Campaign pipeline triggered for client WholeTrout' },
                        { time: '1m ago', msg: 'VERA flagged 2 contrast failures in theme override' },
                        { time: '3m ago', msg: 'nas-watcher daemon polled 14 tasks from dispatch queue' },
                        { time: '7m ago', msg: 'Zero-Day intake session completed — LEX draft generated' },
                    ].map((entry, i) => (
                        <div key={i} className="ambient-feed-entry" ref={el => { if (el) el.style.opacity = String(1 - (i * 0.15)); }}>
                            <span className="ambient-feed-time">{entry.time}</span>
                            <span className="ambient-feed-msg">{entry.msg}</span>
                        </div>
                    ))}
                </div>

                <button className="ambient-launch-btn" onClick={onComplete}>
                    Enter the Engine →
                </button>
            </div>
        );
    }

    return (
        <div className="first-mission">
            <div className="mission-header">
                <div className="mission-icon">🎯</div>
                <h2 className="mission-title">Choose Your First Mission</h2>
                <p className="mission-subtitle">
                    Pick a workflow to launch — or explore the ambient dashboard to see the engine in motion.
                </p>
            </div>

            <div className="mission-filters">
                {(['all', 'create', 'analyze', 'deploy', 'explore'] as const).map(cat => (
                    <button
                        key={cat}
                        className={`mission-filter-btn ${filter === cat ? 'mission-filter-btn--active' : ''}`}
                        onClick={() => setFilter(cat)}
                    >
                        {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            <div className="mission-grid">
                {filtered.map(mission => (
                    <button
                        key={mission.id}
                        className={`mission-card ${selected === mission.id ? 'mission-card--selected' : ''}`}
                        onClick={() => setSelected(mission.id)}
                    >
                        <div className="mission-card-header">
                            <span className="mission-card-icon">{mission.icon}</span>
                            <span
                                className={`mission-card-category mission-category--${mission.category}`}
                            >
                                {mission.category}
                            </span>
                            <span className="mission-card-time">{mission.estimatedTime}</span>
                        </div>
                        <div className="mission-card-title">{mission.title}</div>
                        <div className="mission-card-description">{mission.description}</div>
                        <div className="mission-card-tags">
                            {mission.tags.map(tag => (
                                <span key={tag} className="mission-card-tag">{tag}</span>
                            ))}
                        </div>
                    </button>
                ))}
            </div>

            <div className="mission-actions">
                <button className="mission-btn mission-btn--secondary" onClick={onBack}>Back</button>
                <button className="mission-btn mission-btn--ghost" onClick={() => setPhase('ambient')}>
                    ◉ Ambient View
                </button>
                {selectedMission && (
                    <button
                        className="mission-btn mission-btn--primary"
                        onClick={onComplete}
                    >
                        Launch {selectedMission.icon} {selectedMission.title.split(' ').slice(0, 3).join(' ')}... →
                    </button>
                )}
                {!selectedMission && (
                    <button className="mission-btn mission-btn--primary" onClick={onComplete}>
                        Enter the Engine →
                    </button>
                )}
            </div>
        </div>
    );
}

export default FirstMission;
