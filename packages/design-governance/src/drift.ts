// packages/design-governance/src/drift.ts
// DS-703: Drift detection — identifies components diverging from token schemas
// DS-701: Token usage analytics — orphan detection, usage heat

import { scanDirectory, type ScanResult } from '@inception/design-agent';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// ─── Token Usage Analytics ─────────────────────────────────────────────────

export interface TokenUsageMap {
    /** token CSS var name → number of usages across all scanned files */
    [tokenVar: string]: number;
}

export interface TokenAnalyticsReport {
    totalFiles: number;
    usageMap: TokenUsageMap;
    topTokens: Array<{ token: string; count: number }>;
    orphanTokens: string[]; // defined in tokens but never used
    hotTokens: string[];    // used > 10x — candidates for component tokens
}

/**
 * Scan source files to build a token usage heat map
 */
export function analyzeTokenUsage(
    srcDir: string,
    definedTokens: string[]
): TokenAnalyticsReport {
    const usageMap: TokenUsageMap = {};
    let totalFiles = 0;

    function processFile(filePath: string): void {
        const ext = extname(filePath);
        if (!['.ts', '.tsx', '.css', '.scss'].includes(ext)) return;

        totalFiles++;
        const content = readFileSync(filePath, 'utf8');

        // Match all var(--inc-*) references
        const matches = content.match(/var\(--inc-[a-z0-9-]+\)/g) ?? [];
        for (const match of matches) {
            usageMap[match] = (usageMap[match] ?? 0) + 1;
        }
    }

    function walkDir(dir: string): void {
        const items = readdirSync(dir);
        for (const item of items) {
            if (['node_modules', 'dist', '.turbo'].includes(item)) continue;
            const full = join(dir, item);
            if (statSync(full).isDirectory()) walkDir(full);
            else processFile(full);
        }
    }

    walkDir(srcDir);

    // Find orphans — defined tokens never referenced
    const usedVars = new Set(Object.keys(usageMap));
    const orphanTokens = definedTokens
        .map((t) => `var(--inc-${t.replace(/\./g, '-')})`)
        .filter((v) => !usedVars.has(v));

    // Hot tokens — used more than 10 times (candidates for component tokens)
    const hotTokens = Object.entries(usageMap)
        .filter(([, count]) => count > 10)
        .map(([token]) => token);

    // Top 20 by usage
    const topTokens = Object.entries(usageMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([token, count]) => ({ token, count }));

    return { totalFiles, usageMap, topTokens, orphanTokens, hotTokens };
}

// ─── Drift Detection ──────────────────────────────────────────────────────

export interface DriftReport {
    scannedFiles: number;
    filesWithDrift: number;
    driftScore: number;       // 0-100, 100 = no drift
    violations: Array<{
        file: string;
        line: number;
        value: string;
        type: string;
        suggestion?: string;
    }>;
    trend: 'improving' | 'stable' | 'degrading';
    previousScore?: number;
}

/**
 * Run a drift detection scan against a source directory.
 * Called by CI job and also as a standalone VERA-DESIGN audit.
 */
export function detectDrift(srcDir: string, previousScore?: number): DriftReport {
    const scanResults: ScanResult[] = scanDirectory(srcDir);

    const totalFiles = scanResults.length;
    const filesWithDrift = scanResults.filter((r) => r.violations.length > 0).length;

    const allViolations = scanResults.flatMap((r) =>
        r.violations.map((v) => ({
            file: r.file,
            line: v.line,
            value: v.value,
            type: v.type,
            suggestion: v.suggestion,
        }))
    );

    const avgScore = totalFiles > 0
        ? scanResults.reduce((sum, r) => sum + r.score, 0) / totalFiles
        : 100;

    const driftScore = Math.round(avgScore);

    let trend: DriftReport['trend'] = 'stable';
    if (previousScore !== undefined) {
        if (driftScore > previousScore + 2) trend = 'improving';
        else if (driftScore < previousScore - 2) trend = 'degrading';
    }

    return {
        scannedFiles: totalFiles,
        filesWithDrift,
        driftScore,
        violations: allViolations,
        trend,
        previousScore,
    };
}

export function formatDriftReport(report: DriftReport): string {
    const trendIcon = report.trend === 'improving' ? '📈' : report.trend === 'degrading' ? '📉' : '➡️';
    const lines = [
        `📊 Design System Drift Report`,
        `   Score: ${report.driftScore}/100  ${trendIcon} ${report.trend}`,
        `   Files scanned: ${report.scannedFiles} | Files with drift: ${report.filesWithDrift}`,
    ];
    if (report.violations.length > 0) {
        lines.push(`\n   Top violations:`);
        report.violations.slice(0, 5).forEach((v) => {
            lines.push(`   • ${v.file.split('/').slice(-2).join('/')}:${v.line} — ${v.type}: "${v.value}"`);
        });
    }
    if (report.trend === 'degrading') {
        lines.push(`\n   ⚠️  Drift is increasing — VERA will flag this in the next governance review`);
    }
    return lines.join('\n');
}
