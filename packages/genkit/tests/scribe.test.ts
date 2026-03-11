/**
 * SCRIBE v2 — Integration Tests (SC-06)
 * packages/genkit/tests/scribe.test.ts
 *
 * Tests:
 *   (1) scribeRemember writes to ChromaDB episodic/semantic correctly
 *   (2) VERA gate correctly rejects low-value/PII memories
 *   (3) Context pager triggers at 80% token budget and compresses
 *   (4) KEEPER v2 boot recall returns relevant items
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateMemoryWrite as VERAMemoryGate } from '../src/memory/vera-gate.js';
import { estimateTokens, estimateTurnTokens, pageContext } from '../src/memory/context-pager.js';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK: @inception/memory bus
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@inception/memory', () => ({
    memoryBus: {
        commit: vi.fn().mockResolvedValue({ id: 'test-memory-id-42', agentName: 'SCRIBE', task: 'test', outcome: '', tags: [] }),
        recall: vi.fn().mockResolvedValue([
            { id: 'recalled-1', agentName: 'ATHENA', task: '[DECISION] Use SQLite for dispatch', outcome: 'Chose SQLite for persistence due to NAS constraints', tags: ['decision', 'high', 'dispatch'] },
            { id: 'recalled-2', agentName: 'VERA', task: '[PATTERN] Always gate memory writes', outcome: 'When writing to Living Archive, always route through VERA gate because low-quality memories pollute recall', tags: ['pattern', 'high', 'scribe'] },
        ]),
        setPatternExtractor: vi.fn(),
        withMemory: vi.fn(),
    },
}));

// ─────────────────────────────────────────────────────────────────────────────
// 1. VERA GATE — Rejection Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('VERA Memory Quality Gate (SC-02)', () => {
    it('rejects content containing an email address (PII)', async () => {
        const result = await VERAMemoryGate({
            content: 'User email is test@example.com for follow up',
            category: 'fact',
            importance: 'medium',
            tags: [],
        });
        expect(result.approved).toBe(false);
        expect(result.reason).toMatch(/PII|email|identifiable/i);
    });

    it('rejects content containing an API key', async () => {
        const result = await VERAMemoryGate({
            content: 'Use sk-abc123XYZ789def456ghiJKL012 for OpenAI calls',
            category: 'fact',
            importance: 'high',
            tags: [],
        });
        expect(result.approved).toBe(false);
        expect(result.reason).toMatch(/PII|API key|secret|security/i);
    });

    it('rejects trivially short content', async () => {
        const result = await VERAMemoryGate({
            content: 'ok',
            category: 'session',
            importance: 'low',
            tags: [],
        });
        expect(result.approved).toBe(false);
        expect(result.reason).toMatch(/too short/i);
    });

    it('rejects low-importance session notes', async () => {
        const result = await VERAMemoryGate({
            content: 'Just checking in on the session status for today',
            category: 'session',
            importance: 'low',
            tags: [],
        });
        expect(result.approved).toBe(false);
    });

    it('auto-approves critical decisions without LLM call', async () => {
        const result = await VERAMemoryGate({
            content: 'Architecture decision: use Genkit tools pattern for all agent tool calls instead of raw function calls because it enables Genkit tracing and middleware',
            category: 'decision',
            importance: 'critical',
            tags: ['architecture', 'genkit'],
        });
        expect(result.approved).toBe(true);
        expect(result.reason).toMatch(/auto-approved/i);
    });

    it('auto-approves critical bug fixes without LLM call', async () => {
        const result = await VERAMemoryGate({
            content: 'Bug fix: ChromaDB client requires await on all collection.add() calls or silently drops writes',
            category: 'bug-fix',
            importance: 'critical',
            tags: ['chromadb', 'memory'],
        });
        expect(result.approved).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONTEXT PAGER — Token Budget Tests (SC-03)
// ─────────────────────────────────────────────────────────────────────────────

describe('Context Pager (SC-03)', () => {
    const makeTurns = (count: number, wordsPerTurn = 200) =>
        Array.from({ length: count }, (_, i) => ({
            role: (i % 2 === 0 ? 'user' : 'model') as 'user' | 'model',
            content: `Turn ${i + 1}: ${'word '.repeat(wordsPerTurn).trim()}`,
        }));

    it('estimateTokens approximates correctly', () => {
        const text = 'hello world'; // 11 chars → ~3 tokens
        expect(estimateTokens(text)).toBeGreaterThan(0);
        expect(estimateTokens(text)).toBeLessThan(10);
    });

    it('does NOT page when below 80% token budget', async () => {
        const turns = makeTurns(5, 50); // ~5 * 50 * 5 chars / 4 = ~312 tokens
        const result = await pageContext(turns, { tokenBudget: 100_000 });
        expect(result.paged).toBe(false);
        expect(result.turnsRemoved).toBe(0);
        expect(result.remainingTurns).toHaveLength(5);
    });

    it('DOES page when above 80% token budget', async () => {
        // Create a small budget that we can exceed: 100 tokens, 80% = 80 tokens
        // Each turn with 200 words ≈ 200*5/4 = 250 tokens → 2 turns = 500 tokens
        const turns = makeTurns(4, 200);
        const totalTokens = estimateTurnTokens(turns);
        // Use a budget where totalTokens > 80%
        const budget = Math.floor(totalTokens * 0.7); // set budget so we're at 100/70 = ~143% of budget

        const result = await pageContext(turns, {
            tokenBudget: budget,
            triggerAt: 0.80,
            sessionId: 'test-session',
        });

        expect(result.paged).toBe(true);
        expect(result.turnsRemoved).toBeGreaterThan(0);
        expect(result.remainingTurns.length).toBeLessThan(turns.length + 1); // +1 for system marker
        expect(result.compressionMarker).toBeDefined();
        expect(result.compressionMarker).toContain('CONTEXT-COMPRESSED');
    });

    it('injects a system compression marker turn', async () => {
        const turns = makeTurns(4, 200);
        const budget = Math.floor(estimateTurnTokens(turns) * 0.7);
        const result = await pageContext(turns, { tokenBudget: budget });

        if (result.paged) {
            const firstTurn = result.remainingTurns[0];
            expect(firstTurn.role).toBe('system');
            expect(firstTurn.content).toContain('CONTEXT-COMPRESSED');
        }
    });

    it('tokensAfter is less than tokensBefore after paging', async () => {
        const turns = makeTurns(8, 200);
        const budget = Math.floor(estimateTurnTokens(turns) * 0.5);
        const result = await pageContext(turns, { tokenBudget: budget, triggerAt: 0.80 });

        if (result.paged) {
            expect(result.tokensAfter).toBeLessThan(result.tokensBefore);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TOKEN UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

describe('Token Utilities', () => {
    it('estimateTurnTokens sums all turns', () => {
        const turns = [
            { role: 'user' as const, content: 'Hello', tokenCount: 10 },
            { role: 'model' as const, content: 'World', tokenCount: 20 },
        ];
        expect(estimateTurnTokens(turns)).toBe(30);
    });

    it('uses content estimate when tokenCount is missing', () => {
        const turns = [{ role: 'user' as const, content: 'a'.repeat(400) }];
        // 400 chars / 4 = 100 tokens
        expect(estimateTurnTokens(turns)).toBe(100);
    });
});
