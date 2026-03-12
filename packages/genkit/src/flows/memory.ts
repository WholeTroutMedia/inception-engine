/**
 * Creative Liberation Engine v5 — Memory Flows
 *
 * Implements the vt220 klogd mode memory extraction pattern
 * and the Genkit flows for recalling and committing to the memory bus.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import {
    memoryBus,
    MemoryEntrySchema,
    MemoryQuerySchema,
    MemoryWriteSchema,
} from '@cle/memory';

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN EXTRACTION — klogd (vt220 memory mode)
// ─────────────────────────────────────────────────────────────────────────────

async function extractPattern(task: string, outcome: string): Promise<string> {
    try {
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are vt220 klogd mode. Extract a single reusable principle ("The Why") from this completed task.

Task: ${task}
Outcome: ${outcome}

Return ONE sentence in the format: "When [context], [action] because [reason]."
Be concrete and generalizable. This becomes permanent knowledge.`,
            config: { temperature: 0.2, maxOutputTokens: 100 },
        });
        return text || 'Pattern extraction unavailable.';
    } catch {
        return 'Pattern extraction skipped — model unavailable.';
    }
}

// Inject the pattern extractor into the memoryBus so it doesn't need to depend on Genkit
// This breaks the physical module dependency cycle.
// Adapter: extractPattern(task, outcome) -> (content) => string[]
memoryBus.setPatternExtractor((content) => extractPattern('', content).then((r) => (r ? [r] : [])));

// ─────────────────────────────────────────────────────────────────────────────
// GENKIT FLOWS — callable via Genkit runtime
// ─────────────────────────────────────────────────────────────────────────────

export const RecallMemoryFlow = ai.defineFlow(
    { name: 'RecallMemory', inputSchema: MemoryQuerySchema, outputSchema: z.array(MemoryEntrySchema) },
    async (input) => memoryBus.recall(input)
);

export const CommitMemoryFlow = ai.defineFlow(
    { name: 'CommitMemory', inputSchema: MemoryWriteSchema, outputSchema: MemoryEntrySchema },
    async (input) => memoryBus.commit(input)
);

export { memoryBus } from '@cle/memory';
export type { MemoryBus } from '@cle/memory';

