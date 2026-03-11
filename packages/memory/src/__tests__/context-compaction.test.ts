import { describe, it, expect } from 'vitest';
import {
  compactContext,
  estimateTokens,
  RollingContextManager,
  type Turn,
  type CompactionInput,
} from '../context-compaction.js';

// ─── Context Compaction Layer — Test Suite ────────────────────────────────────
// Article IX: Complete test coverage for the sliding window compression algorithm.

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTurns(count: number, contentLength: number = 100): Turn[] {
  return Array.from({ length: count }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'assistant') as Turn['role'],
    content: `Turn ${i + 1}: ${'a'.repeat(contentLength)}`.slice(0, contentLength + 10),
    timestamp: new Date(Date.now() + i * 1000).toISOString(),
  }));
}

// ── estimateTokens ────────────────────────────────────────────────────────────

describe('estimateTokens()', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns ~25 tokens for 100-char string', () => {
    expect(estimateTokens('a'.repeat(100))).toBe(25);
  });

  it('scales linearly', () => {
    expect(estimateTokens('x'.repeat(400))).toBe(100);
  });
});

// ── compactContext ────────────────────────────────────────────────────────────

describe('compactContext()', () => {
  it('returns all turns verbatim when count <= keep_recent', () => {
    const turns = makeTurns(4);
    const result = compactContext({ turns, target_tokens: 4096, keep_recent: 6, include_summary_preamble: true });
    expect(result.recent_turns).toHaveLength(4);
    expect(result.compressed_turn_count).toBe(0);
    expect(result.original_turn_count).toBe(4);
  });

  it('compresses older turns when count > keep_recent', () => {
    const turns = makeTurns(12);
    const result = compactContext({ turns, target_tokens: 4096, keep_recent: 4, include_summary_preamble: true });
    expect(result.recent_turns).toHaveLength(4);
    expect(result.compressed_turn_count).toBe(8);
  });

  it('always preserves at minimum 2 recent turns even if over budget', () => {
    // Tiny token budget forces pruning, but keeps >= 2 turns
    const turns = makeTurns(10, 500);
    const result = compactContext({ turns, target_tokens: 100, keep_recent: 6, include_summary_preamble: true });
    expect(result.recent_turns.length).toBeGreaterThanOrEqual(2);
  });

  it('includes summary_preamble when include_summary_preamble=true and compression happened', () => {
    const turns = makeTurns(10);
    const result = compactContext({ turns, target_tokens: 4096, keep_recent: 4, include_summary_preamble: true });
    expect(result.summary_preamble).toContain('COMPACTED CONTEXT');
  });

  it('omits summary_preamble when include_summary_preamble=false', () => {
    const turns = makeTurns(10);
    const result = compactContext({ turns, target_tokens: 4096, keep_recent: 4, include_summary_preamble: false });
    expect(result.summary_preamble).toBe('');
  });

  it('estimated_tokens reflects recent + preamble', () => {
    const turns = makeTurns(10);
    const result = compactContext({ turns, target_tokens: 4096, keep_recent: 4, include_summary_preamble: true });
    expect(result.estimated_tokens).toBeGreaterThan(0);
  });

  it('extracted_patterns is an array (empty is ok if none matched)', () => {
    const turns = makeTurns(10);
    const result = compactContext({ turns, target_tokens: 4096, keep_recent: 4, include_summary_preamble: true });
    expect(Array.isArray(result.extracted_patterns)).toBe(true);
  });

  it('extracts patterns from assistant turns matching Pattern: prefix', () => {
    const input: CompactionInput = {
      turns: [
        { role: 'user', content: 'help me with task' },
        { role: 'assistant', content: 'Pattern: Always validate inputs before writing.\nDone.' },
        { role: 'user', content: 'next step' },
        { role: 'assistant', content: 'Pattern: Use TypeScript generics for type safety.' },
        ...makeTurns(6),
      ],
      target_tokens: 4096,
      keep_recent: 4,
      include_summary_preamble: true,
    };
    const result = compactContext(input);
    expect(result.extracted_patterns.some(p => p.includes('Pattern:'))).toBe(true);
  });
});

// ── RollingContextManager ─────────────────────────────────────────────────────

describe('RollingContextManager', () => {
  it('starts empty', () => {
    const mgr = new RollingContextManager();
    expect(mgr.turnCount).toBe(0);
  });

  it('addTurn increments turnCount', () => {
    const mgr = new RollingContextManager();
    mgr.addTurn('user', 'hello');
    mgr.addTurn('assistant', 'hi there');
    expect(mgr.turnCount).toBe(2);
  });

  it('reset empties the turn list', () => {
    const mgr = new RollingContextManager();
    mgr.addTurn('user', 'test');
    mgr.reset();
    expect(mgr.turnCount).toBe(0);
  });

  it('getContextForPrompt returns an array of turns', () => {
    const mgr = new RollingContextManager(4096, 4);
    for (let i = 0; i < 8; i++) {
      mgr.addTurn(i % 2 === 0 ? 'user' : 'assistant', `message ${i}`);
    }
    const context = mgr.getContextForPrompt();
    expect(Array.isArray(context)).toBe(true);
    expect(context.length).toBeGreaterThan(0);
  });

  it('getContextForPrompt injects system summary when compaction occurred', () => {
    const mgr = new RollingContextManager(4096, 2);
    for (let i = 0; i < 10; i++) {
      mgr.addTurn(i % 2 === 0 ? 'user' : 'assistant', `turn ${i} — ${'x'.repeat(50)}`);
    }
    const context = mgr.getContextForPrompt();
    const systemTurn = context.find(t => t.role === 'system');
    expect(systemTurn).toBeDefined();
    expect(systemTurn?.content).toContain('COMPACTED CONTEXT');
  });

  it('getCompacted().original_turn_count matches turns added', () => {
    const mgr = new RollingContextManager();
    for (let i = 0; i < 5; i++) mgr.addTurn('user', 'msg');
    expect(mgr.getCompacted().original_turn_count).toBe(5);
  });
});
