/**
 * guestIntelligence — Natural language query for the Presence Graph
 *
 * ATHENA-powered NLQ interface. Takes a natural language question about
 * home activity and produces a structured answer from the presence graph context.
 *
 * Examples:
 *   "Who was here last week?"
 *   "Who does Sarah always come with?"
 *   "How many unknown devices showed up this month?"
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { defaultMiddleware } from '../middleware/fallback-chain.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const GuestQueryInputSchema = z.object({
    query: z.string().describe('Natural language question about home presence activity'),
    recentEventsSummary: z.string().describe('Recent presence events as formatted text'),
    guestList: z.string().describe('Current guest roster as formatted text'),
    snapshot: z.object({
        knownGuests: z.array(z.unknown()),
        unknownDeviceCount: z.number(),
        garage: z.unknown(),
        zoneOccupancy: z.record(z.number()),
        snapshotAt: z.string(),
    }).describe('Current presence snapshot from the mesh'),
});

const GuestQueryOutputSchema = z.object({
    answer: z.string().describe('Clear, natural language answer to the query'),
    confidence: z.number().min(0).max(1).describe('Confidence in the answer based on available data'),
    dataGaps: z.array(z.string()).describe('What data is missing that would improve this answer'),
    suggestions: z.array(z.string()).describe('Follow-up questions the user might want to ask'),
});

export type GuestQueryInput = z.infer<typeof GuestQueryInputSchema>;
export type GuestQueryOutput = z.infer<typeof GuestQueryOutputSchema>;

// ─── Flow ─────────────────────────────────────────────────────────────────────

export const guestIntelligenceFlow = ai.defineFlow(
    {
        name: 'guest-intelligence',
        inputSchema: GuestQueryInputSchema,
        outputSchema: GuestQueryOutputSchema,
    },
    async (input) => {
        const { output } = await ai.generate({
            prompt: `You are ATHENA — the presence intelligence layer of a Sovereign Home Mesh.

You have access to a home's recent activity log and guest registry.

CURRENT SNAPSHOT (as of ${input.snapshot.snapshotAt}):
- Known guests currently home: ${(input.snapshot.knownGuests as unknown[]).length}
- Unknown devices detected: ${input.snapshot.unknownDeviceCount}
- Garage state: ${JSON.stringify(input.snapshot.garage)}
- Zone occupancy: ${JSON.stringify(input.snapshot.zoneOccupancy)}

GUEST ROSTER:
${input.guestList || 'No guests registered yet.'}

RECENT ACTIVITY (newest first):
${input.recentEventsSummary || 'No recent events.'}

---
USER QUESTION: ${input.query}

Answer the question using only the data provided above.
If data is insufficient, say so clearly and suggest what to look for.
Be conversational but precise. 

PRIVACY RULES:
- Do not speculate about private activities
- Do not identify unknown persons beyond their device fingerprint
- Treat all presence data as sovereign household intelligence`,
            output: { schema: GuestQueryOutputSchema },
            use: defaultMiddleware(),
        });

        if (!output) {
            return {
                answer: "I don't have enough context to answer that right now. The presence graph may not have sufficient data yet.",
                confidence: 0.1,
                dataGaps: ['Presence graph may be empty or unavailable'],
                suggestions: ['Try asking after more activity has been recorded.'],
            };
        }

        return output;
    }
);
