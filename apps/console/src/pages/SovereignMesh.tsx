import { useState, useEffect, useCallback } from 'react'

// ─── Sovereign Mesh Dashboard ──────────────────────────────────────────────────
// Live visualization of the full three-tier sovereign compute mesh.
// Reads from SAR API at localhost:5051/api/sar/*

interface DeviceEntity { id: string; label: string; status: string; device_class: string; connection_type: string; friendly_name: string; attention_score: number }
interface StorageEntity { id: string; label: string; status: string; total_bytes: number; free_bytes: number; drive_type: string; attention_score: number }
interface ProcessEntity { id: string; label: string; name: string; cpu_percent: number; memory_mb: number; attention_score: number }
interface ContainerEntity { id: string; label: string; status: string; image: string; ports: string[]; health: string; attention_score: number; metadata?: Record<string, unknown> }
interface GCPEntity { id: string; label: string; status: string; service_type: string; url?: string; region?: string; attention_score: number }

interface MeshSnapshot {
  captured_at: string
  workstation: { hostname: string; os: string; uptime_seconds: number; devices: DeviceEntity[]; storage: StorageEntity[]; processes: ProcessEntity[]; displays: Array<{ label: string; model: string }> }
  nas: { hostname: string; online: boolean; containers: ContainerEntity[]; volumes: Array<{ label: string; total_bytes: number; free_bytes: number }> }
  gcp: { project_id: string; online: boolean; services: GCPEntity[] }
  attention: { digest: string; anomalies: string[]; top_entities: Array<{ entity: { label: string; id: string }; score: number; reason: string }> }
}

const SAR_URL = 'http://localhost:5051'

const STATUS_DOT: Record<string, string> = {
  online: '#22c55e', offline: '#ef4444', degraded: '#f59e0b', unknown: '#6b7280',
}
const STATUS_LABEL: Record<string, string> = {
  online: 'online', offline: 'OFFLINE', degraded: 'degraded', unknown: 'unknown',
}

function TierCard({ title, icon, status, children }: { title: string; icon: string; status: 'online' | 'offline' | 'degraded'; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${status === 'online' ? 'rgba(34,197,94,0.2)' : status === 'offline' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.2)'}`, borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#f9fafb', letterSpacing: '0.05em' }}>{title}</span>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_DOT[status] ?? '#6b7280', boxShadow: `0 0 8px ${STATUS_DOT[status] ?? '#6b7280'}`, marginLeft: 'auto' }} />
      </div>
      {children}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const color = STATUS_DOT[status] ?? '#6b7280'
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 20, padding: '2px 7px' }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  const color = pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#22c55e'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
        <span>{label}</span>
        <span style={{ color }}>{pct}% used</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

function AttentionFeed({ items }: { items: Array<{ entity: { label: string }; score: number; reason: string }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.slice(0, 8).map((item, i) => {
        const color = item.score >= 80 ? '#ef4444' : item.score >= 50 ? '#f59e0b' : '#8b5cf6'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: `${color}0a`, borderRadius: 8, border: `1px solid ${color}22` }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>
              {item.score}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#f9fafb' }}>{item.entity.label}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{item.reason}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function SovereignMesh() {
  const [snapshot, setSnapshot] = useState<MeshSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${SAR_URL}/api/sar/snapshot`, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error(`SAR API ${res.status}`)
      const data = await res.json() as MeshSnapshot
      setSnapshot(data)
      setLastUpdated(new Date())
      setError(null)
    } catch {
      setError(`SAR offline — start with: npm run start --workspace=@inception/sovereign-mesh`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const interval = setInterval(() => void refresh(), 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  const ws = snapshot?.workstation
  const nas = snapshot?.nas
  const gcp = snapshot?.gcp

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'Inter', sans-serif", color: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: error ? '#ef4444' : '#22c55e', boxShadow: `0 0 10px ${error ? '#ef4444' : '#22c55e'}`, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: error ? '#ef4444' : '#22c55e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              NERVE · {error ? 'SAR offline' : 'Live Mesh'}
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Sovereign Mesh Intelligence</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            Local · NAS · Google Cloud · One Identity
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdated && <span style={{ fontSize: 11, color: '#4b5563' }}>Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button onClick={() => void refresh()} style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, fontSize: 13, color: '#fca5a5' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div style={{ textAlign: 'center', padding: 60, color: '#4b5563' }}>
          Querying sovereign mesh via SAR API…
        </div>
      )}

      {snapshot && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* Workstation tier */}
          <TierCard title={`WORKSTATION · ${ws?.hostname ?? '…'}`} icon="🖥️" status="online">
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {ws?.os} · uptime {Math.round((ws?.uptime_seconds ?? 0) / 3600)}h
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginTop: 4 }}>DEVICES ({ws?.devices.filter(d => d.status === 'online').length} online)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(ws?.devices ?? []).filter(d => d.status === 'online').slice(0, 6).map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{d.friendly_name}</span>
                  <span style={{ fontSize: 10, color: '#6b7280' }}>{d.connection_type}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 8 }}>
              {(ws?.storage ?? []).map(s => (
                <UsageBar
                  key={s.id}
                  label={`${s.label} (${s.drive_type})`}
                  used={s.total_bytes - s.free_bytes}
                  total={s.total_bytes}
                />
              ))}
            </div>
          </TierCard>

          {/* NAS tier */}
          <TierCard title={`NAS · ${nas?.hostname ?? 'creative-liberation-engine'}`} icon="🗄️" status={nas?.online ? 'online' : 'offline'}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {nas?.containers.filter(c => c.status === 'online').length}/{nas?.containers.length} containers running
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginTop: 4 }}>CONTAINERS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(nas?.containers ?? []).map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#d1d5db' }}>{c.label}</span>
                  <StatusPill status={c.health === 'healthy' ? 'online' : c.health === 'unhealthy' ? 'offline' : 'unknown'} />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 8 }}>
              {(nas?.volumes ?? []).map(v => (
                <UsageBar
                  key={v.label}
                  label={v.label}
                  used={v.total_bytes - v.free_bytes}
                  total={v.total_bytes}
                />
              ))}
            </div>
          </TierCard>

          {/* GCP tier */}
          <TierCard title={`GOOGLE CLOUD · ${gcp?.project_id ?? '…'}`} icon="☁️" status={gcp?.online ? 'online' : 'offline'}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {gcp?.services.filter(s => s.status === 'online').length}/{gcp?.services.length} services online
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', marginTop: 4 }}>SERVICES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(gcp?.services ?? []).map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#d1d5db' }}>{s.label}</div>
                    {s.region && <div style={{ fontSize: 10, color: '#4b5563' }}>{s.region} · {s.service_type}</div>}
                  </div>
                  <StatusPill status={s.status} />
                </div>
              ))}
            </div>
          </TierCard>
        </div>
      )}

      {/* NERVE Attention Brief */}
      {snapshot?.attention && (
        <div style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 16 }}>
            ⚡ NERVE · Attention Feed
          </div>
          {snapshot.attention.anomalies.length > 0 && (
            <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {snapshot.attention.anomalies.map((a, i) => (
                <span key={i} style={{ fontSize: 11, background: 'rgba(239,68,68,0.12)', color: '#fca5a5', borderRadius: 6, padding: '3px 9px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {a}
                </span>
              ))}
            </div>
          )}
          <AttentionFeed items={snapshot.attention.top_entities} />
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
