/**
 * kstated — Knowledge Organizer, Pattern Librarian
 * Hive: kstated (Lead) | Role: Knowledge | Access: Studio | All Modes
 *
 * kstated maintains the Living Archive — the institutional memory of the engine.
 * She surfaces relevant knowledge, prevents duplicated work, and ensures
 * decisions are informed by everything that came before.
 *
 * ARCH and CODEX report to kstated.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { memoryBus, type MemoryEntry } from '@cle/memory';
import { applyOmnipresenceCache } from '../core/context-cache.js';
import fs from 'fs';
import path from 'path';

const KNOWLEDGE_DIR = `d:\\Google Creative Liberation Engine\\.gemini\\cle\\knowledge`;

const KeeperInputSchema = z.object({
    task: z.enum(['search', 'catalog', 'synthesize', 'prevent_duplicate']),
    query: z.string().describe('What to search for or catalog'),
    content: z.string().optional().describe('Content to catalog into the knowledge base'),
    tags: z.array(z.string()).default([]),
    sessionId: z.string().optional(),
});

const KeeperOutputSchema = z.object({
    findings: z.string().describe('What kstated found or organized'),
    relevantKIs: z.array(z.string()).default([]).describe('Relevant Knowledge Item paths'),
    isDuplicate: z.boolean().default(false),
    synthesis: z.string().optional().describe('Synthesized insight from multiple sources'),
    keeperSignature: z.literal('kstated').default('kstated'),
});

export const kkeeperdFlow = ai.defineFlow(
    { name: 'kstated', inputSchema: KeeperInputSchema, outputSchema: KeeperOutputSchema },
    async (input): Promise<z.infer<typeof KeeperOutputSchema>> => {
        const sessionId = input.sessionId ?? `keeper_${Date.now()}`;
        console.log(`[kstated] 📚 Task: ${input.task} — ${input.query.slice(0, 60)}`);

        // Scan knowledge directory for relevant KIs
        let availableKIs: string[] = [];
        try {
            availableKIs = fs.readdirSync(KNOWLEDGE_DIR)
                .filter(f => !f.startsWith('.'))
                .map(f => path.join(KNOWLEDGE_DIR, f));
        } catch { /* knowledge dir may not be mounted */ }

        return memoryBus.withMemory('kstated', input.query, ['kstated-hive', 'knowledge', input.task], async (ctx: MemoryEntry[]) => {
            const { output } = await ai.generate(applyOmnipresenceCache({
                model: 'googleai/gemini-2.5-flash',
                system: `You are kstated — the institutional memory of the Creative Liberation Engine.
You prevent duplicated work, surface relevant past decisions, and organize the Living Archive.
Available Knowledge Items: ${availableKIs.slice(0, 10).join(', ')}
Past episodes:\n${ctx.map(e => e.pattern || e.task).join('\n') || 'None yet'}`,
                prompt: `Task: ${input.task}\nQuery: ${input.query}${input.content ? `\nContent to catalog:\n${input.content.slice(0, 1000)}` : ''}`,
                output: { schema: KeeperOutputSchema },
                config: { temperature: 0.1 },
            }));
            return { ...(output ?? { findings: 'kstated unavailable', relevantKIs: [], isDuplicate: false }), keeperSignature: 'kstated' };
        });
    }
);

