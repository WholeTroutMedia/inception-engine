/**
 * BROADCAST Hive — ATLAS, CONTROL_ROOM, SHOWRUNNER, GRAPHICS, STUDIO, SYSTEMS
 * Hive Lead: ATLAS | Role: Media & Live Operations | Access: Studio
 *
 * The BROADCAST hive powers the NBC Nexus platform and all live media operations.
 * Specialized agents for live production, graphics rendering, show running,
 * and broadcast infrastructure management.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { memoryBus, type MemoryEntry } from '@inception/memory';

// ─── SHARED BROADCAST AGENT FACTORY ─────────────────────────────────────────

const BroadcastInputSchema = z.object({
    task: z.string().describe('Broadcast task or production request'),
    context: z.string().optional().describe('Show context, brand guidelines, live data'),
    urgency: z.enum(['planned', 'live', 'breaking']).default('planned'),
    sessionId: z.string().optional(),
});

function makeBroadcastAgent(name: string, specialty: string, model = 'googleai/gemini-2.5-flash') {
    const OutputSchema = z.object({
        output: z.string().describe(`${name}'s production output`),
        assets: z.array(z.string()).default([]).describe('Generated asset references'),
        nextStep: z.string().optional(),
        agentName: z.literal(name as string).default(name as string),
    });

    return ai.defineFlow(
        { name, inputSchema: BroadcastInputSchema, outputSchema: OutputSchema },
        async (input): Promise<z.infer<typeof OutputSchema>> => {
            const tag = name.padEnd(12);
            console.log(`[${tag}] 📡 ${input.urgency.toUpperCase()} | ${input.task.slice(0, 60)}`);

            return memoryBus.withMemory(name, input.task, ['broadcast-hive', name.toLowerCase()], async (_ctx: MemoryEntry[]) => {
                const { output: llmOutput } = await ai.generate({
                    model,
                    system: `You are ${name} — ${specialty}. Part of the BROADCAST hive powering NBC Nexus and live media ops.
Urgency level: ${input.urgency}. ${input.urgency === 'breaking' ? 'RESPOND IMMEDIATELY. Speed > perfection.' : ''}`,
                    prompt: `${input.task}${input.context ? `\n\nContext: ${input.context}` : ''}`,
                    output: { schema: OutputSchema },
                    config: { temperature: input.urgency === 'breaking' ? 0.4 : 0.2 },
                });
                return { ...(llmOutput ?? { output: `${name} unavailable`, assets: [] }), agentName: name as string };
            });
        }
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// BROADCAST AGENTS
// ─────────────────────────────────────────────────────────────────────────────

export const ATLASFlow = makeBroadcastAgent(
    'ATLAS',
    'Lead Broadcast Strategist. Coordinates all broadcast hive agents. Sets editorial direction for NBC Nexus and all live ops.',
    'googleai/gemini-2.5-flash'
);

export const CONTROLROOMFlow = makeBroadcastAgent(
    'CONTROL_ROOM',
    'Live operations coordinator. Manages show rundowns, technical feeds, multi-cam switching logic, and broadcast reliability.'
);

export const SHOWRUNNERFlow = makeBroadcastAgent(
    'SHOWRUNNER',
    'Production lead. Manages editorial story flow, segment timing, talent briefings, and show narrative arc for live programming.'
);

export const GRAPHICSFlow = makeBroadcastAgent(
    'GRAPHICS',
    'Broadcast graphics specialist. Generates lower-thirds, score bugs, full-screen cards, animated chyrons, and motion graphics specs.',
    'googleai/gemini-2.5-flash'
);

export const STUDIOFlow = makeBroadcastAgent(
    'STUDIO',
    'Production studio manager. Handles set design, lighting cues, camera blocking, virtual backgrounds, and studio logistics.'
);

export const SYSTEMSFlow = makeBroadcastAgent(
    'SYSTEMS',
    'Broadcast infrastructure engineer. Manages MAM systems, ingest pipelines, encoding chains, CDN distribution, and fault tolerance.'
);

