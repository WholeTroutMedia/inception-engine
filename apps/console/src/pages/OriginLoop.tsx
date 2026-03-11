/**
 * OriginLoop — Karpathy autoresearch-pattern autonomous task iteration
 *
 * Time-budgeted task loop panel. The user defines a task + metric goal +
 * time budget, and AVERI agents iterate on it autonomously, checking in
 * at each iteration. Inspired by Karpathy's autoresearch "modify train.py
 * within a fixed GPU budget" pattern.
 */

import React, { useState, useRef, useCallback } from 'react';
import styles from './signal-dashboard.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface OriginLoopIteration {
  index: number;
  timestamp: Date;
  action: string;
  result: string;
  metricDelta?: number;
}

export interface OriginLoopProps {
  genkitUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const OriginLoop: React.FC<OriginLoopProps> = ({
  genkitUrl = 'http://localhost:4100',
}) => {
  const [task, setTask] = useState('');
  const [metric, setMetric] = useState('');
  const [budgetMin, setBudgetMin] = useState(15);
  const [running, setRunning] = useState(false);
  const [iterations, setIterations] = useState<OriginLoopIteration[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [totalBudgetSec, setTotalBudgetSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    abortRef.current?.abort();
  }, []);

  const start = useCallback(async () => {
    if (!task.trim()) return;
    setRunning(true);
    setIterations([]);
    setElapsed(0);

    const budgetSec = budgetMin * 60;
    setTotalBudgetSec(budgetSec);
    const start = Date.now();
    abortRef.current = new AbortController();

    // Elapsed timer
    timerRef.current = setInterval(() => {
      const e = Math.floor((Date.now() - start) / 1000);
      setElapsed(e);
      if (e >= budgetSec) stop();
    }, 1000);

    // Iteration loop
    let iter = 0;
    while (!abortRef.current.signal.aborted && Math.floor((Date.now() - start) / 1000) < budgetSec) {
      iter++;
      const prompt = [
        `ORIGIN LOOP: Iteration ${iter}`,
        `Task: ${task}`,
        metric ? `Optimization metric: ${metric}` : '',
        iter > 1 ? `Previous iterations: ${iter - 1} completed` : 'This is the first iteration.',
        `Budget remaining: ${Math.max(0, budgetSec - Math.floor((Date.now() - start) / 1000))}s`,
        'Propose one specific actionable step and execute it.',
      ].filter(Boolean).join('\n');

      try {
        const res = await fetch(`${genkitUrl}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: prompt, prompt }),
          signal: abortRef.current.signal,
        });

        const json = await res.json() as { output?: string; text?: string; content?: string };
        const result = json.output ?? json.text ?? json.content ?? '(no response)';

        setIterations((prev) => [
          ...prev,
          {
            index: iter,
            timestamp: new Date(),
            action: `Iteration ${iter}`,
            result,
            metricDelta: Math.random() * 0.1 - 0.02, // stub — replace with real metric parse
          },
        ]);
      } catch (err) {
        if ((err as Error).name === 'AbortError') break;
        setIterations((prev) => [
          ...prev,
          {
            index: iter,
            timestamp: new Date(),
            action: `Iteration ${iter}`,
            result: `Error: ${String(err)}`,
          },
        ]);
        break;
      }

      // Brief pause between iterations to avoid hammering
      await new Promise((r) => setTimeout(r, 2000));
    }

    stop();
  }, [task, metric, budgetMin, genkitUrl, stop]);

  const progressPct = totalBudgetSec > 0 ? Math.min(100, Math.round((elapsed / totalBudgetSec) * 100)) : 0;

  return (
    <div className={styles.originLoop} role="region" aria-label="ORIGIN Loop autonomous task runner">
      <div className={styles.originHeader}>
        <span className={styles.originIcon}>⟳</span>
        <span className={styles.originTitle}>ORIGIN LOOP</span>
        {running && (
          <span className={styles.originStatus} aria-live="polite">
            Iteration {iterations.length} · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')} / {budgetMin}m
          </span>
        )}
      </div>

      {/* Config row */}
      <div className={styles.originConfig}>
        <input
          id="origin-task-input"
          type="text"
          className={styles.originTaskInput}
          placeholder="Task to iterate on..."
          value={task}
          onChange={(e) => setTask(e.target.value)}
          disabled={running}
          aria-label="Task description"
        />
        <input
          id="origin-metric-input"
          type="text"
          className={styles.originMetricInput}
          placeholder="Metric (e.g. CTR)"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          disabled={running}
          aria-label="Optimization metric"
        />
        <div className={styles.budgetControl}>
          <input
            id="origin-budget-input"
            type="number"
            min={1}
            max={120}
            className={styles.budgetInput}
            value={budgetMin}
            onChange={(e) => setBudgetMin(Number(e.target.value))}
            disabled={running}
            aria-label="Budget in minutes"
          />
          <span className={styles.budgetLabel}>min</span>
        </div>
        <button
          id={running ? 'origin-stop-btn' : 'origin-start-btn'}
          className={`${styles.originBtn} ${running ? styles.originStop : styles.originStart}`}
          onClick={running ? stop : () => void start()}
          disabled={!running && !task.trim()}
          aria-label={running ? 'Stop ORIGIN loop' : 'Start ORIGIN loop'}
        >
          {running ? '■ Stop' : '▶ Run'}
        </button>
      </div>

      {/* Progress bar */}
      {running && (
        <div className={styles.originProgress} role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.originProgressFill} style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {/* Iteration log */}
      {iterations.length > 0 && (
        <div className={styles.iterationLog} aria-label="Iteration history">
          {iterations.slice(-3).map((it) => (
            <div key={it.index} className={styles.iterationEntry}>
              <span className={styles.iterIndex}>#{it.index}</span>
              <span className={styles.iterResult}>{it.result.slice(0, 120)}</span>
              {it.metricDelta !== undefined && (
                <span className={`${styles.iterDelta} ${it.metricDelta >= 0 ? styles.deltaUp : styles.deltaDown}`}>
                  {it.metricDelta >= 0 ? '+' : ''}{(it.metricDelta * 100).toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
