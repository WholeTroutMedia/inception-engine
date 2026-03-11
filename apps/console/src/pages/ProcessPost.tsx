import { useState } from 'react'
import './ProcessPost.css'

// ── Types (inline for console isolation) ─────────────────────────

type EntryType =
    | 'engine_task' | 'user_prompt' | 'asset_created'
    | 'asset_revised' | 'collaboration' | 'milestone' | 'provenance' | 'snapshot'

interface TimelineEntry {
    id: string
    type: EntryType
    timestamp: string
    engine?: string
    author?: string
    title: string
    description: string
    assetId?: string
    thumbnailUrl?: string
    tags: string[]
}

// ── Demo Data ─────────────────────────────────────────────────────

const DEMO_ENTRIES: TimelineEntry[] = [
    {
        id: 'e1', type: 'user_prompt', timestamp: new Date(Date.now() - 3600000).toISOString(),
        author: 'Justin', title: 'Initial Director Brief',
        description: 'Create a 60-second brand film with cinematic 3D logo reveal, lo-fi score, and warm color grading.',
        tags: ['brand', 'video', 'music'],
    },
    {
        id: 'e2', type: 'engine_task', timestamp: new Date(Date.now() - 3200000).toISOString(),
        engine: '3D', author: 'IE 3D', title: '3D Logo Geometry Generated',
        description: 'Generated USD scene with Creative Liberation Engine wordmark. PBR materials applied. 4 camera angles rendered.',
        assetId: 'logo-3d-001', tags: ['3d', 'render'],
    },
    {
        id: 'e3', type: 'engine_task', timestamp: new Date(Date.now() - 2800000).toISOString(),
        engine: 'AUDIO', author: 'IE Audio', title: 'Lo-Fi Score Composed',
        description: '16-bar lo-fi beat with vinyl crackle, Rhodes piano, and 808 sub. Exported at 48kHz WAV.',
        assetId: 'score-lofi-001', tags: ['music', 'audio'],
    },
    {
        id: 'e4', type: 'asset_created', timestamp: new Date(Date.now() - 2400000).toISOString(),
        engine: 'VIDEO', author: 'IE Video', title: 'Timeline Assembly v1',
        description: 'Assembled 60-second cut. Kinetic text intro (0:00-0:08), 3D reveal (0:08-0:30), tagline outro.',
        assetId: 'brand-film-v1', tags: ['video', 'edit'],
    },
    {
        id: 'e5', type: 'asset_revised', timestamp: new Date(Date.now() - 1800000).toISOString(),
        engine: 'VIDEO', author: 'IE Video', title: 'Color Grade Applied',
        description: "Warm trichromatic grade applied. Lifted shadows to +12, orange mid-tone push, crushed whites.",
        assetId: 'brand-film-v2', tags: ['color', 'grade'],
    },
    {
        id: 'e6', type: 'provenance', timestamp: new Date(Date.now() - 900000).toISOString(),
        author: 'IE Blockchain', title: 'C2PA Manifest Recorded',
        description: 'Provenance manifest generated. SHA-256 hash anchored. Royalty splits: 80% creator / 10% platform.',
        tags: ['provenance', 'blockchain'],
    },
    {
        id: 'e7', type: 'milestone', timestamp: new Date(Date.now() - 300000).toISOString(),
        author: 'AVERI', title: '🎉 Brand Film — DELIVERED',
        description: 'All VERIFY gates passed. Exported 4K ProRes + H.264 web version. Ready for client delivery.',
        tags: ['milestone', 'delivered'],
    },
]

const ENGINE_COLORS: Record<string, string> = {
    VIDEO: '#e8794a', AUDIO: '#a78bfa', '3D': '#34d399',
    DESIGN: '#60a5fa', CODE: '#f59e0b', ASSETS: '#94a3b8',
}

const ENTRY_ICONS: Record<EntryType, string> = {
    engine_task: '⚙', user_prompt: '◆', asset_created: '✦',
    asset_revised: '↺', collaboration: '◉', milestone: '🎯',
    provenance: '⛓', snapshot: '◎',
}

const ENTRY_COLORS: Record<EntryType, string> = {
    engine_task: '#60a5fa', user_prompt: '#e2e8f0', asset_created: '#34d399',
    asset_revised: '#f59e0b', collaboration: '#a78bfa', milestone: '#e8794a',
    provenance: '#94a3b8', snapshot: '#475569',
}

function formatTime(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
}

// ── Page ──────────────────────────────────────────────────────────

export default function ProcessPost() {
    const [filter, setFilter] = useState<EntryType | 'all'>('all')
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const filtered = filter === 'all'
        ? DEMO_ENTRIES
        : DEMO_ENTRIES.filter(e => e.type === filter)

    const selected = DEMO_ENTRIES.find(e => e.id === selectedId)

    const FILTER_OPTS: Array<{ value: EntryType | 'all'; label: string }> = [
        { value: 'all', label: 'All' },
        { value: 'user_prompt', label: 'Prompts' },
        { value: 'engine_task', label: 'Engine' },
        { value: 'asset_created', label: 'Created' },
        { value: 'milestone', label: 'Milestones' },
        { value: 'provenance', label: 'Provenance' },
    ]

    return (
        <div className="process-post-page">
            {/* Header */}
            <div className="pp-header">
                <div className="pp-title-row">
                    <span className="pp-icon">◉</span>
                    <div>
                        <h1 className="pp-title">The Process</h1>
                        <p className="pp-subtitle">SOCIAL MODE — Creative Timeline · Brand Film Prototype</p>
                    </div>
                </div>
                <div className="pp-filter-row">
                    {FILTER_OPTS.map(opt => (
                        <button
                            key={opt.value}
                            className={`pp-filter-btn ${filter === opt.value ? 'active' : ''}`}
                            onClick={() => setFilter(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pp-layout">
                {/* Timeline */}
                <div className="pp-timeline">
                    {filtered.map((entry, idx) => (
                        <div
                            key={entry.id}
                            className={`pp-entry ${selectedId === entry.id ? 'selected' : ''}`}
                            onClick={() => setSelectedId(selectedId === entry.id ? null : entry.id)}
                        >
                            {/* Connector */}
                            <div className="pp-connector">
                                <div
                                    className="pp-entry-dot"
                                    style={{ '--dot-color': ENTRY_COLORS[entry.type] } as React.CSSProperties}
                                />
                                {idx < filtered.length - 1 && <div className="pp-connector-line" />}
                            </div>

                            {/* Card */}
                            <div className="pp-card" style={{ '--card-border': (entry.engine ? ENGINE_COLORS[entry.engine] : ENTRY_COLORS[entry.type]) + '33' } as React.CSSProperties}>
                                <div className="pp-card-header">
                                    <span className="pp-entry-icon">{ENTRY_ICONS[entry.type]}</span>
                                    <span className="pp-card-title">{entry.title}</span>
                                    <span className="pp-card-time" title={new Date(entry.timestamp).toLocaleString()}>
                                        {formatRelative(entry.timestamp)}
                                    </span>
                                </div>
                                <p className="pp-card-desc">{entry.description}</p>
                                <div className="pp-card-footer">
                                    {entry.engine && (
                                        <span className="pp-badge engine" style={{ '--engine-color': ENGINE_COLORS[entry.engine] } as React.CSSProperties}>
                                            {entry.engine}
                                        </span>
                                    )}
                                    {entry.author && (
                                        <span className="pp-badge author">{entry.author}</span>
                                    )}
                                    {entry.tags.map(tag => (
                                        <span key={tag} className="pp-badge tag">#{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detail Panel */}
                {selected && (
                    <div className="pp-detail">
                        <div className="pp-detail-header">
                            <span>{ENTRY_ICONS[selected.type]}</span>
                            <span className="pp-detail-title">{selected.title}</span>
                            <button className="pp-detail-close" onClick={() => setSelectedId(null)}>×</button>
                        </div>
                        <div className="pp-detail-body">
                            <div className="pp-detail-row">
                                <span className="pp-detail-label">TIME</span>
                                <span className="pp-detail-value">{formatTime(selected.timestamp)}</span>
                            </div>
                            {selected.engine && (
                                <div className="pp-detail-row">
                                    <span className="pp-detail-label">ENGINE</span>
                                    <span className="pp-detail-value" style={{ '--engine-color': ENGINE_COLORS[selected.engine] } as React.CSSProperties}>{selected.engine}</span>
                                </div>
                            )}
                            {selected.author && (
                                <div className="pp-detail-row">
                                    <span className="pp-detail-label">AUTHOR</span>
                                    <span className="pp-detail-value">{selected.author}</span>
                                </div>
                            )}
                            {selected.assetId && (
                                <div className="pp-detail-row">
                                    <span className="pp-detail-label">ASSET</span>
                                    <code className="pp-detail-code">{selected.assetId}</code>
                                </div>
                            )}
                            <p className="pp-detail-desc">{selected.description}</p>
                            <div className="pp-detail-tags">
                                {selected.tags.map(t => <span key={t} className="pp-badge tag">#{t}</span>)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
