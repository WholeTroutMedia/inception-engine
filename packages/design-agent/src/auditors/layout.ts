// packages/design-agent/src/auditors/layout.ts
// DS-403: Layout Harmony Scorer — detects layout inconsistencies

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

export interface LayoutViolation {
    file: string;
    line: number;
    type: 'off-grid-spacing' | 'magic-number' | 'hardcoded-width' | 'hardcoded-height';
    value: string;
    suggestion: string;
}

export interface LayoutAuditResult {
    filesScanned: number;
    violations: LayoutViolation[];
    score: number;
    offGridCount: number;
    magicNumberCount: number;
}

// 4px grid — all valid multiples up to 512px
const VALID_GRID_VALUES = new Set(
    Array.from({ length: 129 }, (_, i) => i * 4)
);

function isOnGrid(px: number): boolean {
    return VALID_GRID_VALUES.has(px);
}

// Properties that should be on the 4px grid
const GRID_PROPS = new Set([
    'padding', 'margin', 'gap', 'row-gap', 'column-gap',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'top', 'right', 'bottom', 'left',
]);

// Properties that should use tokens or percentages, not hardcoded px
const SIZE_PROPS = new Set(['width', 'height', 'max-width', 'min-width', 'max-height', 'min-height']);

function auditCSSLayout(content: string, filePath: string): LayoutViolation[] {
    const violations: LayoutViolation[] = [];
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        if (line.includes('--inc-')) return; // Token definitions are fine

        // Check grid props
        const propMatch = line.match(/^\s*([\w-]+)\s*:\s*(\d+)px\b/);
        if (propMatch) {
            const prop = propMatch[1].toLowerCase();
            const px = parseInt(propMatch[2]);

            if (GRID_PROPS.has(prop) && !isOnGrid(px)) {
                violations.push({
                    file: filePath, line: lineNum,
                    type: 'off-grid-spacing',
                    value: `${prop}: ${px}px`,
                    suggestion: `${prop}: ${px}px is not on the 4px grid. Nearest valid values: ${Math.floor(px / 4) * 4}px or ${Math.ceil(px / 4) * 4}px`,
                });
            }

            if (SIZE_PROPS.has(prop) && px > 0) {
                violations.push({
                    file: filePath, line: lineNum,
                    type: prop.includes('width') ? 'hardcoded-width' : 'hardcoded-height',
                    value: `${prop}: ${px}px`,
                    suggestion: `Use a layout token var(--inc-spacing-layout-*) or percentage/viewport unit instead of hardcoded ${px}px`,
                });
            }
        }

        // Magic number detection — any stray px value in CSS not in a recognized prop
        const magicMatch = line.match(/:\s*(\d+)px\s/g);
        if (magicMatch) {
            magicMatch.forEach((m) => {
                const px = parseInt(m.match(/(\d+)/)![1]);
                if (!VALID_GRID_VALUES.has(px) && px > 0) {
                    violations.push({
                        file: filePath, line: lineNum,
                        type: 'magic-number',
                        value: m.trim(),
                        suggestion: `${px}px is a magic number — map it to a design token or align to the 4px grid`,
                    });
                }
            });
        }
    });

    return violations;
}

export function auditLayout(srcDir: string): LayoutAuditResult {
    const allViolations: LayoutViolation[] = [];
    let filesScanned = 0;

    function walk(dir: string): void {
        for (const item of readdirSync(dir)) {
            if (['node_modules', 'dist', '.turbo'].includes(item)) continue;
            const full = join(dir, item);
            if (statSync(full).isDirectory()) { walk(full); continue; }
            const ext = extname(full);
            if (!['.css', '.scss'].includes(ext)) continue;
            filesScanned++;
            allViolations.push(...auditCSSLayout(readFileSync(full, 'utf8'), full));
        }
    }

    walk(srcDir);

    const offGrid = allViolations.filter((v) => v.type === 'off-grid-spacing').length;
    const magic = allViolations.filter((v) => v.type === 'magic-number').length;
    const penalty = Math.min(100, allViolations.length * 4);
    const score = Math.max(0, 100 - penalty);

    return {
        filesScanned,
        violations: allViolations,
        score,
        offGridCount: offGrid,
        magicNumberCount: magic,
    };
}
