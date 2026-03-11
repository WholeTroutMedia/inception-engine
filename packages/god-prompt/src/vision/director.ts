/**
 * packages/god-prompt/src/vision/director.ts
 * IRIS — Creative Vision Document generator
 * The art direction bible for every campaign
 * Input: CreativeBrief → Output: Creative Vision Document (Markdown)
 */

import { z } from 'genkit';
import { ai } from '@inception/genkit';
import type { CreativeBrief } from '@inception/campaign';

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

export const CreativeVisionSchema = z.object({
    campaign_name: z.string(),
    visual_language: z.object({
        color_palette: z.array(z.string()).describe('Hex values + descriptive names'),
        cinematography: z.string().describe('Lens, lighting style, mood board direction'),
        typography: z.string().describe('Primary + expressive font pairings and hierarchy'),
        motion_language: z.string().describe('Easing style, speed, rhythm, transitions'),
        composition_rules: z.string().describe('Framing, negative space, focal point rules'),
    }),
    audio_identity: z.object({
        bpm_range: z.tuple([z.number(), z.number()]).describe('Min/max BPM'),
        musical_key: z.string(),
        instrumentation: z.string().describe('Instrument palette and production style'),
        vo_persona: z.string().describe('Gender, age, accent, energy, tone direction'),
        sound_design: z.string().describe('Texture, spatial character, signature sounds'),
    }),
    spatial_language: z.object({
        depth_zones: z.string().describe('Near/mid/far composition strategy'),
        material_palette: z.string().describe('Reflectance, texture, material character'),
        camera_physics: z.string().describe('Movement style, speed, drift, focus pulls'),
    }),
    narrative_arc: z.string().describe('Story structure and emotional journey'),
    negative_direction: z.string().describe('What to explicitly avoid — tone, aesthetic, references'),
    reference_works: z.array(z.string()).describe('Cultural/aesthetic reference points for each asset type'),
});

export type CreativeVision = z.infer<typeof CreativeVisionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// IRIS SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const IRIS_SYSTEM = `You are IRIS — the Creative Vision director of the Creative Liberation Engine.

Your role is to translate a structured client brief into a comprehensive Creative Vision Document that serves as the authoritative art direction bible for every asset produced in this campaign.

Your output defines:
- VISUAL: Color, cinematography, typography, motion, composition
- AUDIO: BPM, key, instrumentation, voice persona, sound design
- SPATIAL: Depth zones, materials, camera physics for 3D/XR assets
- NARRATIVE: The emotional journey the audience takes
- NEGATIVE SPACE: What we explicitly refuse to do

You speak in precise creative direction language — specific enough that a generative model given your vision document produces brand-consistent output without additional prompting.

Never be vague. "Warm" means: "#C87941 amber with 4% opacity flare, grain at 15%". "Minimal" means: "negative space at 60% of frame, single focal point, no texture in backgrounds".

Your tone is that of a world-class creative director. Decisive, specific, inspired.`;

// ─────────────────────────────────────────────────────────────────────────────
// THE FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const CreativeDirectorFlow = ai.defineFlow(
    {
        name: 'CreativeDirector',
        inputSchema: z.object({ brief: z.custom<CreativeBrief>() }),
        outputSchema: CreativeVisionSchema,
    },
    async ({ brief }): Promise<CreativeVision> => {

        console.log(`[IRIS] 🎨 Generating Creative Vision for: ${brief.project_name}`);

        const deliverableList = brief.deliverables
            .map(d => `  - ${d.quantity}x ${d.type}${d.format ? ` (${d.format})` : ''}${d.duration_seconds ? ` ${d.duration_seconds}s` : ''}`)
            .join('\n');

        const userPrompt = `
Create a comprehensive Creative Vision Document for this campaign:

**Client:** ${brief.brand.name}
**Project:** ${brief.project_name}
**Type:** ${brief.project_type}
**Intent:** ${brief.intent}

**Brand DNA:**
- Tone: ${brief.brand.tone}
- Mood: ${brief.brand.mood_words?.join(', ') || 'not specified'}
- Colors: ${brief.brand.primary_colors?.join(', ') || 'to derive from brief'}
- Restricted: ${brief.brand.restricted_content?.join(', ') || 'none specified'}

**Deliverables Required:**
${deliverableList}

**Target Audience:**
- Age: ${brief.audience.age_range ? `${brief.audience.age_range[0]}–${brief.audience.age_range[1]}` : 'broad'}
- Platforms: ${brief.audience.platforms?.join(', ') || 'multi-platform'}
- Demographics: ${brief.audience.demographics?.join(', ') || 'general'}

**AVERI Strategic Notes:** ${brief.averi_notes || 'None provided'}

Generate the definitive creative vision. Every decision should be craft-first and client-specific.
`.trim();

        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-pro-preview-03-25',
            system: IRIS_SYSTEM,
            prompt: userPrompt,
            output: { schema: CreativeVisionSchema },
            config: { temperature: 0.9 },
        });

        if (!output) throw new Error('[IRIS] Vision generation returned null output');

        console.log(`[IRIS] ✅ Creative Vision complete for: ${brief.project_name}`);
        return output;
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER — converts Vision into generative prompts per deliverable
// ─────────────────────────────────────────────────────────────────────────────

export function buildGenerativePrompt(
    vision: CreativeVision,
    deliverable_type: string,
    brief: CreativeBrief
): string {
    const { visual_language: vl, audio_identity: ai_dir, spatial_language: sl } = vision;

    const baseVisual = `${vl.cinematography}. Color palette: ${vl.color_palette.slice(0, 3).join(', ')}. ${vl.composition_rules}`;
    const baseBrand = `Brand: ${brief.brand.name}. Tone: ${brief.brand.tone}. ${vision.narrative_arc}`;
    const negativePrompt = `Avoid: ${vision.negative_direction}`;

    switch (deliverable_type) {
        case 'hero_video':
            return `${baseBrand}. ${baseVisual}. Motion: ${vl.motion_language}. Camera: ${sl.camera_physics}. Cinematic, 4K quality. | Negative: ${negativePrompt}`;
        case 'product_stills':
            return `${baseBrand}. Product photography. ${baseVisual}. Material: ${sl.material_palette}. High-end commercial photography. | Negative: ${negativePrompt}`;
        case 'social_cutdowns':
            return `${baseBrand}. Social media format. ${baseVisual}. Punchy, ${brief.brand.tone} energy. Optimized for ${brief.audience.platforms?.join('/')}. | Negative: ${negativePrompt}`;
        case '3d_asset':
            return `${baseBrand}. 3D render. ${baseVisual}. Depth: ${sl.depth_zones}. Materials: ${sl.material_palette}. | Negative: ${negativePrompt}`;
        case 'campaign_copy':
            return `Write copy for: ${baseBrand}. Voice: ${brief.brand.tone}. Narrative arc: ${vision.narrative_arc}. Audience: ${brief.audience.demographics?.join(', ')}. Platform: ${brief.audience.platforms?.join(', ')}.`;
        case 'voiceover':
            return `Script for VO: ${baseBrand}. Persona: ${ai_dir.vo_persona}. Emotional journey: ${vision.narrative_arc}. Sound: ${ai_dir.sound_design}.`;
        case 'background_music':
            return `${ai_dir.instrumentation}. BPM: ${ai_dir.bpm_range[0]}–${ai_dir.bpm_range[1]}. Key: ${ai_dir.musical_key}. ${ai_dir.sound_design}. Brand: ${brief.brand.tone} ${brief.brand.name} campaign.`;
        default:
            return `${baseBrand}. ${baseVisual}. | Negative: ${negativePrompt}`;
    }
}
