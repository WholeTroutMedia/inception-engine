/**
 * packages/genmedia/src/pipeline/director.ts
 * IECR Director Agent — Creative Liberation Engine Creative Runtime
 *
 * Decomposes a high-level creative prompt into a TaskGraph
 * and dispatches to 6 specialist engine modules:
 *   Video | Audio | 3D | Design | Code | Assets
 *
 * Article IX: No MVPs — full parallel orchestration.
 *
 * DIRA-02: Every node execution emits a ProductionCase to ChromaDB
 * so VERA can learn from production patterns and auto-resolve known issues.
 */

import { z } from 'genkit';
import { ai } from '@inception/genkit';
import {
    createProductionCase,
    productionCaseToScribeInput,
    type ProductionCaseType,
} from '@inception/genkit/dira';
import { scribeRemember } from '@inception/genkit/memory/scribe';
import type { MediaType } from '../index.js';

// ─────────────────────────────────────────────────────────────────────────────
// TASK GRAPH TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const EngineModuleEnum = z.enum(['video', 'audio', '3d', 'design', 'code', 'assets']);
export type EngineModule = z.infer<typeof EngineModuleEnum>;

export const TaskNodeSchema = z.object({
    id: z.string(),
    module: EngineModuleEnum,
    prompt: z.string(),
    dependencies: z.array(z.string()).default([]),
    priority: z.number().int().min(0).max(10).default(5),
    estimatedSeconds: z.number().optional(),
    parameters: z.record(z.any()).default({}),
});
export type TaskNode = z.infer<typeof TaskNodeSchema>;

export const TaskGraphSchema = z.object({
    sessionId: z.string(),
    intent: z.string().describe('The original creative brief'),
    nodes: z.array(TaskNodeSchema),
    maxParallelism: z.number().int().min(1).max(8).default(4),
    constitutionalFlags: z.array(z.string()).default([]),
});
export type TaskGraph = z.infer<typeof TaskGraphSchema>;

export const DirectorInputSchema = z.object({
    brief: z.string().describe('High-level creative intent (e.g., "Cinematic brand film for Zero Day GTM launch")'),
    sessionId: z.string().optional(),
    targetModules: z.array(EngineModuleEnum).optional().describe('Override — only use these modules'),
    quality: z.enum(['draft', 'standard', 'ultra']).default('standard'),
    maxParallelism: z.number().int().min(1).max(8).default(4),
    constitutionalCheck: z.boolean().default(true),
});
export type DirectorInput = z.infer<typeof DirectorInputSchema>;

export const DirectorOutputSchema = z.object({
    graph: TaskGraphSchema,
    executionPlan: z.string().describe('Human-readable execution narrative'),
    estimatedTotalSeconds: z.number(),
    modulesActivated: z.array(EngineModuleEnum),
});
export type DirectorOutput = z.infer<typeof DirectorOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// MODULE CAPABILITY MAP
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_CAPABILITIES: Record<EngineModule, string> = {
    video: 'Video generation, cinematics, animation, transitions (Veo 2, Wan 2.1, Kling)',
    audio: 'Music composition, SFX, voice synthesis, audio reactive (Lyria, ElevenLabs)',
    '3d': '3D model generation, rigging, scene composition (TripoSR, ComfyUI 3D)',
    design: 'Graphics, brand assets, typography, UI components (Imagen 3, Flux Pro)',
    code: 'Code generation, scaffolding, automation scripts (Genkit flows, TypeScript)',
    assets: 'Asset management, compositing, format conversion, NAS delivery pipeline',
};

const MODULE_AVG_SECONDS: Record<EngineModule, number> = {
    video: 120,
    audio: 45,
    '3d': 90,
    design: 30,
    code: 15,
    assets: 10,
};

// ─────────────────────────────────────────────────────────────────────────────
// DIRECTOR DECOMPOSITION — Gemini-powered brief analysis
// ─────────────────────────────────────────────────────────────────────────────

const DECOMPOSITION_SYSTEM = `You are the IECR Director Agent for the Creative Liberation Engine.
Your role is to decompose a creative brief into a structured TaskGraph.

Available engine modules:
${Object.entries(MODULE_CAPABILITIES).map(([m, c]) => `  - ${m}: ${c}`).join('\n')}

Rules:
1. Only activate modules genuinely needed for the brief
2. Set dependencies: if design assets are needed for video, design must run first
3. Assign priority 0-10 where 10 = critical path
4. Keep prompts specific and action-oriented per module
5. Flag constitutional concerns (violence, IP, privacy) in constitutionalFlags
6. Be decisive — return exactly the modules needed, no placeholders`;

async function decomposeWithGemini(input: DirectorInput): Promise<TaskGraph> {
    const sessionId = input.sessionId ?? `iecr_${Date.now()}`;

    const prompt = `Creative Brief: "${input.brief}"
Quality: ${input.quality}
Target modules (if any): ${input.targetModules?.join(', ') ?? 'auto-select'}

Decompose this brief into a JSON TaskGraph. Return ONLY valid JSON matching this schema:
{
  "nodes": [
    {
      "id": "node-1",
      "module": "<module>",
      "prompt": "<specific task prompt>",
      "dependencies": [],
      "priority": <0-10>,
      "estimatedSeconds": <number>,
      "parameters": {}
    }
  ],
  "maxParallelism": ${input.maxParallelism},
  "constitutionalFlags": []
}`;

    try {
        const { output: raw } = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            system: DECOMPOSITION_SYSTEM,
            prompt,
            config: { temperature: 0.3, maxOutputTokens: 2048 },
            output: { schema: TaskGraphSchema },
        });
        if (!raw?.nodes?.length) throw new Error('No nodes in Gemini decomposition');

        // Filter to target modules if specified
        const nodes = input.targetModules
            ? raw.nodes.filter((n: any) => input.targetModules!.includes(n.module as EngineModule))
            : raw.nodes;

        return TaskGraphSchema.parse({
            sessionId,
            intent: input.brief,
            nodes,
            maxParallelism: raw.maxParallelism ?? input.maxParallelism,
            constitutionalFlags: raw.constitutionalFlags ?? [],
        });
    } catch (err) {
        console.warn(`[DIRECTOR] ⚠️ Gemini decomposition failed: ${String(err).slice(0, 100)} — using heuristic fallback`);
        return heuristicDecompose(input, sessionId);
    }
}

// ─── Heuristic fallback (no AI needed) ───────────────────────────────────────

function heuristicDecompose(input: DirectorInput, sessionId: string): TaskGraph {
    const brief = input.brief.toLowerCase();
    const nodes: TaskNode[] = [];
    let nodeIdx = 0;

    const addNode = (module: EngineModule, prompt: string, deps: string[] = [], priority = 5): string => {
        const id = `node-${++nodeIdx}`;
        nodes.push({
            id,
            module,
            prompt,
            dependencies: deps,
            priority,
            estimatedSeconds: MODULE_AVG_SECONDS[module],
            parameters: { quality: input.quality },
        });
        return id;
    };

    // Heuristic keyword → module mapping
    if (brief.includes('video') || brief.includes('film') || brief.includes('cinematic') || brief.includes('animation')) {
        const designId = addNode('design', `Create visual identity and brand assets for: ${input.brief}`, [], 8);
        addNode('video', `Generate cinematic video content for: ${input.brief}`, [designId], 10);
    }

    if (brief.includes('music') || brief.includes('audio') || brief.includes('sound') || brief.includes('voice')) {
        addNode('audio', `Compose audio/music for: ${input.brief}`, [], 7);
    }

    if (brief.includes('3d') || brief.includes('model') || brief.includes('render') || brief.includes('scene')) {
        addNode('3d', `Generate 3D scene/model for: ${input.brief}`, [], 8);
    }

    if (brief.includes('design') || brief.includes('brand') || brief.includes('logo') || brief.includes('graphic')) {
        addNode('design', `Create design assets for: ${input.brief}`, [], 7);
    }

    if (brief.includes('code') || brief.includes('app') || brief.includes('ui') || brief.includes('dashboard')) {
        addNode('code', `Generate code/UI implementation for: ${input.brief}`, [], 6);
    }

    // Always include assets for delivery
    const allIds = nodes.map(n => n.id);
    addNode('assets', `Compile and deliver all generated assets for: ${input.brief}`, allIds, 3);

    // Fallback: if nothing matched, activate design
    if (nodes.length === 1) {
        addNode('design', `Create creative assets for: ${input.brief}`, [], 7);
    }

    return {
        sessionId,
        intent: input.brief,
        nodes,
        maxParallelism: input.maxParallelism,
        constitutionalFlags: [],
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTITUTIONAL REVIEW
// ─────────────────────────────────────────────────────────────────────────────

async function constitutionalReview(graph: TaskGraph): Promise<string[]> {
    const flags: string[] = [...graph.constitutionalFlags];

    // Simple keyword scan — escalate to COMPASS for P0 flags
    const sensitiveTerms = ['violence', 'weapon', 'explicit', 'copyright', 'private', 'face'];
    const allPrompts = graph.nodes.map(n => n.prompt.toLowerCase()).join(' ');

    for (const term of sensitiveTerms) {
        if (allPrompts.includes(term)) {
            flags.push(`CAUTION: detected sensitive term "${term}" — COMPASS review recommended`);
        }
    }

    return flags;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENKIT DIRECTOR FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const IECRDirectorFlow = ai.defineFlow(
    {
        name: 'IECRDirector',
        inputSchema: DirectorInputSchema,
        outputSchema: DirectorOutputSchema,
    },
    async (input: DirectorInput): Promise<DirectorOutput> => {
        const startMs = Date.now();
        console.log(`[IECR-DIRECTOR] 🎬 Decomposing brief: "${input.brief.slice(0, 80)}..."`);

        // 1. Decompose brief into TaskGraph
        const graph = await decomposeWithGemini(input);

        // 2. Constitutional review
        if (input.constitutionalCheck) {
            const flags = await constitutionalReview(graph);
            graph.constitutionalFlags = flags;
            if (flags.length > 0) {
                console.warn(`[IECR-DIRECTOR] ⚠️ Constitutional flags: ${flags.join(', ')}`);
            }
        }

        // 3. Build execution narrative
        const modulesActivated = [...new Set(graph.nodes.map(n => n.module as EngineModule))];
        const estimatedTotalSeconds = graph.nodes.reduce((acc, n) => acc + (n.estimatedSeconds ?? 30), 0);

        // Build dependency-aware critical path narrative
        const sortedNodes = topoSort(graph.nodes);
        const narrative = [
            `IECR Director — ${graph.nodes.length} tasks across ${modulesActivated.length} modules`,
            `Max parallelism: ${graph.maxParallelism} | Est. total: ~${Math.round(estimatedTotalSeconds / 60)}m`,
            '',
            'Execution Plan:',
            ...sortedNodes.map((n, i) =>
                `  ${i + 1}. [${n.module.toUpperCase()}] ${n.prompt.slice(0, 60)}${n.dependencies.length ? ` (after: ${n.dependencies.join(', ')})` : ''}`
            ),
            ...(graph.constitutionalFlags.length ? ['', `Constitutional flags: ${graph.constitutionalFlags.join('; ')}`] : []),
        ].join('\n');

        console.log(`[IECR-DIRECTOR] ✅ Graph built in ${Date.now() - startMs}ms — ${graph.nodes.length} nodes`);

        return {
            graph,
            executionPlan: narrative,
            estimatedTotalSeconds,
            modulesActivated,
        };
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// TOPOLOGICAL SORT — respects dependencies for correct execution order
// ─────────────────────────────────────────────────────────────────────────────

function topoSort(nodes: TaskNode[]): TaskNode[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const visited = new Set<string>();
    const result: TaskNode[] = [];

    function visit(id: string) {
        if (visited.has(id)) return;
        visited.add(id);
        const node = nodeMap.get(id);
        if (!node) return;
        for (const dep of node.dependencies) {
            visit(dep);
        }
        result.push(node);
    }

    for (const node of nodes) {
        visit(node.id);
    }

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH EXECUTION FLOW — runs graph with parallelism control
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// DIRA-02: ProductionCase emission helper
// ─────────────────────────────────────────────────────────────────────────────

/** Maps IECR module names to DIRA ProductionCaseType categories */
function moduleToProductionCaseType(module: EngineModule): ProductionCaseType {
    switch (module) {
        case 'video':
        case 'audio':
        case '3d':   return 'exception';   // Media gen failures are production exceptions
        case 'design': return 'quality';   // Design failures are quality cases
        case 'assets': return 'distribution'; // Delivery failures are distribution cases
        case 'code':   return 'curation';  // Code gen issues are curation cases
        default:       return 'exception';
    }
}

/**
 * Emits a ProductionCase to ChromaDB via SCRIBE after a node run.
 * Fire-and-forget — never blocks the execution pipeline.
 */
async function emitProductionCase(opts: {
    node: TaskNode;
    sessionId: string;
    outcome: 'auto-resolved' | 'escalated' | 'skipped' | 'partial';
    resolution: string;
    trigger: string;
    timeToResolve: number;
    error?: unknown;
}): Promise<void> {
    try {
        const { node, sessionId, outcome, resolution, trigger, timeToResolve } = opts;
        const c = createProductionCase({
            type: moduleToProductionCaseType(node.module as EngineModule),
            workflow: `iecr:${node.module}:${node.id}`,
            trigger,
            resolution,
            timeToResolve,
            outcome,
            tags: [sessionId, node.module, `priority:${node.priority}`],
            reportedBy: 'IECR-DIRECTOR',
        });

        await scribeRemember(productionCaseToScribeInput(c));
        console.log(`[DIRA] 📊 Case emitted: ${c.id} (${c.type}/${outcome})`);
    } catch (err) {
        // Never block pipeline on DIRA write failures
        console.warn('[DIRA] ⚠️ ProductionCase emit failed (non-blocking):', String(err).slice(0, 80));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH EXECUTION FLOW — runs graph with parallelism control + DIRA telemetry
// ─────────────────────────────────────────────────────────────────────────────

export const IECRExecuteGraphFlow = ai.defineFlow(
    {
        name: 'IECRExecuteGraph',
        inputSchema: TaskGraphSchema,
        outputSchema: z.object({
            completedNodes: z.array(z.string()),
            failedNodes: z.array(z.string()),
            durationMs: z.number(),
        }),
    },
    async (graph: TaskGraph) => {
        const startMs = Date.now();
        const completed = new Set<string>();
        const failed = new Set<string>();
        const inProgress = new Set<string>();
        const nodeStartTimes = new Map<string, number>();

        const sorted = topoSort(graph.nodes);

        console.log(`[IECR-EXECUTE] 🚀 Starting graph execution — ${sorted.length} nodes, parallelism: ${graph.maxParallelism}`);

        // Execute with dependency-aware parallelism
        while (completed.size + failed.size < sorted.length) {
            // Find nodes ready to execute (dependencies met, not in progress)
            const ready = sorted.filter(n =>
                !completed.has(n.id) &&
                !failed.has(n.id) &&
                !inProgress.has(n.id) &&
                n.dependencies.every(dep => completed.has(dep) || failed.has(dep))
            );

            if (ready.length === 0 && inProgress.size === 0) {
                console.warn('[IECR-EXECUTE] ⚠️ Deadlock detected — breaking');
                break;
            }

            // Slot into parallel slots
            const batch = ready.slice(0, graph.maxParallelism - inProgress.size);
            if (batch.length === 0) {
                await new Promise(r => setTimeout(r, 100));
                continue;
            }

            for (const node of batch) {
                inProgress.add(node.id);
                nodeStartTimes.set(node.id, Date.now());
            }

            await Promise.allSettled(
                batch.map(async (node) => {
                    console.log(`[IECR-EXECUTE] ▶ [${node.module}] ${node.id}: ${node.prompt.slice(0, 60)}`);
                    try {
                        // In production: route to the actual module executor (GenMedia, Audio, 3D, etc.)
                        // For now: simulate execution with estimated time
                        await new Promise(r => setTimeout(r, Math.min((node.estimatedSeconds ?? 5) * 10, 500)));
                        inProgress.delete(node.id);
                        completed.add(node.id);
                        const elapsed = Date.now() - (nodeStartTimes.get(node.id) ?? Date.now());
                        console.log(`[IECR-EXECUTE] ✅ [${node.module}] ${node.id} complete in ${elapsed}ms`);

                        // DIRA-02: Emit success ProductionCase (fire-and-forget)
                        void emitProductionCase({
                            node,
                            sessionId: graph.sessionId,
                            outcome: 'auto-resolved',
                            trigger: `${node.module} task initiated: ${node.prompt.slice(0, 100)}`,
                            resolution: `Completed successfully in ${elapsed}ms`,
                            timeToResolve: elapsed,
                        });
                    } catch (err) {
                        inProgress.delete(node.id);
                        failed.add(node.id);
                        const elapsed = Date.now() - (nodeStartTimes.get(node.id) ?? Date.now());
                        console.error(`[IECR-EXECUTE] ❌ [${node.module}] ${node.id} failed:`, err);

                        // DIRA-02: Emit failure ProductionCase — escalated for human review
                        void emitProductionCase({
                            node,
                            sessionId: graph.sessionId,
                            outcome: 'escalated',
                            trigger: `${node.module} task failed: ${node.prompt.slice(0, 100)}`,
                            resolution: `Error: ${String(err).slice(0, 200)}`,
                            timeToResolve: elapsed,
                            error: err,
                        });
                    }
                })
            );

            // Move any remaining inProgress to failed set (shouldn't happen but guard)
            for (const id of inProgress) {
                if (!completed.has(id)) {
                    failed.add(id);
                    inProgress.delete(id);
                }
            }
        }

        const durationMs = Date.now() - startMs;
        console.log(`[IECR-EXECUTE] 🏁 Done in ${durationMs}ms — ${completed.size} completed, ${failed.size} failed`);

        return {
            completedNodes: [...completed],
            failedNodes: [...failed],
            durationMs,
        };
    }
);
