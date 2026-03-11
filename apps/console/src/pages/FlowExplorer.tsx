/**
 * FlowExplorer — Live Genkit Flow Registry
 * Fetches all flows/agents from /api/flows (live) with fallback to static data.
 * Rewrote from 8 hardcoded flows → 25+ live-discovered agents.
 */

import { useState, useEffect, useCallback } from 'react'
import './FlowExplorer.css'

const GENKIT_API = import.meta.env.VITE_GENKIT_URL ?? 'http://localhost:4100'

/* ── Types ────────────────────────────────────────────────────── */
interface FlowEndpoint {
    id: string
    method: string
    path: string
    agent: string
    description: string
}

interface LiveAgent {
    name: string
    hive: string
    role: string
    flow: string
    model: string
    color: string
    endpoint?: FlowEndpoint
}

interface FlowRegistry {
    total: number
    endpoint_count: number
    agents: LiveAgent[]
    endpoints: FlowEndpoint[]
    timestamp: string
}

/* ── Static fallback ──────────────────────────────────────────── */
const STATIC_AGENTS: LiveAgent[] = [
    { name: 'ATHENA', hive: 'AVERI', role: 'Strategist', flow: 'ATHENA', model: 'gemini-2.5-pro', color: '#F5A524', endpoint: { id: 'averi-ideate', method: 'POST', path: '/averi/ideate', agent: 'ATHENA', description: 'IDEATE mode: KEEPER recall → ATHENA strategic vision.' } },
    { name: 'VERA', hive: 'AVERI', role: 'Scribe', flow: 'VERA', model: 'gemini-2.5-pro', color: '#F5A524', endpoint: { id: 'search', method: 'POST', path: '/search', agent: 'VERA', description: 'Deep research via Perplexity Sonar.' } },
    { name: 'IRIS', hive: 'AVERI', role: 'Executor', flow: 'IRIS', model: 'gemini-2.0-flash', color: '#F5A524', endpoint: { id: 'creative-director', method: 'POST', path: '/flow/CreativeDirector', agent: 'IRIS', description: 'Creative vision document generation.' } },
    { name: 'AURORA', hive: 'AURORA', role: 'Architect', flow: 'AURORA', model: 'gemini-2.5-pro', color: '#C17D4A' },
    { name: 'BOLT', hive: 'AURORA', role: 'Builder', flow: 'BOLT', model: 'gemini-2.5-pro', color: '#C17D4A' },
    { name: 'COMET', hive: 'AURORA', role: 'Automator', flow: 'COMET', model: 'gemini-2.5-pro', color: '#C17D4A' },
    { name: 'KEEPER', hive: 'KEEPER', role: 'Knowledge', flow: 'KEEPER', model: 'gemini-2.0-flash', color: '#9B72CF', endpoint: { id: 'retrieve', method: 'POST', path: '/retrieve', agent: 'KEEPER', description: 'ChromaDB semantic search.' } },
    { name: 'RELAY', hive: 'SWITCHBOARD', role: 'Router', flow: 'RELAY', model: 'gemini-2.0-flash', color: '#22c55e', endpoint: { id: 'generate', method: 'POST', path: '/generate', agent: 'RELAY', description: 'Unified multi-provider completion.' } },
    { name: 'LEX', hive: 'LEX', role: 'Compliance', flow: 'LEX', model: 'gemini-2.0-flash', color: '#4285F4' },
    { name: 'SENTINEL', hive: 'VALIDATOR', role: 'Security', flow: 'SENTINEL', model: 'gemini-2.5-pro', color: '#ef4444', endpoint: { id: 'score', method: 'POST', path: '/score', agent: 'SENTINEL', description: 'Vision LoRA scoring (0-100).' } },
    { name: 'ATLAS', hive: 'BROADCAST', role: 'Lead', flow: 'ATLAS', model: 'gemini-2.5-pro', color: '#FF6B35', endpoint: { id: 'director', method: 'POST', path: '/director', agent: 'ATLAS', description: 'ATHENA Video EDL hype reel engine.' } },
]

const SAMPLE_INPUTS: Record<string, string> = {
    'averi-ideate': '{\n  "topic": "Creative Liberation Engine v5 launch strategy",\n  "depth": "deep"\n}',
    'averi-plan': '{\n  "topic": "Design system migration to Warm Trichromatic",\n  "depth": "deep"\n}',
    'creative-director': '{\n  "brief": {\n    "project_name": "GENESIS Launch",\n    "brand": "Creative Liberation Engine",\n    "tone": "spatial, premium, dark"\n  }\n}',
    'generate-media': '{\n  "prompt": "Dark editorial fashion photo, brand HORIZON",\n  "deliverable_type": "hero_image"\n}',
    'score': '{\n  "local_path": "/tmp/campaigns/hero.png",\n  "deliverable_type": "hero_image",\n  "vision_document": "Premium spatial aesthetic"\n}',
    'search': '{\n  "query": "Creative AI tools for independent studios 2026",\n  "model": "sonar-pro"\n}',
    'retrieve': '{\n  "query": "Warm Trichromatic design system tokens",\n  "nResults": 5\n}',
    'generate': '{\n  "prompt": "What is the Creative Liberation Engine?",\n  "model": "googleai/gemini-2.0-flash"\n}',
    'classify': '{\n  "userRequest": "Build a landing page for the GENESIS launch"\n}',
    'director': '{\n  "videoFiles": ["clip_01.mp4", "clip_02.mp4"],\n  "targetDuration": 60,\n  "mood": "cinematic, dark, premium"\n}',
    'stream': '{\n  "prompt": "Describe the Creative Liberation Engine in 3 sentences",\n  "model": "googleai/gemini-2.0-flash"\n}',
    // ── Dispatch flow samples ────────────────────────────────────
    'infra-docker': '{\n  "taskId": "test-001",\n  "title": "Add Dockerfile for inception-mcp service",\n  "workstream": "infra-docker",\n  "description": "Multi-stage Dockerfile for the inception-mcp Node 20 service"\n}',
    'comet-browser': '{\n  "taskId": "test-002",\n  "title": "Extract pricing from competitor page",\n  "workstream": "comet-browser",\n  "url": "https://example.com",\n  "objective": "Extract all pricing plans and feature lists"\n}',
    'generic-task': '{\n  "taskId": "test-003",\n  "title": "Document the nas-watcher daemon API",\n  "workstream": "inception-core",\n  "priority": "P1"\n}',
    'genkit-flow-builder': '{\n  "taskId": "test-004",\n  "title": "Create AnalyticsFlow for usage tracking",\n  "workstream": "genkit-flows",\n  "flowName": "analyticsFlow",\n  "agentName": "SENTINEL",\n  "hive": "VALIDATOR",\n  "purpose": "Track API usage, latency, and token cost per agent call"\n}',
    'gen-ui': '{\n  "componentName": "MetricCard",\n  "description": "A compact card showing a live metric with sparkline, title, trend indicator, and timestamp",\n  "variant": "card",\n  "darkMode": true,\n  "withStories": false,\n  "props": [\n    { "name": "title", "type": "string", "required": true, "description": "Metric label" },\n    { "name": "value", "type": "string | number", "required": true },\n    { "name": "trend", "type": "\\"up\\" | \\"down\\" | \\"flat\\"", "required": false },\n    { "name": "sparklineData", "type": "number[]", "required": false }\n  ]\n}',
}

const DEFAULT_INPUT = '{\n  "prompt": "Hello from Creative Liberation Engine"\n}'

const HIVE_ORDER = ['AVERI', 'AURORA', 'KEEPER', 'SWITCHBOARD', 'LEX', 'VALIDATOR', 'BROADCAST', 'SPECIALIST', 'ENHANCEMENT']

const MODEL_BADGE: Record<string, string> = {
    'gemini-2.5-pro': '2.5 PRO',
    'gemini-2.0-flash': '2.0 FLASH',
}

/* ── Main component ───────────────────────────────────────────── */
export default function FlowExplorer() {
    const [registry, setRegistry] = useState<FlowRegistry | null>(null)
    const [online, setOnline] = useState(false)
    const [loading, setLoading] = useState(true)
    const [hiveFilter, setHiveFilter] = useState('ALL')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<LiveAgent | null>(null)
    const [input, setInput] = useState(DEFAULT_INPUT)
    const [running, setRunning] = useState(false)
    const [output, setOutput] = useState<string | null>(null)
    const [runError, setRunError] = useState<string | null>(null)
    const [view, setView] = useState<'agents' | 'endpoints'>('agents')

    const fetchRegistry = useCallback(async () => {
        try {
            const r = await fetch(`${GENKIT_API}/api/flows`, { signal: AbortSignal.timeout(4000) })
            if (r.ok) {
                const data: FlowRegistry = await r.json()
                setRegistry(data)
                setOnline(true)
                if (!selected && data.agents.length > 0) {
                    const first = data.agents[0]
                    setSelected(first)
                    setInput(first.endpoint ? (SAMPLE_INPUTS[first.endpoint.id] ?? DEFAULT_INPUT) : DEFAULT_INPUT)
                }
            } else setOnline(false)
        } catch {
            setOnline(false)
            if (!selected) {
                setSelected(STATIC_AGENTS[0])
                setInput(SAMPLE_INPUTS[STATIC_AGENTS[0].endpoint?.id ?? ''] ?? DEFAULT_INPUT)
            }
        }
        setLoading(false)
    }, [selected])

    useEffect(() => { fetchRegistry() }, [fetchRegistry])

    const agents = registry?.agents ?? STATIC_AGENTS
    const endpoints = registry?.endpoints ?? []

    const filteredAgents = agents.filter(a =>
        (hiveFilter === 'ALL' || a.hive === hiveFilter) &&
        (!search || a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.role.toLowerCase().includes(search.toLowerCase()) ||
            a.hive.toLowerCase().includes(search.toLowerCase()))
    )

    const hives = [...new Set(agents.map(a => a.hive))].sort((a, b) =>
        (HIVE_ORDER.indexOf(a) ?? 99) - (HIVE_ORDER.indexOf(b) ?? 99)
    )

    const selectAgent = (a: LiveAgent) => {
        setSelected(a); setOutput(null); setRunError(null)
        setInput(a.endpoint ? (SAMPLE_INPUTS[a.endpoint.id] ?? DEFAULT_INPUT) : DEFAULT_INPUT)
    }

    const run = async () => {
        if (!selected?.endpoint) return
        setRunning(true); setOutput(null); setRunError(null)
        try {
            const body = JSON.parse(input)
            const res = await fetch(`${GENKIT_API}${selected.endpoint.path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const json = await res.json()
            setOutput(JSON.stringify(json?.result ?? json, null, 2))
        } catch (e) {
            setRunError(`${e instanceof SyntaxError ? 'Invalid JSON in input.' : 'Engine offline — run docker compose up.'}\n\n${String(e)}`)
        } finally { setRunning(false) }
    }

    return (
        <div className="fe-container">
            {/* ── TOP BAR ─────────────────────────────────────── */}
            <div className="fe-topbar">
                <div>
                    <div className="fe-topbar-left">
                        <span className="fe-title">
                            Flow Explorer
                        </span>
                        <span className={`fe-status-badge ${online ? 'online' : 'offline'}`}>
                            {online ? `LIVE · ${GENKIT_API.replace('http://', '')}` : 'OFFLINE — static cache'}
                        </span>
                    </div>
                    <div className="fe-stats">
                        {loading ? 'Discovering...' : `${agents.length} AGENTS · ${endpoints.length} ENDPOINTS`}
                    </div>
                </div>

                {/* View toggle */}
                <div className="fe-topbar-right">
                    {(['agents', 'endpoints'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)} className={`fe-tab ${view === v ? 'active' : 'inactive'}`}>
                            {v}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search agents…"
                    className="fe-search"
                />
            </div>

            {view === 'endpoints' ? (
                /* ── ENDPOINTS VIEW ─────────────────────────── */
                <div className="fe-endpoints-view">
                    {online ? (
                        <>
                            <div className="fe-endpoints-title">
                                REST ENDPOINTS · {endpoints.length} ROUTES
                            </div>
                            <div className="fe-endpoints-list">
                                {endpoints.map((ep, i) => (
                                    <div key={ep.id} className={`fe-endpoint-item ${i === 0 ? '' : 'fe-endpoint-item-border'}`}>
                                        <span className="fe-endpoint-method">{ep.method}</span>
                                        <code className="fe-endpoint-path">
                                            {ep.path}
                                        </code>
                                        <span className="fe-endpoint-desc">
                                            {ep.description}
                                        </span>
                                        <span className="fe-endpoint-agent">{ep.agent}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="fe-offline-panel">
                            <div className="fe-offline-icon">⚡</div>
                            <div className="fe-offline-title">Genkit engine offline</div>
                            <div className="fe-offline-desc">Run <code className="fe-offline-code">docker compose up genkit</code> to start</div>
                        </div>
                    )}
                </div>
            ) : (
                /* ── AGENTS VIEW ────────────────────────────── */
                <div className="fe-agents-view">
                    {/* LEFT: agent list */}
                    <div className="fe-sidebar">
                        {/* Hive filter */}
                        <div className="fe-hive-filters">
                            {(['ALL', ...hives]).map(h => {
                                const color = h === 'ALL' ? 'var(--inc-color-text-primary)' : (agents.find(a => a.hive === h)?.color ?? 'var(--inc-color-text-tertiary)')
                                return (
                                    <button
                                        key={h}
                                        onClick={() => setHiveFilter(h)}
                                        className={`fe-hive-btn ${hiveFilter === h ? 'fe-hive-btn-active' : ''}`}
                                        style={{ '--c': color } as React.CSSProperties}
                                    >{h}</button>
                                )
                            })}
                        </div>

                        {/* Agent list */}
                        <div className="fe-agent-list">
                            {filteredAgents.length === 0 && (
                                <div className="fe-agent-empty">
                                    No agents match
                                </div>
                            )}
                            {hives.filter(h => hiveFilter === 'ALL' || h === hiveFilter).map(hive => {
                                const hiveAgents = filteredAgents.filter(a => a.hive === hive)
                                if (!hiveAgents.length) return null
                                const hiveColor = hiveAgents[0].color
                                return (
                                    <div key={hive}>
                                        <div className="fe-hive-header" style={{ '--c': hiveColor } as React.CSSProperties}>
                                            <span className="fe-hive-dot" />
                                            {hive}
                                            <span className="fe-hive-count">({hiveAgents.length})</span>
                                        </div>
                                        {hiveAgents.map(a => (
                                            <button
                                                key={a.name}
                                                onClick={() => selectAgent(a)}
                                                className={`fe-agent-btn ${selected?.name === a.name ? 'fe-agent-btn-active' : ''}`}
                                                style={{ '--c': a.color } as React.CSSProperties}
                                            >
                                                <div className="fe-agent-btn-header">
                                                    <span className="fe-agent-name">{a.name}</span>
                                                    {a.endpoint && (
                                                        <span className="fe-agent-live">LIVE</span>
                                                    )}
                                                </div>
                                                <div className="fe-agent-role">{a.role}</div>
                                            </button>
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* RIGHT: agent runner */}
                    {selected ? (
                        <div className="fe-agent-runner">
                            {/* Agent header */}
                            <div className="fe-agent-header">
                                <div className="fe-agent-header-inner">
                                    <div>
                                        <div className="fe-agent-title-row">
                                            <span className="fe-agent-title" style={{ '--c': selected.color } as React.CSSProperties}>{selected.name}</span>
                                            <span className="fe-agent-hive" style={{ '--c': selected.color } as React.CSSProperties}>{selected.hive}</span>
                                            <span className="fe-agent-model">{MODEL_BADGE[selected.model] ?? selected.model}</span>
                                        </div>
                                        <div className="fe-agent-role-header">{selected.role}</div>
                                        {selected.endpoint && (
                                            <div className="fe-agent-endpoint">
                                                <code className="fe-agent-endpoint-path">
                                                    POST {selected.endpoint.path}
                                                </code>
                                                <span className="fe-agent-endpoint-desc">— {selected.endpoint.description}</span>
                                            </div>
                                        )}
                                    </div>
                                    {selected.endpoint ? (
                                        <button
                                            onClick={run}
                                            disabled={running}
                                            className={`fe-btn-run ${running ? 'running' : 'ready'}`}
                                        >{running ? '⟳ Running…' : '▶ Run Flow'}</button>
                                    ) : (
                                        <div className="fe-no-endpoint">No HTTP endpoint</div>
                                    )}
                                </div>
                            </div>

                            {/* Input / Output */}
                            <div className="fe-io-grid">
                                {/* Input */}
                                <div className="fe-io-col fe-io-col-left">
                                    <div className="fe-io-header">INPUT · JSON</div>
                                    <textarea
                                        title="Flow JSON input"
                                        placeholder='{"key": "value"}'
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        disabled={!selected.endpoint}
                                        className="fe-textarea"
                                    />
                                </div>
                                {/* Output */}
                                <div className="fe-io-col">
                                    <div className="fe-io-header">
                                        OUTPUT
                                        {output && <span className="fe-io-header-success">· SUCCESS</span>}
                                        {runError && <span className="fe-io-header-error">· ERROR</span>}
                                        {running && <span className="fe-io-header-running">· RUNNING</span>}
                                    </div>
                                    <div className="fe-output-panel">
                                        {!output && !runError && !running && (
                                            <div className="fe-output-msg">
                                                {selected.endpoint ? 'Hit ▶ Run Flow to execute against the Genkit API.' : 'This agent has no direct HTTP endpoint yet.\n\nIt is invoked internally by orchestration flows.'}
                                            </div>
                                        )}
                                        {running && (
                                            <div className="fe-output-running">
                                                ⟳ Constitutional preflight…<br />
                                                ⟳ Dispatching to {selected.name}…<br />
                                                ⟳ Awaiting response…
                                            </div>
                                        )}
                                        {output && (
                                            <pre className="fe-output-success">
                                                {output}
                                            </pre>
                                        )}
                                        {runError && (
                                            <pre className="fe-output-error">
                                                {runError}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="fe-empty-state">
                            {loading ? '⟳ Discovering flows…' : 'Select an agent'}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
