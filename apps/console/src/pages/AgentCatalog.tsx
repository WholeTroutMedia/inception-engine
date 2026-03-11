import { useState } from 'react'

/* ── Agent data ──────────────────────────────────────────────── */
const AGENTS = [
    // AURORA hive
    { id: 'athena', name: 'ATHENA', hive: 'AURORA', role: 'Supreme Orchestrator', mode: 'IDEATE', color: '#F5A524', lead: true, desc: 'Strategic command, agent dispatch, constitutional guardian. The mind of Genesis.' },
    { id: 'vera', name: 'VERA', hive: 'AURORA', role: 'Vision & Research', mode: 'IDEATE', color: '#F5A524', lead: false, desc: 'Deep research synthesis, vision extraction, competitive analysis, trend mapping.' },
    { id: 'iris', name: 'IRIS', hive: 'AURORA', role: 'Creative Director', mode: 'IDEATE', color: '#F5A524', lead: false, desc: 'Aesthetic vision, brand identity, design language decisions, creative leadership.' },
    // AVERI continuation
    { id: 'averi-1', name: 'AVERI-1', hive: 'AVERI', role: 'Intake Specialist', mode: 'PLAN', color: '#C17D4A', lead: true, desc: 'Client onboarding, smart intake sessions, project intent extraction, brief generation.' },
    { id: 'averi-2', name: 'AVERI-2', hive: 'AVERI', role: 'Brief Synthesiser', mode: 'PLAN', color: '#C17D4A', lead: false, desc: 'Creative brief generation from raw client input. Identifies scope, deliverables, timeline.' },
    { id: 'lex-1', name: 'LEX-1', hive: 'LEX', role: 'Contract Drafter', mode: 'PLAN', color: '#4285F4', lead: true, desc: 'AI-driven legal contract generation. Jurisdiction-aware, multi-clause, Stripe integration.' },
    { id: 'lex-2', name: 'LEX-2', hive: 'LEX', role: 'Compliance Officer', mode: 'VALIDATE', color: '#4285F4', lead: false, desc: 'Reviews agent outputs against constitutional articles. Flag, reject, or surface violations.' },
    // KEEPER hive
    { id: 'keeper-1', name: 'KEEPER-1', hive: 'KEEPER', role: 'Memory Archivist', mode: 'SHIP', color: '#9B72CF', lead: true, desc: 'Manages ChromaDB vector store, RAG retrieval, session context, and memory operations.' },
    { id: 'keeper-2', name: 'KEEPER-2', hive: 'KEEPER', role: 'Knowledge Synthesiser', mode: 'IDEATE', color: '#9B72CF', lead: false, desc: 'Distills conversations into persistent knowledge items. Builds long-term institutional memory.' },
    { id: 'keeper-3', name: 'KEEPER-3', hive: 'KEEPER', role: 'Search & Retrieval', mode: 'SHIP', color: '#9B72CF', lead: false, desc: 'Semantic and hybrid search across the knowledge base. Ranks by relevance and recency.' },
    { id: 'keeper-4', name: 'KEEPER-4', hive: 'KEEPER', role: 'NAS Sync Agent', mode: 'SHIP', color: '#9B72CF', lead: false, desc: 'Bi-directional sync between local memory and Synology NAS sovereign storage.' },
    { id: 'keeper-5', name: 'KEEPER-5', hive: 'KEEPER', role: 'GitHub Memory Store', mode: 'SHIP', color: '#9B72CF', lead: false, desc: 'Pushes distilled knowledge to GitHub for persistent cross-session AI memory.' },
    // SWITCHBOARD hive
    { id: 'relay', name: 'RELAY', hive: 'SWITCHBOARD', role: 'Provider Router', mode: 'SHIP', color: '#22c55e', lead: true, desc: 'Routes AI requests across providers with fallback/retry logic and constitutional middleware.' },
    { id: 'switchboard-2', name: 'NEXUS', hive: 'SWITCHBOARD', role: 'Model Selector', mode: 'SHIP', color: '#22c55e', lead: false, desc: 'Dynamic model selection based on task requirements, latency targets, and cost constraints.' },
    { id: 'scribe', name: 'SCRIBE', hive: 'SWITCHBOARD', role: 'Session Recorder', mode: 'SHIP', color: '#22c55e', lead: false, desc: 'Logs all AI interactions, decisions, and outputs for traceability and constitutional review.' },
    { id: 'genkit-bridge', name: 'BRIDGE', hive: 'SWITCHBOARD', role: 'Genkit Bridge', mode: 'SHIP', color: '#22c55e', lead: false, desc: 'Sidecar service enabling v4 Python engine to use v5 Genkit multi-provider orchestration.' },
    // BROADCAST hive
    { id: 'atlas', name: 'ATLAS', hive: 'BROADCAST', role: 'NBC Lead', mode: 'SHIP', color: '#FF6B35', lead: true, desc: 'Leads NBC Nexus broadcast platform. Coordinates content pipeline, scheduling, publishing.' },
    { id: 'broadcast-2', name: 'DIRECTOR', hive: 'BROADCAST', role: 'Content Director', mode: 'SHIP', color: '#FF6B35', lead: false, desc: 'Directs AI-generated video content. Story structure, shot selection, edit motivation.' },
    { id: 'broadcast-3', name: 'HERALD', hive: 'BROADCAST', role: 'Copy Writer', mode: 'SHIP', color: '#FF6B35', lead: false, desc: 'Writes broadcast copy, headlines, on-air scripts, and social captions at production speed.' },
    { id: 'broadcast-4', name: 'SIGMA', hive: 'BROADCAST', role: 'Social Publisher', mode: 'SHIP', color: '#FF6B35', lead: false, desc: 'Schedules and publishes content across social platforms with optimal timing and format.' },
    { id: 'broadcast-5', name: 'MOSAIC', hive: 'BROADCAST', role: 'Visual Composer', mode: 'SHIP', color: '#FF6B35', lead: false, desc: 'Assembles multi-image moodboards, brand galleries, and visual identity systems from prompts.' },
    // SPECIALIST hive
    { id: 'nexus-gen', name: 'GEN-1', hive: 'SPECIALIST', role: 'Image Generator', mode: 'SHIP', color: '#20B2AA', lead: true, desc: 'Specialised in multimodal image creation via Imagen, Flux, SDXL. Handles batch pipelines.' },
    { id: 'specialist-2', name: 'VEO', hive: 'SPECIALIST', role: 'Video Generator', mode: 'SHIP', color: '#20B2AA', lead: false, desc: 'End-to-end video generation with Veo 2, WAN, LTX. Handles I2V, T2V, extend workflows.' },
    { id: 'specialist-3', name: 'LYRA', hive: 'SPECIALIST', role: 'Audio Composer', mode: 'SHIP', color: '#20B2AA', lead: false, desc: 'Generates music, SFX, and voiceover with Lyria 2, MusicGen, and ElevenLabs.' },
    // VALIDATOR hive
    { id: 'ghost', name: 'GHOST', hive: 'VALIDATOR', role: 'QA Lead', mode: 'VALIDATE', color: '#ef4444', lead: true, desc: 'Runs automated QA across agent outputs. Validates against constitutional rubric and spec.' },
    { id: 'validator-2', name: 'AUDITOR', hive: 'VALIDATOR', role: 'Constitutional Auditor', mode: 'VALIDATE', color: '#ef4444', lead: false, desc: 'Deep review of agent chains for constitutional compliance. Issues violation reports.' },
    // ENHANCEMENT hive
    { id: 'optimus', name: 'OPTIMUS', hive: 'ENHANCEMENT', role: 'Self-Optimiser', mode: 'VALIDATE', color: '#8B5CF6', lead: true, desc: 'Monitors engine performance and proposes agent, prompt, and architecture improvements.' },
    { id: 'enhance-2', name: 'MENTOR', hive: 'ENHANCEMENT', role: 'Learning Engine', mode: 'IDEATE', color: '#8B5CF6', lead: false, desc: 'Analyses past sessions to surface learnings, update strategies, and retrain model views.' },
]

const HIVES = [...new Set(AGENTS.map(a => a.hive))]
const MODES = ['ALL', 'IDEATE', 'PLAN', 'SHIP', 'VALIDATE']

const MODE_COLORS: Record<string, string> = {
    IDEATE: '#F5A524',
    PLAN: '#4285F4',
    SHIP: '#22c55e',
    VALIDATE: '#ef4444',
}

export default function AgentCatalog() {
    const [hiveFilter, setHiveFilter] = useState<string>('ALL')
    const [modeFilter, setModeFilter] = useState<string>('ALL')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<typeof AGENTS[0] | null>(null)

    const filtered = AGENTS.filter(a =>
        (hiveFilter === 'ALL' || a.hive === hiveFilter) &&
        (modeFilter === 'ALL' || a.mode === modeFilter) &&
        (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase()))
    )

    const hiveAgents = (h: string) => filtered.filter(a => a.hive === h)
    const visibleHives = hiveFilter === 'ALL' ? HIVES.filter(h => hiveAgents(h).length > 0) : [hiveFilter]

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column' }}>

            {/* ── Header ───────────────────────────────────────── */}
            <div style={{ padding: '32px 40px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--accent-1)', fontWeight: 900, letterSpacing: 3, marginBottom: 10 }}>AGENT ROSTER</div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1.5, color: 'var(--chalk)', margin: 0, flex: 1 }}>
                        39 Agents · 9 Hives
                    </h1>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search agents…"
                        style={{
                            padding: '8px 14px', background: 'var(--surface-2)',
                            border: '1px solid var(--border-default)', borderRadius: 100,
                            fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--chalk)', outline: 'none', width: 200,
                            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)'
                        }}
                    />
                </div>

                {/* Filter strips */}
                <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {['ALL', ...HIVES].map(h => {
                            const agents = AGENTS.filter(a => a.hive === h)
                            const color = h === 'ALL' ? 'var(--chalk)' : AGENTS.find(a => a.hive === h)?.color ?? 'var(--text-tertiary)'
                            return (
                                <button key={h} onClick={() => setHiveFilter(h)} style={{
                                    padding: '5px 12px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                                    background: hiveFilter === h ? `${color}20` : 'var(--surface-2)',
                                    color: hiveFilter === h ? color : 'var(--text-tertiary)',
                                    border: `1px solid ${hiveFilter === h ? `${color}50` : 'var(--border-subtle)'}`,
                                    cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                                    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)'
                                }}>{h === 'ALL' ? 'ALL HIVES' : h} {h !== 'ALL' && `(${agents.length})`}</button>
                            )
                        })}
                    </div>
                    <div style={{ height: 28, width: 1, background: 'var(--border-subtle)', alignSelf: 'center' }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                        {MODES.map(m => (
                            <button key={m} onClick={() => setModeFilter(m)} style={{
                                padding: '5px 12px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                                background: modeFilter === m ? `${MODE_COLORS[m] ?? 'var(--chalk)'}20` : 'var(--surface-2)',
                                color: modeFilter === m ? (MODE_COLORS[m] ?? 'var(--chalk)') : 'var(--text-tertiary)',
                                border: `1px solid ${modeFilter === m ? `${MODE_COLORS[m] ?? 'rgba(255,255,255,0.2)'}50` : 'var(--border-subtle)'}`,
                                cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)'
                            }}>{m}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Main: Hive sections with agent cards ─────────── */}
            <div style={{ flex: 1, padding: '28px 40px 120px', overflowY: 'auto' }}>
                {visibleHives.map(hive => {
                    const agents = hiveAgents(hive)
                    if (!agents.length) return null
                    const hiveColor = agents[0].color
                    const lead = agents.find(a => a.lead)
                    return (
                        <div key={hive} style={{ marginBottom: 40 }}>
                            {/* Hive header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: hiveColor, display: 'inline-block', boxShadow: `0 0 8px ${hiveColor}`, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, fontWeight: 900, color: hiveColor, letterSpacing: 2 }}>{hive}</span>
                                {lead && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Lead: {lead.name}</span>}
                                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)' }}>{agents.length} agents</span>
                            </div>

                            {/* Masonry-style card grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                                {agents.map(agent => (
                                    <div
                                        key={agent.id}
                                        onClick={() => setSelected(selected?.id === agent.id ? null : agent)}
                                        style={{
                                            padding: '18px',
                                            border: `1px solid ${selected?.id === agent.id ? `${agent.color}50` : agent.lead ? `${agent.color}22` : 'var(--border-subtle)'}`,
                                            borderRadius: 14, cursor: 'pointer',
                                            background: selected?.id === agent.id ? `${agent.color}0a` : 'var(--surface-2)',
                                            transition: 'all 0.15s',
                                            backdropFilter: 'blur(20px)',
                                            WebkitBackdropFilter: 'blur(20px)'
                                        }}
                                        onMouseEnter={e => { if (selected?.id !== agent.id) { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.borderColor = `${agent.color}30` } }}
                                        onMouseLeave={e => { if (selected?.id !== agent.id) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = agent.lead ? `${agent.color}22` : 'var(--border-subtle)' } }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 900, color: agent.color, letterSpacing: 0.5 }}>{agent.name}</span>
                                                    {agent.lead && (
                                                        <span style={{ fontSize: 8, fontWeight: 800, color: agent.color, background: `${agent.color}18`, padding: '1px 6px', borderRadius: 100, letterSpacing: 0.8 }}>LEAD</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{agent.role}</div>
                                            </div>
                                            <span style={{
                                                fontSize: 8, fontWeight: 800, letterSpacing: 1, padding: '3px 8px', borderRadius: 100,
                                                background: `${MODE_COLORS[agent.mode] ?? 'var(--bg-elevated)'}18`,
                                                color: MODE_COLORS[agent.mode] ?? 'var(--text-tertiary)',
                                                border: `1px solid ${MODE_COLORS[agent.mode] ?? 'var(--border-default)'}30`,
                                                flexShrink: 0,
                                            }}>{agent.mode}</span>
                                        </div>
                                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{agent.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}

                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
                        No agents match your filter. <button onClick={() => { setHiveFilter('ALL'); setModeFilter('ALL'); setSearch('') }} style={{ color: 'var(--accent-1)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>Clear filters</button>
                    </div>
                )}
            </div>
        </div>
    )
}
