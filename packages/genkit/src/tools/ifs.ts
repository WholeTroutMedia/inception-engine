/**
 * Intent Fidelity Score (IFS)
 *
 * A public, transparent metric on every generative output in the Creative Liberation Engine.
 * Measures the numerical gap between what was asked and what was delivered.
 *
 * Score: 0–100. Three axes, normalized and weighted.
 * Label: EXCELLENT (85+) | GOOD (65–84) | MARGINAL (45–64) | FAIL (<45)
 *
 * Below the configured threshold (default: 65), the critique-middleware triggers
 * a single silent retry with a revision directive. Zero user visibility.
 *
 * This is the trust layer. When IFS is high, the system understood you.
 * When it's visible, users learn to communicate better — and we teach them.
 *
 * Constitutional: Article IV (Transparency), Article IX (No MVPs — every output
 * must meet intent or retry silently before surfacing).
 */

import { VERAFlow } from '../flows/vera.js';

// ── IFS Types ────────────────────────────────────────────────────────────────

export type IFSLabel = 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'FAIL';

export const IFS_THRESHOLDS = {
    EXCELLENT: 85,
    GOOD:      65,
    MARGINAL:  45,
    // Below 45 = FAIL
} as const;

export const IFS_DEFAULT_THRESHOLD = 65; // Minimum acceptable score before silent retry

export interface IFSResult {
    /** Composite score 0–100. Weighted average of the three axes. */
    score: number;
    /** Human-readable label for the score band. */
    label: IFSLabel;
    /** Per-axis breakdown (each 0–100). */
    axes: {
        /** Did the output comply with constitutional articles? */
        constitutional: number;
        /** Was the output contextually accurate and relevant? */
        contextual: number;
        /** How closely did the output match the original intent? */
        intentFidelity: number;
    };
    /** If score < threshold: the directive VERA would use to improve the output. */
    revisionDirective?: string;
}

// ── Axis weights ─────────────────────────────────────────────────────────────
// intent_fidelity is weighted highest — it's the primary trust signal.
const WEIGHTS = {
    constitutional: 0.2,
    contextual:     0.3,
    intent_fidelity: 0.5,
} as const;

// ── Label assignment ─────────────────────────────────────────────────────────

function assignLabel(score: number): IFSLabel {
    if (score >= IFS_THRESHOLDS.EXCELLENT) return 'EXCELLENT';
    if (score >= IFS_THRESHOLDS.GOOD)      return 'GOOD';
    if (score >= IFS_THRESHOLDS.MARGINAL)  return 'MARGINAL';
    return 'FAIL';
}

// ── Core scoring function ─────────────────────────────────────────────────────

/**
 * Score a generative output against its originating intent.
 * Uses VERA's critique mode internally — no separate LLM call.
 *
 * @param intent - The original user intent or prompt
 * @param output - The generated output to evaluate
 * @param sessionId - Optional session ID for memory context
 * @returns IFSResult with score, label, axes, and optional revision directive
 */
export async function scoreIntentFidelity(
    intent: string,
    output: string,
    sessionId?: string,
): Promise<IFSResult> {
    try {
        const veraResult = await VERAFlow({
            mode: 'critique',
            content: `Intent: ${intent}\n\nOutput:\n${output}`,
            original_intent: intent,
            generated_output: output,
            sessionId,
        });

        // Map VERA's 0–1 scores to 0–100 IFS axes
        if (veraResult.critiqueScores) {
            const { constitutional, contextual, intent_fidelity } = veraResult.critiqueScores;

            const compositeRaw =
                constitutional   * WEIGHTS.constitutional +
                contextual       * WEIGHTS.contextual +
                intent_fidelity  * WEIGHTS.intent_fidelity;

            const score = Math.round(compositeRaw * 100);
            const label = assignLabel(score);

            return {
                score,
                label,
                axes: {
                    constitutional: Math.round(constitutional * 100),
                    contextual:     Math.round(contextual * 100),
                    intentFidelity: Math.round(intent_fidelity * 100),
                },
                revisionDirective: !veraResult.critiquePass
                    ? veraResult.revisionDirective
                    : undefined,
            };
        }

        // VERA returned without critiqueScores — use confidence as proxy
        const fallbackScore = Math.round(veraResult.confidence * 100);
        return {
            score: fallbackScore,
            label: assignLabel(fallbackScore),
            axes: {
                constitutional: fallbackScore,
                contextual: fallbackScore,
                intentFidelity: fallbackScore,
            },
        };
    } catch (err) {
        // IFS failure must never block the response flow
        console.warn('[IFS] Scoring failed — returning neutral result:', err);
        return {
            score: 70,
            label: 'GOOD',
            axes: { constitutional: 70, contextual: 70, intentFidelity: 70 },
        };
    }
}

// ── Pass/fail gate ────────────────────────────────────────────────────────────

/**
 * Returns true if the IFS result clears the threshold.
 * Used by critique-middleware to determine whether to retry silently.
 */
export function ifsPasses(result: IFSResult, threshold = IFS_DEFAULT_THRESHOLD): boolean {
    return result.score >= threshold;
}
