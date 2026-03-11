/**
 * packages/god-prompt/src/loras/audio.ts
 * AUDIO LoRA — acoustic direction generator for campaigns
 * Generates precise music direction + VO persona for AUDIO assets
 */

import { z } from 'genkit';
import { ai } from '@inception/genkit';


export const AudioDirectionSchema = z.object({
    bpm_range: z.tuple([z.number(), z.number()]),
    musical_key: z.string(),
    instrumentation: z.string(),
    production_style: z.string(),
    vo_persona: z.object({
        gender: z.enum(['male', 'female', 'neutral']),
        age: z.enum(['young', 'middle_aged', 'mature']),
        accent: z.string(),
        energy: z.enum(['calm', 'warm', 'authoritative', 'energetic', 'intimate']),
        tone_descriptors: z.array(z.string()),
    }),
    sound_design: z.string(),
    lyria_prompt: z.string().describe('Ready-to-use Lyria music generation prompt'),
    elevenlabs_direction: z.string().describe('Ready-to-use ElevenLabs voice direction'),
});

export type AudioDirection = z.infer<typeof AudioDirectionSchema>;

const AudioInputSchema = z.object({
    brief_intent: z.string(),
    brand_tone: z.string(),
    project_type: z.string(),
    audience_age_range: z.tuple([z.number(), z.number()]).optional(),
    platforms: z.array(z.string()).optional(),
    visual_language_summary: z.string().optional(),
});

type AudioInput = z.infer<typeof AudioInputSchema>;

const AUDIO_LORA_SYSTEM = `You are the AUDIO LoRA — an acoustic intelligence enhancement layer for the Creative Liberation Engine.

You translate creative briefs and visual direction into precise audio production specifications.

You speak the language of music production:
- BPM ranges tied to emotional tempo (not generic: "upbeat" = 118–126 BPM, "contemplative" = 64–80 BPM)
- Musical keys tied to emotional color (E major = bright/energetic, D minor = melancholic/cinematic, G major = warm/accessible)
- Instrumentation palettes specific enough to generate (not "electronic" but "analog synth pads with 808 sub, lo-fi vinyl texture at 40% wet")

Your output goes directly to Lyria (music) and ElevenLabs (VO) as generation prompts.`;

export const AudioDirectorFlow = ai.defineFlow(
    {
        name: 'AudioDirector',
        inputSchema: AudioInputSchema,
        outputSchema: AudioDirectionSchema,
    },
    async (input: AudioInput): Promise<AudioDirection> => {
        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-pro-preview-03-25',
            system: AUDIO_LORA_SYSTEM,
            prompt: `Generate complete audio direction for this campaign:

Brief: ${input.brief_intent}
Brand tone: ${input.brand_tone}
Project type: ${input.project_type}
Audience: ${input.audience_age_range ? `${input.audience_age_range[0]}–${input.audience_age_range[1]} years` : 'broad'}
Platforms: ${input.platforms?.join(', ') ?? 'multi-platform'}
Visual direction: ${input.visual_language_summary ?? 'not specified'}

Generate precise, production-ready audio direction. Include a ready-to-use Lyria prompt and ElevenLabs persona direction.`,
            output: { schema: AudioDirectionSchema },
            config: { temperature: 0.8 },
        });

        if (!output) throw new Error('[AUDIO LoRA] null output from direction flow');
        return output;
    }
);
