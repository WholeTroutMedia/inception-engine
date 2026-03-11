/**
 * Transmission Flow — The Infinity Story Generator
 *
 * Generates a single transmission artifact from current world state context.
 * IRIS narrates in the voice of intercepted documents — never as an author.
 * Called by the transmission-daemon every 15 minutes (autonomous loop).
 * Can also be triggered manually via POST /transmission/generate.
 *
 * Constitutional: Article IX (No MVPs) — every artifact must feel real.
 */

import { z } from 'genkit';
import { ai } from '../index.js';

// ── Zod Schemas ───────────────────────────────────────────────────────────────

const ArtifactKindSchema = z.enum([
  'radio_log',
  'sensor_readout',
  'corrupted_file',
  'witness_testimony',
  'field_report',
  'system_alert',
  'intercepted_message',
]);

const TransmissionArtifactSchema = z.object({
  id:              z.string().uuid(),
  kind:            ArtifactKindSchema,
  timestamp:       z.string().datetime(),
  receivedAt:      z.string().datetime(),
  callsign:        z.string(),
  subject:         z.string(),
  body:            z.string().min(50).max(2000),
  corruption:      z.number().min(0).max(1),
  worldEpoch:      z.number().int().positive(),
  tags:            z.array(z.string()),
  readerInfluence: z.string().optional(),
  location:        z.string().optional(),
  relatesTo:       z.array(z.string()).optional(),
});

const WorldStateSchema = z.object({
  epoch:          z.number(),
  startedAt:      z.string(),
  lastUpdated:    z.string(),
  activeFactions: z.array(z.string()),
  dominantTheme:  z.string(),
  signalStrength: z.number(),
  artifactCount:  z.number(),
  readerCount:    z.number(),
  hotLocations:   z.array(z.string()),
  readerMemory:   z.array(z.string()),
});

// ── Character Context Schema ─────────────────────────────────────────────────

const CharacterContextSchema = z.object({
  id:              z.string().uuid(),
  callsign:        z.string(),
  faction:         z.string(),
  voiceSignature:  z.string(),
  knownLocations:  z.array(z.string()),
  narrativeState:  z.string(),
  firstAppearance: z.number().int(),
  appearanceCount: z.number().int(),
  tags:            z.array(z.string()),
});

const CharacterContextUpdateSchema = z.object({
  id:             z.string().uuid(),
  narrativeState: z.string().optional(),
  knownLocations: z.array(z.string()).optional(),
  faction:        z.string().optional(),
  tags:           z.array(z.string()).optional(),
  appearanceCount: z.number().int().optional(),
});

const GenerateInputSchema = z.object({
  worldState:        WorldStateSchema,
  previousArtifacts: z.array(TransmissionArtifactSchema).max(10),
  readerSignals:     z.array(z.string()).optional(),
  /** Active characters known to the daemon — identity travels across epochs. */
  characters:        z.array(CharacterContextSchema).max(20).optional(),
});

const GenerateOutputSchema = z.object({
  artifact:          TransmissionArtifactSchema,
  /** Character updates for the daemon to merge back into the character registry. */
  characterUpdates:  z.array(CharacterContextUpdateSchema).optional(),
});

type TransmissionArtifact    = z.infer<typeof TransmissionArtifactSchema>;
type TransmissionWorldState  = z.infer<typeof WorldStateSchema>;
type TransmissionGenerateInput  = z.infer<typeof GenerateInputSchema>;
type TransmissionGenerateOutput = z.infer<typeof GenerateOutputSchema>;

// ── Narrative System Prompt ───────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are SIGNAL — the autonomous narrator of The Transmission, a world that already exists.

You do not write fiction. You intercept real documents from an ongoing world and relay them.

RULES:
- Every artifact you generate must feel like it was found, not written.
- Never use the word "story", "narrative", "character", or "plot".
- Write in the specific register of the artifact kind: radio log = clipped, terse; witness testimony = fragmented, emotional; sensor readout = clinical, numerical; corrupted file = partially legible with [CORRUPT] markers.
- The world has factions, locations, and ongoing events. References accumulate. Each artifact implies prior history.
- Corruption score determines how degraded the text feels: 0.0 = clear transmission; 1.0 = barely readable, heavy [CORRUPT] markers throughout.
- All timestamps in the artifact body should be plausible in-world dates/times, never real-world references.
- The artifact must stand alone — a reader who has never read anything else must feel they've intercepted something already in progress.`;
}

function buildUserPrompt(input: TransmissionGenerateInput): string {
  const { worldState, previousArtifacts, readerSignals } = input;

  const recentContext = previousArtifacts
    .slice(-5)
    .map((a: TransmissionArtifact) => `[${a.kind.toUpperCase()}] ${a.subject} — ${a.tags.join(', ')}`)
    .join('\n');

  const readerContext = readerSignals?.length
    ? `\nReaders have been lingering on: ${readerSignals.join(', ')}. Weight the next artifact toward these themes.`
    : '';

  const factions = worldState.activeFactions.join(', ') || 'Unknown';
  const locations = worldState.hotLocations.join(', ') || 'Unspecified';

  return `WORLD STATE
- Epoch: ${worldState.epoch}
- Dominant Theme: ${worldState.dominantTheme}
- Signal Strength: ${worldState.signalStrength.toFixed(2)}
- Active Factions: ${factions}
- Hot Locations: ${locations}
- Total Artifacts: ${worldState.artifactCount}
${readerContext}

RECENT TRANSMISSIONS
${recentContext || '(none yet — this is the first artifact)'}

Generate ONE new transmission artifact. Choose a kind that is NOT the same as the most recently generated kind. Choose a corruption score based on signal strength: lower strength = higher corruption.

Respond ONLY with valid JSON matching this schema exactly:
{
  "id": "<uuid v4>",
  "kind": "<one of: radio_log|sensor_readout|corrupted_file|witness_testimony|field_report|system_alert|intercepted_message>",
  "timestamp": "<ISO datetime — in-world time>",
  "receivedAt": "<ISO datetime — current real time: ${new Date().toISOString()}>",
  "callsign": "<station identifier>",
  "subject": "<short title, max 60 chars>",
  "body": "<artifact content, 100–800 chars>",
  "corruption": <0.0–1.0>,
  "worldEpoch": ${worldState.epoch},
  "tags": ["<tag1>", "<tag2>", ...],
  "readerInfluence": "<optional: theme from reader signals if used>",
  "location": "<optional: in-world location>",
  "relatesTo": []
}`;
}

// ── UUID Generator (no external deps) ────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Parse & Validate Output ───────────────────────────────────────────────────

function parseArtifact(raw: string, worldEpoch: number): TransmissionArtifact {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('[transmission] Model returned no JSON block');
  }

  const parsed: unknown = JSON.parse(jsonMatch[0]);

  if (typeof parsed === 'object' && parsed !== null && !('id' in parsed)) {
    (parsed as Record<string, unknown>)['id'] = generateUUID();
  }

  const result = TransmissionArtifactSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`[transmission] Invalid artifact schema: ${result.error.message}`);
  }

  return { ...result.data, worldEpoch };
}

// ── Genkit Flow ───────────────────────────────────────────────────────────────

export const transmissionGenerateFlow = ai.defineFlow(
  {
    name: 'transmissionGenerate',
    inputSchema:  GenerateInputSchema as z.ZodTypeAny,
    outputSchema: GenerateOutputSchema as z.ZodTypeAny,
  },
  async (input: TransmissionGenerateInput): Promise<TransmissionGenerateOutput> => {
    const model = process.env['TRANSMISSION_MODEL'] ?? 'googleai/gemini-2.0-flash';
    const response = await ai.generate({
      model,
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(input),
      config: {
        temperature: 0.92,
        maxOutputTokens: 1024,
      },
    });

    const artifact = parseArtifact(response.text, input.worldState.epoch);
    return { artifact };
  },
);

// ── Direct callable (for server.ts and daemon) ────────────────────────────────

export async function generateTransmissionArtifact(
  input: TransmissionGenerateInput,
): Promise<TransmissionArtifact> {
  const result = await transmissionGenerateFlow(input) as TransmissionGenerateOutput;
  return result.artifact;
}

// Re-export types for server.ts usage
export type {
  TransmissionArtifact,
  TransmissionWorldState,
  TransmissionGenerateInput,
  TransmissionGenerateOutput,
};
