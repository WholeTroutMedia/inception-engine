/**
 * DIRA-02: Instrument IECR agent runs to emit ProductionCase records
 * packages/genkit/src/dira/instrumentation.ts
 *
 * Wraps IECR agent execution paths with ProductionCase emission.
 * On every agent run:
 *   1. Capture trigger, resolution, timeToResolve, outcome
 *   2. Write completed case to ChromaDB 'production_cases' collection
 *      via scribeRemember()
 *
 * This closes the feedback loop for VERA to learn from.
 * Source: IECR Google Doc Tab 8
 */

import { createProductionCase, ProductionCaseType, encodeForEmbedding, toChromaMetadata, PRODUCTION_CASES_COLLECTION } from './types.js';
import { scribeRemember } from '../memory/scribe.js';

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUMENTATION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

export interface RunContext {
    workflow: string;            // e.g., 'video-generation', 'design-agent-scan'
    reportedBy?: string;         // Agent ID
    tags?: string[];
}

export interface RunResult {
    success: boolean;
    output?: unknown;
    error?: Error | string;
    /** Optional human decision override */
    humanDecision?: string;
}

/**
 * Instrument an IECR agent or service call.
 * Automatically writes a ProductionCase to ChromaDB on completion or failure.
 *
 * Usage:
 * ```ts
 * const result = await instrumen({ workflow: 'video-generation', reportedBy: 'genmedia' },
 *   () => myAgentRun(input)
 * );
 * ```
 */
export async function instrument<T>(
    ctx: RunContext,
    fn: () => Promise<T>
): Promise<T> {
    const startTime = Date.now();
    let result: T;
    let trigger = '';
    let resolution = '';
    let caseType: ProductionCaseType = 'exception';
    let success = false;

    try {
        result = await fn();
        success = true;
        resolution = 'Completed successfully';
        caseType = resolveTypeFromWorkflow(ctx.workflow, true);
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        trigger = errorMsg;
        resolution = `Failed: ${errorMsg}`;
        caseType = resolveTypeFromWorkflow(ctx.workflow, false);

        // Emit failure case immediately before re-throwing
        await emitCase({
            type: caseType,
            workflow: ctx.workflow,
            trigger,
            resolution,
            outcome: 'escalated',
            timeToResolve: Date.now() - startTime,
            reportedBy: ctx.reportedBy ?? 'instrument',
            tags: [...(ctx.tags ?? []), 'failure', caseType],
        });

        throw err; // Re-throw so caller handles it normally
    }

    // Emit success case (only for workflows that track patterns)
    if (shouldTrackSuccess(ctx.workflow)) {
        await emitCase({
            type: caseType,
            workflow: ctx.workflow,
            trigger: `Successful ${ctx.workflow} run`,
            resolution,
            outcome: 'auto-resolved',
            timeToResolve: Date.now() - startTime,
            reportedBy: ctx.reportedBy ?? 'instrument',
            tags: [...(ctx.tags ?? []), 'success', caseType],
        });
    }

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function emitCase(params: {
    type: ProductionCaseType;
    workflow: string;
    trigger: string;
    resolution: string;
    outcome: 'auto-resolved' | 'escalated' | 'partial' | 'skipped';
    timeToResolve: number;
    reportedBy: string;
    tags: string[];
    humanDecision?: string;
}): Promise<void> {
    const c = createProductionCase({
        type: params.type,
        workflow: params.workflow,
        trigger: params.trigger,
        resolution: params.resolution,
        outcome: params.outcome,
        timeToResolve: params.timeToResolve,
        reportedBy: params.reportedBy,
        humanDecision: params.humanDecision,
        tags: params.tags,
    });

    const embeddableText = encodeForEmbedding(c);
    const metadata = toChromaMetadata(c);

    try {
        await (scribeRemember as unknown as (input: Record<string, unknown>) => Promise<unknown>)({
            content: embeddableText,
            category: 'bug-fix',
            importance: params.outcome === 'escalated' ? 'high' : 'medium',
            tags: params.tags,
            metadata: {
                ...metadata,
                collection: PRODUCTION_CASES_COLLECTION,
            },
        });
        console.log(`[DIRA-INSTRUMENT] 📋 Case emitted: ${c.id} (${params.workflow}, ${params.outcome})`);
    } catch (err) {
        // Never let instrumentation break the main flow
        console.error('[DIRA-INSTRUMENT] ⚠️ Failed to emit case — non-fatal:', err);
    }
}

function resolveTypeFromWorkflow(workflow: string, _success: boolean): ProductionCaseType {
    if (workflow.includes('video') || workflow.includes('audio') || workflow.includes('media')) return 'quality';
    if (workflow.includes('deploy') || workflow.includes('publish') || workflow.includes('distribute')) return 'distribution';
    if (workflow.includes('design') || workflow.includes('asset') || workflow.includes('figma')) return 'curation';
    if (workflow.includes('timeout') || workflow.includes('latency')) return 'performance';
    if (workflow.includes('agent') || workflow.includes('route') || workflow.includes('handoff')) return 'coordination';
    return 'exception';
}

function shouldTrackSuccess(workflow: string): boolean {
    // Track successful runs for: media gen (most expensive), distribution, coordination
    const trackedPatterns = ['video', 'audio', 'deploy', 'publish', 'agent-handoff', 'director'];
    return trackedPatterns.some(p => workflow.toLowerCase().includes(p));
}
