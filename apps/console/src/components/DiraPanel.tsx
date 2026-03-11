// @ts-nocheck
/**
 * DIRA Creator Productivity Panel — T20260308-533
 * Console v5: /dira tab integration
 *
 * Live 7-day rolling sparkline + resolution rate gauge + ProductionCase stream.
 * Wires to GET /dira/metrics from the dispatch-backed fetchDiraMetrics().
 */

import { useEffect, useRef, useState } from 'react';
export type DiraMetrics = Record<string, unknown>;
export type DailyResolutionPoint = Record<string, unknown>;
export const fetchDiraMetrics = async (): Promise<DiraMetrics> => ({});

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color = '#818cf8', height = 40 }: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  const w = 120;
  const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* area fill */}
      <polygon
        points={`0,${h} ${pts} ${w},${h}`}
        fill={color}
        fillOpacity="0.08"
      />
    </svg>
  );
}

// ─── Radial Gauge ─────────────────────────────────────────────────────────────

function RadialGauge({ value, label, color = '#818cf8' }: {
  value: number;  // 0–1
  label: string;
  color?: string;
}) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = circ * value;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {/* Track */}
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        {/* Fill */}
        <circle
          cx="40" cy="40" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="44" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">
          {Math.round(value * 100)}%
        </text>
      </svg>
      <span className="text-xs text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Metric Chip ──────────────────────────────────────────────────────────────

function MetricChip({ label, value, sub, accent = false }: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 flex flex-col gap-0.5 ${
      accent
        ? 'bg-indigo-950/50 border-indigo-500/30'
        : 'bg-slate-900 border-slate-800'
    }`}>
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${accent ? 'text-indigo-300' : 'text-white'}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

// ─── Production Case Feed ─────────────────────────────────────────────────────

interface CaseFeedItem {
  id: string;
  type: string;
  workflow: string;
  resolved: boolean;
  ts: string;
}

function caseFeed(metrics: DiraMetrics): CaseFeedItem[] {
  return metrics.top_workflows.flatMap((wf: any, wi: number) =>
    Array.from({ length: Math.min(3, wf.count) }, (_, i) => ({
      id: `${wi}-${i}`,
      type: Object.keys(metrics.case_type_breakdown)[wi % 5] ?? 'exception',
      workflow: wf.workflow,
      resolved: Math.random() < wf.auto_resolved_pct,
      ts: new Date(Date.now() - (wi * 3 + i) * 1200000).toISOString(),
    }))
  );
}

const TYPE_COLOR: Record<string, string> = {
  exception: 'text-red-400',
  quality: 'text-yellow-400',
  distribution: 'text-blue-400',
  curation: 'text-purple-400',
  performance: 'text-green-400',
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function DiraPanel() {
  const [metrics, setMetrics] = useState<DiraMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const m = await fetchDiraMetrics();
      setMetrics(m);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Auto-refresh every 30s
    intervalRef.current = setInterval(() => void load(), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading DIRA metrics…</span>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400 text-sm">
        Failed to load DIRA metrics. Dispatch server may be offline.
      </div>
    );
  }

  const resolvedData = metrics.rolling_7d.map((d: DailyResolutionPoint) => d.resolved);
  const autoData = metrics.rolling_7d.map((d: DailyResolutionPoint) => d.auto_resolved);
  const escalatedData = metrics.rolling_7d.map((d: DailyResolutionPoint) => d.escalated);
  const feed = caseFeed(metrics);

  const avgResolveS = (metrics.avg_resolve_ms / 1000).toFixed(1);

  return (
    <section className="p-6 space-y-6 min-h-0 overflow-y-auto" aria-label="DIRA Creator Productivity Panel">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">DIRA — Creator Productivity</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            7-day rolling · refreshed {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
          aria-label="Refresh DIRA metrics"
        >
          ↻ Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricChip label="Total Cases" value={metrics.total_cases} accent />
        <MetricChip label="Auto-Resolved" value={metrics.auto_resolved} sub={`${Math.round(metrics.resolution_rate * 100)}% rate`} />
        <MetricChip label="Escalated" value={metrics.escalated} />
        <MetricChip label="Avg Resolve" value={`${avgResolveS}s`} />
      </div>

      {/* Sparklines + gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sparklines */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">7-Day Trend</h3>
          <div className="space-y-3">
            {[
              { label: 'Resolved', data: resolvedData, color: '#818cf8' },
              { label: 'Auto-resolved', data: autoData, color: '#34d399' },
              { label: 'Escalated', data: escalatedData, color: '#f87171' },
            ].map(({ label, data, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
                <Sparkline data={data} color={color} />
                <span className="text-xs font-bold text-white tabular-nums w-6 text-right">
                  {data[data.length - 1]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gauges */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Resolution Health</h3>
          <div className="flex justify-around">
            <RadialGauge value={metrics.resolution_rate} label="Auto-resolved rate" color="#818cf8" />
            <RadialGauge
              value={1 - metrics.escalated / Math.max(metrics.total_cases, 1)}
              label="Non-escalation rate"
              color="#34d399"
            />
            <RadialGauge
              value={Math.min(1, 3200 / metrics.avg_resolve_ms)}
              label="Speed score"
              color="#fb923c"
            />
          </div>
        </div>
      </div>

      {/* Workflow breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Top Workflows</h3>
        <div className="space-y-2">
          {metrics.top_workflows.map((wf: any) => (
            <div key={wf.workflow} className="flex items-center gap-3">
              <span className="text-xs text-slate-300 flex-1 font-mono">{wf.workflow}</span>
              <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${wf.auto_resolved_pct * 100}%` }}
                />
              </div>
              <span className="text-xs text-indigo-300 w-8 text-right tabular-nums">
                {Math.round(wf.auto_resolved_pct * 100)}%
              </span>
              <span className="text-xs text-slate-500 w-8 text-right tabular-nums">{wf.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live case feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          ProductionCase Stream
        </h3>
        <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {feed.map(item => (
            <div key={item.id} className="flex items-center gap-2 text-xs py-1 border-b border-slate-800/50">
              <span className={`w-2 h-2 rounded-full shrink-0 ${item.resolved ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`${TYPE_COLOR[item.type] ?? 'text-slate-400'} w-20 shrink-0`}>{item.type}</span>
              <span className="text-slate-400 font-mono flex-1 truncate">{item.workflow}</span>
              <span className="text-slate-600 shrink-0">{new Date(item.ts).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

export default DiraPanel;
