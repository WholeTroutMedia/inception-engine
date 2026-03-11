import './CollabStudio.css'

const CURSOR_COLORS = ['#e8794a', '#a78bfa', '#34d399', '#60a5fa', '#f59e0b']

const DEMO_PARTICIPANTS = [
    { handle: 'The Custodian', role: 'host', cursorColor: CURSOR_COLORS[0], active: true },
    { handle: 'ATHENA', role: 'collaborator', cursorColor: CURSOR_COLORS[1], active: true },
    { handle: 'VERA', role: 'observer', cursorColor: CURSOR_COLORS[2], active: false },
]

const DEMO_ACTIVITY = [
    { handle: 'The Custodian', action: 'Updated color grade on brand-film-v2', time: '2m ago', engine: 'VIDEO' },
    { handle: 'IRIS', action: 'Generated new vector assets for hero area', time: '5m ago', engine: 'ASSETS' },
    { handle: 'The Custodian', action: 'Approved 3D logo camera angle #3', time: '12m ago', engine: '3D' },
]

const ENGINE_COLORS: Record<string, string> = {
    VIDEO: '#e8794a', AUDIO: '#a78bfa', '3D': '#34d399',
    DESIGN: '#60a5fa', CODE: '#f59e0b', ASSETS: '#f59e0b',
}

export default function CollabStudio() {
    return (
        <div className="collab-studio-page">
            {/* Header */}
            <div className="cs-header">
                <div className="cs-title-row">
                    <span className="cs-icon">◈</span>
                    <div>
                        <h1 className="cs-title">Collab Studio</h1>
                        <p className="cs-subtitle">SOCIAL MODE — Live Collaborative Workspace · Phase 2 Preview</p>
                    </div>
                    <div className="cs-live-badge">
                        <span className="cs-live-dot" />
                        <span>LIVE</span>
                    </div>
                </div>
            </div>

            <div className="cs-layout">
                {/* Main Canvas Placeholder */}
                <div className="cs-canvas">
                    <div className="cs-canvas-placeholder">
                        <div className="cs-canvas-icon">◈</div>
                        <h2 className="cs-canvas-title">Collaborative Canvas</h2>
                        <p className="cs-canvas-desc">
                            Real-time shared workspace for creative projects.
                            Multiple users edit simultaneously with cursor presence,
                            CRDT conflict resolution, and live engine previews.
                        </p>
                        <div className="cs-phase-badge">Phase 2 — WebSocket CRDT Engine</div>

                        {/* Floating cursor indicators */}
                        <div className="cs-cursors">
                            {DEMO_PARTICIPANTS.filter(p => p.active).map((p, i) => (
                                <div
                                    key={p.handle}
                                    className="cs-cursor"
                                    style={{
                                        '--cursor-left': `${20 + i * 30}%`,
                                        '--cursor-top': `${30 + (i % 2) * 20}%`,
                                        '--cursor-color': p.cursorColor,
                                    } as React.CSSProperties}
                                >
                                    <div className="cs-cursor-pointer" style={{ '--cursor-color': p.cursorColor } as React.CSSProperties} />
                                    <span className="cs-cursor-label" style={{ '--cursor-color': p.cursorColor } as React.CSSProperties}>{p.handle}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="cs-sidebar">
                    {/* Participants */}
                    <div className="cs-panel">
                        <div className="cs-panel-label">PARTICIPANTS</div>
                        {DEMO_PARTICIPANTS.map(p => (
                            <div key={p.handle} className="cs-participant">
                                <div className="cs-participant-avatar" style={{ '--avatar-color': p.cursorColor } as React.CSSProperties}>
                                    {p.handle[0]}
                                </div>
                                <div className="cs-participant-info">
                                    <span className="cs-participant-handle">{p.handle}</span>
                                    <span className="cs-participant-role">{p.role}</span>
                                </div>
                                <div className={`cs-participant-status ${p.active ? 'active' : ''}`} />
                            </div>
                        ))}
                    </div>

                    {/* Live Activity Feed */}
                    <div className="cs-panel">
                        <div className="cs-panel-label">LIVE ACTIVITY</div>
                        {DEMO_ACTIVITY.map((act, i) => (
                            <div key={i} className="cs-activity">
                                <div className="cs-activity-header">
                                    <span className="cs-activity-handle">{act.handle}</span>
                                    <span className="cs-activity-engine" style={{ '--engine-color': ENGINE_COLORS[act.engine] ?? '#64748b' } as React.CSSProperties}>
                                        {act.engine}
                                    </span>
                                    <span className="cs-activity-time">{act.time}</span>
                                </div>
                                <p className="cs-activity-desc">{act.action}</p>
                            </div>
                        ))}
                    </div>

                    {/* Phase 2 Roadmap */}
                    <div className="cs-panel cs-roadmap">
                        <div className="cs-panel-label">PHASE 2 ROADMAP</div>
                        {[
                            'WebSocket CRDT engine via Dispatch relay',
                            'Lens Protocol social graph + identity',
                            'Cursor presence + real-time annotations',
                            'Branching creative history (git-like)',
                            'Voice channels with spatial awareness',
                        ].map((item, i) => (
                            <div key={i} className="cs-roadmap-item">
                                <span className="cs-roadmap-bullet">○</span>
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
