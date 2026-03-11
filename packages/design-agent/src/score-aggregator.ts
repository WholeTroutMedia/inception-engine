import { TokenScanner, ScanIssue } from './scanner.js';
import { ColorValidator } from './color-validator.js';

export interface QualityReport {
    score: number;
    grade: 'A+' | 'A' | 'B' | 'C' | 'F';
    issues: ScanIssue[];
    fatalCount: number;
    /** Contrast failures from the WCAG AA check */
    contrastFailures: Array<{ pair: string; ratio: number; required: number }>;
    /** Palette harmony score (0-100) from ColorValidator */
    paletteHarmonyScore: number;
    paletteIssues: string[];
}

/**
 * VERA-DESIGN: Quality Score Aggregator
 * Computes a unified "confidence score" (0-100) for the entire design spec.
 *
 * Rubric (weighted):
 *   - Token compliance (errors −10 each, warnings −2 each)     max 60 pts
 *   - Contrast gate (each WCAG AA failure −15)                  max 20 pts
 *   - Palette harmony score                                      max 20 pts
 */
export class QualityScoreAggregator {
    /**
     * @param tokens - flat record of token paths → CSS values (for compliance scan)
     * @param palette - array of resolved hex colors to run contrast + harmony checks on
     */
    static evaluateSpec(
        tokens: Record<string, string>,
        palette: string[] = [],
    ): QualityReport {
        let score = 100;

        // ── 1. Token compliance ─────────────────────────────────────────────
        // Synthesise a CSS block from the token record and scan it for literal values
        const cssContent = Object.entries(tokens)
            .map(([k, v]: [string, string]) => `--${k}: ${v};`)
            .join('\n');
        const scanner = new TokenScanner();
        const scanResult = scanner.scan('tokens.css', cssContent, 'css');
        const issues = scanResult.issues;
        const errors = issues.filter((i: ScanIssue) => i.severity === 'error').length;
        const warnings = issues.filter((i: ScanIssue) => i.severity === 'warning').length;
        score -= errors * 10;
        score -= warnings * 2;

        // ── 2. Contrast gate ─────────────────────────────────────────────────
        const contrastFailures: QualityReport['contrastFailures'] = [];
        if (palette.length >= 2) {
            const report = ColorValidator.analyzeFullPalette(palette);
            // Check text-on-background pairs for WCAG AA (minimum 4.5)
            for (const pair of report.contrastMatrix) {
                if (!pair.wcagAA) {
                    contrastFailures.push({
                        pair: `${pair.fg} on ${pair.bg}`,
                        ratio: pair.ratio,
                        required: 4.5,
                    });
                    score -= 15;
                }
            }
        }

        // ── 3. Palette harmony ───────────────────────────────────────────────
        let paletteHarmonyScore = 100;
        let paletteIssues: string[] = [];
        if (palette.length >= 2) {
            const harmony = ColorValidator.checkPaletteHarmony(palette);
            paletteHarmonyScore = harmony.score;
            paletteIssues = harmony.issues;
            // Blend harmony into overall score (20% weight)
            score = score * 0.8 + harmony.score * 0.2;
        }

        score = Math.max(0, Math.round(score));

        let grade: QualityReport['grade'] = 'F';
        if (score >= 98) grade = 'A+';
        else if (score >= 90) grade = 'A';
        else if (score >= 80) grade = 'B';
        else if (score >= 70) grade = 'C';

        return {
            score,
            grade,
            issues,
            fatalCount: errors,
            contrastFailures,
            paletteHarmonyScore,
            paletteIssues,
        };
    }
}

