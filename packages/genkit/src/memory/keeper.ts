/**
 * KEEPER v2 Boot Protocol — Task-Aware Memory Recall on Session Start (SC-04)
 * packages/genkit/src/memory/keeper.ts
 *
 * On every session boot, KEEPER:
 *   1. Parses current task/workstream context from HANDOFF.md or boot context
 *   2. Runs scribeRecall(taskContext, both, limit=10) against ChromaDB
 *   3. Returns a compressed memory brief for injection at top of system prompt
 *   4. Surfaces critical-importance items as boot alerts
 *
 * Usage in flows (inject at top of system prompt):
 *   const brief = await keeperBoot({ workstream: 'mcp-router' });
 *   systemPrompt += brief.memoryBrief;
 *   if (brief.alerts.length) console.warn('[KEEPER] Alerts:', brief.alerts);
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scribeRecall } from './scribe.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface KeeperBootContext {
    /** Active workstream (e.g. 'mcp-router', 'scribe-v2'). Auto-detected if omitted. */
    workstream?: string;
    /** Explicit task description to recall against. Auto-detected from HANDOFF.md if omitted. */
    taskHint?: string;
    /** Number of memory results to recall. Default: 10 */
    limit?: number;
    /** Agent calling KEEPER boot (used for agent-scoped recall). Default: 'AVERI' */
    agentName?: string;
}

export interface KeeperBootResult {
    /** Formatted memory brief for injection into system prompt */
    memoryBrief: string;
    /** High-importance recalled items that need immediate attention */
    alerts: string[];
    /** Number of memories recalled */
    recalledCount: number;
    /** Detected workstream from HANDOFF.md or provided context */
    detectedWorkstream: string;
    /** Raw HANDOFF.md task description (if found) */
    handoffTask?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDOFF.md PARSER
// ─────────────────────────────────────────────────────────────────────────────

const WORKSPACE_ROOTS = [
    'D:\\Google Creative Liberation Engine\\Infusion Engine Brainchild\\brainchild-v5',
    'D:\\Google Creative Liberation Engine\\Infusion Engine Brainchild\\brainchild-v4',
];

/**
 * Find and parse the HANDOFF.md file from any known workspace root.
 * Returns the task context string and workstream if parseable.
 */
function parseHandoffMd(): { taskHint: string; workstream: string } | null {
    for (const root of WORKSPACE_ROOTS) {
        const handoffPath = path.join(root, 'HANDOFF.md');
        try {
            if (!fs.existsSync(handoffPath)) continue;
            const content = fs.readFileSync(handoffPath, 'utf-8');

            // Extract current task — look for "## Current Task" or "**Task:**" patterns
            const taskMatch =
                content.match(/##\s*Current Task[^\n]*\n+([^\n#]{10,200})/i) ??
                content.match(/\*\*Task[:\s]*\*\*[:\s]*([^\n]{10,200})/i) ??
                content.match(/^#+\s*Task[:\s]+(.+)$/im);

            const workstreamMatch =
                content.match(/##\s*Workstream[^\n]*\n+([^\n#]{3,60})/i) ??
                content.match(/\*\*Workstream[:\s]*\*\*[:\s]*([^\n]{3,60})/i) ??
                content.match(/workstream:\s*([^\s\n]{3,40})/i);

            if (taskMatch?.[1]) {
                return {
                    taskHint: taskMatch[1].trim().replace(/\*\*/g, ''),
                    workstream: workstreamMatch?.[1]?.trim() ?? 'general',
                };
            }
        } catch {
            // file unreadable — skip
        }
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// KEEPER BOOT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run KEEPER's boot recall protocol.
 * Surfaces relevant episodic + semantic memories for the current task.
 * Returns a formatted brief ready for injection into any AVERI system prompt.
 */
export async function keeperBoot(ctx: KeeperBootContext = {}): Promise<KeeperBootResult> {
    const { limit = 10, agentName = 'AVERI' } = ctx;

    // Step 1: Determine task hint
    let taskHint = ctx.taskHint ?? '';
    let detectedWorkstream = ctx.workstream ?? 'general';
    let handoffTask: string | undefined;

    if (!taskHint) {
        const handoff = parseHandoffMd();
        if (handoff) {
            taskHint = handoff.taskHint;
            detectedWorkstream = ctx.workstream ?? handoff.workstream;
            handoffTask = handoff.taskHint;
        }
    }

    // If still no hint — use workstream as fallback
    if (!taskHint && ctx.workstream) {
        taskHint = `working on workstream: ${ctx.workstream}`;
    }

    if (!taskHint) {
        // No context available — return empty brief
        return {
            memoryBrief: '',
            alerts: [],
            recalledCount: 0,
            detectedWorkstream,
            handoffTask,
        };
    }

    // Step 2: Run SCRIBE recall against the task context
    let recalledItems: Array<{ content: string; importance?: string; source?: string; similarity?: number }> = [];

    try {
        const recallResult = await scribeRecall({
            query: taskHint,
            agentName,
            limit,
            tags: [],
            successOnly: false,
        });
        recalledItems = recallResult.results ?? [];
    } catch (err) {
        console.warn('[KEEPER] ⚠️ scribeRecall failed during boot:', (err as Error).message);
        // Return gracefully with empty brief — don't block session start
        return {
            memoryBrief: '',
            alerts: [],
            recalledCount: 0,
            detectedWorkstream,
            handoffTask,
        };
    }

    if (recalledItems.length === 0) {
        return {
            memoryBrief: '',
            alerts: [],
            recalledCount: 0,
            detectedWorkstream,
            handoffTask,
        };
    }

    // Step 3: Separate alerts (critical importance) from regular context
    const alerts: string[] = [];
    const contextItems: string[] = [];

    for (const item of recalledItems) {
        const text = item.content?.slice(0, 200) ?? '';
        if (!text) continue;

        if (item.importance === 'critical' || item.importance === 'high') {
            alerts.push(`⚠️ [${item.source ?? 'SCRIBE'}] ${text}`);
        } else {
            const sim = item.similarity != null ? ` (${(item.similarity * 100).toFixed(0)}% match)` : '';
            contextItems.push(`• ${text}${sim}`);
        }
    }

    // Step 4: Format memory brief for system prompt injection
    const sections: string[] = [];

    if (alerts.length > 0) {
        sections.push(`**⚠️ KEEPER BOOT ALERTS (${alerts.length}):**\n${alerts.join('\n')}`);
    }

    if (contextItems.length > 0) {
        sections.push(
            `**📚 KEEPER MEMORY BRIEF — ${detectedWorkstream} [${taskHint.slice(0, 60)}]:**\n${contextItems.join('\n')}`
        );
    }

    const memoryBrief =
        sections.length > 0
            ? `\n\n---\n${sections.join('\n\n')}\n---\n`
            : '';

    console.log(
        `[KEEPER] 🧠 Boot recall: ${recalledItems.length} memories | ${alerts.length} alerts | workstream=${detectedWorkstream}`
    );

    return {
        memoryBrief,
        alerts: alerts.map(a => a.replace(/^⚠️\s*/, '')),
        recalledCount: recalledItems.length,
        detectedWorkstream,
        handoffTask,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE — Format for specific AVERI agents
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run KEEPER boot for ATHENA — uses topic-focused recall.
 */
export async function keeperBootForATHENA(topic: string): Promise<string> {
    const result = await keeperBoot({ taskHint: topic, agentName: 'ATHENA', limit: 5 });
    return result.memoryBrief;
}

/**
 * Run KEEPER boot for VERA — uses validation-focused recall.
 */
export async function keeperBootForVERA(content: string): Promise<string> {
    const result = await keeperBoot({ taskHint: content, agentName: 'VERA', limit: 5 });
    return result.memoryBrief;
}

/**
 * Run KEEPER boot for IRIS — uses blocker/resolution recall.
 */
export async function keeperBootForIRIS(blocker: string): Promise<string> {
    const result = await keeperBoot({ taskHint: blocker, agentName: 'IRIS', limit: 5 });
    return result.memoryBrief;
}
