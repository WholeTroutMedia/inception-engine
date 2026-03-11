/**
 * IE Engine Sub-Flows — IECR Phase 1
 * Six specialist Genkit flows, one per engine module.
 * Each receives a SubTask intent and returns structured result metadata.
 * T-IECR-002 through T-IECR-007
 */

import { ai } from "../index.js";
import { z } from "genkit";

// ── Shared schemas ────────────────────────────────────────────────

const EngineTaskInputSchema = z.object({
    taskId: z.string(),
    sessionId: z.string(),
    intent: z.string().describe("What this engine should accomplish"),
    inputs: z.array(z.string()).describe("Upstream asset IDs"),
    parameters: z.record(z.unknown()).optional().describe("Engine-specific parameters"),
});

const EngineTaskOutputSchema = z.object({
    taskId: z.string(),
    engine: z.string(),
    status: z.enum(["queued", "running", "complete", "failed"]),
    outputs: z.array(z.object({
        assetId: z.string(),
        type: z.string(),
        description: z.string(),
        path: z.string().optional(),
    })),
    metadata: z.record(z.unknown()).optional(),
    durationMs: z.number().optional(),
    nextSteps: z.array(z.string()).optional(),
});

// Helper to make an engine flow
function makeEngineFlow(
    name: string,
    engineLabel: string,
    systemContext: string
) {
    return ai.defineFlow(
        {
            name,
            inputSchema: EngineTaskInputSchema,
            outputSchema: EngineTaskOutputSchema,
        },
        async (input) => {
            const start = Date.now();

            const { output } = await ai.generate({
                model: "googleai/gemini-2.0-flash",
                system: `You are the ${engineLabel} engine of the Creative Liberation Engine Creative Runtime.
${systemContext}

Your role: Given a task intent, determine:
1. What outputs this engine will produce (list them with descriptive asset IDs)
2. The execution parameters needed
3. Next steps for dependent engines

Return structured JSON matching the output schema.`,
                prompt: `Task ID: ${input.taskId}
Session: ${input.sessionId}
Intent: "${input.intent}"
Upstream inputs: ${JSON.stringify(input.inputs)}
Parameters: ${JSON.stringify(input.parameters ?? {})}

Plan your execution and describe your outputs.`,
                output: {
                    schema: z.object({
                        outputs: z.array(z.object({
                            assetId: z.string(),
                            type: z.string(),
                            description: z.string(),
                            path: z.string().optional(),
                        })),
                        metadata: z.record(z.unknown()).optional(),
                        nextSteps: z.array(z.string()).optional(),
                    }),
                },
            });

            if (!output) throw new Error(`${engineLabel} engine: no output from model`);

            return {
                taskId: input.taskId,
                engine: engineLabel,
                status: "complete" as const,
                outputs: output.outputs,
                metadata: output.metadata,
                durationMs: Date.now() - start,
                nextSteps: output.nextSteps,
            };
        }
    );
}

// ── IE VIDEO — Agent-operated NLE ────────────────────────────────
export const ieVideoFlow = makeEngineFlow(
    "ieVideoFlow",
    "IE VIDEO",
    `IE VIDEO is an agent-operated non-linear editing engine powered by Stable Video Diffusion (SVD). Capabilities:
- Timeline assembly from clips, images, and generated media
- Generative video synthesis via Stable Video Diffusion
- Professional compositing and color grading
- FFmpeg-based encode/decode with GPU acceleration
- Cross-engine: receives 3D renders from IE 3D, audio from IE AUDIO`
);

// ── IE AUDIO — Full DAW ───────────────────────────────────────────
export const ieAudioFlow = makeEngineFlow(
    "ieAudioFlow",
    "IE AUDIO",
    `IE AUDIO is a full synthesis and mastering DAW engine powered by Stable Audio Open + XTTS. Capabilities:
- Node-based audio graph for complex sound design
- Voice synthesis and cloning via XTTS
- Music and sound effect generation via Stable Audio Open
- Recording and MIDI sequencing
- Professional mastering chain (compression, EQ, limiting, stereo imaging)
- Output formats: WAV, FLAC, MP3, stem exports`
);

// ── IE 3D — Real-time PBR renderer ───────────────────────────────
export const ie3dFlow = makeEngineFlow(
    "ie3dFlow",
    "IE 3D",
    `IE 3D is a real-time PBR rendering engine and world builder powered by TripoSR + InstantMesh. Capabilities:
- AI mesh generation from images/text via TripoSR and InstantMesh
- USD and glTF 2.0 asset support
- Physically-based materials with IBL lighting
- Camera animation and keyframe rigging
- Rendering via wgpu/WebGPU for cross-platform GPU compute
- Integration with Blender for complex geometry`
);

// ── IE DESIGN — Vector/Raster canvas ──────────────────────────────
export const ieDesignFlow = makeEngineFlow(
    "ieDesignFlow",
    "IE DESIGN",
    `IE DESIGN is an integrated vector/raster canvas powered by SDXL + FLUX.1. Capabilities:
- Image generation and manipulation via SDXL and FLUX.1
- Infinite canvas with precise vector paths and bezier editing
- Typography engine with variable font support and layout grid
- Responsive layout engine targeting web, mobile, print
- Export to SVG, PDF, PNG, Figma-compatible JSON
- AI layout generation from brand briefs`
);

// ── IE CODE — Shader and script generator ────────────────────────
export const ieCodeFlow = makeEngineFlow(
    "ieCodeFlow",
    "IE CODE",
    `IE CODE generates shaders, scripts, and runtime tools on demand powered by DeepSeek / CodeLlama. Capabilities:
- Custom UI generation and logic scripting via DeepSeek / CodeLlama
- WGSL/GLSL shader generation for custom visual effects
- TypeScript/Python script generation for pipeline automation
- Runtime tool creation (extend IE's own capabilities dynamically)
- Integration with Genkit flows for agent-written code
- Automated testing of generated code before deployment`
);

// ── IE ASSETS — Universal librarian ──────────────────────────────
export const ieAssetsFlow = makeEngineFlow(
    "ieAssetsFlow",
    "IE ASSETS",
    `IE ASSETS is the universal asset management engine. Capabilities:
- Semantic search across all project assets (text, image, video, audio, 3D)
- NAS integration for Synology storage (synology-media-mcp)
- Format conversion between any media types
- Automatic tagging and categorization via Gemini Vision
- Version control and asset lineage tracking
- Cloud sync (Google Drive, IPFS for permanent storage)
- Smart deduplication and compression`
);
