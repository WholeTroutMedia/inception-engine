/**
 * Critique Middleware — Helix A: VERA Inner Critic Loop
 *
 * Wraps any Genkit generate call with a post-generation self-evaluation loop.
 * VERA scores the output before it surfaces. If it fails, one silent retry
 * with a revision directive. Zero user visibility.
 *
 * Usage:
 *   const result = await withSelfCritique(
 *     () => ai.generate({ ... }),
 *     'User intent text',
 *     { threshold: 65, sessionId: 'abc' }
 *   );
 *
 * Constitutional: Article IX (No MVPs — silent retry before surfacing),
 *                 Article IV (Transparency — IFS score exposed in output).
 */

import { scoreIntentFidelity, ifsPasses, IFSResult, IFS_DEFAULT_THRESHOLD } from '../tools/ifs.js';

// ── Config ────────────────────────────────────────────────────────────────────

export interface CritiqueConfig {
    /** IFS threshold 0–100. Below this → silent retry. Default: 65 */
    threshold?: number;
    /** Session ID for VERA memory context. */
    sessionId?: string;
    /** Disable the critique loop entirely. Useful in tests or high-throughput paths. */
    disabled?: boolean;
}

// ── Result wrapper ────────────────────────────────────────────────────────────

export interface CritiqueWrappedResult<T> {
    /** The final output — either first-pass or silently retried. */
    output: T;
    /** The IFS result for the surfaced output. */
    ifs: IFSResult;
    /** True if a silent retry was triggered. */
    retried: boolean;
    /** The revision directive that guided the retry (if retried). */
    revisionDirective?: string;
}

// ── Core wrapper ──────────────────────────────────────────────────────────────

/**
 * Generic self-critique loop for any generative function.
 *
 * @param generateFn - An async function that produces a string output.
 *   For structured outputs, serialize the relevant fields to string for scoring.
 * @param intent - The original user intent that drove this generation.
 * @param config - Optional critique configuration.
 */
export async function withSelfCritique(
    generateFn: () => Promise<string>,
    retryFn: (directive: string) => Promise<string>,
    intent: string,
    config: CritiqueConfig = {},
): Promise<CritiqueWrappedResult<string>> {
    const { threshold = IFS_DEFAULT_THRESHOLD, sessionId, disabled = false } = config;

    if (disabled) {
        const output = await generateFn();
        return {
            output,
            ifs: { score: 70, label: 'GOOD', axes: { constitutional: 70, contextual: 70, intentFidelity: 70 } },
            retried: false,
        };
    }

    // ── First pass ────────────────────────────────────────────────────────────
    const firstOutput = await generateFn();
    const firstIFS = await scoreIntentFidelity(intent, firstOutput, sessionId);

    if (ifsPasses(firstIFS, threshold)) {
        return { output: firstOutput, ifs: firstIFS, retried: false };
    }

    // ── Silent retry ──────────────────────────────────────────────────────────
    const directive = firstIFS.revisionDirective
        ?? `The previous output missed the intent. Focus on: "${intent.slice(0, 200)}". Be more precise and directly address the user's actual request.`;

    console.log(`[CRITIQUE] IFS=${firstIFS.score} < ${threshold} — silent retry | directive: ${directive.slice(0, 80)}...`);

    const retryOutput = await retryFn(directive);
    const retryIFS = await scoreIntentFidelity(intent, retryOutput, sessionId);

    // Surface the retry result regardless of score — we only retry once
    return {
        output: retryOutput,
        ifs: retryIFS,
        retried: true,
        revisionDirective: directive,
    };
}

// ── Convenience wrapper for structured outputs ────────────────────────────────

/**
 * Wraps a structured generation (returns typed T) with the critique loop.
 * Serializes the output text field for IFS scoring.
 *
 * @param generateFn - Async function returning { text: string; ...rest: T }
 * @param retryFn - Async function that accepts a revision directive and returns the same shape
 * @param intent - The original user intent
 * @param config - Critique configuration
 */
export async function withStructuredCritique<T extends object>(
    generateFn: () => Promise<T>,
    retryFn: (directive: string) => Promise<T>,
    textExtractor: (result: T) => string,
    intent: string,
    config: CritiqueConfig = {},
): Promise<CritiqueWrappedResult<T>> {
    const { threshold = IFS_DEFAULT_THRESHOLD, sessionId, disabled = false } = config;

    if (disabled) {
        const output = await generateFn();
        return {
            output,
            ifs: { score: 70, label: 'GOOD', axes: { constitutional: 70, contextual: 70, intentFidelity: 70 } },
            retried: false,
        };
    }

    const firstOutput = await generateFn();
    const firstText = textExtractor(firstOutput);
    const firstIFS = await scoreIntentFidelity(intent, firstText, sessionId);

    if (ifsPasses(firstIFS, threshold)) {
        return { output: firstOutput, ifs: firstIFS, retried: false };
    }

    const directive = firstIFS.revisionDirective
        ?? `Retry with tighter focus on: "${intent.slice(0, 200)}"`;

    console.log(`[CRITIQUE] IFS=${firstIFS.score} < ${threshold} — structured retry`);

    const retryOutput = await retryFn(directive);
    const retryIFS = await scoreIntentFidelity(intent, textExtractor(retryOutput), sessionId);

    return {
        output: retryOutput,
        ifs: retryIFS,
        retried: true,
        revisionDirective: directive,
    };
}
