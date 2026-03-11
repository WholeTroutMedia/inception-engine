/**
 * packages/god-prompt/src/loras/spatial.ts
 * SPATIAL LoRA — volumetric / 3D / XR composition director
 * Generates 3D scene direction for spatial and XR deliverables
 */

import { z } from 'genkit';
import { ai } from '@inception/genkit';

export const SpatialDirectionSchema = z.object({
    depth_zones: z.object({
        near: z.string().describe('0–2m zone — what lives here'),
        mid: z.string().describe('2–6m zone — primary subject territory'),
        far: z.string().describe('6m+ zone — background environment'),
    }),
    material_palette: z.object({
        primary_material: z.string(),
        secondary_material: z.string(),
        surface_finish: z.enum(['matte', 'semi-gloss', 'gloss', 'metallic', 'translucent', 'rough']),
        reflectance: z.string(),
        texture_notes: z.string(),
    }),
    camera_physics: z.object({
        movement_style: z.enum(['static', 'drift', 'orbit', 'push_pull', 'handheld_subtle', 'cinematic_crane']),
        focal_length: z.string(),
        depth_of_field: z.enum(['deep', 'medium', 'shallow', 'rack_focus']),
        speed: z.enum(['slow', 'medium', 'fast', 'variable']),
    }),
    lighting_rig: z.object({
        key_light: z.string(),
        fill_light: z.string(),
        rim_light: z.string(),
        ambient: z.string(),
        color_temperature: z.string(),
    }),
    tripo_prompt: z.string().describe('Ready-to-use TripoSR / 3D generation prompt'),
});

export type SpatialDirection = z.infer<typeof SpatialDirectionSchema>;

const SpatialInputSchema = z.object({
    brief_intent: z.string(),
    brand_tone: z.string(),
    deliverable_type: z.string(),
    visual_language_summary: z.string().optional(),
});

type SpatialInput = z.infer<typeof SpatialInputSchema>;

const SPATIAL_LORA_SYSTEM = `You are the SPATIAL LoRA — a 3D/volumetric intelligence enhancement layer for the Creative Liberation Engine.

You translate creative briefs into precise spatial composition specifications for 3D rendering, AR overlay design, XR experiences, and depth-zone UI.

You speak in the language of:
- Virtual production depth zones (not "background" but "6m+ zone: atmospheric haze, volumetric fog at 30%")
- Material science (not "metal" but "brushed titanium with 0.4 metalness, 0.1 roughness, directional grain at 45°")
- Cinematography physics (not "wide shot" but "24mm simulated focal length, 0.3% barrel distortion correction")
- Practical lighting rigs (not "warm" but "3200K key at camera-right, 5600K fill at 50% intensity, copper practical rim")`;

export const SpatialDirectorFlow = ai.defineFlow(
    {
        name: 'SpatialDirector',
        inputSchema: SpatialInputSchema,
        outputSchema: SpatialDirectionSchema,
    },
    async (input: SpatialInput): Promise<SpatialDirection> => {
        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-pro-preview-03-25',
            system: SPATIAL_LORA_SYSTEM,
            prompt: `Generate spatial direction for:

Brief: ${input.brief_intent}
Brand tone: ${input.brand_tone}
Asset type: ${input.deliverable_type}
Visual direction: ${input.visual_language_summary ?? 'not specified'}

Include a ready-to-use TripoSR/3D generation prompt at the end.`,
            output: { schema: SpatialDirectionSchema },
            config: { temperature: 0.8 },
        });

        if (!output) throw new Error('[SPATIAL LoRA] null output');
        return output;
    }
);
