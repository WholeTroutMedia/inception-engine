import React, { useEffect, useState, useCallback } from 'react';

interface VeraScoreResult {
  overall: number;
  breakdown: {
    consistency: number;
    accessibility: number;
    hierarchy: number;
    craft: number;
    responsiveness: number;
  };
  flags: string[];
  sentiment: 'excellent' | 'good' | 'needs-work' | 'blocked';
}

function computeVeraScore(cssVars: Record<string, string>): VeraScoreResult {
  const flags: string[] = [];
  let consistency = 100;
  let accessibility = 100;
  let hierarchy = 90;
  let craft = 100;
  let responsiveness = 90;

  // Check for non-token values (literal hex or px)
  for (const [name, value] of Object.entries(cssVars)) {
    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
      flags.push(`${name}: raw hex detected (${value})`);
      consistency -= 8;
      craft -= 5;
    }
    if (/^\d+px$/.test(value) && !name.includes('radius') && !name.includes('shadow')) {
      flags.push(`${name}: literal px value (${value})`);
      consistency -= 5;
    }
  }

  // Check brand primary is defined
  if (!cssVars['--inc-color-brand-primary'] && !cssVars['color-brand-primary']) {
    flags.push('Brand primary color token missing');
    consistency -= 15;
  }

  // Clamp all scores
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const scores = {
    consistency: clamp(consistency),
    accessibility: clamp(accessibility),
    hierarchy: clamp(hierarchy),
    craft: clamp(craft),
    responsiveness: clamp(responsiveness),
  };

  const overall = Math.round(
    scores.consistency * 0.25 +
    scores.accessibility * 0.25 +
    scores.hierarchy * 0.20 +
    scores.craft * 0.15 +
    scores.responsiveness * 0.15
  );

  const sentiment: VeraScoreResult['sentiment'] =
    overall >= 90 ? 'excellent' : overall >= 70 ? 'good' : overall >= 50 ? 'needs-work' : 'blocked';

  return { overall, breakdown: scores, flags, sentiment };
}

const SENTIMENT_CONFIG = {
  excellent: { color: '#16a34a', label: '✨ Excellent', bg: '#f0fdf4' },
  good: { color: '#0f62fe', label: '✅ Good', bg: '#eff6ff' },
  'needs-work': { color: '#cd7e0a', label: '⚠️ Needs Work', bg: '#fffbeb' },
  blocked: { color: '#dc3545', label: '🚫 Blocked', bg: '#fef2f2' },
};

const RUBRIC = [
  { key: 'consistency', label: 'Consistency', weight: '25%' },
  { key: 'accessibility', label: 'Accessibility', weight: '25%' },
  { key: 'hierarchy', label: 'Hierarchy', weight: '20%' },
  { key: 'craft', label: 'Craft', weight: '15%' },
  { key: 'responsiveness', label: 'Responsiveness', weight: '15%' },
] as const;

export function VeraScorePanel() {
  const [result, setResult] = useState<VeraScoreResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const runScan = useCallback(() => {
    setScanning(true);
    // Collect all --inc-* CSS vars from :root
    const vars: Record<string, string> = {};
    const style = getComputedStyle(document.documentElement);
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule instanceof CSSStyleRule) {
            for (const prop of Array.from(rule.style)) {
              if (prop.startsWith('--inc-')) {
                vars[prop] = style.getPropertyValue(prop).trim();
              }
            }
          }
        }
      } catch { /* cross-origin */ }
    }
    setTimeout(() => {
      setResult(computeVeraScore(vars));
      setScanning(false);
    }, 400);
  }, []);

  useEffect(() => { runScan(); }, [runScan]);

  if (!result) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#71717a' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⟳</div>
        Initializing VERA-DESIGN scan...
      </div>
    );
  }

  const cfg = SENTIMENT_CONFIG[result.sentiment];

  return (
    <div style={{ background: 'var(--inc-color-background-subtle, #fafafa)', border: '1px solid var(--inc-color-border-default, #e4e4e7)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Score header */}
      <div style={{ background: cfg.bg, borderBottom: '1px solid var(--inc-color-border-default, #e4e4e7)', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#71717a', marginBottom: 4 }}>
            VERA-DESIGN Score
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
            {result.overall}
            <span style={{ fontSize: 18, fontWeight: 400, color: '#71717a' }}>/100</span>
          </div>
          <div style={{ fontSize: 14, color: cfg.color, marginTop: 6, fontWeight: 600 }}>{cfg.label}</div>
        </div>
        {/* Radial gauge */}
        <svg width={80} height={80} viewBox="0 0 80 80">
          <circle cx={40} cy={40} r={34} fill="none" stroke="#e4e4e7" strokeWidth={8} />
          <circle
            cx={40} cy={40} r={34} fill="none"
            stroke={cfg.color} strokeWidth={8}
            strokeDasharray={`${(result.overall / 100) * 213.6} 213.6`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
          <text x={40} y={46} textAnchor="middle" fontSize={16} fontWeight={700} fill={cfg.color}>{result.overall}</text>
        </svg>
      </div>

      {/* Breakdown */}
      <div style={{ padding: '20px 28px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#71717a', marginBottom: 12 }}>Breakdown</div>
        {RUBRIC.map(({ key, label, weight }) => {
          const score = result.breakdown[key];
          const barColor = score >= 80 ? '#16a34a' : score >= 60 ? '#0f62fe' : score >= 40 ? '#cd7e0a' : '#dc3545';
          return (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 500 }}>{label}</span>
                <span style={{ color: '#71717a' }}>{weight} · <strong style={{ color: barColor }}>{score}</strong></span>
              </div>
              <div style={{ background: '#e4e4e7', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                <div style={{ width: `${score}%`, height: '100%', background: barColor, borderRadius: 999, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Flags */}
      {result.flags.length > 0 && (
        <div style={{ borderTop: '1px solid var(--inc-color-border-default, #e4e4e7)', padding: '16px 28px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#71717a', marginBottom: 10 }}>Flags ({result.flags.length})</div>
          {result.flags.map((f, i) => (
            <div key={i} style={{ fontSize: 12, color: '#cd7e0a', padding: '4px 8px', background: '#fffbeb', borderRadius: 4, marginBottom: 4, fontFamily: 'monospace' }}>
              ⚠ {f}
            </div>
          ))}
        </div>
      )}

      {/* Rescan button */}
      <div style={{ borderTop: '1px solid var(--inc-color-border-default, #e4e4e7)', padding: '12px 28px' }}>
        <button
          onClick={runScan}
          disabled={scanning}
          style={{ fontSize: 12, fontWeight: 600, color: '#0f62fe', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {scanning ? '⟳ Scanning...' : '↺ Re-scan tokens'}
        </button>
      </div>
    </div>
  );
}
