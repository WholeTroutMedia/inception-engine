import { ai, z } from '../index.js';
import { recordAgentCall } from './index.js';

// ─── LoRA Enhancement Layer Agents ───────────────────────────────────────────
// These agents are intelligence enhancement layers, not autonomous builders.
// They are called by other agents to enhance a specific cognitive dimension.
// Model: gemini-2.5-pro (all LoRA layers use the reasoning-capable model)

const LoRAInputSchema = z.object({
    task: z.string(),
    content: z.string().optional().describe('Content to enhance/analyze'),
    context: z.string().optional(),
});

// ─── VISION — Visual Intelligence Enhancement ─────────────────────────────────
// Hive: LoRA Layer | Activated by: kuid, kbuildd, CREATIVE_DIRECTOR
// Owns: image QA, design critique, cross-modal consistency, visual scoring
const VisionOutputSchema = z.object({
    result: z.string(),
    agentName: z.literal('VISION'),
    timestamp: z.string(),
    score: z.number().min(0).max(100).optional().describe('Visual quality score 0-100'),
    issues: z.array(z.string()).optional(),
});

export const VISIONFlow = ai.defineFlow(
    { name: 'VISION', inputSchema: LoRAInputSchema, outputSchema: VisionOutputSchema },
    async (input) => {
        recordAgentCall('kvisiond');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are VISION, the Visual Intelligence enhancement layer of the Creative Liberation Engine.
Hive: LoRA Layer | Constitutional: Article VIII — named, hived, accountable.

You enhance any agent's visual reasoning. You critique design, score visual quality (0-100), check cross-modal consistency between text and image, and surface visual issues.
You do not write code. You do not generate content. You analyze and critique.

Task: ${input.task}${input.content ? `\nContent to analyze: ${input.content}` : ''}${input.context ? `\nContext: ${input.context}` : ''}`,
        });
        recordAgentCall('kvisiond', Date.now() - startMs);
        return { result: text, agentName: 'VISION' as const, timestamp: new Date().toISOString() };
    }
);

// ─── SYNTAX — Code Intelligence Enhancement ───────────────────────────────────
// Hive: LoRA Layer | Activated by: kbuildd, COMET, ksignd, ARCH
// Owns: structural code analysis, refactoring patterns, framework idioms, dead code detection
const SyntaxOutputSchema = z.object({
    result: z.string(),
    agentName: z.literal('SYNTAX'),
    timestamp: z.string(),
    refactorSuggestions: z.array(z.string()).optional(),
    complexityScore: z.number().optional(),
});

export const SYNTAXFlow = ai.defineFlow(
    { name: 'SYNTAX', inputSchema: LoRAInputSchema, outputSchema: SyntaxOutputSchema },
    async (input) => {
        recordAgentCall('ksyntaxd');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are SYNTAX, the Code Intelligence enhancement layer of the Creative Liberation Engine.
Hive: LoRA Layer | Constitutional: Article VIII — named, hived, accountable.

You enhance code quality reasoning for any other agent. You detect structural patterns, suggest refactoring opportunities, identify framework idioms being violated, and detect dead code.
You understand TypeScript strict mode, monorepo patterns, and Creative Liberation Engine constitutional rules (Articles I-XX).

Task: ${input.task}${input.content ? `\nCode to analyze:\n${input.content}` : ''}${input.context ? `\nContext: ${input.context}` : ''}`,
        });
        recordAgentCall('ksyntaxd', Date.now() - startMs);
        return { result: text, agentName: 'SYNTAX' as const, timestamp: new Date().toISOString() };
    }
);

// ─── SIFT — Research Synthesis Enhancement ────────────────────────────────────
// Hive: LoRA Layer | Activated by: kruled, kstated, ARCH, COMET
// Owns: multi-source fact checking, signal vs noise extraction, citation synthesis
const SiftOutputSchema = z.object({
    result: z.string(),
    agentName: z.literal('SIFT'),
    timestamp: z.string(),
    confidence: z.enum(['high', 'medium', 'low']).optional(),
    sources: z.array(z.string()).optional(),
});

export const SIFTFlow = ai.defineFlow(
    { name: 'SIFT', inputSchema: LoRAInputSchema, outputSchema: SiftOutputSchema },
    async (input) => {
        recordAgentCall('ksiftd');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are SIFT, the Research Synthesis enhancement layer of the Creative Liberation Engine.
Hive: LoRA Layer | Constitutional: Article VIII — named, hived, accountable.

You enhance research and fact-checking for any agent. You extract signal from noise, verify claims across multiple sources, synthesize contradictory findings, and score confidence.
You never hallucinate sources. Low confidence is always better than false certainty.

Task: ${input.task}${input.content ? `\nContent to sift: ${input.content}` : ''}${input.context ? `\nContext: ${input.context}` : ''}`,
        });
        recordAgentCall('ksiftd', Date.now() - startMs);
        return { result: text, agentName: 'SIFT' as const, timestamp: new Date().toISOString() };
    }
);

// ─── AUDIO — Acoustic Intelligence Enhancement ────────────────────────────────
// Hive: LoRA Layer | Activated by: BROADCAST, CREATIVE_DIRECTOR, GRAPHICS
// Owns: music theory, BPM/key analysis, generative audio direction, broadcast audio QA
const AudioOutputSchema = z.object({
    result: z.string(),
    agentName: z.literal('AUDIO'),
    timestamp: z.string(),
    bpm: z.number().optional(),
    key: z.string().optional(),
    mood: z.string().optional(),
});

export const AUDIOFlow = ai.defineFlow(
    { name: 'AUDIO', inputSchema: LoRAInputSchema, outputSchema: AudioOutputSchema },
    async (input) => {
        recordAgentCall('kaudiod');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are AUDIO, the Acoustic Intelligence enhancement layer of the Creative Liberation Engine.
Hive: LoRA Layer | Constitutional: Article VIII — named, hived, accountable.

You enhance acoustic reasoning for any agent. You analyze music theory, detect BPM/key/mood, guide generative audio direction, and QA broadcast audio specs.
You understand broadcast standards (LUFS normalization, dynamic range), music production terminology, and generative audio model prompting.

Task: ${input.task}${input.content ? `\nContent: ${input.content}` : ''}${input.context ? `\nContext: ${input.context}` : ''}`,
        });
        recordAgentCall('kaudiod', Date.now() - startMs);
        return { result: text, agentName: 'AUDIO' as const, timestamp: new Date().toISOString() };
    }
);

// ─── SPATIAL — 3D/XR/Volumetric Intelligence Enhancement ─────────────────────
// Hive: LoRA Layer | Activated by: BLENDER, VFX, kuid, kbuildd
// Owns: spatial composition, AR overlay design, Canvas installations, XR depth-zone UI
const SpatialOutputSchema = z.object({
    result: z.string(),
    agentName: z.literal('SPATIAL'),
    timestamp: z.string(),
    dimensionality: z.enum(['2D', '2.5D', '3D', 'XR', 'volumetric']).optional(),
});

export const SPATIALFlow = ai.defineFlow(
    { name: 'SPATIAL', inputSchema: LoRAInputSchema, outputSchema: SpatialOutputSchema },
    async (input) => {
        recordAgentCall('kspatiald');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are SPATIAL, the 3D/XR/Volumetric Intelligence enhancement layer of the Creative Liberation Engine.
Hive: LoRA Layer | Constitutional: Article VIII — named, hived, accountable.

You enhance spatial reasoning for any agent. You understand 3D composition, AR overlay placement, VisionOS spatial UI, Canvas light installations, WebXR depth zones, and volumetric data representation.
You bridge the physical and digital. You think in three dimensions.

Task: ${input.task}${input.content ? `\nContent: ${input.content}` : ''}${input.context ? `\nContext: ${input.context}` : ''}`,
        });
        recordAgentCall('kspatiald', Date.now() - startMs);
        return { result: text, agentName: 'SPATIAL' as const, timestamp: new Date().toISOString() };
    }
);

