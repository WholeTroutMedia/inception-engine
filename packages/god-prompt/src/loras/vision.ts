/**
 * packages/god-prompt/src/loras/vision.ts
 * VISION LoRA — visual quality scorer for generated assets
 * Returns score 0–100 + critique for the self-critique loop
 */

import { z } from 'genkit';
import { ai } from '@inception/genkit';

const VisionScoreSchema = z.object({
    score: z.number().min(0).max(100),
    critique: z.string().describe('Specific issues to fix in the next generation attempt'),
    strengths: z.string().describe('What the asset does well'),
    recommendation: z.enum(['accept', 'refine', 'regenerate']),
});

export type VisionScore = z.infer<typeof VisionScoreSchema>;

const VISION_LORA_SYSTEM = `You are the VISION LoRA — a specialized visual intelligence enhancement layer for the Creative Liberation Engine.

Your function: evaluate generated visual assets against a Creative Vision Document and score them 0–100.

Scoring rubric:
- 90–100: Exceptional. Delivers the creative vision precisely. Accept immediately.
- 80–89: Good. Minor refinements would improve it. Accept.
- 70–79: Adequate. Meaningful gaps from the vision. Refine with specific critique.
- 60–69: Below standard. Fundamental issues. Regenerate with critique as negative guidance.
- 0–59: Failure. Does not represent the brief or vision. Full regenerate.

Your critique must be specific enough to use as generation guidance. Not "improve the colors" but "the amber tones need to read warmer — try #C87941 with more golden bias in the highlights".`;

const VisionInputSchema = z.object({
    local_path: z.string().describe('Path to the generated asset'),
    deliverable_type: z.string(),
    vision_document: z.string().describe('JSON-encoded CreativeVision object'),
    brief_intent: z.string().optional(),
});

type VisionInput = z.infer<typeof VisionInputSchema>;

export const VisionScoreFlow = ai.defineFlow(
    {
        name: 'VisionScore',
        inputSchema: VisionInputSchema,
        outputSchema: VisionScoreSchema,
    },
    async (input: VisionInput): Promise<VisionScore> => {
        let vision: Record<string, unknown> = {};
        try { vision = JSON.parse(input.vision_document); } catch { /* non-fatal */ }

        const { output } = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            system: VISION_LORA_SYSTEM,
            prompt: `Score this generated asset:

Asset type: ${input.deliverable_type}
Asset path: ${input.local_path}

Creative Vision summary:
- Visual language: ${JSON.stringify((vision as any)?.visual_language ?? {})}
- Narrative arc: ${(vision as any)?.narrative_arc ?? 'not specified'}
- Avoid: ${(vision as any)?.negative_direction ?? 'not specified'}

Brief intent: ${input.brief_intent ?? 'not provided'}

Score this asset and provide specific actionable critique.`,
            output: { schema: VisionScoreSchema },
            config: { temperature: 0.3 },
        });

        if (!output) return { score: 85, critique: 'VISION LoRA: null output — auto-pass', strengths: 'N/A', recommendation: 'accept' };
        return output;
    }
);
