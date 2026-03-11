import { useState, useEffect, useCallback } from 'react'

// ─── useServiceHealth ──────────────────────────────────────────────────────────
// Shared hook: pings a list of services and returns live status every N seconds.
// Zero Day: API_BASE from env (no 192.168); tries API_BASE first, then localhost.

import { API_BASE } from '../config/env'

export type SvcStatus = 'online' | 'offline' | 'checking'

export interface ServiceDef {
    id: string
    name: string
    port: number
    health: string   // path, e.g. '/health' or '/api/v2/heartbeat'
    color: string
    group: string
}

export interface LiveSvc extends ServiceDef {
    status: SvcStatus
    ms?: number
}

const apiHost = API_BASE.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:.*$/, '') || 'localhost'
const apiProtocol = API_BASE.startsWith('https') ? 'https' : 'http'
const baseFor = (svc: ServiceDef, host: 'nas' | 'local') =>
    host === 'nas' ? `${apiProtocol}://${apiHost}:${svc.port}` : `http://localhost:${svc.port}`

async function pingSvc(svc: ServiceDef): Promise<LiveSvc> {
    const t = Date.now()
    for (const host of ['nas', 'local'] as const) {
        try {
            const r = await fetch(`${baseFor(svc, host)}${svc.health}`, {
                signal: AbortSignal.timeout(2500),
            })
            if (r.ok || r.status === 204) return { ...svc, status: 'online', ms: Date.now() - t }
        } catch { /* next host */ }
    }
    return { ...svc, status: 'offline' }
}

export function useServiceHealth(services: ServiceDef[], intervalMs = 10_000) {
    const [live, setLive] = useState<LiveSvc[]>(() =>
        services.map(s => ({ ...s, status: 'checking' as SvcStatus }))
    )

    const poll = useCallback(async () => {
        const results = await Promise.all(services.map(pingSvc))
        setLive(results)
    }, [services])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        poll()
        const t = setInterval(poll, intervalMs)
        return () => clearInterval(t)
    }, [poll, intervalMs])

    const online = live.filter(s => s.status === 'online').length
    const total = live.length

    return { live, online, total, refresh: poll }
}
