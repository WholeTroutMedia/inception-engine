import { useState, useEffect, useCallback } from 'react'
import '../pages/PipelineGraph.css'

// ── Types ─────────────────────────────────────────────────────────

type EngineStatus = 'online' | 'busy' | 'offline' | 'initializing'

interface EngineHealth {
    engine: string
    status: EngineStatus
    lastInvoked?: string
    invocationsToday: number
    avgLatencyMs?: number
    queueDepth?: number
}

import { GENKIT_URL } from '../config/env'
const GENKIT_BASE = GENKIT_URL

const ENGINE_META = [
    { module: 'VIDEO', label: 'IE Video', icon: '◧', color: '#e8794a', desc: 'Non-linear editing · compositing · color' },
    { module: 'AUDIO', label: 'IE Audio', icon: '◉', color: '#a78bfa', desc: 'Synthesis · mixing · mastering · Lyria' },
    { module: '3D', label: 'IE 3D', icon: '⬡', color: '#34d399', desc: 'PBR rendering · USD/glTF · world builder' },
    { module: 'DESIGN', label: 'IE Design', icon: '◈', color: '#60a5fa', desc: 'Vector/raster canvas · typography · brand' },
    { module: 'CODE', label: 'IE Code', icon: '⬢', color: '#f59e0b', desc: 'Shader gen · script gen · GPU compute' },
    { module: 'ASSETS', label: 'IE Assets', icon: '◎', color: '#94a3b8', desc: 'Semantic search · NAS sync · IPFS' },
] as const

const STATUS_COLOR: Record<EngineStatus, string> = {
    online: '#34d399',
    busy: '#f59e0b',
    offline: '#ef4444',
    initializing: '#60a5fa',
}

// ── EngineStatusGrid ──────────────────────────────────────────────

export default function EngineStatusGrid() {
    const [healths, setHealths] = useState<Record<string, EngineHealth>>(() => {
        const init: Record<string, EngineHealth> = {}
        for (const e of ENGINE_META) {
            init[e.module] = { engine: e.module, status: 'initializing', invocationsToday: 0 }
        }
        return init
    })
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

    const probe = useCallback(async () => {
        try {
            const res = await fetch(`${GENKIT_BASE}/health`, { signal: AbortSignal.timeout(3000) })
            if (res.ok) {
                // Genkit server is up — mark all as online
                setHealths(prev => {
                    const next = { ...prev }
                    for (const e of ENGINE_META) {
                        next[e.module] = { ...next[e.module], status: 'online' }
                    }
                    return next
                })
            } else {
                setHealths(prev => {
                    const next = { ...prev }
                    for (const e of ENGINE_META) {
                        next[e.module] = { ...next[e.module], status: 'offline' }
                    }
                    return next
                })
            }
        } catch {
            setHealths(prev => {
                const next = { ...prev }
                for (const e of ENGINE_META) {
                    next[e.module] = { ...next[e.module], status: 'offline' }
                }
                return next
            })
        }
        setLastRefreshed(new Date())
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            void probe()
        }, 0)
        const t = setInterval(probe, 30_000)
        return () => {
            clearTimeout(timer)
            clearInterval(t)
        }
    }, [probe])

    const online = Object.values(healths).filter(h => h.status === 'online').length

    return (
        <div className="engine-status-grid">
            <div className="engine-status-header">
                <span className="engine-status-title">ENGINE STATUS</span>
                <span className="engine-status-meta">
                    {online}/{ENGINE_META.length} online
                    <span className="engine-status-dot" ref={el => el?.style.setProperty('--dot-color', online === ENGINE_META.length ? '#34d399' : online > 0 ? '#f59e0b' : '#ef4444')} />
                </span>
            </div>

            <div className="engine-status-cards">
                {ENGINE_META.map(engine => {
                    const health = healths[engine.module]
                    const status = health?.status ?? 'offline'
                    return (
                        <div key={engine.module} className="engine-card" ref={el => el?.style.setProperty('--card-accent', engine.color + '33')}>
                            <div className="engine-card-header">
                                <span className="engine-card-icon" ref={el => el?.style.setProperty('--icon-color', engine.color)}>{engine.icon}</span>
                                <span className="engine-card-label">{engine.label}</span>
                                <span className="engine-card-status" ref={el => el?.style.setProperty('--status-color', STATUS_COLOR[status])}>
                                    {status}
                                </span>
                            </div>
                            <div className="engine-card-desc">{engine.desc}</div>
                            <div className="engine-card-stats">
                                {health?.avgLatencyMs && (
                                    <span className="engine-stat">{health.avgLatencyMs}ms avg</span>
                                )}
                                {health?.invocationsToday > 0 && (
                                    <span className="engine-stat">{health.invocationsToday} today</span>
                                )}
                                {health?.queueDepth !== undefined && health.queueDepth > 0 && (
                                    <span className="engine-stat">{health.queueDepth} queued</span>
                                )}
                            </div>
                            <div className="engine-card-bar">
                                <div
                                    className="engine-card-bar-fill"
                                    ref={el => {
                                        if (el) {
                                            el.style.setProperty('--bar-color', engine.color)
                                            el.style.setProperty('--bar-width', status === 'online' ? '100%' : status === 'busy' ? '60%' : '0%')
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="engine-status-footer">
                Last refreshed: {lastRefreshed.toLocaleTimeString()}
                <button className="engine-refresh-btn" onClick={probe}>↺</button>
            </div>
        </div>
    )
}
