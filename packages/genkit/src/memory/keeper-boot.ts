/**
 * KEEPER v2 Boot Protocol — SC-04
 *
 * Replaces flat KI summary with dynamic targeted recall on session start.
 * On boot:
 *   1. Parse current task/workstream from HANDOFF.md or boot context
 *   2. Run scribeRecall(task context, both collections, limit=10)
 *   3. Inject top results as compressed memory brief at top of system prompt
 *   4. Surface critical-importance items as boot alerts
 *
 * This makes KEEPER v2 context-aware from the first token.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { scribeRecall } from './scribe.js';
import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// HANDOFF.md PARSER
// ─────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = `d:\\Google Creative Liberation Engine\\Infusion Engine Brainchild\\brainchild-v5`;
const HANDOFF_PATH = path.join(REPO_ROOT, 'HANDOFF.md');

interface HandoffContext {
    phase: string;
    from: string;
    workstream: string;
    task: string;
    next: string;
}

function parseHandoff(): HandoffContext | null {
    try {
        const content = fs.readFileSync(HANDOFF_PATH, 'utf-8');
        // Extract JSON block from markdown
        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
        if (!jsonMatch) return null;
        const parsed = JSON.parse(jsonMatch[1]);
        return {
            phase: parsed.phase ?? 'unknown',
            from: parsed.from ?? 'unknown',
            workstream: parsed.workstream ?? 'free',
            task: parsed.task ?? parsed.current ?? 'general',
            next: parsed.next ?? '',
        };
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOT RECALL
// ─────────────────────────────────────────────────────────────────────────────

export interface KeeperBootResult {
    memoryBrief: string;
    bootAlerts: string[];
    criticalItems: string[];
    handoffContext: HandoffContext | null;
    recallCount: number;
    queryUsed: string;
}

export async function keeperBootRecall(options: {
    explicitTask?: string;
    workstream?: string;
    limit?: number;
} = {}): Promise<KeeperBootResult> {
    const { explicitTask, workstream, limit = 10 } = options;

    // Determine context query
    const handoff = parseHandoff();
    const taskContext = explicitTask ?? handoff?.task ?? handoff?.workstream ?? workstream ?? 'general session start';
    const queryWorkstream = workstream ?? handoff?.workstream ?? 'free';

    console.log(`[KEEPER-BOOT] 🚀 Boot recall — task: "${taskContext.slice(0, 60)}" workstream: ${queryWorkstream}`);

    // Multi-query recall: task-specific + workstream-specific
    const [taskResults, workstreamResults] = await Promise.all([
        scribeRecall({ query: taskContext, limit: Math.ceil(limit * 0.6), tags: [], successOnly: false }),
        scribeRecall({ query: queryWorkstream, limit: Math.floor(limit * 0.4), tags: [], successOnly: false }),
    ]);

    // Merge and deduplicate
    const allResults = [...taskResults.results, ...workstreamResults.results];
    const seen = new Set<string>();
    const uniqueResults = allResults.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
    });

    // Sort by importance
    const importanceOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    uniqueResults.sort((a, b) => (importanceOrder[b.importance] ?? 0) - (importanceOrder[a.importance] ?? 0));

    // Build compressed memory brief
    const criticalItems = uniqueResults
        .filter(r => r.importance === 'critical')
        .map(r => `🔴 [${r.category.toUpperCase()}] ${r.content.slice(0, 120)}`);

    const highItems = uniqueResults
        .filter(r => r.importance === 'high')
        .map(r => `🟡 [${r.category.toUpperCase()}] ${r.content.slice(0, 100)}`);

    const mediumItems = uniqueResults
        .filter(r => r.importance === 'medium')
        .slice(0, 4)
        .map(r => `⚪ [${r.category.toUpperCase()}] ${r.content.slice(0, 80)}`);

    const memoryBriefLines = [
        `## KEEPER v2 Memory Brief — ${new Date().toISOString()}`,
        `**Task context:** ${taskContext}`,
        `**Workstream:** ${queryWorkstream}`,
        `**Memories recalled:** ${uniqueResults.length}`,
        '',
    ];

    if (criticalItems.length > 0) {
        memoryBriefLines.push('### 🔴 Critical', ...criticalItems, '');
    }
    if (highItems.length > 0) {
        memoryBriefLines.push('### 🟡 High Priority', ...highItems, '');
    }
    if (mediumItems.length > 0) {
        memoryBriefLines.push('### ⚪ Context', ...mediumItems, '');
    }

    if (handoff) {
        memoryBriefLines.push(
            `### 📋 Active HANDOFF`,
            `Phase: **${handoff.phase}** | From: ${handoff.from}`,
            `Next: ${handoff.next.slice(0, 200)}`,
            ''
        );
    }

    const memoryBrief = memoryBriefLines.join('\n');
    const bootAlerts = criticalItems; // Surface crit items as alerts in boot panel

    console.log(`[KEEPER-BOOT] ✅ Boot brief: ${uniqueResults.length} memories, ${criticalItems.length} critical alerts`);

    return {
        memoryBrief,
        bootAlerts,
        criticalItems,
        handoffContext: handoff,
        recallCount: uniqueResults.length,
        queryUsed: taskContext,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GENKIT FLOW WRAPPER (SC-04)
// ─────────────────────────────────────────────────────────────────────────────

const KeeperBootInputSchema = z.object({
    explicitTask: z.string().optional().describe('Override task context (skip HANDOFF.md parsing)'),
    workstream: z.string().optional().describe('Active workstream name'),
    limit: z.number().int().min(1).max(20).default(10),
});

const KeeperBootOutputSchema = z.object({
    memoryBrief: z.string().describe('Compressed memory brief for system prompt injection'),
    bootAlerts: z.array(z.string()).describe('Critical-importance items to surface as boot alerts'),
    criticalItems: z.array(z.string()),
    recallCount: z.number(),
    queryUsed: z.string(),
    handoffPhase: z.string().optional(),
    handoffNext: z.string().optional(),
});

export const KeeperBootFlow = ai.defineFlow(
    { name: 'KeeperBoot', inputSchema: KeeperBootInputSchema, outputSchema: KeeperBootOutputSchema },
    async (input) => {
        const result = await keeperBootRecall(input);
        return {
            memoryBrief: result.memoryBrief,
            bootAlerts: result.bootAlerts,
            criticalItems: result.criticalItems,
            recallCount: result.recallCount,
            queryUsed: result.queryUsed,
            handoffPhase: result.handoffContext?.phase,
            handoffNext: result.handoffContext?.next,
        };
    }
);
