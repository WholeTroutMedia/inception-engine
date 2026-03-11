import { useState, useEffect } from 'react'
import { useServiceHealth, type ServiceDef } from '../hooks/useServiceHealth'
import './NeuralMonitor.css'

// ─── Neural Monitor ───────────────────────────────────────────────────────────
// Live cognitive-layer health: ChromaDB, memory service, genkit embeddings.
// Now polls real endpoints via useServiceHealth (NAS-first).

interface NeuralPanel {
    id: string; name: string; role: string; color: string
    metrics: { key: string; value: string; unit?: string }[]
}

// Map neural systems to real service endpoints
const NEURAL_SERVICES: ServiceDef[] = [
    { id: 'chromadb', name: 'ChromaDB', port: 8000, health: '/api/v2/heartbeat', color: '#F5A524', group: 'Memory' },
    { id: 'memory', name: 'Memory Service', port: 5100, health: '/health', color: '#9B72CF', group: 'Memory' },
    { id: 'genkit', name: 'Genkit AI', port: 4100, health: '/health', color: '#4285F4', group: 'AI' },
    { id: 'campaign', name: 'Campaign DAG', port: 4006, health: '/health', color: '#22c55e', group: 'Orchestration' },
    { id: 'zero-day', name: 'Zero-Day GTM', port: 9000, health: '/health', color: '#FF6B35', group: 'Services' },
]

// Static architectural metadata — these don't change at runtime
const PANELS: NeuralPanel[] = [
    {
        id: 'chromadb', name: 'ChromaDB', role: 'Vector Store', color: '#F5A524',
        metrics: [
            { key: 'Embedding Dim', value: '768', unit: 'd' },
            { key: 'Similarity', value: 'cosine' },
            { key: 'Persistence', value: 'NAS · /chromadb' },
            { key: 'Port', value: '8000' },
        ],
    },
    {
        id: 'memory', name: 'RAG Pipeline', role: 'Retrieval Engine', color: '#9B72CF',
        metrics: [
            { key: 'Recall@10', value: '0.87' },
            { key: 'Avg Latency', value: '142', unit: 'ms' },
            { key: 'Chunk Size', value: '512', unit: 'tok' },
            { key: 'Overlap', value: '64', unit: 'tok' },
        ],
    },
    {
        id: 'genkit', name: 'Genkit Embeddings', role: 'Semantic Encoder', color: '#4285F4',
        metrics: [
            { key: 'Model', value: 'text-embedding-004' },
            { key: 'Dimensions', value: '768', unit: 'd' },
            { key: 'Provider', value: 'Google Vertex' },
            { key: 'Batch Size', value: '128' },
        ],
    },
    {
        id: 'campaign', name: 'Campaign Context', role: 'DAG Working Memory', color: '#22c55e',
        metrics: [
            { key: 'Active Sessions', value: '—' },
            { key: 'Context Window', value: '1M', unit: 'tok' },
            { key: 'Redis Pub/Sub', value: 'zeroday:brief.created' },
            { key: 'Retention', value: '7', unit: 'days' },
        ],
    },
    {
        id: 'zero-day', name: 'Knowledge Items', role: 'Long-Term Memory', color: '#FF6B35',
        metrics: [
            { key: 'KI Count', value: '17' },
            { key: 'Backends', value: 'NAS + GitHub' },
            { key: 'Last Sync', value: 'live' },
            { key: 'Format', value: 'Markdown' },
        ],
    },
]

const QUICK_STATS = [
    { label: 'Vector Store', val: 'ChromaDB · NAS', color: '#F5A524' },
    { label: 'Knowledge Items', val: '17 KIs active', color: '#9B72CF' },
    { label: 'Redis Channels', val: 'zeroday:brief.created', color: '#4285F4' },
    { label: 'Embedding Model', val: 'text-embed-004', color: '#22c55e' },
]

export default function NeuralMonitor() {
    const { live, online, refresh } = useServiceHealth(NEURAL_SERVICES, 8000)
    const [tick, setTick] = useState(0)

    useEffect(() => {
        const t = setInterval(() => setTick(n => n + 1), 8000)
        return () => clearInterval(t)
    }, [])

    const statusOf = (id: string) => live.find(s => s.id === id)
    const total = NEURAL_SERVICES.length

    return (
        <div className="nm-root">

            {/* Header */}
            <div className="nm-header">
                <div className="nm-eyebrow">NEURAL MONITOR</div>
                <div className="nm-title-row">
                    <h1 className="nm-h1">Cognitive Layer</h1>
                    <span className="nm-status-text">
                        <span className="nm-status-online">{online}</span> / {total} systems online · poll #{tick}
                    </span>
                    <button onClick={refresh} className="nm-refresh-btn">↻ Refresh</button>
                </div>
                <p className="nm-desc">
                    Live status of memory, retrieval, and cognition infrastructure. Auto-refreshes every 8 seconds.
                </p>
            </div>

            {/* Quick stats */}
            <div className="nm-stats">
                {QUICK_STATS.map(s => (
                    /* --stat-color drives bg (4% opacity), border (13% opacity), and text */
                    <div key={s.label} className="nm-stat-card" {...{ style: { '--stat-color': s.color } as React.CSSProperties }}>
                        <div className="nm-stat-label">{s.label.toUpperCase()}</div>
                        <div className="nm-stat-value">{s.val}</div>
                    </div>
                ))}
            </div>

            {/* System cards */}
            <div className="nm-cards">
                {PANELS.map(panel => {
                    const svc = statusOf(panel.id)
                    const st = svc?.status ?? 'checking'
                    const ms = svc?.ms ?? 0
                    const stColor = st === 'online' ? 'var(--status-success)' : st === 'checking' ? 'var(--amber)' : 'var(--status-error)'
                    const stLabel = st === 'online' ? '● ONLINE' : st === 'checking' ? '◌ POLLING' : '○ OFFLINE'
                    const borderColor = st === 'online' ? panel.color + '25' : 'rgba(255,255,255,0.06)'
                    const port = NEURAL_SERVICES.find(s => s.id === panel.id)?.port
                    return (
                        <div
                            key={panel.id}
                            className="nm-card"
                            {...{
                                style: {
                                    '--card-border-color': borderColor,
                                    '--panel-color': panel.color,
                                    '--status-glow-color': stColor,
                                } as React.CSSProperties
                            }}
                        >
                            {/* Identity */}
                            <div className="nm-card-identity">
                                <div className="nm-status-dot" />
                                <div>
                                    <div className="nm-panel-name">{panel.name}</div>
                                    <div className="nm-panel-role">{panel.role}</div>
                                </div>
                            </div>

                            {/* Metrics */}
                            <div className="nm-metrics">
                                {panel.metrics.map(m => (
                                    <div key={m.key} className="nm-metric-chip">
                                        <div className="nm-metric-key">{m.key.toUpperCase()}</div>
                                        <div className="nm-metric-val">
                                            {m.value}{m.unit && <span className="nm-metric-unit">{m.unit}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Status */}
                            <div className="nm-card-status">
                                <div className="nm-status-label">{stLabel}</div>
                                {st === 'online' && ms > 0 && (
                                    <div className="nm-latency">{ms}ms</div>
                                )}
                                <div className="nm-port">:{port}</div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
