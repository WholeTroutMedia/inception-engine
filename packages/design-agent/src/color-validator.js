import chroma from 'chroma-js';
/**
 * VERA-DESIGN: Deep color analysis and validation beyond basic WCAG.
 * Covers WCAG contrast, palette harmony, hue clustering, and saturation coherence.
 */
export class ColorValidator {
    /**
     * Strictly verifies contrast between two hex colors.
     * @param required - WCAG minimum (4.5 for AA text, 3.0 for UI components, 7.0 for AAA)
     */
    static checkContrast(fg, bg, required = 4.5) {
        try {
            const ratio = chroma.contrast(fg, bg);
            return {
                pair: `${fg} on ${bg}`,
                fg,
                bg,
                ratio: Math.round(ratio * 100) / 100,
                passed: ratio >= required,
                required,
            };
        }
        catch {
            return { pair: `${fg} on ${bg}`, fg, bg, ratio: 0, passed: false, required };
        }
    }
    /**
     * Validates that a scale has strictly decreasing luminance (dark → light or light → dark).
     * Fails if any step breaks monotonicity.
     */
    static checkLightnessMonotonicity(scale, direction = 'desc') {
        const offendingIndices = [];
        let prev = direction === 'desc' ? 2 : -1;
        for (let i = 0; i < scale.length; i++) {
            try {
                const lum = chroma(scale[i]).luminance();
                if (i > 0) {
                    const violation = direction === 'desc' ? lum >= prev : lum <= prev;
                    if (violation)
                        offendingIndices.push(i);
                }
                prev = lum;
            }
            catch {
                offendingIndices.push(i); // unparseable color
            }
        }
        return { passed: offendingIndices.length === 0, offendingIndices };
    }
    /**
     * Full palette harmony analysis:
     * - Hue coherence: are all hues within a tight angular range?
     * - Saturation coherence: are saturations consistent (no jarring jumps)?
     * - Lightness monotonicity: does the scale flow correctly?
     *
     * Returns a score 0-100 and a list of issues.
     */
    static checkPaletteHarmony(colors) {
        if (colors.length < 2) {
            return { score: 100, passed: true, issues: [], details: { hueCoherence: 100, saturationCoherence: 100, monotonicLightness: true } };
        }
        const issues = [];
        const hues = [];
        const sats = [];
        const lums = [];
        for (const c of colors) {
            try {
                const col = chroma(c);
                const [h, s] = col.hsl();
                hues.push(h ?? 0);
                sats.push(s ?? 0);
                lums.push(col.luminance());
            }
            catch {
                issues.push(`Unparseable color: ${c}`);
            }
        }
        // ── Hue coherence ────────────────────────────────────────────────────
        // Measure circular variance across the hue wheel (0–360°)
        // A tight palette should have hues within 60° of each other (analogous).
        const hueRange = Math.max(...hues) - Math.min(...hues);
        const normalizedHueRange = Math.min(hueRange, 360 - hueRange); // handle wrap
        // 0° → 100 score, 180° → 0 score
        const hueCoherence = Math.max(0, Math.round(100 - normalizedHueRange / 1.8));
        if (normalizedHueRange > 60) {
            issues.push(`Hue spread of ${Math.round(normalizedHueRange)}° exceeds analogous threshold (60°). Consider using complementary or triadic intent explicitly.`);
        }
        // ── Saturation coherence ─────────────────────────────────────────────
        const satMean = sats.reduce((a, b) => a + b, 0) / sats.length;
        const satVariance = sats.reduce((a, b) => a + Math.pow(b - satMean, 2), 0) / sats.length;
        const satStdDev = Math.sqrt(satVariance);
        // Std dev > 0.25 (25%) is flagged as incoherent
        const saturationCoherence = Math.max(0, Math.round(100 - satStdDev * 300));
        if (satStdDev > 0.25) {
            issues.push(`Saturation std dev of ${(satStdDev * 100).toFixed(1)}% is too high — palette has jarring saturation jumps.`);
        }
        // ── Lightness monotonicity ─────────────────────────────────────────
        const isDescending = lums[0] > lums[lums.length - 1];
        const direction = isDescending ? 'desc' : 'asc';
        let monoPassed = true;
        for (let i = 1; i < lums.length; i++) {
            if (direction === 'desc' && lums[i] >= lums[i - 1]) {
                monoPassed = false;
                issues.push(`Lightness step ${i} (${lums[i].toFixed(3)}) is not lower than step ${i - 1} (${lums[i - 1].toFixed(3)}) — breaks monotonic flow.`);
                break;
            }
            if (direction === 'asc' && lums[i] <= lums[i - 1]) {
                monoPassed = false;
                issues.push(`Lightness step ${i} is not higher than ${i - 1} — breaks monotonic flow.`);
                break;
            }
        }
        // ── Aggregate score ───────────────────────────────────────────────────
        const monoBonus = monoPassed ? 0 : -20;
        const score = Math.max(0, Math.round((hueCoherence * 0.4) + (saturationCoherence * 0.4) + (monoPassed ? 20 : 0) + monoBonus));
        return {
            score,
            passed: score >= 70 && issues.length === 0,
            issues,
            details: { hueCoherence, saturationCoherence, monotonicLightness: monoPassed },
        };
    }
    /**
     * Full palette report: harmony + contrast matrix for all fg/bg pairs.
     * Used by the QualityScoreAggregator.
     */
    static analyzeFullPalette(colors) {
        const harmony = ColorValidator.checkPaletteHarmony(colors);
        const contrastMatrix = [];
        for (let i = 0; i < colors.length; i++) {
            for (let j = 0; j < colors.length; j++) {
                if (i === j)
                    continue;
                try {
                    const ratio = chroma.contrast(colors[i], colors[j]);
                    contrastMatrix.push({
                        fg: colors[i],
                        bg: colors[j],
                        ratio: Math.round(ratio * 100) / 100,
                        wcagAA: ratio >= 4.5,
                        wcagAAA: ratio >= 7.0,
                    });
                }
                catch {
                    // skip unparseable pairs
                }
            }
        }
        return { colors, harmony, contrastMatrix };
    }
}
//# sourceMappingURL=color-validator.js.map