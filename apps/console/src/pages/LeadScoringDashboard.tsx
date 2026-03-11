import { useState, useMemo, useEffect } from 'react'

// ─── Lead Scoring Dashboard ────────────────────────────────────────────────────
// Real-time visualization of Zero-Day prospect pipeline scores and CTM funnel.
// Connects to the zero-day package CRM sync state via the Genkit API.

interface PipelineRecord {
  prospectId: string
  email: string
  name: string
  company?: string
  industry: string
  stage: 'lead' | 'qualified' | 'engaged' | 'onboarding' | 'contracted' | 'active' | 'churned'
  leadScore: number
  scoringFactors: string[]
  estimatedDealValue?: number
  outreachStrategy?: string
  nextAction?: string
  sourceChannel: string
  updatedAt: string
}

interface PipelineSummary {
  total: number
  byStage: Record<string, number>
  averageScore: number
  totalPipelineValue: number
  recentActivity: PipelineRecord[]
}

const STAGE_COLORS: Record<string, string> = {
  lead: '#6b7280',
  qualified: '#3b82f6',
  engaged: '#8b5cf6',
  onboarding: '#f59e0b',
  contracted: '#10b981',
  active: '#22c55e',
  churned: '#ef4444',
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  engaged: 'Engaged',
  onboarding: 'Onboarding',
  contracted: 'Contracted',
  active: 'Active',
  churned: 'Churned',
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 30 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 44,
      borderRadius: '50%',
      background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
      boxShadow: `0 0 12px ${color}44`,
      fontSize: 13,
      fontWeight: 700,
      color,
      position: 'relative',
    }}>
      {score}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 160,
    }}>
      <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: '#6b7280' }}>{sub}</span>}
    </div>
  )
}

function StageFunnel({ byStage }: { byStage: Record<string, number> }) {
  const stages = ['lead', 'qualified', 'engaged', 'onboarding', 'contracted', 'active']
  const max = Math.max(...stages.map(s => byStage[s] ?? 0), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {stages.map(stage => {
        const count = byStage[stage] ?? 0
        const width = Math.max((count / max) * 100, 4)
        return (
          <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 90, fontSize: 11, color: '#9ca3af', textAlign: 'right', flexShrink: 0 }}>
              {STAGE_LABELS[stage]}
            </span>
            <div style={{
              height: 24,
              width: `${width}%`,
              background: STAGE_COLORS[stage],
              borderRadius: 4,
              transition: 'width 0.6s ease',
              opacity: 0.85,
              minWidth: 4,
            }} />
            <span style={{ fontSize: 12, color: '#d1d5db', fontWeight: 600 }}>{count}</span>
          </div>
        )
      })}
    </div>
  )
}

function ProspectRow({ record }: { record: PipelineRecord }) {
  const [expanded, setExpanded] = useState(false)
  const stageColor = STAGE_COLORS[record.stage] ?? '#6b7280'

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.2s',
        cursor: 'pointer',
        background: expanded ? 'rgba(139,92,246,0.06)' : 'transparent',
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '48px 1fr 140px 100px 120px',
        alignItems: 'center',
        padding: '12px 16px',
        gap: 16,
      }}>
        <ScoreBadge score={record.leadScore} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb' }}>{record.name}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{record.email}</div>
        </div>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: stageColor,
          background: `${stageColor}18`,
          borderRadius: 20,
          padding: '3px 10px',
          textAlign: 'center',
          border: `1px solid ${stageColor}44`,
        }}>
          {STAGE_LABELS[record.stage]}
        </div>
        <div style={{ fontSize: 13, color: '#d1d5db' }}>
          {record.estimatedDealValue
            ? `$${record.estimatedDealValue.toLocaleString()}`
            : '—'
          }
        </div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>
          {new Date(record.updatedAt).toLocaleDateString()}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '0 16px 16px 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {record.outreachStrategy && (
            <div style={{ fontSize: 12, color: '#9ca3af' }}>
              <span style={{ color: '#6b7280', marginRight: 6 }}>Strategy:</span>
              {record.outreachStrategy}
            </div>
          )}
          {record.nextAction && (
            <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 500 }}>
              <span style={{ color: '#6b7280', marginRight: 6 }}>Next Action:</span>
              {record.nextAction}
            </div>
          )}
          {record.scoringFactors.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {record.scoringFactors.map((f, i) => (
                <span key={i} style={{
                  fontSize: 11,
                  background: 'rgba(139,92,246,0.15)',
                  color: '#a78bfa',
                  borderRadius: 4,
                  padding: '2px 7px',
                }}>
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Demo seed data (real data would come from /api/crm/pipeline) ──────────────
const SEED_RECORDS: PipelineRecord[] = [
  {
    prospectId: 'PROSPECT-001',
    email: 'founder@axiom.io',
    name: 'Jordan Kim',
    company: 'Axiom.io',
    industry: 'B2B SaaS',
    stage: 'engaged',
    leadScore: 85,
    scoringFactors: ['+10 from intake_started', '+30 from intake_completed', '+15 from proposal_viewed', '+30 from proposal_accepted'],
    estimatedDealValue: 48000,
    outreachStrategy: 'Schedule executive briefing within 48h. Present sovereignty ROI calculator.',
    nextAction: 'Book 45-min demo call with CTO team.',
    sourceChannel: 'intake_form',
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    prospectId: 'PROSPECT-002',
    email: 'ops@meridian.design',
    name: 'Alex Torres',
    company: 'Meridian Design',
    industry: 'Creative Agency',
    stage: 'qualified',
    leadScore: 45,
    scoringFactors: ['+10 from intake_started', '+30 from intake_completed'],
    estimatedDealValue: 24000,
    outreachStrategy: 'Nurture sequence: share AI-native creative workflow case studies.',
    nextAction: 'Send Creative Liberation Engine overview deck with a creative agency case study.',
    sourceChannel: 'referral',
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    prospectId: 'PROSPECT-003',
    email: 'cto@novalabs.tech',
    name: 'Sam Patel',
    company: 'NovaLabs',
    industry: 'Deep Tech',
    stage: 'onboarding',
    leadScore: 92,
    scoringFactors: ['+10 from intake_started', '+30 from intake_completed', '+15 from proposal_viewed', '+40 from proposal_accepted', '-3 adjustment'],
    estimatedDealValue: 96000,
    outreachStrategy: 'High-priority: full sovereign deployment. Assign dedicated AVERI instance.',
    nextAction: 'Trigger onboarding Genkit flow and send portal access credentials.',
    sourceChannel: 'inbound',
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    prospectId: 'PROSPECT-004',
    email: 'founder@vantage.media',
    name: 'Riley Chen',
    company: 'Vantage Media',
    industry: 'Media Production',
    stage: 'lead',
    leadScore: 12,
    scoringFactors: ['+10 from intake_started'],
    estimatedDealValue: undefined,
    outreachStrategy: 'Cold nurture — connect via content marketing first.',
    nextAction: 'Add to Zero-Day newsletter drip sequence.',
    sourceChannel: 'outbound',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

// ── CRM API (zero-day server :9000) ──────────────────────────────────────────
const CRM_PIPELINE_URL = 'http://localhost:9000/api/crm/pipeline'

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LeadScoringDashboard() {
  const [records, setRecords] = useState<PipelineRecord[]>(SEED_RECORDS)
  const [crmLive, setCrmLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<'leadScore' | 'estimatedDealValue' | 'updatedAt'>('leadScore')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(CRM_PIPELINE_URL)
        if (!res.ok) throw new Error('CRM offline')
        const data = await res.json() as PipelineRecord[]
        if (!cancelled && data.length > 0) {
          setRecords(data)
          setCrmLive(true)
        }
      } catch {
        // Keep seed records — graceful degradation
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const interval = setInterval(() => { void load() }, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const summary = useMemo<PipelineSummary>(() => {
    const byStage: Record<string, number> = {}
    let totalScore = 0
    let totalValue = 0

    for (const r of records) {
      byStage[r.stage] = (byStage[r.stage] ?? 0) + 1
      totalScore += r.leadScore
      totalValue += r.estimatedDealValue ?? 0
    }

    return {
      total: records.length,
      byStage,
      averageScore: records.length > 0 ? Math.round(totalScore / records.length) : 0,
      totalPipelineValue: totalValue,
      recentActivity: [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    }
  }, [records])

  const filteredRecords = records
    .filter(r => filter === 'all' || r.stage === filter)
    .sort((a, b) => {
      if (sortKey === 'leadScore') return b.leadScore - a.leadScore
      if (sortKey === 'estimatedDealValue') return (b.estimatedDealValue ?? 0) - (a.estimatedDealValue ?? 0)
      return b.updatedAt.localeCompare(a.updatedAt)
    })

  return (
    <div style={{
      padding: '28px 32px',
      fontFamily: "'Inter', sans-serif",
      color: '#f9fafb',
      minHeight: '100vh',
      background: 'transparent',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 10px #22c55e',
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ fontSize: 11, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            Zero-Day GTM · Live
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#fff' }}>Lead Scoring Dashboard</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          AI-scored prospect pipeline · {records.length} prospects tracked ·{' '}
          <span style={{ color: crmLive ? '#22c55e' : '#6b7280' }}>
            {loading ? 'connecting…' : crmLive ? '⚡ live from CRM' : '⚠ seed data (start zero-day server)'}
          </span>
        </p>
      </div>

      {/* Stats row */}
      {summary && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <StatCard label="Total Prospects" value={summary.total} />
          <StatCard label="Avg Lead Score" value={summary.averageScore} sub="out of 100" />
          <StatCard
            label="Pipeline Value"
            value={`$${(summary.totalPipelineValue / 1000).toFixed(0)}k`}
            sub="estimated deal value"
          />
          <StatCard
            label="Engaged"
            value={(summary.byStage['engaged'] ?? 0) + (summary.byStage['onboarding'] ?? 0)}
            sub="ready to close"
          />
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
        {/* Prospect table */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {/* Table toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'lead', 'qualified', 'engaged', 'onboarding', 'contracted'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: filter === s ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)',
                    color: filter === s ? '#a78bfa' : '#9ca3af',
                    transition: 'all 0.15s',
                  }}
                >
                  {s === 'all' ? 'All' : STAGE_LABELS[s]}
                </button>
              ))}
            </div>
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as typeof sortKey)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#d1d5db',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              <option value="leadScore">Sort: Score</option>
              <option value="estimatedDealValue">Sort: Deal Value</option>
              <option value="updatedAt">Sort: Recent</option>
            </select>
          </div>

          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 140px 100px 120px',
            padding: '8px 16px',
            gap: 16,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {['Score', 'Prospect', 'Stage', 'Est. Value', 'Updated'].map(h => (
              <span key={h} style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filteredRecords.length > 0 ? (
            filteredRecords.map(r => (
              <ProspectRow key={r.prospectId} record={r} />
            ))
          ) : (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#4b5563' }}>
              No prospects in this stage.
            </div>
          )}
        </div>

        {/* Sidebar: Funnel + Recent */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pipeline funnel */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#d1d5db', marginBottom: 16 }}>
              Pipeline Funnel
            </div>
            {summary && <StageFunnel byStage={summary.byStage} />}
          </div>

          {/* Recent activity */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 20,
            flex: 1,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#d1d5db', marginBottom: 12 }}>
              Recent Activity
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(summary?.recentActivity ?? []).map(r => (
                <div key={r.prospectId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: STAGE_COLORS[r.stage],
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#f9fafb', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      Score: {r.leadScore} · {STAGE_LABELS[r.stage]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
