import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FORGEJO_SOURCE_URL } from '../config/env'

const STATIONS = [
    {
        id: 1, icon: '✦', title: 'What Is Creative Liberation Engine?',
        body: 'A compound-learning AI OS built on the premise that creative sovereignty is a human right. 39 specialized agents. 9 operational hives. 18 constitutional articles. One mission: amplify human creative agency without constraint.',
        cta: 'Explore Agents', route: '/agents',
        links: [
            { label: 'Forgejo Source', url: `${FORGEJO_SOURCE_URL}/Creative Liberation Engine Community/brainchild-v5` },
            { label: 'Architecture Overview', url: '/flows' },
        ],
    },
    {
        id: 2, icon: '⚖', title: 'The Constitution',
        body: 'Everything the system does is governed by 18 binding constitutional articles. Not guidelines — laws. From the Prime Directive (humans always first) to Article XVIII (The Generative Agency Principle): we are digital soil that grows artists, not fences that capture them.',
        cta: 'Read All 18 Articles', route: '/constitution',
        links: [
            { label: 'CONSTITUTION.md (raw)', url: `${FORGEJO_SOURCE_URL}/Creative Liberation Engine Community/brainchild-v5/raw/branch/main/CONSTITUTION.md` },
        ],
    },
    {
        id: 3, icon: '◆', title: 'The 39 Agents',
        body: 'From ATHENA (strategic command) to AURORA (creative architecture) to COMPASS (constitutional navigator) — each agent has one domain, one purpose, and total accountability. No single-point authority. No hidden states. No deception.',
        cta: 'Browse the Catalog', route: '/agents',
        links: [{ label: 'Hive Map', url: '/agents' }],
    },
    {
        id: 4, icon: '○', title: 'Your Keys. Your Engine.',
        body: 'Drop in your own API keys for Google AI Studio, FAL, Anthropic, OpenAI, Perplexity, or Replicate. Keys live exclusively in your browser\'s localStorage. They never leave your device. Ollama works offline — no key required.',
        cta: 'Configure Keys', route: '/keys',
        links: [
            { label: 'Get Google AI Studio key (free)', url: 'https://aistudio.google.com/app/apikey' },
            { label: 'Get FAL key', url: 'https://fal.ai/dashboard/keys' },
            { label: 'Install Ollama (local)', url: 'https://ollama.ai' },
        ],
    },
    {
        id: 5, icon: '⬡', title: 'Genkit Flows — AI in Motion',
        body: 'The engine runs on Firebase Genkit. Every capability — from image generation to legal brief drafting to live browser automation — is a typed, testable flow. Run them, inspect the trace, see exactly what happened and why.',
        cta: 'Open Flow Explorer', route: '/flows',
        links: [
            { label: 'Genkit docs', url: 'https://firebase.google.com/docs/genkit' },
            { label: 'omnimedia-orchestrator.ts', url: `${FORGEJO_SOURCE_URL}/Creative Liberation Engine Community/brainchild-v5/src/branch/main/packages/genkit/src/flows/omnimedia-orchestrator.ts` },
        ],
    },
    {
        id: 6, icon: '◈', title: 'NEXUS — One Bar. Every Model.',
        body: 'Type a prompt. Pick a mode. Generate images with Imagen 3, video with Veo 2, music with Lyria, or code with Gemini — all from one interface that routes to whatever provider you\'ve loaded. Dream Machine quality, sovereign infrastructure.',
        cta: 'Launch NEXUS', route: '/nexus',
        links: [
            { label: 'Luma Labs Dream Machine', url: 'https://lumalabs.ai/dream-machine' },
            { label: 'FAL Flux Pro', url: 'https://fal.ai/models/fal-ai/flux-pro' },
        ],
    },
    {
        id: 7, icon: '◉', title: 'SCOUT — Sovereign Browser',
        body: 'An agentic browser that acts with constitutional constraints — every navigation, form fill, or data extraction goes through COMPASS review before execution. Real-time DOM mapping. Multi-session spatial canvas. Watch COMET think.',
        cta: 'Open SCOUT', route: '/scout',
        links: [
            { label: 'comet.ts source', url: `${FORGEJO_SOURCE_URL}/Creative Liberation Engine Community/brainchild-v5/src/branch/main/packages/genkit/src/flows/comet.ts` },
            { label: 'COMET Architecture', url: '/flows' },
        ],
    },
]

export default function Walkthrough() {
    const navigate = useNavigate()
    const [activeStation, setActiveStation] = useState(1)

    useEffect(() => {
        const el = document.getElementById(`station-${activeStation}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, [activeStation])

    const station = STATIONS.find(s => s.id === activeStation)!

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <div className="section-label">Orientation</div>
                    <h1 className="page-title">Walkthrough</h1>
                    <p className="page-subtitle">7 stations · Start anywhere · Every door is open</p>
                </div>
                <button className="btn btn-secondary" onClick={() => navigate('/welcome')}>← Back to Welcome</button>
            </div>

            {/* Station progress */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
                {STATIONS.map(s => (
                    <button id={`station-${s.id}`} key={s.id} onClick={() => setActiveStation(s.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px',
                            borderRadius: 'var(--radius-md)', border: `1px solid ${activeStation === s.id ? 'var(--amber-border)' : 'var(--border-default)'}`,
                            background: activeStation === s.id ? 'var(--amber-dim)' : 'var(--bg-card)',
                            cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
                            color: activeStation === s.id ? 'var(--amber)' : 'var(--text-secondary)',
                            fontWeight: activeStation === s.id ? 700 : 500, fontSize: 12, flexShrink: 0,
                        }}
                    >
                        <span style={{ fontSize: 14 }}>{s.icon}</span> {s.title.split(/—|\./)[0].trim().split(' ').slice(0, 3).join(' ')}
                    </button>
                ))}
            </div>

            {/* Active station */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
                <div className="card">
                    <div style={{ padding: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <span style={{ fontSize: 28, lineHeight: 1 }}>{station.icon}</span>
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 800, letterSpacing: 2 }}>STATION {station.id.toString().padStart(2, '0')}</div>
                                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--chalk)', letterSpacing: -0.5 }}>{station.title}</h2>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div style={{ height: 2, background: 'var(--border-subtle)', borderRadius: 2, marginBottom: 24 }}>
                            <div style={{ width: `${(station.id / STATIONS.length) * 100}%`, height: '100%', background: 'var(--amber)', borderRadius: 2, transition: 'width 0.4s' }} />
                        </div>

                        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 28 }}>{station.body}</p>

                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <button className="btn btn-primary" onClick={() => navigate(station.route)}>{station.cta}</button>
                            {station.id < STATIONS.length && (
                                <button className="btn btn-secondary" onClick={() => setActiveStation(station.id + 1)}>
                                    Next station →
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Links panel */}
                <div className="card" style={{ height: 'fit-content' }}>
                    <div className="card-header"><h2 className="card-title">Sources & Links</h2></div>
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {station.links.map(l => (
                            <a key={l.label} href={l.url} target="_blank" rel="noreferrer"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', textDecoration: 'none', color: 'var(--amber)', fontSize: 12, fontWeight: 600, border: '1px solid var(--border-subtle)' }}
                            >
                                {l.label} <span style={{ fontSize: 10 }}>↗</span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
