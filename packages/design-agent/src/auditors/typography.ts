/// <reference types="node" />
// packages/design-agent/src/auditors/typography.ts
// DS-405: Typography Auditor — detects type scale inconsistencies and hierarchy violations

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

export interface TypographyAuditViolation {
    file: string;
    line: number;
    type: 'literal-font-size' | 'non-scale-size' | 'heading-order' | 'font-family-raw' | 'weight-out-of-range';
    value: string;
    suggestion: string;
}

export interface TypographyAuditResult {
    filesScanned: number;
    violations: TypographyAuditViolation[];
    score: number;
    summary: string;
}

const ALLOWED_SIZES_PX = new Set([12, 14, 16, 18, 20, 24, 30, 36, 48]);
const ALLOWED_SIZES_REM = new Set([0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3]);
const ALLOWED_WEIGHTS = new Set([400, 500, 600, 700, 800]);

function auditCSS(content: string, filePath: string): TypographyAuditViolation[] {
    const violations: TypographyAuditViolation[] = [];
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        if (line.includes('--inc-font')) return;

        // Literal font-size — index 1 and 2 are always defined if the match exists
        const fontSizeMatch = line.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem|pt|em)\b/);
        if (fontSizeMatch?.[1] != null && fontSizeMatch[2] != null) {
            const val = parseFloat(fontSizeMatch[1]);
            const unit = fontSizeMatch[2];
            let onScale = false;
            if (unit === 'px') onScale = ALLOWED_SIZES_PX.has(val);
            if (unit === 'rem') onScale = ALLOWED_SIZES_REM.has(val);
            violations.push({
                file: filePath, line: lineNum,
                type: onScale ? 'literal-font-size' : 'non-scale-size',
                value: `${val}${unit}`,
                suggestion: `Use var(--inc-font-size-*) token instead of ${val}${unit}`,
            });
        }

        // Raw font-family
        const fontFamilyMatch = line.match(/font-family\s*:\s*['"]?([A-Za-z][^;{]+)['"]?\s*[;{]/);
        if (fontFamilyMatch?.[1] != null && !line.includes('var(--inc-font-family')) {
            violations.push({
                file: filePath, line: lineNum,
                type: 'font-family-raw',
                value: fontFamilyMatch[1].trim(),
                suggestion: 'Use var(--inc-font-family-display) or var(--inc-font-family-body)',
            });
        }

        // font-weight out of range
        const weightMatch = line.match(/font-weight\s*:\s*(\d+)/);
        if (weightMatch?.[1] != null) {
            const w = parseInt(weightMatch[1], 10);
            if (!ALLOWED_WEIGHTS.has(w)) {
                violations.push({
                    file: filePath, line: lineNum,
                    type: 'weight-out-of-range',
                    value: String(w),
                    suggestion: `font-weight ${w} is not in the design system scale. Use 400, 500, 600, 700, or 800 (via var(--inc-font-weight-*))`,
                });
            }
        }
    });

    return violations;
}

function auditTSX(content: string, filePath: string): TypographyAuditViolation[] {
    const violations: TypographyAuditViolation[] = [];
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const arbMatches = line.match(/text-\[(\d+(?:\.\d+)?)(px|rem)\]/g);
        if (arbMatches == null) return;
        for (const match of arbMatches) {
            const numMatch = match.match(/\d+(?:\.\d+)?/);
            if (numMatch == null) continue;
            const num = parseFloat(numMatch[0]);
            const unit = match.includes('px') ? 'px' : 'rem';
            const onScale = unit === 'px' ? ALLOWED_SIZES_PX.has(num) : ALLOWED_SIZES_REM.has(num);
            violations.push({
                file: filePath, line: lineNum,
                type: onScale ? 'literal-font-size' : 'non-scale-size',
                value: match,
                suggestion: `Replace ${match} with a semantic text-size class using a token`,
            });
        }
    });

    return violations;
}

export function auditTypography(srcDir: string): TypographyAuditResult {
    const allViolations: TypographyAuditViolation[] = [];
    let filesScanned = 0;

    function walk(dir: string): void {
        for (const item of readdirSync(dir)) {
            if (['node_modules', 'dist', '.turbo'].includes(item)) continue;
            const full = join(dir, item);
            if (statSync(full).isDirectory()) { walk(full); continue; }
            const ext = extname(full);
            if (!['.css', '.scss', '.ts', '.tsx'].includes(ext)) continue;
            filesScanned++;
            const content = readFileSync(full, 'utf8');
            if (['.css', '.scss'].includes(ext)) allViolations.push(...auditCSS(content, full));
            else allViolations.push(...auditTSX(content, full));
        }
    }

    walk(srcDir);

    const penalty = Math.min(100, allViolations.length * 5);
    const score = Math.max(0, 100 - penalty);

    return {
        filesScanned,
        violations: allViolations,
        score,
        summary: allViolations.length === 0
            ? `✅ Typography audit passed — ${filesScanned} files clean`
            : `⚠️  ${allViolations.length} typography violation(s) across ${filesScanned} files (score: ${score}/100)`,
    };
}
