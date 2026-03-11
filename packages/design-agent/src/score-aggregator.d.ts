import { ScanIssue } from './scanner.js';
export interface QualityReport {
    score: number;
    grade: 'A+' | 'A' | 'B' | 'C' | 'F';
    issues: ScanIssue[];
    fatalCount: number;
    /** Contrast failures from the WCAG AA check */
    contrastFailures: Array<{
        pair: string;
        ratio: number;
        required: number;
    }>;
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
export declare class QualityScoreAggregator {
    /**
     * @param tokens - flat record of token paths → CSS values (for compliance scan)
     * @param palette - array of resolved hex colors to run contrast + harmony checks on
     */
    static evaluateSpec(tokens: Record<string, string>, palette?: string[]): QualityReport;
}
//# sourceMappingURL=score-aggregator.d.ts.map