export interface ContrastResult {
    pair: string;
    fg: string;
    bg: string;
    ratio: number;
    passed: boolean;
    required: number;
}
export interface HarmonyResult {
    score: number;
    passed: boolean;
    issues: string[];
    details: {
        hueCoherence: number;
        saturationCoherence: number;
        monotonicLightness: boolean;
    };
}
export interface PaletteReport {
    colors: string[];
    harmony: HarmonyResult;
    contrastMatrix: Array<{
        fg: string;
        bg: string;
        ratio: number;
        wcagAA: boolean;
        wcagAAA: boolean;
    }>;
}
/**
 * VERA-DESIGN: Deep color analysis and validation beyond basic WCAG.
 * Covers WCAG contrast, palette harmony, hue clustering, and saturation coherence.
 */
export declare class ColorValidator {
    /**
     * Strictly verifies contrast between two hex colors.
     * @param required - WCAG minimum (4.5 for AA text, 3.0 for UI components, 7.0 for AAA)
     */
    static checkContrast(fg: string, bg: string, required?: number): ContrastResult;
    /**
     * Validates that a scale has strictly decreasing luminance (dark → light or light → dark).
     * Fails if any step breaks monotonicity.
     */
    static checkLightnessMonotonicity(scale: string[], direction?: 'asc' | 'desc'): {
        passed: boolean;
        offendingIndices: number[];
    };
    /**
     * Full palette harmony analysis:
     * - Hue coherence: are all hues within a tight angular range?
     * - Saturation coherence: are saturations consistent (no jarring jumps)?
     * - Lightness monotonicity: does the scale flow correctly?
     *
     * Returns a score 0-100 and a list of issues.
     */
    static checkPaletteHarmony(colors: string[]): HarmonyResult;
    /**
     * Full palette report: harmony + contrast matrix for all fg/bg pairs.
     * Used by the QualityScoreAggregator.
     */
    static analyzeFullPalette(colors: string[]): PaletteReport;
}
//# sourceMappingURL=color-validator.d.ts.map