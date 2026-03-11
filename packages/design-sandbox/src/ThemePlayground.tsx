// packages/design-sandbox/src/ThemePlayground.tsx
// DS-304 + DS-307: Theme Playground — live token editor + WCAG contrast checker

'use client';

import * as React from 'react';
import { BUILT_IN_THEMES, type ThemeId, type Theme } from '@inception/theme-engine';
import './ThemePlayground.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContrastResult {
    ratio: number;
    aa: boolean;
    aaa: boolean;
    level: 'AAA' | 'AA' | 'FAIL';
}

// ─── Contrast Checker (DS-307) ────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
    const match = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) return null;
    return [parseInt(match[1]!, 16), parseInt(match[2]!, 16), parseInt(match[3]!, 16)];
}

function linearize(c: number): number {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance([r, g, b]: [number, number, number]): number {
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(fg: string, bg: string): ContrastResult {
    const fgRgb = hexToRgb(fg);
    const bgRgb = hexToRgb(bg);
    if (!fgRgb || !bgRgb) return { ratio: 0, aa: false, aaa: false, level: 'FAIL' };

    const l1 = luminance(fgRgb);
    const l2 = luminance(bgRgb);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;

    const aa = ratio >= 4.5;
    const aaa = ratio >= 7.0;
    const level: ContrastResult['level'] = aaa ? 'AAA' : aa ? 'AA' : 'FAIL';

    return { ratio, aa, aaa, level };
}

// ─── Token Card ──────────────────────────────────────────────────────────────

function TokenRow({ name, value }: { name: string; value: string }) {
    const isColor = /^#|^rgb|^hsl/.test(value);
    const cssVarName = `token-swatch-${name.replace(/[^a-zA-Z0-9-]/g, '-')}`;

    return (
        <div className={`tp-token-row ${isColor ? cssVarName : ''}`}>
            {isColor && (
                <>
                    {/* eslint-disable-next-line react/no-danger, @typescript-eslint/no-explicit-any */}
                    <style>{`.${cssVarName} { --token-swatch-bg: ${value}; }`}</style>
                    <div className="tp-token-swatch" />
                </>
            )}
            <div className="tp-token-info">
                <code className="tp-token-name">{name}</code>
                <span className="tp-token-value">{value}</span>
            </div>
        </div>
    );
}

// ─── Contrast Checker Widget ─────────────────────────────────────────────────

function ContrastChecker() {
    const [fg, setFg] = React.useState('#FFFFFF');
    const [bg, setBg] = React.useState('#2D1B4E');
    const result = contrastRatio(fg, bg);

    const badgeColor = result.level === 'AAA' ? '#22c55e' : result.level === 'AA' ? '#eab308' : '#ef4444';

    return (
        <div className="tp-contrast-card">
            <h3 className="tp-contrast-title">
                WCAG Contrast Checker
            </h3>

            <div className="tp-contrast-inputs">
                <label className="tp-contrast-label">
                    <span className="tp-contrast-label-text">Foreground</span>
                    <input
                        type="color"
                        value={fg}
                        onChange={(e) => setFg(e.target.value)}
                        className="tp-color-input"
                    />
                    <code className="tp-color-code">{fg}</code>
                </label>
                <label className="tp-contrast-label">
                    <span className="tp-contrast-label-text">Background</span>
                    <input
                        type="color"
                        value={bg}
                        onChange={(e) => setBg(e.target.value)}
                        className="tp-color-input"
                    />
                    <code className="tp-color-code">{bg}</code>
                </label>
            </div>

            {/* Preview — bg/fg are live color-picker values, consumed via CSS vars */}
            {/* eslint-disable-next-line react/no-danger, @typescript-eslint/no-explicit-any */}
            <style>{`
                .tp-contrast-dynamic-preview { --preview-bg: ${bg}; --preview-fg: ${fg}; }
                .tp-contrast-dynamic-badge { --badge-bg: ${badgeColor}; }
            `}</style>

            <div className="tp-contrast-preview tp-contrast-dynamic-preview">
                <div className="tp-contrast-preview-heading">The quick brown fox</div>
                <div className="tp-contrast-preview-body">Sample body text for readability check</div>
            </div>

            {/* Result */}
            <div className="tp-contrast-result tp-contrast-dynamic-badge">
                <span className="tp-contrast-ratio">{result.ratio}:1</span>
                <span className="tp-contrast-badge">
                    {result.level}
                </span>
                <div className="tp-contrast-hint">
                    AA requires 4.5:1 · AAA requires 7:1
                </div>
            </div>
        </div>
    );
}

// ─── Theme Playground ─────────────────────────────────────────────────────────

export interface ThemePlaygroundProps {
    initialTheme?: ThemeId;
}

export function ThemePlayground({ initialTheme = 'default' }: ThemePlaygroundProps) {
    const [activeTheme, setActiveTheme] = React.useState<ThemeId>(initialTheme);
    const [tab, setTab] = React.useState<'tokens' | 'contrast'>('tokens');

    const theme = BUILT_IN_THEMES[activeTheme] as Theme;
    const tokenEntries = Object.entries(theme?.overrides?.color ?? {});

    return (
        <div className="tp-root">
            {/* Header */}
            <div className="tp-header">
                <h1 className="tp-title">
                    🎨 Design Token Playground
                </h1>
                <p className="tp-subtitle">
                    Explore Creative Liberation Engine design tokens across all themes
                </p>
            </div>

            {/* Theme Switcher */}
            <div className="tp-theme-switcher">
                {(Object.keys(BUILT_IN_THEMES) as ThemeId[]).map((id) => (
                    <button
                        key={id}
                        onClick={() => setActiveTheme(id)}
                        className={`tp-theme-btn ${activeTheme === id ? 'tp-theme-btn--active' : 'tp-theme-btn--default'}`}
                    >
                        {BUILT_IN_THEMES[id]?.displayName}
                    </button>
                ))}
            </div>

            {/* Tabs */}
            <div className="tp-tabs">
                {(['tokens', 'contrast'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`tp-tab-btn ${tab === t ? 'tp-tab-btn--active' : 'tp-tab-btn--default'}`}
                    >
                        {t === 'tokens' ? '🎨 Tokens' : '♿ Contrast'}
                    </button>
                ))}
            </div>

            {/* Content */}
            {tab === 'tokens' && (
                <div className="tp-token-list">
                    <div className="tp-token-list-header">
                        <span className="tp-token-count">
                            {tokenEntries.length} token overrides — {theme?.displayName}
                        </span>
                    </div>
                    {tokenEntries.length > 0
                        ? tokenEntries.map(([k, v]) => <TokenRow key={k} name={k} value={v} />)
                        : <p className="tp-empty-msg">This theme uses base primitives with no overrides.</p>
                    }
                </div>
            )}

            {tab === 'contrast' && <ContrastChecker />}
        </div>
    );
}
