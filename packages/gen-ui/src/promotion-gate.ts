/**
 * Promotion Gate — T20260306-367
 * Enforces: score < 70 → blocked from production export
 * Lives in packages/gen-ui so IRIS-GEN flow can call it as a gate.
 */

export interface PromotionResult {
    approved: boolean;
    score: number;
    threshold: number;
    blockedReason?: string;
    warnings: string[];
    suggestions: string[];
}

export interface VariationCandidate {
    id: string;
    /** VERA-DESIGN weighted rubric score 0–100 */
    score: number;
    /** Optional per-dimension breakdown */
    breakdown?: {
        contrast?: number;          // 0-100
        typography?: number;        // 0-100
        spacing?: number;           // 0-100
        colorHarmony?: number;      // 0-100
        componentCompliance?: number; // 0-100
    };
}

const PROMOTION_THRESHOLD = 70;
const WARNING_THRESHOLD = 80;       // warn if below 80 but still allow
const CELEBRATION_THRESHOLD = 90;   // trigger celebration animation

/**
 * Evaluate a design variation against the promotion gate.
 * - Score < 70  → blocked (cannot export to production)
 * - Score 70–79 → approved with warnings
 * - Score 80–89 → approved
 * - Score ≥ 90  → approved + celebration flag
 */
export function evaluatePromotion(candidate: VariationCandidate): PromotionResult {
    const { score, breakdown } = candidate;
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (score < PROMOTION_THRESHOLD) {
        // Identify which dimensions are failing
        if (breakdown) {
            if ((breakdown.contrast ?? 100) < 60) {
                suggestions.push('Contrast ratio is critically low — check text/background pairs against WCAG AA.');
            }
            if ((breakdown.typography ?? 100) < 60) {
                suggestions.push('Typography score is low — ensure heading hierarchy and line-height comply with DS spec.');
            }
            if ((breakdown.spacing ?? 100) < 60) {
                suggestions.push('Spacing is off the 4px grid — audit all margin/padding token assignments.');
            }
            if ((breakdown.colorHarmony ?? 100) < 60) {
                suggestions.push('Colour harmony is weak — ensure primary/secondary/accent follow the trichromatic palette rules.');
            }
            if ((breakdown.componentCompliance ?? 100) < 60) {
                suggestions.push('Component compliance is insufficient — verify all components reference design tokens, not literal values.');
            }
        } else {
            suggestions.push('Run the VERA-DESIGN scanner to get a dimension-level breakdown for targeted improvements.');
        }

        return {
            approved: false,
            score,
            threshold: PROMOTION_THRESHOLD,
            blockedReason: `Score ${score}/100 is below the minimum promotion threshold of ${PROMOTION_THRESHOLD}. ` +
                `Improve the design and re-validate before exporting to production.`,
            warnings,
            suggestions,
        };
    }

    // Approved — collect warnings for sub-80 dims
    if (score < WARNING_THRESHOLD) {
        warnings.push(`Score ${score}/100 meets the minimum but is below the recommended target of ${WARNING_THRESHOLD}. Consider iterating.`);
    }

    if (breakdown) {
        Object.entries(breakdown).forEach(([dim, val]) => {
            if (val < WARNING_THRESHOLD) {
                warnings.push(`${dim}: ${Math.round(val)}/100 — below recommended. Review and iterate.`);
            }
        });
    }

    const celebration = score >= CELEBRATION_THRESHOLD;
    if (celebration) {
        suggestions.push('🎉 Exceptional score! This variation is production-ready.');
    }

    return {
        approved: true,
        score,
        threshold: PROMOTION_THRESHOLD,
        warnings,
        suggestions,
    };
}

/**
 * Batch evaluate multiple candidates.
 * Returns them sorted: approved first (descending score), then blocked.
 */
export function batchEvaluate(candidates: VariationCandidate[]): Array<VariationCandidate & { result: PromotionResult }> {
    return candidates
        .map(c => ({ ...c, result: evaluatePromotion(c) }))
        .sort((a, b) => {
            if (a.result.approved !== b.result.approved) {
                return a.result.approved ? -1 : 1;
            }
            return b.score - a.score;
        });
}

/** Quick helper — returns true only if the candidate clears the gate */
export function canPromote(candidate: VariationCandidate): boolean {
    return candidate.score >= PROMOTION_THRESHOLD;
}

/** Returns true if score qualifies for celebration animation */
export function shouldCelebrate(candidate: VariationCandidate): boolean {
    return candidate.score >= CELEBRATION_THRESHOLD;
}
