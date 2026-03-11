import { useState, useEffect } from 'react'

// ─── Financial Command Center ──────────────────────────────────────────────────
// the creator's unified financial dashboard.
// Left panel: Infrastructure cost reality (GCP + sovereign advantage).
// Right panel: Zero-Day pipeline revenue, active deals, burn vs. earn.
// Bottom: month-over-month trajectory and next-money actions.

// ── Types ─────────────────────────────────────────────────────────────────────
interface CostLine {
  label: string
  category: 'gcp' | 'sovereign' | 'external'
  monthly_usd: number
  detail: string
  trend: 'stable' | 'up' | 'down'
}

interface DealLine {
  name: string
  company: string
  stage: string
  value: number
  probability: number  // 0-1
  close_date: string
  source: string
}

interface RevenueMonth {
  month: string
  revenue: number
  pipeline: number
}

// ── Static data (will be live once GCP Billing API + CRM sync are wired) ─────
const COSTS: CostLine[] = [
  { label: 'Firebase Hosting', category: 'gcp', monthly_usd: 0, detail: 'cle-mobile.web.app — free tier (10GB, 360MB/day bandwidth)', trend: 'stable' },
  { label: 'Firebase Auth', category: 'gcp', monthly_usd: 0, detail: 'Email + Google OAuth — free up to 10k MAU', trend: 'stable' },
  { label: 'Cloud Run (Creative Liberation Engine)', category: 'gcp', monthly_usd: 5, detail: 'Genkit API · scales to zero · ~0.4M req free/mo', trend: 'stable' },
  { label: 'Firestore', category: 'gcp', monthly_usd: 2, detail: 'Sessions, memory fragments, agent state', trend: 'stable' },
  { label: 'Gemini API', category: 'gcp', monthly_usd: 40, detail: 'gemini-2.5-pro · multi-helix wave usage · variable', trend: 'up' },
  { label: 'GCS', category: 'gcp', monthly_usd: 1, detail: 'Build artifacts, media buffers', trend: 'stable' },
  { label: 'NAS (Creative Liberation Engine Community)', category: 'sovereign', monthly_usd: 0, detail: 'Owned hardware · Dispatch, Redis, Genkit, Forgejo, Docker — $0 cloud', trend: 'stable' },
  { label: 'Workstation (RTX 3080)', category: 'sovereign', monthly_usd: 0, detail: 'Owned hardware · local compute, renders, dev — $0 cloud', trend: 'stable' },
  { label: 'Forgejo (Git)', category: 'sovereign', monthly_usd: 0, detail: 'Self-hosted on NAS · $0 vs $21/mo GitHub Team', trend: 'stable' },
  { label: 'Domain + DNS', category: 'external', monthly_usd: 2, detail: 'creative-liberation-engine.io + creative-liberation-engine.io', trend: 'stable' },
  { label: 'Resend (Email)', category: 'external', monthly_usd: 0, detail: 'Zero-Day outreach — 3k/mo free tier', trend: 'stable' },
]

// ── Static CRM fallback (shown when CRM server is offline) ───────────────────
const DEALS_FALLBACK: DealLine[] = [
  { name: 'Jordan Kim', company: 'Axiom.io', stage: 'Engaged', value: 48000, probability: 0.75, close_date: '2026-03-25', source: 'Intake' },
  { name: 'Sam Patel', company: 'NovaLabs', stage: 'Onboarding', value: 96000, probability: 0.90, close_date: '2026-03-15', source: 'Inbound' },
  { name: 'Alex Torres', company: 'Meridian Design', stage: 'Qualified', value: 24000, probability: 0.35, close_date: '2026-04-10', source: 'Referral' },
  { name: 'Riley Chen', company: 'Vantage Media', stage: 'Lead', value: 18000, probability: 0.10, close_date: '2026-05-01', source: 'Outbound' },
]

const MONTHLY_HISTORY: RevenueMonth[] = [
  { month: 'Jan', revenue: 0, pipeline: 12000 },
  { month: 'Feb', revenue: 8000, pipeline: 48000 },
  { month: 'Mar', revenue: 24000, pipeline: 186000 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const STAGE_COLOR: Record<string, string> = {
  Lead: '#6b7280', Qualified: '#3b82f6', Engaged: '#8b5cf6',
  Onboarding: '#f59e0b', Contracted: '#10b981', Active: '#22c55e',
}
const CAT_COLOR: Record<string, string> = { gcp: '#4285f4', sovereign: '#22c55e', external: '#9ca3af' }
const CAT_LABEL: Record<string, string> = { gcp: 'Google Cloud', sovereign: '⚡ Sovereign (free)', external: 'External' }

// ── Sub-components ────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent = '#a78bfa', delta }: {
  label: string; value: string; sub?: string; accent?: string; delta?: string
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}22`, borderRadius: 12, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</span>
        {delta && <span style={{ fontSize: 12, color: delta.startsWith('+') ? '#22c55e' : '#ef4444' }}>{delta}</span>}
      </div>
      {sub && <span style={{ fontSize: 11, color: '#4b5563' }}>{sub}</span>}
    </div>
  )
}

function SparkBar({ history }: { history: RevenueMonth[] }) {
  const maxV = Math.max(...history.map(h => h.pipeline), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 80, padding: '0 4px' }}>
      {history.map((h, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', position: 'relative', height: `${Math.round((h.pipeline / maxV) * 100)}%`, minHeight: 4, borderRadius: 4, background: 'rgba(139,92,246,0.25)' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${h.revenue > 0 ? Math.round((h.revenue / h.pipeline) * 100) : 0}%`, background: '#a78bfa', borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 10, color: '#4b5563' }}>{h.month}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
// CRM API — zero-day server must be running on :9000
const CRM_API = 'http://localhost:9000/api/crm/pipeline'

// Map server PipelineRecord → DealLine display shape
function toDealLine(r: {
  name: string; company?: string; stage: string;
  estimatedDealValue?: number; leadScore: number; sourceChannel: string; updatedAt: string
}): DealLine {
  const stageProbability: Record<string, number> = {
    lead: 0.05, qualified: 0.25, engaged: 0.70, onboarding: 0.90, contracted: 0.97, active: 1.0, churned: 0,
  }
  return {
    name: r.name,
    company: r.company ?? '—',
    stage: r.stage.charAt(0).toUpperCase() + r.stage.slice(1),
    value: r.estimatedDealValue ?? 0,
    probability: stageProbability[r.stage] ?? 0.10,
    close_date: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
    source: r.sourceChannel,
  }
}

export default function FinancialCommandCenter() {
  const [crmDeals, setCrmDeals] = useState<DealLine[]>(DEALS_FALLBACK)
  const [crmLive, setCrmLive] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(CRM_API)
        if (!res.ok) throw new Error('CRM offline')
        const data = await res.json() as Array<{
          name: string; company?: string; stage: string;
          estimatedDealValue?: number; leadScore: number; sourceChannel: string; updatedAt: string
        }>
        if (!cancelled && data.length > 0) {
          setCrmDeals(data.map(toDealLine))
          setCrmLive(true)
          setLastUpdated(new Date())
        }
      } catch {
        // Server offline — keep fallback seed data, no UI disruption
      }
    }
    void load()
    const interval = setInterval(() => { void load() }, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const totalAll = COSTS.reduce((s, c) => s + c.monthly_usd, 0)
  const sovereignSavings = 21 + 15 + 50
  const weightedPipeline = crmDeals.reduce((s, d) => s + d.value * d.probability, 0)
  const totalPipeline = crmDeals.reduce((s, d) => s + d.value, 0)
  const monthRevenue = MONTHLY_HISTORY[MONTHLY_HISTORY.length - 1].revenue



  return (
    <div style={{ padding: '28px 32px', fontFamily: "'Inter', sans-serif", color: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Financial Command Center · Live
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Money. Clear as day.</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            Infrastructure spend · Pipeline revenue · Sovereign advantage
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#4b5563' }}>Updated {lastUpdated.toLocaleTimeString()}</div>
          <div style={{ fontSize: 11, color: crmLive ? '#22c55e' : '#6b7280', marginTop: 2 }}>
            {crmLive ? '⚡ CRM live · :9000' : '⚠ CRM offline — seed data'}
          </div>
        </div>
      </div>

      {/* Top KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <MetricCard label="Monthly Burn" value={`$${totalAll}`} sub="total infra spend" accent="#ef4444" delta="-92% vs cloud-native stack" />
        <MetricCard label="Sovereign Savings" value={`$${sovereignSavings}/mo`} sub="vs equivalent SaaS stack" accent="#22c55e" />
        <MetricCard label="Weighted Pipeline" value={fmt(weightedPipeline)} sub="probability-adjusted" accent="#a78bfa" />
        <MetricCard label="Burn:Earn Ratio" value={`1:${Math.round(monthRevenue / Math.max(totalAll, 1))}x`} sub={`$${totalAll} cost vs ${fmt(monthRevenue)} March revenue`} accent="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

        {/* Cost breakdown */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#d1d5db' }}>Infrastructure Cost Breakdown</span>
            <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>${totalAll}/mo total</span>
          </div>

          {(['gcp', 'sovereign', 'external'] as const).map(cat => {
            const lines = COSTS.filter(c => c.category === cat)
            const catTotal = lines.reduce((s, c) => s + c.monthly_usd, 0)
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: CAT_COLOR[cat], textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {CAT_LABEL[cat]}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: CAT_COLOR[cat] }}>${catTotal}/mo</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {lines.map(c => (
                    <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '5px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#d1d5db', fontWeight: 500 }}>{c.label}</div>
                        <div style={{ fontSize: 10, color: '#4b5563', marginTop: 1 }}>{c.detail}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: c.monthly_usd === 0 ? '#22c55e' : '#9ca3af', marginLeft: 12, flexShrink: 0 }}>
                        {c.monthly_usd === 0 ? 'FREE' : `$${c.monthly_usd}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Sovereign advantage callout */}
          <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>⚡ Sovereign Architecture = $0 infra floor</div>
            <div style={{ fontSize: 11, color: '#4b5563', marginTop: 3 }}>
              NAS + workstation = $0/mo cloud. 49-agent mesh running on owned hardware.
              Equivalent AWS stack: ~$800/mo.
            </div>
          </div>
        </div>

        {/* Pipeline / revenue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Deal pipeline */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#d1d5db' }}>Zero-Day Deal Pipeline</span>
              <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>{fmtFull(totalPipeline)} {crmLive ? '(live)' : '(seed)'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {crmDeals.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: STAGE_COLOR[d.stage] ?? '#6b7280', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f9fafb' }}>{d.name}</span>
                      <span style={{ fontSize: 11, color: '#4b5563' }}>{d.company}</span>
                    </div>
                    <div style={{ paddingLeft: 15, marginTop: 2 }}>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, maxWidth: 160 }}>
                        <div style={{ height: '100%', width: `${d.probability * 100}%`, background: STAGE_COLOR[d.stage] ?? '#6b7280', borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f9fafb' }}>{fmtFull(d.value)}</div>
                    <div style={{ fontSize: 10, color: '#4b5563' }}>{Math.round(d.probability * 100)}% · closes {new Date(d.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Weighted close value</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#a78bfa' }}>{fmtFull(weightedPipeline)}</span>
            </div>
          </div>

          {/* Revenue trajectory */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#d1d5db', marginBottom: 12 }}>Revenue Trajectory</div>
            <SparkBar history={MONTHLY_HISTORY} />
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: '#4b5563' }}>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#a78bfa', borderRadius: 2, marginRight: 4 }} />Revenue closed</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'rgba(139,92,246,0.25)', borderRadius: 2, marginRight: 4 }} />Pipeline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Next money actions */}
      <div style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 14 }}>⚡ Next Money Actions — Highest Impact</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Close NovaLabs', sub: 'Sam Patel in onboarding — 90% close probability. Send portal access now.', value: '$96k', urgency: '#22c55e' },
            { label: 'Advance Axiom.io', sub: 'Jordan Kim engaged at 85 score. Book exec briefing this week.', value: '$48k', urgency: '#f59e0b' },
            { label: 'Public Genkit URL', sub: 'Cloud Run allow-unauthenticated = AVERI accessible to all clients externally.', value: 'Unblocks GTM', urgency: '#8b5cf6' },
          ].map(a => (
            <div key={a.label} style={{ padding: '14px 16px', background: `${a.urgency}09`, border: `1px solid ${a.urgency}22`, borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f9fafb' }}>{a.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: a.urgency }}>{a.value}</span>
              </div>
              <p style={{ fontSize: 11, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{a.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
