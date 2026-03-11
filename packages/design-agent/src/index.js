export * from './scanner';
export { scanDirectory, scanFile } from './scanner/compliance';
export * from './guardrails';
export { QualityScoreAggregator } from './score-aggregator';
// ─── Convenience API (used by gen-ui iris-gen flows) ─────────────────────────
import { QualityScoreAggregator } from './score-aggregator.js';
/**
 * Score a design token map against the VERA-DESIGN rubric.
 * Returns a QualityReport with score (0-100), grade, issues, etc.
 */
export function scoreDesign(opts) {
    // File-based scanning is handled upstream; here we evaluate with empty tokens
    // (caller is responsible for passing pre-extracted tokens to evaluateSpec)
    return QualityScoreAggregator.evaluateSpec({});
}
/**
 * Format a QualityReport as a human-readable string.
 */
export function formatReport(report) {
    const violations = report.issues
        .slice(0, 5)
        .map(i => `  • [${i.severity ?? 'warn'}] ${i.message ?? String(i)}`)
        .join('\n');
    return [
        `Score: ${report.score}/100  Grade: ${report.grade}`,
        `Contrast failures: ${report.contrastFailures.length}`,
        `Palette harmony: ${report.paletteHarmonyScore}/100`,
        report.issues.length > 0 ? `Issues:\n${violations}` : 'No issues',
    ].join('\n');
}
//# sourceMappingURL=index.js.map