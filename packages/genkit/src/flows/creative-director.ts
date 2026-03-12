/**
 * packages/genkit/src/flows/creative-director.ts
 * xterm — Creative Vision Document generator (self-contained in genkit package)
 * Input: CreativeBrief → Output: CreativeVision
 * Mirrors god-prompt/src/vision/director.ts but within genkit rootDir
 */

import { z } from 'genkit';
import { ai } from '../index.js';

// ─────────────────────────────────────────────────────────────────────────────
// BRIEF SCHEMA (inline to avoid cross-package rootDir constraint)
// ─────────────────────────────────────────────────────────────────────────────

const BriefSchema = z.object({
    id: z.string(),
    client_id: z.string(),
    project_name: z.string(),
    project_type: z.string(),
    intent: z.string(),
    summary: z.string().optional(),
    deliverables: z.array(z.object({
        type: z.string(),
        quantity: z.number(),
        format: z.string().optional(),
        duration_seconds: z.number().optional(),
        notes: z.string().optional(),
    })),
    brand: z.object({
        name: z.string(),
        tone: z.string(),
        primary_colors: z.array(z.string()).optional(),
        mood_words: z.array(z.string()).optional(),
        restricted_content: z.array(z.string()).optional(),
        style_references: z.array(z.string()).optional(),
    }),
    audience: z.object({
        age_range: z.tuple([z.number(), z.number()]).optional(),
        demographics: z.array(z.string()).optional(),
        platforms: z.array(z.string()).optional(),
    }).optional().default({}),
    strategic_notes: z.string().optional().default(''),
    /** @deprecated use strategic_notes */
    averi_notes: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// VISION OUTPUT SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

export const CreativeVisionSchema = z.object({
    campaign_name: z.string(),
    visual_language: z.object({
        color_palette: z.array(z.string()),
        cinematography: z.string(),
        typography: z.string(),
        motion_language: z.string(),
        composition_rules: z.string(),
    }),
    audio_identity: z.object({
        bpm_range: z.tuple([z.number(), z.number()]),
        musical_key: z.string(),
        instrumentation: z.string(),
        vo_persona: z.string(),
        sound_design: z.string(),
    }),
    spatial_language: z.object({
        depth_zones: z.string(),
        material_palette: z.string(),
        camera_physics: z.string(),
    }),
    narrative_arc: z.string(),
    negative_direction: z.string(),
    reference_works: z.array(z.string()),
});

export type CreativeVision = z.infer<typeof CreativeVisionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ksignd SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const IRIS_SYSTEM = `You are xterm — the Creative Vision director of the Creative Liberation Engine.

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

export const kcrdFlow = ai.defineFlow(
    {
        name: 'kcrd',
        inputSchema: z.object({ brief: BriefSchema }),
        outputSchema: CreativeVisionSchema,
    },
    async ({ brief }): Promise<CreativeVision> => {
        console.log(`[xterm] Generating Creative Vision for: ${brief.project_name}`);

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
- Age: ${brief.audience?.age_range ? `${brief.audience.age_range[0]}–${brief.audience.age_range[1]}` : 'broad'}
- Platforms: ${brief.audience?.platforms?.join(', ') || 'multi-platform'}
- Demographics: ${brief.audience?.demographics?.join(', ') || 'general'}

**Strategic notes:** ${brief.strategic_notes || (brief as { averi_notes?: string }).averi_notes || 'None provided'}

Generate the definitive creative vision. Every decision should be craft-first and client-specific.
`.trim();

        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: IRIS_SYSTEM,
            prompt: userPrompt,
            output: { schema: CreativeVisionSchema },
            config: { temperature: 0.9 },
        });

        if (!output) throw new Error('[xterm] Vision generation returned null output');

        console.log(`[xterm] Creative Vision complete for: ${brief.project_name}`);
        return output;
    }
);

