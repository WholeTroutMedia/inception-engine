import { useState, useCallback, useRef, useEffect } from 'react'
import './PipelineGraph.css'
import EngineStatusGrid from '../components/EngineStatusGrid'

// ── Types ─────────────────────────────────────────────────────────

type EngineModule = 'VIDEO' | 'AUDIO' | '3D' | 'DESIGN' | 'CODE' | 'ASSETS'

interface SubTask {
    id: string
    engine: EngineModule
    intent: string
    inputs: string[]
    outputs: string[]
    priority: number
    status: 'pending' | 'queued' | 'running' | 'complete' | 'failed'
}

interface TaskGraph {
    sessionId: string
    sourcePrompt: string
    tasks: SubTask[]
    enginesRequired: EngineModule[]
    summary?: string
}

import { GENKIT_URL } from '../config/env'
const GENKIT_BASE = GENKIT_URL

const ENGINE_META: Record<EngineModule, { icon: string; color: string; label: string }> = {
    VIDEO: { icon: '◧', color: '#e8794a', label: 'IE Video' },
    AUDIO: { icon: '◉', color: '#a78bfa', label: 'IE Audio' },
    '3D': { icon: '⬡', color: '#34d399', label: 'IE 3D' },
    DESIGN: { icon: '◈', color: '#60a5fa', label: 'IE Design' },
    CODE: { icon: '⬢', color: '#f59e0b', label: 'IE Code' },
    ASSETS: { icon: '◎', color: '#94a3b8', label: 'IE Assets' },
}

const STATUS_COLORS = {
    pending: '#64748b',
    queued: '#60a5fa',
    running: '#f59e0b',
    complete: '#34d399',
    failed: '#ef4444',
}

// ── Pipeline Graph ────────────────────────────────────────────────

export default function PipelineGraph() {
    const [prompt, setPrompt] = useState('')
    const [graph, setGraph] = useState<TaskGraph | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'graph' | 'status'>('graph')
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const runDirector = useCallback(async () => {
        if (!prompt.trim()) return
        setLoading(true)
        setError(null)

        try {
            const res = await fetch(`${GENKIT_BASE}/flows/directorAgent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { prompt: prompt.trim() } }),
                signal: AbortSignal.timeout(45_000),
            })

            if (!res.ok) throw new Error(`Genkit error: ${res.status}`)
            const json = await res.json()
            const result = json.result ?? json
            setGraph({
                sessionId: result.taskGraph?.sessionId ?? `sess-${Date.now()}`,
                sourcePrompt: prompt.trim(),
                tasks: result.taskGraph?.tasks ?? [],
                enginesRequired: result.taskGraph?.enginesRequired ?? [],
                summary: result.summary,
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Director Agent unreachable')
        } finally {
            setLoading(false)
        }
    }, [prompt])

    const reset = () => {
        setGraph(null)
        setPrompt('')
        setError(null)
        setTimeout(() => inputRef.current?.focus(), 50)
    }

    return (
        <div className="pipeline-graph-page">
            {/* Header */}
            <div className="pg-header">
                <div className="pg-title-row">
                    <span className="pg-icon">⬡</span>
                    <div>
                        <h1 className="pg-title">Pipeline Graph</h1>
                        <p className="pg-subtitle">GRAPH MODE — Director Agent · Engine Orchestration</p>
                    </div>
                </div>
                <div className="pg-tabs">
                    <button className={`pg-tab ${activeTab === 'graph' ? 'active' : ''}`} onClick={() => setActiveTab('graph')}>⬡ Graph</button>
                    <button className={`pg-tab ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>◉ Engine Status</button>
                </div>
            </div>

            {activeTab === 'status' ? (
                <div className="pg-status-panel">
                    <EngineStatusGrid />
                </div>
            ) : (
                <>
                    {/* Prompt Input */}
                    <div className="pg-prompt-card">
                        <label className="pg-prompt-label">DIRECTOR AGENT — Natural Language Task</label>
                        <textarea
                            ref={inputRef}
                            className="pg-prompt-input"
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && e.metaKey && runDirector()}
                            placeholder="e.g. Create a cinematic brand video with a lo-fi score and 3D logo reveal…"
                            rows={3}
                            title="Natural language task for the Director Agent"
                        />
                        <div className="pg-prompt-actions">
                            {graph && (
                                <button className="pg-btn-secondary" onClick={reset}>← New Task</button>
                            )}
                            <button
                                className={`pg-btn-primary ${loading ? 'loading' : ''}`}
                                onClick={runDirector}
                                disabled={loading || !prompt.trim()}
                            >
                                {loading ? '⟳ Orchestrating…' : '▶ Decompose Task'}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="pg-error">
                            <span>⚠ {error}</span>
                        </div>
                    )}

                    {/* Graph Visualization */}
                    {graph && (
                        <div className="pg-graph-area">
                            {/* Summary */}
                            {graph.summary && (
                                <div className="pg-summary-card">
                                    <span className="pg-summary-label">PLAN SUMMARY</span>
                                    <p className="pg-summary-text">{graph.summary}</p>
                                    <div className="pg-summary-engines">
                                        {graph.enginesRequired.map(e => {
                                            const meta = ENGINE_META[e]
                                            return (
                                                <span key={e} className="pg-engine-chip" style={{ '--chip-color': meta.color } as React.CSSProperties}>
                                                    {meta.icon} {meta.label}
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Task Nodes */}
                            <div className="pg-nodes">
                                {graph.tasks
                                    .sort((a, b) => b.priority - a.priority)
                                    .map((task, idx) => {
                                        const meta = ENGINE_META[task.engine]
                                        return (
                                            <div key={task.id} className="pg-node" style={{ '--node-color': meta.color } as React.CSSProperties}>
                                                <div className="pg-node-header">
                                                    <span className="pg-node-seq">#{idx + 1}</span>
                                                    <span className="pg-node-engine" style={{ '--engine-color': meta.color } as React.CSSProperties}>{meta.icon} {meta.label}</span>
                                                    <span className="pg-node-priority">P{task.priority}</span>
                                                    <span className="pg-node-status" style={{ '--status-color': STATUS_COLORS[task.status] } as React.CSSProperties}>
                                                        {task.status}
                                                    </span>
                                                </div>
                                                <p className="pg-node-intent">{task.intent}</p>
                                                <div className="pg-node-io">
                                                    {task.inputs.length > 0 && (
                                                        <span className="pg-io in">← {task.inputs.join(', ')}</span>
                                                    )}
                                                    {task.outputs.length > 0 && (
                                                        <span className="pg-io out">→ {task.outputs.join(', ')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>

                            <div className="pg-graph-footer">
                                Session: <code>{graph.sessionId}</code>
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {!graph && !loading && !error && (
                        <div className="pg-empty">
                            <div className="pg-empty-icon">⬡</div>
                            <p className="pg-empty-title">Enter a creative task to see the engine pipeline</p>
                            <p className="pg-empty-sub">The Director Agent will decompose your intent into a directed task graph across 6 specialized engines.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
