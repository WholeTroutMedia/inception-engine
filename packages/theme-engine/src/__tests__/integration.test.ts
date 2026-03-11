/**
 * Integration Test: Token → Component → Theme Round-Trip
 * T20260306-274 — design-system workstream
 *
 * Verifies the full pipeline:
 *   1. Design tokens are well-formed (structure, types)
 *   2. Theme engine consumes tokens and validates them
 *   3. CSS variables are generated correctly for each built-in theme
 *   4. Theme overrides are applied on top of base tokens
 *   5. Validation gates (contrast, spacing rhythm) pass on valid themes
 *      and correctly fail on invalid themes
 */

import { describe, it, expect } from 'vitest';
import {
    BUILT_IN_THEMES,
    DEFAULT_THEME,
    DARK_THEME,
    LIGHT_THEME,
    HIGH_CONTRAST_THEME,
    generateThemeCSS,
    generateAllThemeCSS,
    validateTheme,
    type Theme,
} from '../themes.js';
import { tokens } from '../tokens.js';

// ── 1. Base token integrity ──────────────────────────────────────────────────

describe('Design Token Integrity', () => {
    it('has a color palette with required semantic keys', () => {
        expect(tokens.colors).toHaveProperty('primary');
        expect(tokens.colors).toHaveProperty('secondary');
        expect(tokens.colors).toHaveProperty('background');
        expect(tokens.colors).toHaveProperty('text');
    });

    it('has a spacing scale with at least 4 steps', () => {
        const steps = Object.keys(tokens.spacing);
        expect(steps.length).toBeGreaterThanOrEqual(4);
    });

    it('spacing values are CSS pixel strings', () => {
        for (const [key, val] of Object.entries(tokens.spacing)) {
            expect(val, `spacing.${key}`).toMatch(/^\d+(\.\d+)?(px|rem|em)$/);
        }
    });

    it('typography font families are defined', () => {
        expect(tokens.typography.fonts.sans).toBeTruthy();
        expect(tokens.typography.fonts.mono).toBeTruthy();
    });

    it('typography sizes cover xs through xl', () => {
        const sizes = tokens.typography.sizes;
        expect(sizes).toHaveProperty('xs');
        expect(sizes).toHaveProperty('sm');
        expect(sizes).toHaveProperty('md');
        expect(sizes).toHaveProperty('lg');
        expect(sizes).toHaveProperty('xl');
    });
});

// ── 2. Built-in theme registry ───────────────────────────────────────────────

describe('Built-in Theme Registry', () => {
    it('exposes exactly 4 built-in themes', () => {
        expect(Object.keys(BUILT_IN_THEMES)).toHaveLength(4);
    });

    it('all built-in themes have required fields', () => {
        for (const [id, theme] of Object.entries(BUILT_IN_THEMES)) {
            expect(theme.id, `${id}.id`).toBe(id);
            expect(theme.displayName, `${id}.displayName`).toBeTruthy();
            expect(theme.description, `${id}.description`).toBeTruthy();
            expect(theme.metadata.author, `${id}.author`).toBeTruthy();
            expect(theme.metadata.validated, `${id}.validated`).toBe(true);
        }
    });

    it('default theme has blue primary colour', () => {
        expect(DEFAULT_THEME.overrides.color?.['color.primary']).toBe('#0066cc');
    });

    it('dark theme has deep surface base', () => {
        expect(DARK_THEME.overrides.color?.['color.surface.base']).toBe('#111827');
    });

    it('light theme has empty or minimal overrides (all defaults)', () => {
        // Light theme uses all defaults — overrides may be empty or an empty object
        const overrideKeys = Object.values(LIGHT_THEME.overrides).flatMap(Object.values);
        expect(overrideKeys.length).toBe(0);
    });

    it('high-contrast theme targets WCAG AAA', () => {
        expect(HIGH_CONTRAST_THEME.overrides.color?.['color.text.primary']).toBe('#ffffff');
        expect(HIGH_CONTRAST_THEME.overrides.color?.['color.surface.base']).toBe('#000000');
    });
});

// ── 3. CSS generation ────────────────────────────────────────────────────────

describe('CSS Generation — Token → CSS Variable Round-Trip', () => {
    it('maps token paths to --inc- prefixed CSS variables', () => {
        const css = generateThemeCSS(DEFAULT_THEME);
        // color.primary → --inc-color-primary
        expect(css).toContain('--inc-color-primary: #0066cc');
    });

    it('generates the correct selector by default', () => {
        const css = generateThemeCSS(DARK_THEME);
        expect(css).toMatch(/^\[data-theme="dark"\]/);
    });

    it('accepts a custom CSS selector', () => {
        const css = generateThemeCSS(DARK_THEME, '.theme-dark');
        expect(css).toMatch(/^\.theme-dark\s*\{/);
    });

    it('produces closed CSS block', () => {
        const css = generateThemeCSS(DEFAULT_THEME);
        expect(css.trimEnd()).toMatch(/\}$/);
    });

    it('generateAllThemeCSS includes all 4 themes', () => {
        const all = generateAllThemeCSS();
        expect(all).toContain('default');
        expect(all).toContain('dark');
        expect(all).toContain('light');
        expect(all).toContain('high-contrast');
    });

    it('maps dots in token paths to dashes in CSS vars', () => {
        const css = generateThemeCSS(DARK_THEME);
        // color.surface.base → --inc-color-surface-base
        expect(css).toContain('--inc-color-surface-base:');
        expect(css).not.toContain('--inc-color.surface.base:');
    });
});

// ── 4. Theme validation gates ─────────────────────────────────────────────────

describe('Theme Validation — Spacing Rhythm Gate', () => {
    it('passes when all spacing values are on the 4px grid', () => {
        const theme: Theme = {
            id: 'test-spacing',
            displayName: 'Test Spacing',
            description: 'Spacing rhythm test',
            overrides: {
                spacing: {
                    'spacing.xs': '4px',
                    'spacing.sm': '8px',
                    'spacing.md': '16px',
                    'spacing.lg': '24px',
                },
            },
            metadata: { author: 'test', createdAt: '2026-03-06', validated: true },
        };
        const result = validateTheme(theme);
        expect(result.passed).toBe(true);
        expect(result.failures.spacing).toBeUndefined();
    });

    it('fails when a spacing value is not on the 4px grid', () => {
        const theme: Theme = {
            ...DEFAULT_THEME,
            overrides: {
                spacing: {
                    'spacing.custom': '7px', // 7 % 4 !== 0
                },
            },
        };
        const result = validateTheme(theme);
        expect(result.passed).toBe(false);
        expect(result.failures.spacing).toEqual(
            expect.arrayContaining([expect.stringContaining('7px')])
        );
    });
});

describe('Theme Validation — Contrast Gate', () => {
    it('passes for high-contrast theme (black/white)', () => {
        const resolvedColors = {
            'color.text.primary': '#ffffff',   // white text on black = 21:1 ratio
            'color.surface.base': '#000000',
            'color.primary': '#1d4ed8',        // blue-700 — ~8:1 on white
        };
        const result = validateTheme(HIGH_CONTRAST_THEME, resolvedColors);
        expect(result.passed).toBe(true);
    });

    it('flags poor contrast when foreground and background are both white', () => {
        const badTheme: Theme = {
            id: 'bad-contrast',
            displayName: 'Bad Contrast',
            description: 'Intentionally bad contrast',
            overrides: { color: { 'color.primary': '#ffffff' } },
            metadata: { author: 'test', createdAt: '2026-03-06', validated: false },
        };
        const resolvedColors = {
            'color.text.primary': '#eeeeee',  // near-white
            'color.surface.base': '#ffffff',   // white — fails WCAG AA
            'color.primary': '#ffffff',
        };
        const result = validateTheme(badTheme, resolvedColors);
        expect(result.passed).toBe(false);
        expect(result.failures.contrast).toBeDefined();
    });
});

// ── 5. Component CVA token binding sanity check ──────────────────────────────
// These checks operate purely at the string/token-map level — no DOM required.

describe('Component Token Binding — CVA token map format', () => {
    it('CSS var references use the correct --inc- prefix pattern', () => {
        // Verify the convention matches what generateThemeCSS produces
        const css = generateThemeCSS(DEFAULT_THEME);
        const cssVarPattern = /--inc-[\w-]+:/g;
        const vars = css.match(cssVarPattern) ?? [];
        expect(vars.length).toBeGreaterThan(0);
        for (const v of vars) {
            // Allow mixed-case segments (camelCase token paths like 'primaryHover' stay as-is)
            expect(v).toMatch(/^--inc-[a-zA-Z][a-zA-Z0-9-]+:$/);
        }
    });

    it('default CSS variables cover primary and surface tokens', () => {
        const css = generateThemeCSS(DEFAULT_THEME);
        expect(css).toContain('--inc-color-primary');
        expect(css).toContain('--inc-color-surface-base');
        expect(css).toContain('--inc-color-text-primary');
    });
});
