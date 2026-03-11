/**
 * Foley Brief Extractor — Helix G: Foley Intelligence Auto-Score
 *
 * Given a visual description (style, mood, motion brief), extracts a structured
 * CampaignBrief that the foley-engine can use to generate cinema-quality audio.
 *
 * Every visual artifact now has an audio identity from birth.
 * Not "add music later." Intent-native sound.
 *
 * Constitutional: Article IX (No MVPs — audio intent is part of the output,
 *                 not an afterthought), Article XX (non-blocking — runs in
 *                 parallel with visual generation).
 */

import { z } from 'genkit';
import { ai } from '../index.js';

// ── Foley Brief Schema ────────────────────────────────────────────────────────

export const FoleyBriefSchema = z.object({
    /** Descriptive title for the audio piece — derived from visual context. */
    title:          z.string(),
    /** Mood of the audio — must drive the visual's emotional pacing. */
    mood:           z.enum(['energetic', 'calm', 'dramatic', 'ambient', 'upbeat']),
    /** Musical genre or audio texture. e.g. "cinematic orchestral", "lo-fi ambient", "industrial noise". */
    genre:          z.string(),
    /** Target BPM. Derived from motion pace. */
    bpm:            z.number().int().min(40).max(200).optional(),
    /** Seconds — matches the visual clip/arc duration. */
    durationSec:    z.number().min(1),
    /** Specific instruments or sound elements to feature. */
    instruments:    z.array(z.string()),
    /**
     * Spatial/temporal audio events to sync with visual moments.
     * e.g. "Impact hit at 4s when the cut occurs", "drone builds to peak at 12s"
     */
    syncPoints:     z.array(z.object({
        atSecond: z.number(),
        event:    z.string(),
    })).optional(),
    /** Whether to include ambient foley texture (footsteps, environment, room tone). */
    includeAmbient: z.boolean().default(true),
});

export type FoleyBrief = z.infer<typeof FoleyBriefSchema>;

// ── Extraction flow ────────────────────────────────────────────────────────────

function buildFoleyExtractionPrompt(
    style: string,
    mood: string,
    format: string,
    durationSec: number,
    motionBrief?: string,
): string {
    return `You are FOLEY — the audio intelligence of the Creative Liberation Engine.

Given a visual description, extract a precise audio brief. Every visual has an inherent sound identity.
Your job: surface it.

VISUAL CONTEXT:
- Style: ${style}
- Mood: ${mood}
- Format: ${format} (${format === 'vertical' ? 'portrait, mobile-first' : 'cinematic widescreen'})
- Duration: ${durationSec} seconds
${motionBrief ? `- Motion: ${motionBrief}` : ''}

RULES:
1. BPM must match the visual's pacing. Fast motion = higher BPM. Slow push = lower.
2. Instruments must be specific. Not "strings" — "tremolo cellos" or "high legato violins".
3. Mood must match the visual's emotional register precisely. Violent contrast = dissonance (only if intentional).
4. syncPoints mark the beat-level connection between audio and visual events. Be specific.
5. Never generate generic. Name the exact sound world.

Respond ONLY with valid JSON matching the FoleyBrief schema:
{
  "title": "<audio piece title>",
  "mood": "energetic|calm|dramatic|ambient|upbeat",
  "genre": "<specific genre/texture>",
  "bpm": <number>,
  "durationSec": ${durationSec},
  "instruments": ["<instrument>", ...],
  "syncPoints": [{"atSecond": <n>, "event": "<audio event>"}],
  "includeAmbient": true|false
}`;
}

/**
 * Extract a FoleyBrief from a visual prompt.
 * Lightweight — uses gemini-flash for speed. Runs in parallel with visual generation.
 *
 * @param style - Visual style directive (e.g. "neon-noir", "golden-hour")
 * @param mood - Visual mood (e.g. "aggressive", "cinematic")
 * @param format - Aspect ratio format
 * @param durationSec - Duration to match
 * @param motionBrief - Optional camera/motion description for sync accuracy
 */
export async function extractFoleyBrief(
    style: string,
    mood: string,
    format: string,
    durationSec: number,
    motionBrief?: string,
): Promise<FoleyBrief | null> {
    try {
        const { text } = await ai.generate({
            model:  'googleai/gemini-2.5-flash',
            prompt: buildFoleyExtractionPrompt(style, mood, format, durationSec, motionBrief),
            config: { temperature: 0.4, maxOutputTokens: 512 },
        });

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const result = FoleyBriefSchema.safeParse(JSON.parse(jsonMatch[0]));
        if (!result.success) {
            console.warn('[FOLEY] Brief schema validation failed:', result.error.message);
            return null;
        }

        console.log(`[FOLEY] ✅ Brief extracted | "${result.data.title}" | ${result.data.mood} | ${result.data.bpm ?? '?'}bpm`);
        return result.data;
    } catch (err) {
        console.warn('[FOLEY] Brief extraction failed (non-critical):', err);
        return null;
    }
}
