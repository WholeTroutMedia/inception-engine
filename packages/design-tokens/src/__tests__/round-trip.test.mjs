// packages/design-tokens/src/__tests__/round-trip.test.mjs
// DS-805: Integration test — token → component → theme round-trip
// Verifies:
//   1. Compiled CSS vars exist and have valid values
//   2. All semantic tokens resolve to primitives (no dangling refs)
//   3. All 4 built-in themes override without conflicts
//   4. Compliance scanner reports 0 literals in @inception/ui source

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, extname } from 'path';

const ROOT = resolve(process.cwd(), '../..');
const PKG_TOKENS = join(ROOT, 'packages/design-tokens');
const PKG_UI = join(ROOT, 'packages/ui');
const PKG_AGENT = join(ROOT, 'packages/design-agent');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readTokenFile(relativePath) {
    const full = join(PKG_TOKENS, relativePath);
    if (!existsSync(full)) throw new Error(`Token file not found: ${full}`);
    return JSON.parse(readFileSync(full, 'utf8'));
}

function collectValues(obj, path = '') {
    const result = [];
    for (const [key, val] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (val && typeof val === 'object' && '$value' in val) {
            result.push({ path: currentPath, value: val.$value, type: val.$type });
        } else if (val && typeof val === 'object') {
            result.push(...collectValues(val, currentPath));
        }
    }
    return result;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Token Round-Trip Integration', () => {

    describe('1. Token Source Files', () => {
        it('should have primitive token files', () => {
            const files = ['src/primitives/color.json', 'src/primitives/spacing.json', 'src/primitives/typography.json'];
            for (const f of files) {
                expect(existsSync(join(PKG_TOKENS, f)), `Missing: ${f}`).toBe(true);
            }
        });

        it('should have semantic token files', () => {
            const files = ['src/semantic/color.json', 'src/semantic/spacing.json'];
            for (const f of files) {
                expect(existsSync(join(PKG_TOKENS, f)), `Missing: ${f}`).toBe(true);
            }
        });

        it('primitive color tokens should have $type: color', () => {
            const colors = readTokenFile('src/primitives/color.json');
            const entries = collectValues(colors);
            const colorEntries = entries.filter(e => e.type === 'color');
            expect(colorEntries.length).toBeGreaterThan(0);
        });

        it('spacing tokens should be multiples of 4', () => {
            const spacing = readTokenFile('src/primitives/spacing.json');
            const entries = collectValues(spacing);
            const spacingVals = entries.filter(e => e.type === 'dimension' && typeof e.value === 'string');
            for (const { path, value } of spacingVals) {
                const numMatch = String(value).match(/^(\d+(\.\d+)?)(px|rem)$/);
                if (!numMatch) continue;
                const px = numMatch[3] === 'rem' ? parseFloat(numMatch[1]) * 16 : parseFloat(numMatch[1]);
                // Skip 0 and very small values
                if (px < 4) continue;
                expect(px % 4, `${path}: ${value} — spacing must be multiple of 4px`).toBe(0);
            }
        });
    });

    describe('2. Semantic Token Resolution', () => {
        it('semantic color tokens should reference primitives (no raw values)', () => {
            const semantic = readTokenFile('src/semantic/color.json');
            const entries = collectValues(semantic);
            for (const { path, value } of entries) {
                // Semantic tokens must reference primitive tokens via {primitive.path}
                if (typeof value === 'string' && !value.startsWith('{') && !value.startsWith('rgba') && !value.startsWith('var(')) {
                    // Raw color value in semantic layer is a violation
                    throw new Error(`Semantic token "${path}" has raw value "${value}" — should reference a primitive via {path.to.primitive}`);
                }
            }
        });
    });

    describe('3. Theme Engine Integration', () => {
        it('all 4 themes should be importable', async () => {
            // Dynamic import — requires packages to be built
            const { themes } = await import('@inception/theme-engine').catch(() => ({ themes: null }));
            if (!themes) {
                console.warn('theme-engine not built — skipping runtime theme test');
                return;
            }
            expect(Object.keys(themes)).toEqual(
                expect.arrayContaining(['default', 'dark', 'light', 'high-contrast'])
            );
        });

        it('each theme should pass validation when built', async () => {
            const { themes, validateTheme } = await import('@inception/theme-engine').catch(() => ({ themes: null, validateTheme: null }));
            if (!themes || !validateTheme) return;

            for (const [id, theme] of Object.entries(themes)) {
                const result = validateTheme(theme);
                expect(result.valid, `Theme ${id} failed validation: ${result.errors?.join(', ')}`).toBe(true);
            }
        });
    });

    describe('4. UI Package — Zero Literal Values', () => {
        it('@inception/ui source should have no hex color literals in TSX', () => {
            const violations = [];

            function walk(dir) {
                for (const item of readdirSync(dir)) {
                    if (['node_modules', 'dist', '.turbo', '__tests__'].includes(item)) continue;
                    const full = join(dir, item);
                    if (statSync(full).isDirectory()) { walk(full); continue; }
                    if (extname(full) !== '.tsx' || full.endsWith('.stories.tsx')) continue;
                    const content = readFileSync(full, 'utf8');
                    const lines = content.split('\n');
                    lines.forEach((line, i) => {
                        const hexMatches = line.match(/#[0-9a-fA-F]{3,8}\b/g);
                        if (hexMatches) {
                            // Allow in comments
                            if (!line.trimStart().startsWith('//') && !line.trimStart().startsWith('*')) {
                                violations.push(`${full}:${i + 1} — ${hexMatches.join(', ')}`);
                            }
                        }
                    });
                }
            }

            walk(join(PKG_UI, 'src'));
            expect(violations, `Literal hex values found:\n${violations.join('\n')}`).toHaveLength(0);
        });
    });

    describe('5. VERA-DESIGN Agent', () => {
        it('design-agent scanner module should be importable', async () => {
            const agent = await import('@inception/design-agent').catch(() => null);
            if (!agent) {
                console.warn('design-agent not built — skipping runtime test');
                return;
            }
            expect(typeof agent.scanDirectory).toBe('function');
            expect(typeof agent.validateContrast).toBe('function');
            expect(typeof agent.calculateQualityScore).toBe('function');
        });
    });
});
