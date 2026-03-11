import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

// ΓöÇΓöÇΓöÇ Live Service Health ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Polls the running GENESIS Docker stack directly (no proxy needed ΓÇö same host)

/* ΓöÇΓöÇ DIRA-04: Creator Productivity types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
interface WorkflowSparkPoint { label: string; value: number }
interface CaseResolutionPoint { date: string; rate: number }

interface CreatorProductivityData {
    workflowSparklines: { type: string; points: WorkflowSparkPoint[]; avgMinutes: number; color: string }[]
    topExceptions: { message: string; count: number; autoResolved: number; escalated: number }[]
    caseResolutionRate: CaseResolutionPoint[]
    totalWorkflows: number
    avgResolutionSec: number
}

/* ΓöÇΓöÇ Dispatch types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
interface DispatchTask { id: string; title: string; workstream: string; priority: string; status: string; claimed_by: string | null }
interface DispatchAgent { agent_id: string; tool: string; active_task_id: string | null }
interface DispatchStatus { summary: { queued: number; active: number; done: number; total_agents: number }; queued_tasks: DispatchTask[]; active_tasks: DispatchTask[]; active_agents: DispatchAgent[]; idle_agents: DispatchAgent[] }

/* ΓöÇΓöÇ Service health ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
interface Svc { name: string; port: number; health: string; status: 'online' | 'offline' | 'checking'; ms?: number; color: string; group: string }
const GENESIS_SERVICES: Svc[] = [
    // Core AI
    { name: 'Genkit AI', port: 4100, health: '/health', status: 'offline', color: '#F5A524', group: 'AI' },
    { name: 'Dispatch', port: 5050, health: '/health', status: 'offline', color: '#22c55e', group: 'Core' },
    { name: 'Gateway', port: 3080, health: '/health', status: 'offline', color: '#9B72CF', group: 'Core' },
    { name: 'Redis', port: 5050, health: '/health/redis', status: 'offline', color: '#ef4444', group: 'Core' },
    // Services
    { name: 'Relay MCP', port: 5100, health: '/health', status: 'offline', color: '#4285F4', group: 'Services' },
    { name: 'Ghost QA', port: 6000, health: '/health', status: 'offline', color: '#ef4444', group: 'Services' },
    { name: 'Campaign', port: 4006, health: '/health', status: 'offline', color: '#FF6B35', group: 'Services' },
    { name: 'Zero-Day', port: 9000, health: '/health', status: 'offline', color: '#C17D4A', group: 'Services' },
    { name: 'Blueprints', port: 4200, health: '/health', status: 'offline', color: '#22D3EE', group: 'Services' },
    // Extended
    { name: 'God-Prompt', port: 7000, health: '/health', status: 'offline', color: '#8B5CF6', group: 'Extended' },
    { name: 'COMET', port: 7100, health: '/health', status: 'offline', color: '#20B2AA', group: 'Extended' },
    { name: 'Atlas Live', port: 8500, health: '/health', status: 'offline', color: '#FF6B35', group: 'Extended' },
    { name: 'ChromaDB', port: 8000, health: '/api/v2/heartbeat', status: 'offline', color: '#9B72CF', group: 'Memory' },
]

type ServiceStatus = { status: 'up' | 'down' | 'checking'; latency?: number; detail?: string }

const HIVE_STATS = [
    { name: 'AURORA', agents: 3, role: 'Creative Architecture', status: 'active' },
    { name: 'KEEPER', agents: 5, role: 'Knowledge Organization', status: 'active' },
    { name: 'LEX', agents: 2, role: 'Legal & Compliance', status: 'active' },
    { name: 'SWITCHBOARD', agents: 4, role: 'Task Routing', status: 'active' },
    { name: 'BROADCAST', agents: 7, role: 'Content Distribution', status: 'active' },
    { name: 'AVERI', agents: 6, role: 'Decision Intelligence', status: 'active' },
]

async function checkService(port: number): Promise<ServiceStatus> {
    const t0 = Date.now()
    try {
        const r = await fetch(`${base}${svc.health}`, { signal: AbortSignal.timeout(2500) })
        if (r.ok || r.status === 204) return { ...svc, status: 'online', ms: Date.now() - t }
    } catch { /* network error ΓÇö try fallback */ }
    // Fallback: try localhost if NAS fails (dev mode)
    try {
        const r = await fetch(`http://localhost:${svc.port}${svc.health}`, { signal: AbortSignal.timeout(1500) })
        if (r.ok || r.status === 204) return { ...svc, status: 'online', ms: Date.now() - t }
    } catch { /* also offline */ }
    return { ...svc, status: 'offline' }
}

/* ΓöÇΓöÇ Hive roster ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const HIVES = [
    { name: 'AURORA', agents: 3, lead: 'ATHENA', color: '#F5A524', role: 'Orchestration & Strategy' },
    { name: 'KEEPER', agents: 5, lead: 'VERA', color: '#9B72CF', role: 'Research & Knowledge' },
    { name: 'LEX', agents: 2, lead: 'LEX-1', color: '#4285F4', role: 'Legal & Contracts' },
    { name: 'SWITCHBOARD', agents: 4, lead: 'RELAY', color: '#22c55e', role: 'Provider Orchestration' },
    { name: 'BROADCAST', agents: 7, lead: 'ATLAS', color: '#FF6B35', role: 'Content & Media' },
    { name: 'AVERI', agents: 6, lead: 'IRIS', color: '#C17D4A', role: 'Creative Leadership' },
    { name: 'SPECIALIST', agents: 6, lead: 'NEXUS', color: '#20B2AA', role: 'Domain Execution' },
    { name: 'VALIDATOR', agents: 4, lead: 'GHOST', color: '#ef4444', role: 'QA & Constitution' },
    { name: 'ENHANCEMENT', agents: 3, lead: 'OPTIMUS', color: '#8B5CF6', role: 'Self-Optimisation' },
]

/* ΓöÇΓöÇ Feature sections (Higgsfield-inspired) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const FEATURES = [
    {
        title: 'NEXUS Studio',
        badge: 'CREATE',
        badgeColor: '#F5A524',
        desc: 'Unified multimodal generation ΓÇö image, video, music, voice, code ΓÇö with 16+ tools and 150+ models via FAL, Vertex, Replicate.',
        route: '/nexus',
        stats: ['16 tools', '150+ models', '5 modalities'],
    },
    {
        title: 'SCOUT Browser',
        badge: 'BROWSE',
        badgeColor: '#4285F4',
        desc: 'Sovereign agentic browser with Playwright + constitutional compliance review. Multi-session viewport cards and real-time DOM map.',
        route: '/scout',
        stats: ['Playwright native', 'WebSocket stream', 'Constitutional overlay'],
    },
    {
        title: 'Flow Explorer',
        badge: 'ORCHESTRATE',
        badgeColor: '#22c55e',
        desc: 'Visual Genkit flow builder. Chain agents, tools, and providers into directed execution graphs. Run, inspect, and trace in real time.',
        route: '/flows',
        stats: ['Genkit 0.9', 'Live tracing', 'Multi-provider'],
    },
    {
        title: 'Neural Monitor',
        badge: 'COGNITION',
        badgeColor: '#9B72CF',
        desc: 'Live cognitive layer health: vector store status, memory ops, RAG pipeline, session context, ChromaDB metrics.',
        route: '/neural',
        stats: ['ChromaDB', 'RAG pipeline', '5 neural systems'],
    },
    {
        title: 'Creative Studio',
        badge: 'WORKSPACE',
        badgeColor: '#FF6B35',
        desc: 'Full creative workstation: brand campaign orchestration, image-to-3D-to-video pipelines, and provider health dashboard.',
        route: '/creative',
        stats: ['Brand campaigns', 'I2V pipelines', 'Radial gauges'],
    },
    {
        title: 'Studio VFX',
        badge: 'VFX',
        badgeColor: '#C17D4A',
        desc: 'DaVinci Resolve + Fusion integration, real-time roto engine, motion capture pipeline, and automated VFX workflows.',
        route: '/vfx',
        stats: ['DaVinci Resolve', 'Mocap engine', 'Roto engine'],
    },
]

/* ΓöÇΓöÇ Recent activity feed ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const STATIC_ACTIVITY = [
    { icon: 'ΓùÄ', label: 'Generated image', detail: 'Flux Pro ┬╖ 1024├ù1024', time: '2m ago', color: '#F5A524' },
    { icon: 'ΓÜû', label: 'Constitution reviewed', detail: 'Article 7 ┬╖ Agent access control', time: '8m ago', color: '#4285F4' },
    { icon: 'Γ¼ó', label: 'Agent activated', detail: 'ATLAS ┬╖ Broadcast Hive', time: '15m ago', color: '#FF6B35' },
    { icon: 'Γ¼í', label: 'Flow executed', detail: 'zero-day-intake ┬╖ 3 steps', time: '1h ago', color: '#22c55e' },
    { icon: 'Γùë', label: 'Scout session', detail: 'Browsed fal.ai models', time: '2h ago', color: '#9B72CF' },
]

/* ΓöÇΓöÇ Dispatch stat definitions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const DISPATCH_STATS = [
    { l: 'QUEUED', c: '#F5A524' },
    { l: 'ACTIVE', c: '#22c55e' },
    { l: 'DONE',   c: '#9B72CF' },
    { l: 'AGENTS', c: 'rgba(255,255,255,0.3)' },
] as const

/* ΓöÇΓöÇ Dot dot dot pulse ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const Pulse = ({ ok, size = 6 }: { ok: boolean; size?: number }) => (
    <span className={`dash-pulse dash-pulse-${ok ? 'ok' : 'err'}-${size}`} />
)

/* ΓöÇΓöÇ DIRA-04: Miniature sparkline ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
function Spark({ points, color }: { points: number[]; color: string }) {
    const max = Math.max(...points, 1)
    const w = 80
    const h = 28
    const pts = points.map((v, i) => {
        const x = (i / (points.length - 1)) * w
        const y = h - (v / max) * h
        return `${x},${y}`
    }).join(' ')
    return (
        <svg width={w} height={h} style={{ overflow: 'visible' }}>
            <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <circle cx={pts.split(' ').at(-1)?.split(',')[0] ?? 0}
                    cy={pts.split(' ').at(-1)?.split(',')[1] ?? 0}
                    r="2.5" fill={color} />
        </svg>
    )
}

/* ΓöÇΓöÇ DIRA-04: Creator Productivity Panel ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */

interface CreatorProductivityData {
    workflowSparklines: {
        type: string
        points: number[]
        avgMinutes: number
        color: string
    }[]
    topExceptions: {
        message: string
        count: number
        autoResolved: number
        escalated: number
    }[]
    caseResolutionRate: {
        day: string
        rate: number
    }[]
    totalWorkflows: number
    avgResolutionSec: number
}

function CreatorProductivityPanel() {
    const [expanded, setExpanded] = useState(false)
    const [metrics, setMetrics] = useState<CreatorProductivityData | null>(null)
    const cardRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                // Determine Genkit base URL (Vite proxy in dev, or custom env)
                const NAS = '127.0.0.1'
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                // Use relative proxy path if local dev, else absolute NAS URL
                const baseUrl = isLocalhost ? '/api/genkit' : `http://${NAS}:4100`

                const res = await fetch(`${baseUrl}/dira/metrics`)
                if (res.ok) {
                    setMetrics(await res.json())
                }
            } catch (error) {
                console.error('Failed to fetch DIRA metrics:', error)
            }
        }
        
        fetchMetrics()
        const t = setInterval(fetchMetrics, 15000)
        return () => clearInterval(t)
    }, [])

    if (!metrics) {
        return (
            <section className="dira-panel" ref={cardRef}>
                <div className="dira-header">
                    <div className="dira-header-left">
                        <span className="dira-tag">DIRA</span>
                        <h2 className="dira-title">Creator Productivity</h2>
                        <span className="dira-subtitle">7-day rolling ┬╖ live DIRA engine metrics</span>
                    </div>
                </div>
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Syncing neural telemetry...</div>
            </section>
        )
    }

    const { workflowSparklines, topExceptions, caseResolutionRate, totalWorkflows, avgResolutionSec } = metrics
    const avgRate = caseResolutionRate.length > 0 
        ? Math.round(caseResolutionRate.reduce((acc, obj) => acc + obj.rate, 0) / caseResolutionRate.length)
        : 100

    return (
        <section className="dira-panel" ref={cardRef}>
            <div className="dira-header">
                <div className="dira-header-left">
                    <span className="dira-tag">DIRA</span>
                    <h2 className="dira-title">Creator Productivity</h2>
                    <span className="dira-subtitle">7-day rolling ┬╖ live DIRA engine metrics</span>
                </div>
                <div className="dira-header-right">
                    <div className="dira-kpi">
                        <span className="dira-kpi-value">{totalWorkflows}</span>
                        <span className="dira-kpi-label">workflows (7d)</span>
                    </div>
                    <div className="dira-kpi">
                        <span className="dira-kpi-value" style={{ color: avgRate >= 90 ? '#22c55e' : avgRate >= 80 ? '#F5A524' : '#ef4444' }}>{avgRate}%</span>
                        <span className="dira-kpi-label">avg resolution rate</span>
                    </div>
                    <div className="dira-kpi">
                        <span className="dira-kpi-value">{avgResolutionSec.toFixed(1)}s</span>
                        <span className="dira-kpi-label">avg resolve</span>
                    </div>
                    <button className="dira-toggle" onClick={() => setExpanded(e => !e)}>
                        {expanded ? 'Γû▓ collapse' : 'Γû╝ expand'}
                    </button>
                </div>
            </div>

            {/* Sparkline grid ΓÇö always visible */}
            <div className="dira-spark-grid">
                {workflowSparklines.map(c => (
                    <div key={c.type} className="dira-spark-card">
                        <div className="dira-spark-header">
                            <span className="dira-spark-dot" style={{ background: c.color }} />
                            <span className="dira-spark-type">{c.type}</span>
                            <span className="dira-spark-count" style={{ color: c.color }}>
                                {c.points.at(-1) ?? 0}
                            </span>
                        </div>
                        <Spark points={c.points.length > 0 ? c.points : [0]} color={c.color} />
                        <div className="dira-spark-avg">
                            avg {Math.round(c.points.reduce((a,b)=>a+b,0)/Math.max(c.points.length, 1))}/day
                        </div>
                    </div>
                ))}
                {workflowSparklines.length === 0 && (
                    <div className="dira-empty-state">No workflow metrics recorded in the past 7 days.</div>
                )}
            </div>

            {/* Expanded section */}
            {expanded && (
                <div className="dira-expanded">
                    {/* 7-day resolution bar chart */}
                    <div className="dira-section">
                        <div className="dira-section-title">Case Resolution Rate ΓÇö 7 Day Rolling</div>
                        <div className="dira-bar-chart">
                            {caseResolutionRate.map((d, i) => (
                                <div key={i} className="dira-bar-col">
                                    <div className="dira-bar-value">{d.rate}%</div>
                                    <div className="dira-bar-track">
                                        <div
                                            className="dira-bar-fill"
                                            style={{
                                                height: `${d.rate}%`,
                                                background: d.rate >= 90
                                                    ? '#22c55e'
                                                    : d.rate >= 80
                                                    ? '#F5A524'
                                                    : '#ef4444',
                                            }}
                                        />
                                    </div>
                                    <div className="dira-bar-label">{d.day}</div>
                                </div>
                            ))}
                            {caseResolutionRate.length === 0 && <span className="dira-empty-inline">Insufficient data</span>}
                        </div>
                    </div>

                    {/* Exception table */}
                    <div className="dira-section">
                        <div className="dira-section-title">Top Exceptions (7 days)</div>
                        {topExceptions.length > 0 ? (
                            <table className="dira-exception-table">
                                <thead>
                                    <tr>
                                        <th>Exception</th>
                                        <th>Count</th>
                                        <th>Auto-resolved</th>
                                        <th>Escalated</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topExceptions.map((e, i) => (
                                        <tr key={i}>
                                            <td>{e.message}</td>
                                            <td style={{ color: '#F5A524' }}>{e.count}</td>
                                            <td style={{ color: '#22c55e' }}>{e.autoResolved}</td>
                                            <td style={{ color: e.escalated > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                                                {e.escalated}
                                            </td>

                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        ) : null}
                    </div>
                </div>
            )}
        </section>
    )
}

export default function Dashboard() {
    const [services, setServices] = useState<Record<string, ServiceStatus>>(
        Object.fromEntries(SERVICES.map(s => [s.key, { status: 'checking' }]))
    )
    const [plugCount, setPlugCount] = useState<{ total: number; active: number } | null>(null)
    const [time, setTime] = useState(new Date())
    const [services, setServices] = useState<Svc[]>(GENESIS_SERVICES)
    const [dispatch, setDispatch] = useState<DispatchStatus | null>(null)
    const [dispatchOnline, setDispatchOnline] = useState(false)
    const [addingTask, setAddingTask] = useState(false)
    const [newTask, setNewTask] = useState({ title: '', workstream: '', priority: 'P2', project: 'brainchild-v5' })

    // Live clock
    useEffect(() => {
        const iv = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(iv)
    }, [])

    // Poll all services every 10s
    useEffect(() => {
        const poll = async () => {
            const results = await Promise.all(
                SERVICES.map(async s => [s.key, await checkService(s.port)])
            )
            setServices(Object.fromEntries(results))
            setLastPolled(new Date())

    const pollDispatch = async () => {
        try {
            const r = await fetch(`${DISPATCH}/api/status`, { signal: AbortSignal.timeout(3000) })
            if (r.ok) { setDispatch(await r.json()); setDispatchOnline(true) }
            else setDispatchOnline(false)
        } catch { setDispatchOnline(false) }
    }
    useEffect(() => {
        pollDispatch()
        const t = setInterval(pollDispatch, 10_000)
        return () => clearInterval(t)
    }, [])

    const submitTask = async () => {
        if (!newTask.title || !newTask.workstream) return
        try {
            await fetch(`${DISPATCH}/api/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newTask, created_by: 'user' }),
            })
            setNewTask({ title: '', workstream: '', priority: 'P2', project: 'brainchild-v5' })
            setAddingTask(false)
            pollDispatch()
        } catch { /* fire-and-forget */ }
    }

    const upCount = Object.values(services).filter(s => s.status === 'up').length
    const downCount = Object.values(services).filter(s => s.status === 'down').length

    const dispatchStatValues: Record<string, number> = dispatch ? {
        QUEUED: dispatch.summary.queued,
        ACTIVE: dispatch.summary.active,
        DONE:   dispatch.summary.done,
        AGENTS: dispatch.summary.total_agents,
    } : {}

    return (
        <div className="dash-container">
            {/* ΓöÇΓöÇ HERO ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
            <div className="dash-hero">
                {/* Status strip */}
                <div className="dash-status-strip">
                    {[
                        { label: 'SERVICES', val: `${online} / ${services.length}`, ok: online >= 3 },
                        { label: 'AGENTS', val: '39', ok: true },
                        { label: 'HIVES', val: '9 ACTIVE', ok: true },
                        { label: 'ARTICLES', val: '18 BINDING', ok: true },
                    ].map(s => (
                        <div key={s.label} className={`dash-status-item ${s.ok ? 'dash-status-item-ok' : 'dash-status-item-err'}`}>
                            <Pulse ok={s.ok} />
                            <span className="dash-status-label">{s.label}</span>
                            <span className="dash-status-val">{s.val}</span>
                        </div>
                    ))}
                    <div className="dash-clock">
                        {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ┬╖ {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Active Plugs</div>
                    <div className="stat-value">{plugCount ? `${plugCount.active} / ${plugCount.total}` : 'ΓÇö'}</div>
                    <div className="stat-detail">Stripe, Slack, Linear, Figma active</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Active Agents</div>
                    <div className="stat-value">39</div>
                    <div className="stat-detail">6 hives ΓÇó 3 enhancement layers</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Neural Systems</div>
                    <div className="stat-value">5</div>
                    <div className="stat-detail">PFC ΓÇó DMN ΓÇó Attractors ΓÇó SmallWorld ΓÇó Vectors</div>
                </div>
            </div>

                <div className="dash-hero-grid">
                    <div>
                        <div className="dash-hero-pretitle">GENESIS ENGINE ┬╖ OPERATIONAL</div>
                        <h1 className="dash-hero-title">{greet}</h1>
                        <p className="dash-hero-desc">
                            39 agents across 9 hives are standing by. The constitutional stack is active,
                            enforced, and sovereign. What are we creating today?
                        </p>
                        <div className="dash-hero-buttons">
                            <button className="dash-btn-primary" onClick={() => navigate('/nexus')}>Open NEXUS Studio</button>
                            <button className="dash-btn-secondary" onClick={() => navigate('/creative')}>Creative Studio</button>
                        </div>
                    </div>

                    {/* Recent activity ΓÇö live from dispatch when online */}
                    <div className="dash-recent">
                        <div className="dash-recent-header">
                            <span className="dash-recent-label">RECENT ACTIVITY</span>
                            {dispatchOnline && <span className="dash-live-badge">ΓùÅ LIVE</span>}
                        </div>
                        {(dispatchOnline && dispatch
                            ? [...(dispatch.active_tasks ?? []), ...(dispatch.queued_tasks ?? [])].slice(0, 5).map((t, i) => (
                                <div key={t.id} className={`dash-recent-item ${i === 0 ? '' : 'dash-recent-item-border'}`}>
                                    <span className={`dash-priority-badge priority-badge-${['P0', 'P1', 'P2'].includes(t.priority) ? t.priority : 'default'}`}>{t.priority}</span>
                                    <div className="dash-recent-content">
                                        <div className={`dash-recent-title ${t.status === 'active' ? 'dash-recent-title-active' : 'dash-recent-title-inactive'}`}>{t.title}</div>
                                        <div className="dash-recent-subtitle">{t.workstream}</div>
                                    </div>
                                    <span className={t.status === 'active' ? 'dash-recent-status-active' : 'dash-recent-status-inactive'}>{t.status}</span>
                                </div>
                            ))
                            : STATIC_ACTIVITY.map((a, i) => (
                                <div key={i} className={`dash-recent-item ${i === 0 ? '' : 'dash-recent-item-border'}`}>
                                    <span
                                        className="dash-static-icon"
                                        style={{ '--item-color': a.color } as React.CSSProperties}
                                    >{a.icon}</span>
                                    <div className="dash-recent-content">
                                        <div className="dash-recent-title dash-recent-title-inactive">{a.label}</div>
                                        <div className="dash-recent-subtitle">{a.detail}</div>
                                    </div>
                                    <span className="dash-static-time">{a.time}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ΓöÇΓöÇ FEATURES (Higgsfield-style sections) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
            <div className="dash-features">
                <div className="dash-section-header">CAPABILITIES</div>
                <div className="dash-features-grid">
                    {FEATURES.map((f) => (
                        <div
                            key={f.route}
                            onClick={() => navigate(f.route)}
                            className="dash-feature-card"
                            style={{ '--badge-color': f.badgeColor } as React.CSSProperties}
                        >
                            <div className="dash-feature-head">
                                <span className="dash-feature-badge">{f.badge}</span>
                            </div>
                            <div className="dash-feature-title">{f.title}</div>
                            <div className="dash-feature-desc">{f.desc}</div>
                            <div className="dash-feature-stats">
                                {f.stats.map(s => (
                                    <span key={s} className="dash-feature-stat">{s}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ΓöÇΓöÇ HIVE GRID (Kling social masonry-inspired) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
            <div className="dash-hives">
                <div className="dash-hives-header">
                    <div className="dash-section-header mb-0">HIVE ROSTER</div>
                    <span className="dash-hives-sub">┬╖ 39 agents ┬╖ 9 hives</span>
                    <button onClick={() => navigate('/agents')} className="dash-hives-link">View all ΓåÆ</button>
                </div>
                <div className="dash-hives-grid">
                    {HIVES.map((h) => (
                        <div
                            key={h.name}
                            onClick={() => navigate('/agents')}
                            className="dash-hive-card"
                            style={{ '--hive-color': h.color } as React.CSSProperties}
                        >
                            <div className="dash-hive-icon">
                                <span className="dash-hive-dot" />
                            </div>
                            <div className="dash-recent-content">
                                <div className="dash-hive-title">{h.name}</div>
                                <div className="dash-hive-role">{h.role}</div>
                                <div className="dash-hive-agents">Lead: {h.lead} ┬╖ {h.agents} agents</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ΓöÇΓöÇ DISPATCH BOARD ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
            <div className="dash-board">
                <div className="dash-board-header">
                    <span className={`dash-board-dot ${dispatchOnline ? 'dash-board-dot-ok' : 'dash-board-dot-err'}`} />
                    <span className="dash-section-header mb-0">DISPATCH BOARD</span>
                    <span className={`dash-board-ip ${dispatchOnline ? 'dash-board-ip-ok' : 'dash-board-ip-err'}`}>{dispatchOnline ? '127.0.0.1:5050' : 'OFFLINE'}</span>
                    {dispatch && (
                        <div className="dash-board-stats">
                            {DISPATCH_STATS.map(s => (
                                <span
                                    key={s.l}
                                    className="dash-board-stat"
                                    style={{ '--stat-c': s.c } as React.CSSProperties}
                                >{dispatchStatValues[s.l] ?? 0} {s.l}</span>
                            ))}
                        </div>
                    )}
                    <button onClick={() => setAddingTask(a => !a)} className="dash-board-btn-queue">+ Queue Task</button>
                    <button onClick={pollDispatch} className="dash-board-btn-refresh">Γå╗</button>
                </div>

                {addingTask && (
                    <div className="dash-new-task">
                        <input className="dash-input" value={newTask.title} onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))} placeholder='Task title...' />
                        <input className="dash-input" value={newTask.workstream} onChange={e => setNewTask(t => ({ ...t, workstream: e.target.value }))} placeholder='Workstream...' />
                        <select className="dash-input dash-select" aria-label="Task priority" title="Task priority" value={newTask.priority} onChange={e => setNewTask(t => ({ ...t, priority: e.target.value }))}>
                            {['P0', 'P1', 'P2', 'P3'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input className="dash-input" value={newTask.project} onChange={e => setNewTask(t => ({ ...t, project: e.target.value }))} placeholder='project...' />
                        <button className="dash-btn-add" onClick={submitTask}>Add</button>
                    </div>
                )}

                {!dispatchOnline ? (
                    <div className="dash-offline-warn">
                        Dispatch server offline ΓÇö run <code className="dash-offline-code">npm run dev --prefix packages/dispatch</code> to start it
                    </div>
                ) : dispatch && (
                    <div className="dash-queues">
                        <div className="dash-queue-panel">
                            <div className="dash-queue-header"><span className="dash-queue-title">TASK QUEUE</span></div>
                            {[...dispatch.active_tasks, ...dispatch.queued_tasks].slice(0, 12).map((t, i) => {
                                const isActive = t.status === 'active'
                                return (
                                    <div key={t.id} className={`dash-queue-item ${i === 0 ? '' : 'dash-queue-item-border'} ${isActive ? 'dash-queue-item-active' : ''}`}>
                                        <span className={`dash-task-priority priority-badge-${['P0', 'P1', 'P2'].includes(t.priority) ? t.priority : 'default'}`}>{t.priority}</span>
                                        <div className="dash-task-content">
                                            <div className={`dash-task-title ${isActive ? 'dash-task-title-active' : 'dash-task-title-inactive'}`}>{t.title}</div>
                                            <div className="dash-task-sub">{t.workstream} ┬╖ {t.id}</div>
                                        </div>
                                        <span className={isActive ? 'dash-task-status-active' : 'dash-task-status-inactive'}>{isActive ? (t.claimed_by ?? 'active') : 'queued'}</span>
                                    </div>
                                )
                            })}
                            {!dispatch.queued_tasks.length && !dispatch.active_tasks.length && (
                                <div className="dash-empty">Queue empty ΓÇö all caught up.</div>
                            )}
                        </div>
                        <div className="dash-queue-panel">
                            <div className="dash-queue-header"><span className="dash-queue-title">CONNECTED AGENTS</span></div>
                            {[...dispatch.active_agents, ...dispatch.idle_agents].slice(0, 10).map((a, i) => (
                                <div key={a.agent_id} className={`dash-agent-item ${i === 0 ? '' : 'dash-queue-item-border'}`}>
                                    <span className={`dash-agent-dot ${a.active_task_id ? 'agent-dot-active' : 'agent-dot-idle'}`} />
                                    <div className="dash-agent-content">
                                        <div className="dash-agent-id">{a.agent_id}</div>
                                        <div className="dash-agent-sub">{a.tool} ┬╖ {a.active_task_id ? 'working' : 'idle'}</div>
                                    </div>
                                </div>
                            ))}
                            {!dispatch.active_agents.length && !dispatch.idle_agents.length && (
                                <div className="dash-empty">No agents connected</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ΓöÇΓöÇ DIRA-04: Creator Productivity Dashboard ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
            <CreatorProductivityPanel />

            {/* ΓöÇΓöÇ SERVICE HEALTH ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
            <div className="dash-health">
                <div className="dash-health-header">
                    <div className="dash-section-header mb-0">GENESIS SERVICE HEALTH</div>
                    <span className="dash-health-sub">┬╖ auto-refresh 10s</span>
                    <button onClick={poll} className="dash-health-btn">Γå╗ Refresh</button>
                </div>
                <div className="dash-health-grid">
                    {services.map((svc) => {
                        const isOnline = svc.status === 'online'
                        return (
                            <div
                                key={svc.name}
                                className={`dash-svc-card ${isOnline ? '' : 'dash-svc-card-offline'}`}
                                style={{ '--svc-color': isOnline ? svc.color : undefined } as React.CSSProperties}
                            >
                                <div className="dash-svc-head">
                                    <Pulse ok={isOnline} size={7} />
                                    <span className={`dash-svc-name ${isOnline ? '' : 'dash-svc-name-offline'}`}>{svc.name}</span>
                                </div>
                                <div className="dash-svc-stats">
                                    :{svc.port}<br />
                                    {isOnline ? <span className="dash-svc-ms">{svc.ms}ms</span> : 'offline'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    )
}
