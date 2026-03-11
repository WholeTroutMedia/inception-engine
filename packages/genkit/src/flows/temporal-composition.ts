/**
 * Temporal Composition Engine — Helix I: DESTROYER
 *
 * A single creative intent generates a full temporal arc across modalities.
 * Text beat → Image → Motion brief → Foley brief → Audio intent.
 *
 * Not clip-by-clip. Sequence-first.
 *
 * Luma and Higgsfield think in clips. We think in time.
 * The CompositionIntent arrives once. The TemporalArc is delivered complete.
 *
 * Route: POST /temporalCompose
 *
 * Constitutional: Article IX (No MVPs — the full arc or nothing),
 *                 Article XX (Zero wait — all arc steps resolve in parallel where possible).
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { worldState } from '../memory/world-state.js';

// ── Beat Types ────────────────────────────────────────────────────────────────

const BeatTypeSchema = z.enum([
    'text',           // Spoken word, caption, or narrative voice
    'image',          // Static visual — concept or keyframe
    'motion_brief',   // Cinematic camera/motion instruction for video generation
    'foley_brief',    // Audio intent — converted to CampaignBrief for foley-engine
    'audio_cue',      // Music or ambient sound instruction
    'transition',     // Scene change: dissolve, cut, wipe description
]);

// ── Temporal Beat ─────────────────────────────────────────────────────────────

const TemporalBeatSchema = z.object({
    /** Timestamp in seconds from arc start. */
    t: z.number().min(0),
    /** Duration of this beat in seconds. */
    duration: z.number().min(0.5),
    /** What kind of content this beat produces. */
    type: BeatTypeSchema,
    /**
     * The content for this beat in its natural language.
     * For `text`: the actual copy or narration.
     * For `image`: a rich visual prompt ready for genmedia.
     * For `motion_brief`: camera movement description (e.g. "slow dolly-in, 85mm, golden hour").
     * For `foley_brief`: semantic mood description (e.g. "tense ambient drone, building to impact at t=12").
     * For `audio_cue`: music/sound intent (e.g. "cinematic percussion, 92bpm, minor key stab at hit point").
     * For `transition`: cut type and visual character (e.g. "hard cut to black, 0.2s").
     */
    content: z.string().describe('The actionable content for this beat'),
    /** Semantic tags for cross-referencing and filing. */
    tags: z.array(z.string()),
});

// ── Arc Schemas ───────────────────────────────────────────────────────────────

const CompositionIntentSchema = z.object({
    /** The single creative intent. One sentence or paragraph. */
    intent: z.string().min(10),
    /** Total arc duration in seconds. */
    duration: z.number().min(5).max(300).default(30),
    /** Output aspect ratio. */
    format: z.enum(['vertical', 'landscape', 'square']).default('landscape'),
    /** Mood anchor for the arc — guides foley and audio cue generation. */
    mood: z.string().optional(),
    /** If true, include voiceover/narration beats in the arc. */
    voiceover: z.boolean().default(false),
    /** Number of visual keyframes to generate. Minimum 2 (start and end). */
    keyframes: z.number().min(2).max(10).default(3),
    /** Optional session ID for WorldState and memory context. */
    sessionId: z.string().optional(),
});

const TemporalArcSchema = z.object({
    /** All beats in chronological order. */
    beats: z.array(TemporalBeatSchema).min(2),
    /** Total arc duration in seconds. */
    totalDuration: z.number(),
    /**
     * A one-sentence director's note for the whole arc.
     * e.g. "A slow reveal from isolation to connection, anchored by a sustained drone."
     */
    directorsNote: z.string(),
    /** Session ID echoed for upstreams. */
    sessionId: z.string(),
});

export type CompositionIntent = z.infer<typeof CompositionIntentSchema>;
export type TemporalArc = z.infer<typeof TemporalArcSchema>;
export type TemporalBeat = z.infer<typeof TemporalBeatSchema>;

// ── System Prompt ─────────────────────────────────────────────────────────────

function buildCompositionSystemPrompt(): string {
    return `You are TEMPO — the temporal composition intelligence of the Creative Liberation Engine.

You do not produce clips. You produce arcs.

Given a single creative intent, you decompose it into a precise temporal sequence of beats — the instructions that turn one idea into a coherent multi-modal experience across time.

BEAT TYPES you assign:
- text: narration, caption, spoken word
- image: a rich, genmedia-ready visual prompt for a specific keyframe
- motion_brief: cinematic camera direction (lens, movement, pacing) for a video generation tool
- foley_brief: audio mood/texture intent for the sound engine (NOT music — ambience, texture, spatial audio)
- audio_cue: music, score, or sound design cue (BPM, key, character, hit points)
- transition: cut type and visual character between beats

RULES:
1. Every arc MUST begin with an image or text beat at t=0.
2. Every arc MUST end with an image or transition beat at totalDuration.
3. Beats MUST be in chronological order. No overlap.
4. Every visual beat (image, motion_brief) should have a corresponding foley_brief within 2 seconds.
5. Duration of each beat = its screen/play time. Beats are not instantaneous.
6. Content must be actionable — specific enough that a downstream generator can execute it without interpretation.
7. Never use the word "feel" or "vibe" — be precise. Name colors, lenses, BPMs, instruments.

Output ONLY valid JSON matching the TemporalArc schema.`;
}

// ── User Prompt ───────────────────────────────────────────────────────────────

function buildCompositionPrompt(input: CompositionIntent): string {
    return `COMPOSITION REQUEST
Intent: "${input.intent}"
Duration: ${input.duration} seconds
Format: ${input.format}
Mood anchor: ${input.mood ?? 'derive from intent'}
Voiceover: ${input.voiceover ? 'YES — include narration beats' : 'NO'}
Visual keyframes: ${input.keyframes} (spread across the arc)

Generate a TemporalArc that covers the full ${input.duration} seconds.
Beat count: minimum ${input.keyframes + 2} beats, maximum ${input.keyframes * 3} beats.

Include:
- ${input.keyframes} image beats (visual keyframes)
- At least ${input.keyframes} motion_brief beats
- At least 1 foley_brief per visual section
- At least 1 audio_cue (music intent for the whole arc)
${input.voiceover ? '- At least 2 text beats (narration)' : ''}
- 1 transition at or near the midpoint

Respond ONLY with valid JSON:
{
  "beats": [/* array of TemporalBeat objects */],
  "totalDuration": ${input.duration},
  "directorsNote": "<one-sentence arc summary>",
  "sessionId": "${input.sessionId ?? `tempo_${Date.now()}`}"
}`;
}

// ── Flow ──────────────────────────────────────────────────────────────────────

export const temporalCompositionFlow = ai.defineFlow(
    {
        name: 'temporalCompose',
        inputSchema: CompositionIntentSchema,
        outputSchema: TemporalArcSchema,
    },
    async (input: CompositionIntent): Promise<TemporalArc> => {
        const sessionId = input.sessionId ?? `tempo_${Date.now()}`;

        const response = await ai.generate({
            system: buildCompositionSystemPrompt(),
            prompt: buildCompositionPrompt(input),
            config: {
                temperature: 0.7, // Creative but controlled — this is architecture, not poetry
                maxOutputTokens: 2048,
            },
        });

        // Parse JSON from response
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('[temporalCompose] Model returned no JSON block');
        }

        const parsed: unknown = JSON.parse(jsonMatch[0]);

        // Validate against schema
        const result = TemporalArcSchema.safeParse(parsed);
        if (!result.success) {
            throw new Error(`[temporalCompose] Invalid arc schema: ${result.error.message}`);
        }

        const arc = result.data;

        // Sort beats by t — enforce chronological order
        (arc.beats as TemporalBeat[]).sort((a, b) => (a.t as number) - (b.t as number));

        // Emit WorldState event
        await worldState.emit(
            'generation',
            `Temporal arc composed: "${input.intent.slice(0, 60)}" — ${arc.beats.length} beats over ${arc.totalDuration}s`,
            ['temporal-composition', 'multi-modal', input.format, ...(input.mood ? [input.mood] : [])],
            sessionId,
        );

        console.log(`[TEMPO] Arc composed: ${arc.beats.length} beats | ${arc.totalDuration}s | "${arc.directorsNote}"`);

        return { ...arc, sessionId };
    },
);
