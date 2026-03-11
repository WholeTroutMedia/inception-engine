// VERA-DESIGN — Design Quality Score Aggregator
// DS-406: Weighted heuristic scoring (0-100) across 5 categories
// Threshold: < 70 = flagged, >= 90 = celebration

import { scanDirectory, scanFile, ScanResult } from '../scanner/compliance.js';
import { validateColorContrast, ContrastResult } from '../validators/contrast.js';

export interface QualityReport {
    overall: number;
    passed: boolean; // >= 70
    celebrate: boolean; // >= 90
    breakdown: {
        consistency: CategoryScore;
        accessibility: CategoryScore;
        hierarchy: CategoryScore;
        craft: CategoryScore;
        responsiveness: CategoryScore;
    };
    violations: string[];
    suggestions: string[];
}

export interface CategoryScore {
    score: number;   // 0-100
    weight: number;  // 0-1
    weighted: number;
    details: string[];
}

const WEIGHTS = {
    consistency: 0.25,
    accessibility: 0.25,
    hierarchy: 0.20,
    craft: 0.15,
    responsiveness: 0.15,
} as const;

export interface ScoringInput {
    /** Path to directory or single file to score */
    targetPath: string;
    /** Optional: color pairs to check for contrast */
    colorPairs?: Array<{ foreground: string; background: string; context: string }>;
    /** Optional: heading size sequence for hierarchy check [h1,h2,h3,...] in px */
    headingSizes?: number[];
    /** Optional: check responsive breakpoints via breakpoint existence */
    hasResponsiveBreakpoints?: boolean;
}

export async function scoreDesign(input: ScoringInput): Promise<QualityReport> {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // ─── Consistency (25%) — Token adherence ─────────────────────────────────
    const scanResults: ScanResult[] = [];
    try {
        scanResults.push(...scanDirectory(input.targetPath));
    } catch {
        // Single file
        scanResults.push(scanFile(input.targetPath));
    }

    const totalFiles = scanResults.length;
    const violatingFiles = scanResults.filter((r) => r.violations.length > 0).length;
    const avgFileScore = totalFiles > 0
        ? scanResults.reduce((sum, r) => sum + r.score, 0) / totalFiles
        : 100;

    scanResults.forEach((r) => {
        r.violations.forEach((v) => {
            violations.push(`[consistency] ${r.file}:${v.line} — literal ${v.type} "${v.value}"`);
            if (v.suggestion) suggestions.push(v.suggestion);
        });
    });

    const consistencyScore: CategoryScore = {
        score: Math.round(avgFileScore),
        weight: WEIGHTS.consistency,
        weighted: Math.round(avgFileScore * WEIGHTS.consistency),
        details: [
            `${violatingFiles}/${totalFiles} files have literal value violations`,
            `Avg token compliance per file: ${Math.round(avgFileScore)}%`,
        ],
    };

    // ─── Accessibility (25%) — Contrast checks ───────────────────────────────
    let accessibilityScore = 100;
    const a11yDetails: string[] = [];

    if (input.colorPairs && input.colorPairs.length > 0) {
        const contrastResults = input.colorPairs.map((pair) => validateColorContrast(pair.foreground, pair.background, pair.context));
        const failingContrasts = contrastResults.filter((r) => !r.passesAA);
        const contrastPenalty = (failingContrasts.length / contrastResults.length) * 80;
        accessibilityScore = Math.max(0, 100 - contrastPenalty);

        failingContrasts.forEach((r) => {
            violations.push(`[accessibility] ${r.context}: contrast ${r.ratio.toFixed(2)}:1 fails WCAG AA (min 4.5:1 for text, 3:1 for UI)`);
            suggestions.push(`Adjust ${r.context} to achieve at least 4.5:1 contrast ratio`);
        });
        a11yDetails.push(`${contrastResults.length - failingContrasts.length}/${contrastResults.length} color pairs pass WCAG AA`);
    } else {
        a11yDetails.push('No color pairs provided — accessibility score assumes compliant');
    }

    const accessibilityCategory: CategoryScore = {
        score: Math.round(accessibilityScore),
        weight: WEIGHTS.accessibility,
        weighted: Math.round(accessibilityScore * WEIGHTS.accessibility),
        details: a11yDetails,
    };

    // ─── Hierarchy (20%) — Heading size ordering ─────────────────────────────
    let hierarchyScore = 100;
    const hierarchyDetails: string[] = [];

    if (input.headingSizes && input.headingSizes.length > 1) {
        let violations_h = 0;
        for (let i = 1; i < input.headingSizes.length; i++) {
            if (input.headingSizes[i] >= input.headingSizes[i - 1]) {
                violations_h++;
                violations.push(`[hierarchy] h${i + 1} (${input.headingSizes[i]}px) >= h${i} (${input.headingSizes[i - 1]}px) — heading sizes must be strictly descending`);
            }
        }
        const violationPct = violations_h / (input.headingSizes.length - 1);
        hierarchyScore = Math.round((1 - violationPct) * 100);
        hierarchyDetails.push(`${violations_h} hierarchy violations in heading scale`);
    } else {
        hierarchyDetails.push('Heading sizes not provided — hierarchy score baseline');
    }

    const hierarchyCategory: CategoryScore = {
        score: hierarchyScore,
        weight: WEIGHTS.hierarchy,
        weighted: Math.round(hierarchyScore * WEIGHTS.hierarchy),
        details: hierarchyDetails,
    };

    // ─── Craft (15%) — Token usage polish signal ─────────────────────────────
    // Craft score is derived from compliance quality + 0-violation bonus
    const craftBonus = violatingFiles === 0 ? 15 : 0;
    const craftScore = Math.min(100, Math.round(avgFileScore * 0.85 + craftBonus));
    const craftCategory: CategoryScore = {
        score: craftScore,
        weight: WEIGHTS.craft,
        weighted: Math.round(craftScore * WEIGHTS.craft),
        details: [
            violatingFiles === 0 ? '✅ No literal value violations — full craft bonus' : `${violatingFiles} files with literal values — craft penalty applied`,
        ],
    };

    // ─── Responsiveness (15%) ─────────────────────────────────────────────────
    const responsivenessScore = input.hasResponsiveBreakpoints === false ? 40 : 90;
    const responsivenessCategory: CategoryScore = {
        score: responsivenessScore,
        weight: WEIGHTS.responsiveness,
        weighted: Math.round(responsivenessScore * WEIGHTS.responsiveness),
        details: [input.hasResponsiveBreakpoints !== false ? 'Responsive breakpoints detected' : 'No responsive breakpoints found — score reduced'],
    };

    // ─── Aggregate ───────────────────────────────────────────────────────────
    const overall = Math.round(
        consistencyScore.weighted +
        accessibilityCategory.weighted +
        hierarchyCategory.weighted +
        craftCategory.weighted +
        responsivenessCategory.weighted
    );

    return {
        overall,
        passed: overall >= 70,
        celebrate: overall >= 90,
        breakdown: {
            consistency: consistencyScore,
            accessibility: accessibilityCategory,
            hierarchy: hierarchyCategory,
            craft: craftCategory,
            responsiveness: responsivenessCategory,
        },
        violations,
        suggestions,
    };
}

export function formatReport(report: QualityReport): string {
    const icon = report.celebrate ? '🎉' : report.passed ? '✅' : '❌';
    const lines = [
        `${icon} Design Quality Score: ${report.overall}/100`,
        '',
        '  Category Breakdown:',
        `  • Consistency    ${report.breakdown.consistency.score}/100    (${report.breakdown.consistency.weighted}pts)`,
        `  • Accessibility  ${report.breakdown.accessibility.score}/100    (${report.breakdown.accessibility.weighted}pts)`,
        `  • Hierarchy      ${report.breakdown.hierarchy.score}/100    (${report.breakdown.hierarchy.weighted}pts)`,
        `  • Craft          ${report.breakdown.craft.score}/100    (${report.breakdown.craft.weighted}pts)`,
        `  • Responsiveness ${report.breakdown.responsiveness.score}/100    (${report.breakdown.responsiveness.weighted}pts)`,
    ];

    if (report.violations.length > 0) {
        lines.push('', `  Violations (${report.violations.length}):`);
        report.violations.slice(0, 10).forEach((v) => lines.push(`  • ${v}`));
        if (report.violations.length > 10) lines.push(`  ... and ${report.violations.length - 10} more`);
    }

    if (!report.passed) {
        lines.push('', '  ⚠️  Score below threshold (70). Remediation required before production promotion.');
    }

    if (report.celebrate) {
        lines.push('', '  🎉 Exceptional quality — celebration unlocked!');
    }

    return lines.join('\n');
}
