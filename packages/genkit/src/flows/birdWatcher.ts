/**
 * birdWatcher — Gemini Vision bird species identification flow
 *
 * Accepts a base64-encoded camera frame from Frigate and returns:
 * - Species identification (bird or security object)
 * - Confidence score
 * - Naturalist notes
 * - Security flag (true if person/vehicle detected)
 *
 * Dual purpose: naturalist log + security classification.
 * Constitutional: Article I — images processed locally, no third-party storage.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { defaultMiddleware } from '../middleware/fallback-chain.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const BirdWatcherInputSchema = z.object({
    imageBase64: z.string().describe('Base64-encoded JPEG frame from Frigate camera'),
    cameraId: z.string().describe('Camera ID, e.g. feeder-front, driveway'),
    timestamp: z.string().describe('ISO 8601 timestamp of frame capture'),
});

const BirdWatcherOutputSchema = z.object({
    species: z.string().describe('Common name of identified species, e.g. "American Robin" or "Unknown Bird"'),
    scientificName: z.string().optional().describe('Scientific name if identifiable'),
    confidence: z.number().min(0).max(1).describe('Identification confidence 0–1'),
    notes: z.string().describe('Naturalist description: plumage, behavior, or security observation notes'),
    isSecurity: z.boolean().describe('True if a person or vehicle is the primary subject instead of wildlife'),
    securityLabel: z.string().optional().describe('If isSecurity is true: "person", "car", "truck", etc.'),
});

export type BirdWatcherInput = z.infer<typeof BirdWatcherInputSchema>;
export type BirdWatcherOutput = z.infer<typeof BirdWatcherOutputSchema>;

// ─── Flow ─────────────────────────────────────────────────────────────────────

export const birdWatcherFlow = ai.defineFlow(
    {
        name: 'bird-watcher',
        inputSchema: BirdWatcherInputSchema,
        outputSchema: BirdWatcherOutputSchema,
    },
    async (input) => {
        const { output } = await ai.generate({
            prompt: [
                {
                    text: `You are WREN — a sovereign home naturalist and security AI.

You are analyzing a frame from camera: ${input.cameraId}, captured at ${input.timestamp}.

Your primary task:
1. Identify any birds present by species (common and scientific name)
2. Note behavior and plumage characteristics for a naturalist field log
3. If you see a person, vehicle, or other security-relevant subject instead of wildlife, mark isSecurity as true

IMPORTANT RULES:
- Provide confidence as a decimal 0.0 to 1.0 (not a percentage)
- If the frame is empty or ambiguous, species = "Unidentified" and confidence = 0.1
- If a security object is detected, set isSecurity = true and notes should describe what you see
- Be concise but scientifically accurate
- Never transmit any personal identifying information about humans visible in frame (privacy — Article I)`
                },
                {
                    media: {
                        url: `data:image/jpeg;base64,${input.imageBase64}`,
                        contentType: 'image/jpeg',
                    }
                }
            ],
            output: { schema: BirdWatcherOutputSchema },
            use: defaultMiddleware(),
        });

        if (!output) {
            return {
                species: 'Unidentified',
                confidence: 0.1,
                notes: 'Vision analysis unavailable — frame logged for manual review',
                isSecurity: false,
            };
        }

        return output;
    }
);
