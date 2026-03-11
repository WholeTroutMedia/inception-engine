import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DIRAMetrics {
  totalCases: number;
  autoResolved: number;
  escalated: number;
  partial: number;
  skipped: number;
  avgResolutionMs: number;
  resolutionRate: number; // 0–1
  byType: Record<string, number>;
  dailyCounts: { date: string; total: number; autoResolved: number }[];
  recentCases: RecentCase[];
}

interface RecentCase {
  id: string;
  type: string;
  workflow: string;
  trigger: string;
  outcome: string;
  autoResolved: boolean;
  createdAt: string;
  timeToResolve?: number;
}

import { DISPATCH_URL } from '../config/env';
const DISPATCH = DISPATCH_URL;

const OUTCOME_COLORS: Record<string, string> = {
  'auto-resolved': '#6ee7b7',
  escalated: '#fca5a5',
  partial: '#fcd34d',
  skipped: '#94a3b8',
};

const TYPE_ICONS: Record<string, string> = {
  exception: '⚡',
  quality: '🎯',
  distribution: '📡',
  curation: '🎨',
  performance: '⏱',
  coordination: '🤝',
};

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color = '#6ee7b7' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const W = 120;
  const H = 32;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * H}`)
    .join(' ');

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
      {/* Area fill */}
      <polygon
        points={`0,${H} ${pts} ${W},${H}`}
        fill={color}
        fillOpacity="0.1"
      />
    </svg>
  );
}

// ─── Radial gauge ─────────────────────────────────────────────────────────────

function RadialGauge({ value, label }: { value: number; label: string }) {
  const pct = Math.min(Math.max(value, 0), 1);
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  const color = pct >= 0.8 ? '#6ee7b7' : pct >= 0.5 ? '#fcd34d' : '#fca5a5';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="48" y="52" textAnchor="middle" fontSize="14" fontWeight="700" fill="white">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <span className="text-xs text-slate-400 text-center">{label}</span>
    </div>
  );
}

// ─── Case row ─────────────────────────────────────────────────────────────────

function CaseRow({ c }: { c: RecentCase }) {
  const outcomeColor = OUTCOME_COLORS[c.outcome] ?? '#94a3b8';
  const icon = TYPE_ICONS[c.type] ?? '◆';
  const ms = c.timeToResolve;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="grid grid-cols-[28px_1fr_80px_80px_72px] gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-sm"
    >
      <span className="text-base" title={c.type}>{icon}</span>
      <div className="min-w-0">
        <div className="text-slate-200 truncate font-medium text-xs">{c.workflow}</div>
        <div className="text-slate-500 truncate text-xs mt-0.5">{c.trigger.slice(0, 60)}</div>
      </div>
      <div
        className="text-xs font-medium text-right"
        style={{ color: outcomeColor }}
      >
        {c.outcome}
      </div>
      <div className="text-xs text-slate-500 text-right">
        {ms != null ? (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`) : '—'}
      </div>
      <div className="text-xs text-slate-600 text-right">
        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </motion.div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color = '#6ee7b7',
  sparkData,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  sparkData?: number[];
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
      <div className="text-xs text-slate-500 font-medium tracking-wide uppercase">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
      {sparkData && <Sparkline data={sparkData} color={color} />}
    </div>
  );
}

// ─── DIRADashboard ────────────────────────────────────────────────────────────

export default function DIRADashboard() {
  const [metrics, setMetrics] = useState<DIRAMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`${DISPATCH}/dira/metrics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DIRAMetrics;
      setMetrics(data);
      setLastRefresh(new Date());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DIRA metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch_();
    const interval = setInterval(() => void fetch_(), 15_000);
    return () => clearInterval(interval);
  }, [fetch_]);

  const dailyTotals = metrics?.dailyCounts.map((d) => d.total) ?? [];
  const dailyResolved = metrics?.dailyCounts.map((d) => d.autoResolved) ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">DIRA Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dispatch Internal Resolution Agent · 7-day rolling telemetry
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-slate-600">
              Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => void fetch_()}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors border border-slate-700 disabled:opacity-50"
          >
            ↺ Refresh
          </motion.button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 px-4 py-3 bg-red-950/50 border border-red-900 rounded-xl text-sm text-red-400"
          >
            ⚠ {error} — Dispatch server may be unreachable.
          </motion.div>
        )}
      </AnimatePresence>

      {loading && !metrics ? (
        <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
          Loading DIRA metrics…
        </div>
      ) : metrics ? (
        <div className="flex flex-col gap-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Cases"
              value={metrics.totalCases}
              sub="7-day window"
              color="#e2e8f0"
              sparkData={dailyTotals}
            />
            <StatCard
              label="Auto-Resolved"
              value={metrics.autoResolved}
              sub={`${Math.round(metrics.resolutionRate * 100)}% rate`}
              color="#6ee7b7"
              sparkData={dailyResolved}
            />
            <StatCard
              label="Escalated"
              value={metrics.escalated}
              sub="Requires human"
              color="#fca5a5"
            />
            <StatCard
              label="Avg Resolution"
              value={
                metrics.avgResolutionMs < 1000
                  ? `${Math.round(metrics.avgResolutionMs)}ms`
                  : `${(metrics.avgResolutionMs / 1000).toFixed(1)}s`
              }
              sub="Time to resolve"
              color="#fcd34d"
            />
          </div>

          {/* Gauge + type breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Resolution gauge */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 flex items-center justify-around">
              <RadialGauge value={metrics.resolutionRate} label="Auto-Resolution Rate" />
              <div className="flex flex-col gap-2">
                {Object.entries(OUTCOME_COLORS).map(([outcome, color]) => {
                  const count =
                    outcome === 'auto-resolved'
                      ? metrics.autoResolved
                      : outcome === 'escalated'
                      ? metrics.escalated
                      : outcome === 'partial'
                      ? metrics.partial
                      : metrics.skipped;
                  return (
                    <div key={outcome} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-slate-400 capitalize">{outcome}</span>
                      <span className="ml-auto text-slate-300 font-medium pl-4">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Type breakdown */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-4">
                Cases by Type
              </div>
              <div className="flex flex-col gap-2.5">
                {Object.entries(metrics.byType).map(([type, count]) => {
                  const pct = metrics.totalCases > 0 ? count / metrics.totalCases : 0;
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">
                          {TYPE_ICONS[type] ?? '◆'} {type}
                        </span>
                        <span className="text-slate-500">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct * 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-indigo-500/70"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent cases feed */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                Recent Cases
              </div>
              <div className="text-xs text-slate-600">
                {metrics.recentCases.length} records
              </div>
            </div>
            {/* Column headers */}
            <div className="grid grid-cols-[28px_1fr_80px_80px_72px] gap-3 items-center px-3 py-2 border-b border-slate-800/50">
              <div />
              <div className="text-xs text-slate-600">Workflow · Trigger</div>
              <div className="text-xs text-slate-600 text-right">Outcome</div>
              <div className="text-xs text-slate-600 text-right">Duration</div>
              <div className="text-xs text-slate-600 text-right">Time</div>
            </div>
            <div className="divide-y divide-slate-800/30">
              {metrics.recentCases.length === 0 ? (
                <div className="px-4 py-8 text-xs text-slate-600 text-center">
                  No cases recorded in this window.
                </div>
              ) : (
                metrics.recentCases.map((c) => <CaseRow key={c.id} c={c} />)
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
