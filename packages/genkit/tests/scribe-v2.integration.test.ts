/**
 * SCRIBE v2 Integration Tests (SC-06)
 *
 * Tests:
 * 1. scribeRemember writes to ChromaDB episodic/semantic correctly
 * 2. VERA gate correctly rejects low-value/PII memories
 * 3. Context pager triggers at 80% token budget
 * 4. KEEPER v2 boot recall returns relevant items
 *
 * These are integration tests — they require ChromaDB to be running.
 * Set CHROMADB_URL env var (default: http://localhost:8000)
 * Skip with: SKIP_INTEGRATION=true pnpm test
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// CONDITIONAL SKIP
// ─────────────────────────────────────────────────────────────────────────────

const SKIP = process.env.SKIP_INTEGRATION === 'true';
const itIntegration = SKIP ? it.skip : it;

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS — Mock memoryBus for unit test paths
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@inception/memory', () => ({
    memoryBus: {
        commit: vi.fn().mockResolvedValue({ id: 'mock-mem-001', agentName: 'TEST', task: 'mock', outcome: 'mock', tags: [], sessionId: 'test', success: true }),
        recall: vi.fn().mockResolvedValue([]),
    },
}));

// ─────────────────────────────────────────────────────────────────────────────
// SCRIBE v2 — SC-01: scribeRemember + scribeRecall (Unit)
// ─────────────────────────────────────────────────────────────────────────────

describe('SCRIBE v2 — scribeRemember (unit)', () => {
    it('returns committed=false when VERA gate rejects low-value memory', async () => {
        // Mock the VERA gate to reject
        vi.doMock('../src/memory/vera-gate.js', () => ({
            VERAMemoryGate: vi.fn().mockResolvedValue({ approved: false, reason: 'Low value — too ephemeral' }),
        }));

        const { scribeRemember } = await import('../src/memory/scribe.js');
        const result = await scribeRemember({
            content: 'ok',
            category: 'session',
            importance: 'low',
            tags: [],
            agentName: 'TEST',
        });

        expect(result.committed).toBe(false);
        expect(result.gateVerdict.approved).toBe(false);
        expect(result.gateVerdict.reason).toBeTruthy();
    });

    it('skips VERA gate when skipGate=true', async () => {
        const { scribeRemember } = await import('../src/memory/scribe.js');
        const result = await scribeRemember({
            content: 'Architecture decision: use Genkit for all AI flows in v5.',
            category: 'decision',
            importance: 'high',
            tags: ['architecture', 'genkit'],
            agentName: 'ATHENA',
            skipGate: true,
        });

        // memoryBus.commit was mocked — should return committed=true
        expect(result.committed).toBe(true);
        expect(result.gateVerdict.approved).toBe(true);
    });

    it('returns correct output schema shape', async () => {
        const { scribeRemember } = await import('../src/memory/scribe.js');
        const result = await scribeRemember({
            content: 'Test memory entry',
            category: 'fact',
            importance: 'medium',
            tags: ['test'],
            agentName: 'TEST',
            skipGate: true,
        });

        expect(result).toHaveProperty('committed');
        expect(result).toHaveProperty('gateVerdict');
        expect(result).toHaveProperty('summary');
        expect(result.gateVerdict).toHaveProperty('approved');
        expect(result.gateVerdict).toHaveProperty('reason');
    });
});

describe('SCRIBE v2 — scribeRecall (unit)', () => {
    it('returns correct output schema shape with empty results on no matches', async () => {
        const { scribeRecall } = await import('../src/memory/scribe.js');
        const result = await scribeRecall({
            query: 'nonexistent query xyz123',
            limit: 5,
            tags: [],
            successOnly: false,
        });

        expect(result).toHaveProperty('results');
        expect(result).toHaveProperty('totalFound');
        expect(result).toHaveProperty('query');
        expect(Array.isArray(result.results)).toBe(true);
    });

    it('applies category filter to results', async () => {
        // Mock memoryBus.recall to return mixed results
        const { memoryBus } = await import('@inception/memory');
        (memoryBus.recall as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
            { id: '1', task: '[DECISION] Genkit architecture', outcome: 'Use Genkit for v5', tags: ['decision', 'high'], agentName: 'ATHENA', success: true },
            { id: '2', task: '[SESSION] Boot sequence', outcome: 'Session started', tags: ['session', 'low'], agentName: 'VERA', success: true },
        ]);

        const { scribeRecall } = await import('../src/memory/scribe.js');
        const result = await scribeRecall({
            query: 'architecture decision',
            category: 'decision',
            limit: 10,
            tags: [],
            successOnly: false,
        });

        // Only 'decision' category items should pass the filter
        expect(result.results.every(r => r.category === 'decision')).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SC-02: VERA Memory Quality Gate (Unit)
// ─────────────────────────────────────────────────────────────────────────────

describe('VERA Memory Quality Gate — unit', () => {
    it('rejects PII content', async () => {
        // Mock ai.generate to return a rejection
        vi.doMock('../src/index.js', () => ({
            ai: {
                defineTool: vi.fn((config, fn) => fn),
                defineFlow: vi.fn((config, fn) => fn),
                generate: vi.fn().mockResolvedValue({
                    output: { approved: false, reason: 'Content contains PII — email address detected' },
                }),
            },
        }));

        const { VERAMemoryGate } = await import('../src/memory/vera-gate.js');
        const result = await VERAMemoryGate({
            content: 'User email: john.doe@example.com',
            category: 'fact',
            importance: 'low',
            tags: [],
        });

        expect(result.approved).toBe(false);
        expect(result.reason).toContain('PII');
    });

    it('approves high-importance decisions', async () => {
        vi.doMock('../src/index.js', () => ({
            ai: {
                defineTool: vi.fn((config, fn) => fn),
                defineFlow: vi.fn((config, fn) => fn),
                generate: vi.fn().mockResolvedValue({
                    output: { approved: true, reason: 'Important architectural decision worth preserving' },
                }),
            },
        }));

        const { VERAMemoryGate } = await import('../src/memory/vera-gate.js');
        const result = await VERAMemoryGate({
            content: 'Use SQLite-backed dispatch server for task persistence across NAS restarts.',
            category: 'decision',
            importance: 'critical',
            tags: ['architecture', 'dispatch'],
        });

        expect(result.approved).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SC-03: Context Pager — Token Budget Tracker (Unit)
// ─────────────────────────────────────────────────────────────────────────────

describe('Context Pager — token budget tracker', () => {
    it('does not trigger below 80% token budget', async () => {
        const { ContextPager } = await import('../src/memory/context-pager.js');
        const pager = new ContextPager(10000); // 10k budget

        // Add 5k tokens worth of turns (50% — below threshold)
        const turn1 = { role: 'user' as const, content: 'A'.repeat(5000) };

        const result = await pager.processTurn(turn1);
        expect(result.triggered).toBe(false);
        expect(result.turns).toHaveLength(1);
    });

    it('triggers at >= 80% token budget and compresses oldest turns', async () => {
        const { ContextPager } = await import('../src/memory/context-pager.js');
        const pager = new ContextPager(1000); // 1k budget for fast test

        // Add turns totalling ~850 tokens (85% of 1000)
        const turns = [
            { role: 'user' as const, content: 'A'.repeat(200) },
            { role: 'assistant' as const, content: 'B'.repeat(200) },
            { role: 'user' as const, content: 'C'.repeat(200) },
            { role: 'assistant' as const, content: 'D'.repeat(200) },
            { role: 'user' as const, content: 'E'.repeat(200) }, // This pushes to 1000 = 100%
        ];

        let finalResult = { triggered: false, turns: [] as typeof turns, contextMarker: undefined as string | undefined };
        for (const turn of turns) {
            finalResult = await pager.processTurn(turn);
        }

        expect(finalResult.triggered).toBe(true);
        expect(finalResult.contextMarker).toBeDefined();
        expect(finalResult.contextMarker).toContain('[CONTEXT COMPRESSED]');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SC-04: KEEPER v2 Boot Recall (Unit)
// ─────────────────────────────────────────────────────────────────────────────

describe('KEEPER v2 Boot Recall', () => {
    it('returns empty brief when no relevant memories found', async () => {
        const { runKeeperBoot } = await import('../src/memory/keeper-boot.js');

        const result = await runKeeperBoot({
            taskContext: 'completely-unrelated-xyz-topic',
            workstream: 'test',
        });

        expect(result).toHaveProperty('brief');
        expect(result).toHaveProperty('alerts');
        expect(Array.isArray(result.alerts)).toBe(true);
    });

    it('surfaces critical-importance items as boot alerts', async () => {
        const { memoryBus } = await import('@inception/memory');
        (memoryBus.recall as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
            {
                id: 'critical-1',
                task: '[decision] NAS-first sovereignty',
                outcome: 'CRITICAL: All services must run on NAS first',
                tags: ['critical', 'decision', 'sovereignty'],
                agentName: 'ATHENA',
                success: true,
            },
        ]);

        const { runKeeperBoot } = await import('../src/memory/keeper-boot.js');
        const result = await runKeeperBoot({
            taskContext: 'sovereignty infrastructure deployment',
            workstream: 'infra-docker',
        });

        expect(result.alerts.length).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SC-01 INTEGRATION — Real ChromaDB writes (skipped without CHROMADB_URL)
// ─────────────────────────────────────────────────────────────────────────────

describe('SCRIBE v2 — ChromaDB integration', () => {
    itIntegration('writes and retrieves a memory from ChromaDB', async () => {
        const { scribeRemember, scribeRecall } = await import('../src/memory/scribe.js');
        const testContent = `Integration test memory — ${Date.now()}`;

        const writeResult = await scribeRemember({
            content: testContent,
            category: 'fact',
            importance: 'low',
            tags: ['integration-test'],
            agentName: 'TEST-SUITE',
            skipGate: true,
        });

        expect(writeResult.committed).toBe(true);
        expect(writeResult.memoryId).toBeTruthy();

        // Brief delay for ChromaDB indexing
        await new Promise(resolve => setTimeout(resolve, 500));

        const recallResult = await scribeRecall({
            query: testContent,
            tags: ['integration-test'],
            limit: 5,
            successOnly: false,
        });

        expect(recallResult.results.length).toBeGreaterThan(0);
        expect(recallResult.results[0]!.tags).toContain('integration-test');
    });
});
