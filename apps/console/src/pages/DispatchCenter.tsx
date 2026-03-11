import { useState, useEffect, useCallback } from 'react'
import { DISPATCH_URL } from '../config/env'
import './DispatchCenter.css'

const DISPATCH = DISPATCH_URL

/* ── Types ────────────────────────────────────────────────────── */
interface DispatchTask {
    id: string
    title: string
    workstream: string
    priority: string
    status: string
    claimed_by: string | null
    project?: string
}
interface DispatchAgent {
    agent_id: string
    tool: string
    active_task_id: string | null
    last_seen: string
    capabilities: string[]
    connected_at: string
}
interface DispatchStatus {
    summary: { queued: number; active: number; done: number; total_agents: number }
    queued_tasks: DispatchTask[]
    active_tasks: DispatchTask[]
    active_agents: DispatchAgent[]
    idle_agents: DispatchAgent[]
}

/* ── Local registry (read from local task-queue.md cache via a 
   static JSON that the dispatch server could expose, or fallback 
   to hardcoded registry knowledge) ──────────────────────────── */
const LOCAL_REGISTRY = [
    { window: 'A', workstream: 'infra-docker', status: 'active', lastSeen: '2026-03-05T22:56:00-05:00' },
    { window: 'B', workstream: 'zero-day', status: 'active', lastSeen: '2026-03-05T23:09:58-05:00' },
    { window: 'C', workstream: 'console-ui', status: 'active', lastSeen: '2026-03-05T23:10:38-05:00' },
]

const WORKSTREAM_COLORS: Record<string, string> = {
    'infra-docker': '#ef4444',
    'zero-day': '#22c55e',
    'console-ui': '#7c3aed',
    'genkit-flows': '#F5A524',
    'genkit-server': '#F5A524',
    'comet-browser': '#4285F4',
    'console-ui-c': '#7c3aed',
    'inception-core': '#9B72CF',
    'synology-mcp': '#20B2AA',
    'spatial-visionos': '#FF6B35',
    'free': 'rgba(255,255,255,0.3)',
}

const PRIORITY_COLORS: Record<string, string> = {
    P0: '#ef4444',
    P1: '#F5A524',
    P2: '#4285F4',
    P3: 'rgba(255,255,255,0.3)',
}

function wsColor(ws: string) {
    return WORKSTREAM_COLORS[ws] ?? '#9B72CF'
}

/* ── Helpers ──────────────────────────────────────────────────── */
function timeAgo(iso: string) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    if (diff < 60) return `${Math.round(diff)}s ago`
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`
    return `${Math.round(diff / 3600)}h ago`
}

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* ── Sub-components ───────────────────────────────────────────── */
function Dot({ color, pulse, style: extraStyle }: { color: string; pulse?: boolean; style?: React.CSSProperties }) {
    return (
        <span
            className={`dc-dot${pulse ? ' dc-dot-pulse' : ''}`}
            style={{ '--c': color, ...extraStyle } as React.CSSProperties}
        />
    )
}

function Badge({ label, color }: { label: string; color: string }) {
    return (
        <span className="dc-badge" style={{ '--c': color } as React.CSSProperties}>{label}</span>
    )
}

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
    return (
        <div className="dc-section-header">
            <span className="dc-section-title">{title}</span>
            {sub && <span className="dc-section-sub">· {sub}</span>}
            {action && <div className="dc-section-action">{action}</div>}
        </div>
    )
}

/* ── Main page ────────────────────────────────────────────────── */
export default function DispatchCenter() {
    const [dispatch, setDispatch] = useState<DispatchStatus | null>(null)
    const [online, setOnline] = useState(false)
    const [lastPoll, setLastPoll] = useState<Date | null>(null)
    const [polling, setPolling] = useState(false) // true while fallback polling
    const [sseConnected, setSseConnected] = useState(false)
    const [agents, setAgents] = useState<{ total: number; active: DispatchAgent[]; idle: DispatchAgent[] } | null>(null)
    const [filter, setFilter] = useState<'all' | 'active' | 'queued'>('all')
    const [addTask, setAddTask] = useState(false)
    const [newTask, setNewTask] = useState({ title: '', workstream: '', priority: 'P1', project: 'brainchild-v5' })
    const [completing, setCompleting] = useState<string | null>(null)

    // Fallback manual refresh used when SSE is down
    const poll = useCallback(async () => {
        setPolling(true)
        try {
            const r = await fetch(`${DISPATCH}/api/status`, { signal: AbortSignal.timeout(4000) })
            if (r.ok) { setDispatch(await r.json()); setOnline(true) }
            else setOnline(false)
        } catch { setOnline(false) }
        setLastPoll(new Date())
        setPolling(false)
    }, [])

    const pollAgents = useCallback(async () => {
        try {
            const r = await fetch(`${DISPATCH}/api/agents`, { signal: AbortSignal.timeout(4000) })
            if (r.ok) setAgents(await r.json())
        } catch { /* fire-and-forget */ }
    }, [])

    // Primary: SSE EventSource — replaces polling when dispatch server is live
    useEffect(() => {
        let es: EventSource | null = null
        let fallbackTimer: ReturnType<typeof setInterval> | null = null
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null

        function connect() {
            try { es?.close() } catch { /* ignore */ }
            es = new EventSource(`${DISPATCH}/api/events`)

            es.addEventListener('connected', () => {
                setSseConnected(true)
                setOnline(true)
                if (fallbackTimer) { clearInterval(fallbackTimer); fallbackTimer = null }
            })

            es.addEventListener('status', (e: MessageEvent) => {
                try {
                    const data: DispatchStatus = JSON.parse(e.data)
                    setDispatch(data)
                    setOnline(true)
                    setLastPoll(new Date())
                } catch { /* malformed SSE payload */ }
            })

            es.onerror = () => {
                setSseConnected(false)
                setOnline(false)
                try { es?.close() } catch { /* ignore */ }
                // Fallback: poll every 12s while SSE is down
                if (!fallbackTimer) {
                    poll(); pollAgents()
                    fallbackTimer = setInterval(() => { poll(); pollAgents() }, 12_000)
                }
                // Attempt SSE reconnect after 8s
                if (!reconnectTimer) {
                    reconnectTimer = setTimeout(() => {
                        reconnectTimer = null
                        connect()
                    }, 8_000)
                }
            }
        }

        connect()
        // Keep agents fresh separately (15s) — agents have their own endpoint
        // eslint-disable-next-line react-hooks/set-state-in-effect
        pollAgents()
        const agentTimer = setInterval(pollAgents, 15_000)

        return () => {
            try { es?.close() } catch { /* ignore */ }
            if (fallbackTimer) clearInterval(fallbackTimer)
            if (reconnectTimer) clearTimeout(reconnectTimer)
            clearInterval(agentTimer)
        }
    }, [poll, pollAgents])

    const submitTask = async () => {
        if (!newTask.title || !newTask.workstream) return
        try {
            await fetch(`${DISPATCH}/api/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newTask, created_by: 'console-ui' }),
            })
            setNewTask({ title: '', workstream: '', priority: 'P1', project: 'brainchild-v5' })
            setAddTask(false)
            // SSE will push update automatically; fallback poll if SSE is down
            if (!sseConnected) poll()
        } catch { /* fire-and-forget */ }
    }

    const completeTask = async (taskId: string) => {
        setCompleting(taskId)
        try {
            await fetch(`${DISPATCH}/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'done' }),
            })
            if (!sseConnected) poll()
        } catch { /* fire-and-forget */ }
        setCompleting(null)
    }

    const disconnectAgent = async (agentId: string) => {
        try {
            await fetch(`${DISPATCH}/api/agents/${encodeURIComponent(agentId)}`, { method: 'DELETE' })
            pollAgents()
            if (!sseConnected) poll()
        } catch { /* fire-and-forget */ }
    }

    /* tasks to display */
    const tasks = dispatch
        ? [
            ...(filter !== 'queued' ? dispatch.active_tasks : []),
            ...(filter !== 'active' ? dispatch.queued_tasks : []),
        ]
        : []

    return (
        <div className="dc-container">

            {/* ── TOP BAR ──────────────────────────────────────── */}
            <div className="dc-topbar">
                <div className="dc-topbar-left">
                    <Dot color={online ? 'var(--status-success)' : '#ef4444'} pulse={online} />
                    <span className="dc-topbar-title">DISPATCH CENTER</span>
                    <span className={`dc-topbar-conn-badge ${online ? 'online' : 'offline'}`}>
                        {online ? `${DISPATCH.replace('http://', '')}` : 'OFFLINE — local cache'}
                    </span>
                </div>

                {dispatch && (
                    <div className="dc-topbar-stats">
                        {[
                            { l: 'QUEUED', v: dispatch.summary.queued, c: '#F5A524' },
                            { l: 'ACTIVE', v: dispatch.summary.active, c: '#22c55e' },
                            { l: 'DONE', v: dispatch.summary.done, c: '#9B72CF' },
                            { l: 'AGENTS', v: dispatch.summary.total_agents, c: 'rgba(255,255,255,0.4)' },
                        ].map(s => (
                            <span key={s.l} className="dc-topbar-stat" style={{ '--c': s.c } as React.CSSProperties}>{s.v} {s.l}</span>
                        ))}
                    </div>
                )}

                <div className="dc-topbar-right">
                    {lastPoll && (
                        <span className="dc-topbar-time">
                            polled {fmtTime(lastPoll.toISOString())}
                        </span>
                    )}
                    <button
                        onClick={poll}
                        disabled={polling}
                        className={`dc-btn-refresh ${polling ? 'spinning' : ''}`}
                    >↻</button>
                    <button
                        onClick={() => setAddTask(a => !a)}
                        className="dc-btn-queue"
                    >+ Queue Task</button>
                </div>
            </div>

            <div className="dc-main-grid">

                {/* ── LEFT COLUMN ──────────────────────────────── */}
                <div className="dc-left-col">

                    {/* Add Task Form */}
                    {addTask && (
                        <div className="dc-add-form">
                            <div className="dc-add-title">NEW TASK</div>
                            <div className="dc-add-inputs">
                                {[
                                    { key: 'title', ph: 'Task title...' },
                                    { key: 'workstream', ph: 'Workstream...' },
                                ].map(f => (
                                    <input
                                        key={f.key}
                                        value={(newTask as Record<string, string>)[f.key]}
                                        onChange={e => setNewTask(t => ({ ...t, [f.key]: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && submitTask()}
                                        placeholder={f.ph}
                                        className="dc-input"
                                    />
                                ))}
                                <select
                                    title="Task priority"
                                    value={newTask.priority}
                                    onChange={e => setNewTask(t => ({ ...t, priority: e.target.value }))}
                                    className="dc-input dc-select"
                                >
                                    {['P0', 'P1', 'P2', 'P3'].map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <input
                                    value={newTask.project}
                                    onChange={e => setNewTask(t => ({ ...t, project: e.target.value }))}
                                    placeholder='project...'
                                    className="dc-input"
                                />
                                <button
                                    onClick={submitTask}
                                    className="dc-btn-add"
                                >Add</button>
                            </div>
                        </div>
                    )}

                    {/* Task Queue */}
                    <div>
                        <SectionHeader
                            title="TASK QUEUE"
                            sub="live · 10s refresh"
                            action={
                                <div className="dc-tabs">
                                    {(['all', 'active', 'queued'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`dc-tab ${filter === f ? 'dc-tab-active' : ''}`}
                                        >{f}</button>
                                    ))}
                                </div>
                            }
                        />

                        {!online && (
                            <div className="dc-offline-panel">
                                <div className="dc-offline-title">Dispatch Offline</div>
                                <div className="dc-offline-text">
                                    Dispatch at <code className="dc-offline-code">{DISPATCH.replace(/^https?:\/\//, '')}</code> is unreachable.<br />
                                    Showing local registry cache below.
                                </div>
                            </div>
                        )}

                        {online && tasks.length === 0 && (
                            <div className="dc-empty-panel">
                                <div className="dc-empty-icon">✓</div>
                                <div className="dc-empty-title">Queue empty — all caught up.</div>
                                <div className="dc-empty-text">All active tasks are in progress.</div>
                            </div>
                        )}

                        {tasks.length > 0 && (
                            <div className="dc-queue-list">
                                {tasks.map((task, i) => {
                                    const isActive = task.status === 'active'
                                    const pc = PRIORITY_COLORS[task.priority] ?? 'rgba(255,255,255,0.3)'
                                    const wc = wsColor(task.workstream)
                                    return (
                                        <div key={task.id} className={`dc-queue-item ${i === 0 ? '' : 'dc-queue-item-border'} ${isActive ? 'active' : ''}`}>
                                            {/* Priority badge */}
                                            <Badge label={task.priority} color={pc} />

                                            {/* Task body */}
                                            <div className="dc-task-body">
                                                <div className={`dc-task-title ${isActive ? 'active' : 'inactive'}`}>{task.title}</div>
                                                <div className="dc-task-meta">
                                                    <span className="dc-task-ws" style={{ '--c': wc } as React.CSSProperties}>{task.workstream}</span>
                                                    <span className="dc-task-id">{task.id}</span>
                                                    {task.project && <span className="dc-task-proj">· {task.project}</span>}
                                                </div>
                                            </div>

                                            {/* Status + complete action */}
                                            <div className="dc-task-right">
                                                <div className={`dc-task-status ${isActive ? 'active' : 'inactive'}`}>
                                                    {isActive ? (task.claimed_by ?? 'active') : 'queued'}
                                                </div>
                                                {isActive && task.claimed_by && (
                                                    <div className="dc-task-window">
                                                        Window {task.claimed_by.split('-').pop()?.toUpperCase()}
                                                    </div>
                                                )}
                                                {online && (
                                                    <button
                                                        onClick={() => completeTask(task.id)}
                                                        disabled={completing === task.id}
                                                        className={`dc-btn-done ${completing === task.id ? 'completing' : 'normal'}`}
                                                    >{completing === task.id ? '...' : '✓ done'}</button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Live Agents Panel */}
                    {online && agents && agents.total > 0 && (
                        <div>
                            <SectionHeader
                                title="LIVE AGENTS"
                                sub={`${agents.total} connected · 15s refresh`}
                                action={
                                    <span className="dc-agents-summary">
                                        {agents.active.length} working · {agents.idle.length} idle
                                    </span>
                                }
                            />
                            <div className="dc-agents-grid">
                                {[...agents.active, ...agents.idle].map((a, i) => {
                                    const isWorking = !!a.active_task_id
                                    return (
                                        <div key={a.agent_id} className={`dc-agent-item ${i >= 2 ? 'dc-agent-item-border-top' : ''} ${i % 2 === 1 ? 'dc-agent-item-border-left' : ''}`}>
                                            <Dot color={isWorking ? '#22c55e' : 'rgba(255,255,255,0.2)'} pulse={isWorking} />
                                            <div className="dc-agent-body">
                                                <div className="dc-agent-id">{a.agent_id}</div>
                                                <div className="dc-agent-meta">
                                                    {a.tool}
                                                    {a.active_task_id && <span className="dc-agent-task-active"> · {a.active_task_id}</span>}
                                                    {a.last_seen && <span> · {timeAgo(a.last_seen)}</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => disconnectAgent(a.agent_id)}
                                                title="Disconnect agent"
                                                className="dc-btn-disconnect"
                                            >✕</button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RIGHT COLUMN — Window Registry ───────────── */}
                <div className="dc-right-col">

                    {/* Multi-Window Registry */}
                    <div>
                        <SectionHeader title="ACTIVE WINDOWS" sub="registry.md" />
                        <div className="dc-win-list">
                            {LOCAL_REGISTRY.map(win => {
                                const wc = wsColor(win.workstream)
                                const isThisWindow = win.window === 'C'
                                return (
                                    <div
                                        key={win.window}
                                        className={`dc-win-card ${isThisWindow ? 'dc-win-card-active' : ''}`}
                                        style={{ '--wc': wc } as React.CSSProperties}
                                    >
                                        <div className="dc-win-card-header">
                                            <div className="dc-win-icon">
                                                {win.window}
                                            </div>
                                            <div>
                                                <div className="dc-win-ws">{win.workstream}</div>
                                                {isThisWindow && (
                                                    <div className="dc-win-this">THIS WINDOW</div>
                                                )}
                                            </div>
                                            <Dot color='#22c55e' pulse style={{ marginLeft: 'auto' }} />
                                        </div>
                                        <div className="dc-win-last">
                                            Last seen {timeAgo(win.lastSeen)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Available Workstreams */}
                    <div>
                        <SectionHeader title="AVAILABLE WORKSTREAMS" />
                        <div className="dc-ws-list">
                            {[
                                'genkit-flows', 'genkit-server', 'inception-core',
                                'synology-mcp', 'comet-browser', 'spatial-visionos', 'free',
                            ].map(ws => {
                                const wc = wsColor(ws)
                                return (
                                    <div key={ws} className="dc-ws-card" style={{ '--wc': wc } as React.CSSProperties}>
                                        <span className="dc-ws-dot" />
                                        <span className="dc-ws-name">{ws}</span>
                                        <span className="dc-ws-status">free</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Active Peripherals (PSI) */}
                    <div>
                        <SectionHeader title="ACTIVE PERIPHERALS" sub="psi daemon" />
                        <div className="dc-ws-list">
                            {[
                                { class: 'mouse', name: 'G Pro X Superlight', status: 'active', aura: 'Navigation Aura' },
                                { class: 'keyboard', name: 'NuPhy Air75', status: 'active', aura: 'Default Aura' },
                            ].map(p => (
                                <div key={p.name} className="dc-ws-card" style={{ '--wc': '#22c55e' } as React.CSSProperties}>
                                    <span className="dc-ws-dot" style={{ animation: p.status === 'active' ? 'pulse 2s infinite' : 'none' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span className="dc-ws-name" style={{ margin: 0 }}>{p.name}</span>
                                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>{p.aura}</span>
                                    </div>
                                    <span className="dc-ws-status" style={{ color: p.status === 'active' ? '#22c55e' : 'inherit' }}>{p.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick commands */}
                    <div>
                        <SectionHeader title="QUICK COMMANDS" />
                        <div className="dc-cmds-panel">
                            {[
                                { cmd: '/claim <ws>', desc: 'Register this window' },
                                { cmd: '/handoff', desc: 'Release & leave note' },
                                { cmd: '/status', desc: 'All active windows' },
                                { cmd: '/sync', desc: 'Pull latest from remote' },
                                { cmd: '/design <prompt>', desc: 'Generate UI via Stitch' },
                                { cmd: '/browser-ideate', desc: 'Ideate from open tabs' },
                                { cmd: '/release', desc: 'Commit → PR → deploy' },
                            ].map(c => (
                                <div key={c.cmd} className="dc-cmd-row">
                                    <code className="dc-cmd-code">{c.cmd}</code>
                                    <span className="dc-cmd-desc">— {c.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
