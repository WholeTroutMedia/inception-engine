// packages/design-sandbox/src/VariationComparison.tsx
// T20260306-395: Variation comparison UI — side-by-side with score badges

import * as React from 'react';
import { evaluateGuardrail, guardrailColor, type GuardrailLevel } from './guardrails.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ComponentVariation {
    id: string;
    label: string;
    score: number;
    component: React.ReactNode;
    metadata?: {
        tokens: number;
        violations: number;
        wcagPairs: Array<{ label: string; ratio: number; pass: boolean }>;
    };
}

export interface VariationComparisonProps {
    variations: ComponentVariation[];
    onSelect?: (id: string) => void;
    selectedId?: string;
}

// ─── Score Badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
    const result = evaluateGuardrail(score);
    const bg = guardrailColor(result.level);
    const icon =
        result.level === 'celebration' ? '🎉'
            : result.level === 'nudge' ? '✅'
                : result.level === 'soft' ? '⚠️'
                    : '🚫';

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: bg,
                color: '#fff',
                borderRadius: 20,
                padding: '3px 10px',
                fontSize: 12,
                fontWeight: 700,
            }}
        >
            <span>{icon}</span>
            <span>{score}/100</span>
        </div>
    );
}

// ─── Variation Card ───────────────────────────────────────────────────────────

function VariationCard({
    variation,
    selected,
    onSelect,
}: {
    variation: ComponentVariation;
    selected: boolean;
    onSelect: (id: string) => void;
}) {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <div
            style={{
                border: selected
                    ? '2px solid var(--inc-color-primary, #6366f1)'
                    : '1px solid var(--inc-color-border-default, #e5e5e5)',
                borderRadius: 12,
                overflow: 'hidden',
                transition: 'border 0.15s ease, box-shadow 0.15s ease',
                boxShadow: selected ? '0 0 0 3px var(--inc-color-primary-subtle, rgba(99,102,241,0.15))' : 'none',
                background: 'var(--inc-color-surface-base, #fff)',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--inc-color-border-subtle, #f0f0f0)',
                    background: 'var(--inc-color-surface-overlay, #f9f9f9)',
                }}
            >
                <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--inc-color-text-primary, #111)' }}>
                        {variation.label}
                    </div>
                    {variation.metadata && (
                        <div style={{ fontSize: 11, color: 'var(--inc-color-text-secondary, #666)', marginTop: 2 }}>
                            {variation.metadata.tokens} tokens · {variation.metadata.violations} violations
                        </div>
                    )}
                </div>
                <ScoreBadge score={variation.score} />
            </div>

            {/* Preview */}
            <div style={{ padding: 24, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {variation.component}
            </div>

            {/* Metadata (expandable) */}
            {variation.metadata?.wcagPairs && variation.metadata.wcagPairs.length > 0 && (
                <div style={{ borderTop: '1px solid var(--inc-color-border-subtle, #f0f0f0)' }}>
                    <button
                        onClick={() => setExpanded((e) => !e)}
                        style={{
                            width: '100%',
                            border: 'none',
                            background: 'none',
                            padding: '8px 16px',
                            textAlign: 'left',
                            fontSize: 11,
                            color: 'var(--inc-color-text-secondary, #666)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        <span>{expanded ? '▾' : '▸'}</span>
                        WCAG pairs ({variation.metadata.wcagPairs.filter((p) => !p.pass).length} failing)
                    </button>
                    {expanded && (
                        <div style={{ padding: '0 16px 12px' }}>
                            {variation.metadata.wcagPairs.map((pair) => (
                                <div
                                    key={pair.label}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '3px 0',
                                        fontSize: 11,
                                        borderBottom: '1px solid var(--inc-color-border-subtle, #f5f5f5)',
                                    }}
                                >
                                    <span style={{ color: 'var(--inc-color-text-secondary, #666)' }}>{pair.label}</span>
                                    <span
                                        style={{
                                            fontWeight: 700,
                                            color: pair.pass ? 'var(--inc-color-status-success, #22c55e)' : 'var(--inc-color-status-error, #ef4444)',
                                        }}
                                    >
                                        {pair.ratio.toFixed(1)}:1 {pair.pass ? '✓' : '✗'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div
                style={{
                    padding: '10px 16px',
                    borderTop: '1px solid var(--inc-color-border-subtle, #f0f0f0)',
                    display: 'flex',
                    gap: 8,
                }}
            >
                <button
                    onClick={() => onSelect(variation.id)}
                    style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 6,
                        border: 'none',
                        background: selected
                            ? 'var(--inc-color-primary, #6366f1)'
                            : 'var(--inc-color-surface-overlay, #ededf0)',
                        color: selected ? '#fff' : 'var(--inc-color-text-primary, #111)',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                >
                    {selected ? '✓ Selected' : 'Select'}
                </button>
                <button
                    onClick={() => {
                        // Handoff to sandbox — open this variation in Design Sandbox (T20260306-120)
                        window.dispatchEvent(new CustomEvent('sandbox:open-variation', { detail: { id: variation.id } }));
                    }}
                    style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--inc-color-border-default, #ddd)',
                        background: 'transparent',
                        color: 'var(--inc-color-text-secondary, #666)',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer',
                    }}
                >
                    Open in Sandbox ↗
                </button>
            </div>
        </div>
    );
}

// ─── Comparison Layout ────────────────────────────────────────────────────────

export function VariationComparison({ variations, onSelect, selectedId }: VariationComparisonProps) {
    const sorted = [...variations].sort((a, b) => b.score - a.score);
    const best = sorted[0];

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--inc-color-text-primary, #111)' }}>
                    Variation Comparison
                </h2>
                <span style={{ fontSize: 13, color: 'var(--inc-color-text-secondary, #666)' }}>
                    {variations.length} variants · Best: <strong>{best?.label}</strong> ({best?.score}/100)
                </span>
            </div>

            {/* Score summary bar */}
            <div
                style={{
                    display: 'flex',
                    gap: 8,
                    padding: '10px 16px',
                    background: 'var(--inc-color-surface-overlay, #f9f9f9)',
                    borderRadius: 8,
                    marginBottom: 20,
                    overflowX: 'auto',
                    flexWrap: 'wrap',
                }}
            >
                {sorted.map((v) => (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <div
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: guardrailColor(evaluateGuardrail(v.score).level),
                            }}
                        />
                        <span style={{ color: 'var(--inc-color-text-primary, #111)', fontWeight: selectedId === v.id ? 700 : 400 }}>
                            {v.label}
                        </span>
                        <span style={{ color: 'var(--inc-color-text-secondary, #888)' }}>{v.score}</span>
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 16,
                }}
            >
                {sorted.map((v) => (
                    <VariationCard
                        key={v.id}
                        variation={v}
                        selected={selectedId === v.id}
                        onSelect={onSelect ?? (() => { })}
                    />
                ))}
            </div>
        </div>
    );
}

export default VariationComparison;
