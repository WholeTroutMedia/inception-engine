export * from './scanner';
export { scanDirectory, scanFile, type ScanResult, type ScanViolation } from './scanner/compliance';
export * from './guardrails';
export { QualityScoreAggregator, type QualityReport } from './score-aggregator';
import { type QualityReport } from './score-aggregator.js';
export interface ScoreDesignOptions {
    targetPath?: string;
    hasResponsiveBreakpoints?: boolean;
}
/**
 * Score a design token map against the VERA-DESIGN rubric.
 * Returns a QualityReport with score (0-100), grade, issues, etc.
 */
export declare function scoreDesign(opts: ScoreDesignOptions): QualityReport;
/**
 * Format a QualityReport as a human-readable string.
 */
export declare function formatReport(report: QualityReport): string;
//# sourceMappingURL=index.d.ts.map