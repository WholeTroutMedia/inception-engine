/**
 * Director Agent — IECR Core
 * Receives a natural language task, decomposes it into a TaskGraph,
 * delegates to specialist engine sub-flows, and validates output.
 * T-IECR-001
 */

import { ai } from "../index.js";
import { z } from "genkit";

// ── Engine Module Enum ────────────────────────────────────────────
export const EngineModuleSchema = z.enum([
    "VIDEO",
    "AUDIO",
    "3D",
    "DESIGN",
    "CODE",
    "ASSETS",
]);
export type EngineModule = z.infer<typeof EngineModuleSchema>;

// ── Task Graph ────────────────────────────────────────────────────
export const SubTaskSchema = z.object({
    id: z.string(),
    engine: EngineModuleSchema,
    intent: z.string().describe("What this engine should do"),
    inputs: z.array(z.string()).describe("Asset IDs or task IDs feeding into this step"),
    outputs: z.array(z.string()).describe("Produced asset IDs"),
    priority: z.number().int().min(1).max(10).default(5),
});
export type SubTask = z.infer<typeof SubTaskSchema>;

export const TaskGraphSchema = z.object({
    sessionId: z.string(),
    sourcePrompt: z.string(),
    tasks: z.array(SubTaskSchema),
    estimatedDurationMs: z.number().optional(),
    enginesRequired: z.array(EngineModuleSchema),
});
export type TaskGraph = z.infer<typeof TaskGraphSchema>;

// ── Director Agent Input/Output ───────────────────────────────────
export const DirectorInputSchema = z.object({
    prompt: z.string().describe("Natural language creative intent from the user"),
    sessionId: z.string().default(() => `sess-${Date.now()}`),
    context: z.record(z.unknown()).optional().describe("Prior context, uploaded files, etc."),
});

export const DirectorOutputSchema = z.object({
    taskGraph: TaskGraphSchema,
    summary: z.string().describe("Human-readable plan summary"),
    engineDelegations: z.array(z.object({
        engine: EngineModuleSchema,
        taskId: z.string(),
        flowEndpoint: z.string(),
    })),
});

// ── Flow Definition ───────────────────────────────────────────────
export const directorAgentFlow = ai.defineFlow(
    {
        name: "directorAgent",
        inputSchema: DirectorInputSchema,
        outputSchema: DirectorOutputSchema,
    },
    async (input) => {
        const { output } = await ai.generate({
            model: "googleai/gemini-2.5-pro-preview-03-25",
            system: `You are the Director Agent of the Creative Liberation Engine Creative Runtime (IECR).
Your role: decompose a creative prompt into a structured TaskGraph — a directed acyclic graph of engine sub-tasks.

Available engines:
- VIDEO: Non-linear editing, compositing, color grading, timeline assembly (via FFmpeg)
- AUDIO: Synthesis, recording, mixing, mastering, audio graph construction
- 3D: Real-time PBR rendering, USD/glTF assembly, world building, 3D asset generation
- DESIGN: Vector/raster canvas, typography, layout, brand identity
- CODE: GPU shader generation, TypeScript scripting, runtime tool creation
- ASSETS: Semantic search, library management, format conversion, NAS storage

Rules:
1. Identify which engines are needed for the prompt
2. Create an ordered list of SubTasks (each engine call is one step)
3. Specify inputs/outputs (use descriptive IDs like "hero-video-clip", "ambient-track")
4. Keep task graph minimal — only what is strictly needed
5. Assign priority 1-10 (10 = must complete first)

Return a valid TaskGraph JSON matching the schema.`,
            prompt: `Prompt: "${input.prompt}"
Session: ${input.sessionId}
Context: ${JSON.stringify(input.context ?? {})}

Decompose this into a TaskGraph. Return valid JSON only.`,
            output: {
                schema: z.object({
                    tasks: z.array(SubTaskSchema),
                    enginesRequired: z.array(EngineModuleSchema),
                    estimatedDurationMs: z.number().optional(),
                    summary: z.string(),
                }),
            },
        });

        if (!output) throw new Error("Director Agent: no output from Gemini");

        const taskGraph: TaskGraph = {
            sessionId: input.sessionId,
            sourcePrompt: input.prompt,
            tasks: output.tasks,
            estimatedDurationMs: output.estimatedDurationMs,
            enginesRequired: output.enginesRequired,
        };

        // Build delegation map — maps each engine to its Genkit flow endpoint
        const ENGINE_FLOW_MAP: Record<EngineModule, string> = {
            VIDEO: "ieVideoFlow",
            AUDIO: "ieAudioFlow",
            "3D": "ie3dFlow",
            DESIGN: "ieDesignFlow",
            CODE: "ieCodeFlow",
            ASSETS: "ieAssetsFlow",
        };

        const engineDelegations = taskGraph.tasks.map((task) => ({
            engine: task.engine,
            taskId: task.id,
            flowEndpoint: ENGINE_FLOW_MAP[task.engine],
        }));

        return {
            taskGraph,
            summary: output.summary,
            engineDelegations,
        };
    }
);
