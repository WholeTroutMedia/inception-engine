/**
 * Context Pager — SC-03
 * MemGPT-style STM/LTM split for Creative Liberation Engine conversations.
 *
 * Monitors token usage as Genkit middleware. When conversation exceeds 80%
 * of token budget:
 *   1. Takes oldest N turns
 *   2. Runs summarization flow → 3-5 key facts
 *   3. Writes summary to ChromaDB episodic collection via scribeRemember
 *   4. Removes those turns from the prompt stack
 *   5. Injects a [CONTEXT-COMPRESSED] marker so agents know this happened
 *
 * Budget defaults: 100k tokens (Gemini 2.5 Pro ceiling), 80% trigger = 80k.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { scribeRemember } from './scribe.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ConversationTurn {
    role: 'user' | 'model' | 'system';
    content: string;
    tokenCount?: number;
}

export interface PageResult {
    paged: boolean;
    turnsRemoved: number;
    summaryId?: string;
    compressionMarker?: string;
    remainingTurns: ConversationTurn[];
    tokensBefore: number;
    tokensAfter: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN ESTIMATION (fast approximation — no API call needed)
// ─────────────────────────────────────────────────────────────────────────────

const AVG_CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
    return Math.ceil(text.length / AVG_CHARS_PER_TOKEN);
}

export function estimateTurnTokens(turns: ConversationTurn[]): number {
    return turns.reduce((sum, t) => sum + (t.tokenCount ?? estimateTokens(t.content)), 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARIZATION FLOW
// ─────────────────────────────────────────────────────────────────────────────

async function summarizeTurns(turns: ConversationTurn[], sessionId: string): Promise<string> {
    const transcript = turns
        .filter(t => t.role !== 'system')
        .map(t => `${t.role.toUpperCase()}: ${t.content}`)
        .join('\n\n');

    try {
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: `You are VERA's Context Compressor. Extract the 3-5 most important facts, decisions, or patterns from this conversation segment that must not be forgotten. Format as a numbered list. Be extremely concise — each item max 2 sentences.`,
            prompt: `Compress this conversation segment:\n\n${transcript.slice(0, 8000)}`,
            config: { temperature: 0.1, maxOutputTokens: 400 },
        });
        return text ?? 'Context compressed — details unavailable.';
    } catch {
        return `Session ${sessionId} compressed at ${new Date().toISOString()} — ${turns.length} turns archived.`;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT PAGER — MAIN FUNCTION (SC-03)
// ─────────────────────────────────────────────────────────────────────────────

export async function pageContext(
    turns: ConversationTurn[],
    options: {
        tokenBudget?: number;     // Default: 100_000 tokens
        triggerAt?: number;       // Default: 0.80 (80%)
        turnsToPage?: number;     // How many oldest turns to remove. Default: oldest 25%
        sessionId?: string;
        agentName?: string;
    } = {}
): Promise<PageResult> {
    const {
        tokenBudget = 100_000,
        triggerAt = 0.80,
        turnsToPage,
        sessionId = `session_${Date.now()}`,
        agentName = 'CONTEXT-PAGER',
    } = options;

    const triggerTokens = Math.floor(tokenBudget * triggerAt);
    const tokensBefore = estimateTurnTokens(turns);

    // Not at threshold yet — nothing to do
    if (tokensBefore < triggerTokens) {
        return {
            paged: false,
            turnsRemoved: 0,
            remainingTurns: turns,
            tokensBefore,
            tokensAfter: tokensBefore,
        };
    }

    console.log(`[CONTEXT-PAGER] 📄 Token budget at ${Math.round((tokensBefore / tokenBudget) * 100)}% — paging oldest turns`);

    // Determine how many turns to remove (oldest 25% by default)
    const numToRemove = turnsToPage ?? Math.max(1, Math.floor(turns.length * 0.25));
    const turnsToArchive = turns.slice(0, numToRemove);
    const remainingTurns = turns.slice(numToRemove);

    // Summarize and write to ChromaDB
    const summary = await summarizeTurns(turnsToArchive, sessionId);
    const compressionMarker = `[CONTEXT-COMPRESSED @ ${new Date().toISOString()} — ${numToRemove} turns archived to Living Archive]`;

    let summaryId: string | undefined;
    try {
        const result = await scribeRemember({
            content: `Session context summary (${numToRemove} turns):\n${summary}`,
            category: 'session',
            tags: [sessionId, 'context-paged', agentName, 'episodic'],
            importance: 'medium',
            agentName,
            sessionId,
            skipGate: true, // System-generated summaries bypass gate
        });
        summaryId = result.memoryId;
        console.log(`[CONTEXT-PAGER] ✅ Archived ${numToRemove} turns → memory ${summaryId}`);
    } catch (err) {
        console.warn('[CONTEXT-PAGER] ⚠️ Failed to write to memory bus:', err);
    }

    // Inject compression marker as a system turn at position 0
    const compressedTurns: ConversationTurn[] = [
        { role: 'system', content: compressionMarker },
        ...remainingTurns,
    ];

    const tokensAfter = estimateTurnTokens(compressedTurns);

    return {
        paged: true,
        turnsRemoved: numToRemove,
        summaryId,
        compressionMarker,
        remainingTurns: compressedTurns,
        tokensBefore,
        tokensAfter,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GENKIT FLOW WRAPPER (for use via Genkit runtime / HTTP)
// ─────────────────────────────────────────────────────────────────────────────

const ContextPageInputSchema = z.object({
    turns: z.array(z.object({
        role: z.enum(['user', 'model', 'system']),
        content: z.string(),
        tokenCount: z.number().optional(),
    })),
    tokenBudget: z.number().default(100_000),
    triggerAt: z.number().default(0.80),
    turnsToPage: z.number().optional(),
    sessionId: z.string().optional(),
    agentName: z.string().default('CONTEXT-PAGER'),
});

const ContextPageOutputSchema = z.object({
    paged: z.boolean(),
    turnsRemoved: z.number(),
    summaryId: z.string().optional(),
    compressionMarker: z.string().optional(),
    remainingTurns: z.array(z.object({
        role: z.enum(['user', 'model', 'system']),
        content: z.string(),
        tokenCount: z.number().optional(),
    })),
    tokensBefore: z.number(),
    tokensAfter: z.number(),
});

export const ContextPagerFlow = ai.defineFlow(
    { name: 'ContextPager', inputSchema: ContextPageInputSchema, outputSchema: ContextPageOutputSchema },
    async (input) => pageContext(input.turns, input)
);

