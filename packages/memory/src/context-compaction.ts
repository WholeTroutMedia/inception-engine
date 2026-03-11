/**
 * Context Compaction Layer — VERA Awareness Distillator
 * Creative Liberation Engine v5.0.0 (GENESIS) — Issue #94
 *
 * Addresses the context window explosion problem:
 *   - Long conversations → compressed semantic summaries
 *   - Agent memory → distilled "The Why" patterns
 *   - Session history → rolling context that fits in 8K tokens
 *
 * Strategy: Hierarchical sliding window compression
 *   1. RECENT (last N turns)            — kept verbatim
 *   2. WORKING MEMORY (last N sessions) — compressed to key facts + decisions
 *   3. LONG-TERM (older)               — distilled to patterns via SCRIBE
 *
 * Article IX: Complete. Full type safety.
 */

import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export const CompactionTurn = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string().optional(),
  token_estimate: z.number().optional(),
});

export const CompactionRequest = z.object({
  turns: z.array(CompactionTurn),
  /** Max tokens for the entire compacted output */
  target_tokens: z.number().default(4096),
  /** Keep this many recent turns verbatim */
  keep_recent: z.number().default(6),
  /** Include a system preamble with distilled context */
  include_summary_preamble: z.boolean().default(true),
  /** Agent name for SCRIBE pattern tagging */
  agent_name: z.string().optional(),
  /** Session ID for memory linkage */
  session_id: z.string().optional(),
});

export type Turn = z.infer<typeof CompactionTurn>;
export type CompactionInput = z.infer<typeof CompactionRequest>;

export interface CompactedContext {
  /** Verbatim recent turns */
  recent_turns: Turn[];
  /** Compressed summary of older turns as a system prompt preamble */
  summary_preamble: string;
  /** Combined token estimate */
  estimated_tokens: number;
  /** Original turn count before compaction */
  original_turn_count: number;
  /** How many turns were compressed */
  compressed_turn_count: number;
  /** Extracted semantic patterns */
  extracted_patterns: string[];
}

// ─── Token Estimation ─────────────────────────────────────────────────────────

export function estimateTokens(text: string): number {
  // Rough approximation: ~4 chars per token for English prose
  return Math.ceil(text.length / 4);
}

function estimateTurnTokens(turn: Turn): number {
  return turn.token_estimate ?? estimateTokens(turn.content) + 4; // role overhead
}

// ─── Keyword Extraction ───────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'this', 'that', 'these', 'those', 'with', 'from', 'by', 'of', 'as',
  'it', 'its', 'we', 'you', 'they', 'he', 'she', 'i', 'me', 'my', 'our',
]);

function extractKeywords(text: string, topN: number = 8): string[] {
  const wordFreq = new Map<string, number>();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));

  for (const w of words) {
    wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
  }

  return [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

// ─── Pattern Extraction ───────────────────────────────────────────────────────

function extractPatterns(turns: Turn[]): string[] {
  const patterns: string[] = [];
  const assistantTurns = turns.filter(t => t.role === 'assistant');

  for (const turn of assistantTurns) {
    // Look for "The Why" signals — conclusions, decisions, learnings
    const lines = turn.content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith('Pattern:') ||
        trimmed.startsWith('Decision:') ||
        trimmed.startsWith('Key insight:') ||
        trimmed.startsWith('Constitutional:') ||
        trimmed.match(/^(Rule|Principle|Lesson|Conclusion):/i)
      ) {
        patterns.push(trimmed.slice(0, 120));
      }
    }

    // Detect declarative learning sentences
    const learningMatch = turn.content.match(
      /(?:we (?:learned|discovered|found)|the (?:key|important|critical) (?:thing|point|insight) is|always |never )[^.!?\n]{20,100}[.!?]/gi
    );
    if (learningMatch) {
      patterns.push(...learningMatch.slice(0, 2).map(s => s.trim().slice(0, 120)));
    }
  }

  return [...new Set(patterns)].slice(0, 6);
}

// ─── Compaction Engine ────────────────────────────────────────────────────────

/**
 * Compress a conversation history into a compacted context that fits within the target token budget.
 *
 * Algorithm:
 * 1. Keep the last `keep_recent` turns verbatim (always preserved)
 * 2. For older turns, extract key decisions, entities, and outcomes
 * 3. Build a summary preamble that captures the semantic essence
 * 4. Return structured CompactedContext ready to inject into the next prompt
 */
export function compactContext(input: CompactionInput): CompactedContext {
  const { turns, target_tokens, keep_recent, include_summary_preamble } = input;

  if (turns.length <= keep_recent) {
    // Nothing to compact
    const estimated = turns.reduce((acc, t) => acc + estimateTurnTokens(t), 0);
    return {
      recent_turns: turns,
      summary_preamble: '',
      estimated_tokens: estimated,
      original_turn_count: turns.length,
      compressed_turn_count: 0,
      extracted_patterns: extractPatterns(turns),
    };
  }

  const recentTurns = turns.slice(-keep_recent);
  const olderTurns = turns.slice(0, -keep_recent);

  // ── Compress older turns ──────────────────────────────────────────────────
  const allOlderText = olderTurns
    .map(t => `[${t.role.toUpperCase()}]: ${t.content}`)
    .join('\n\n');

  const keywords = extractKeywords(allOlderText, 12);
  const patterns = extractPatterns(olderTurns);

  // Extract: user goals, agent decisions, tool outcomes
  const userGoals: string[] = [];
  const agentDecisions: string[] = [];
  const outcomes: string[] = [];

  for (const turn of olderTurns) {
    if (turn.role === 'user') {
      // Take first sentence of each user message as the "goal"
      const firstSentence = turn.content.match(/^[^.!?\n]{10,120}/)?.[0];
      if (firstSentence) userGoals.push(firstSentence.trim());
    } else if (turn.role === 'assistant') {
      // Extract action lines (tool calls, decisions)
      const actionLines = turn.content
        .split('\n')
        .filter(l => l.match(/^(built|created|wrote|fixed|updated|added|removed|deployed|committed|shipped)/i))
        .map(l => l.trim().slice(0, 80));
      agentDecisions.push(...actionLines.slice(0, 2));

      // Extract completion signals
      const completionMatch = turn.content.match(/(?:✅|✓|done|complete|shipped|committed)[^.\n]{0,60}/i);
      if (completionMatch) outcomes.push(completionMatch[0].trim().slice(0, 80));
    }
  }

  // Build summary preamble
  const summaryLines: string[] = ['[COMPACTED CONTEXT — Earlier Conversation Summary]'];

  if (userGoals.length > 0) {
    summaryLines.push(`\nUser Goals (${olderTurns.filter(t => t.role === 'user').length} messages):`);
    summaryLines.push(...userGoals.slice(0, 4).map(g => `  • ${g}`));
  }

  if (agentDecisions.length > 0) {
    summaryLines.push(`\nActions Taken:`);
    summaryLines.push(...agentDecisions.slice(0, 6).map(d => `  • ${d}`));
  }

  if (outcomes.length > 0) {
    summaryLines.push(`\nOutcomes:`);
    summaryLines.push(...outcomes.slice(0, 4).map(o => `  • ${o}`));
  }

  if (patterns.length > 0) {
    summaryLines.push(`\nExtracted Patterns:`);
    summaryLines.push(...patterns.map(p => `  • ${p}`));
  }

  if (keywords.length > 0) {
    summaryLines.push(`\nKey Topics: ${keywords.join(', ')}`);
  }

  summaryLines.push(`\n[${olderTurns.length} turns compressed. Resume from recent context below.]`);

  const summaryPreamble = include_summary_preamble ? summaryLines.join('\n') : '';

  // ── Build final token estimate ────────────────────────────────────────────
  const recentTokens = recentTurns.reduce((acc, t) => acc + estimateTurnTokens(t), 0);
  const preambleTokens = estimateTokens(summaryPreamble);
  let totalTokens = recentTokens + preambleTokens;

  // If still over budget: trim oldest recent turns
  let finalRecent = [...recentTurns];
  while (totalTokens > target_tokens && finalRecent.length > 2) {
    const removed = finalRecent.shift()!;
    totalTokens -= estimateTurnTokens(removed);
  }

  return {
    recent_turns: finalRecent,
    summary_preamble: summaryPreamble,
    estimated_tokens: totalTokens,
    original_turn_count: turns.length,
    compressed_turn_count: olderTurns.length,
    extracted_patterns: patterns,
  };
}

// ─── Rolling Context Manager ──────────────────────────────────────────────────

/**
 * RollingContextManager — maintains a sliding window of conversation turns.
 * Automatically compacts when approaching the token budget.
 */
export class RollingContextManager {
  private turns: Turn[] = [];
  private readonly maxTokens: number;
  private readonly keepRecent: number;

  constructor(maxTokens: number = 6000, keepRecent: number = 8) {
    this.maxTokens = maxTokens;
    this.keepRecent = keepRecent;
  }

  addTurn(role: Turn['role'], content: string): void {
    this.turns.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      token_estimate: estimateTokens(content) + 4,
    });
  }

  getCompacted(): CompactedContext {
    return compactContext({
      turns: this.turns,
      target_tokens: this.maxTokens,
      keep_recent: this.keepRecent,
      include_summary_preamble: true,
    });
  }

  /**
   * Returns an array of turns ready to inject into a model context:
   * [system preamble turn (if compacted)] + [recent turns]
   */
  getContextForPrompt(): Turn[] {
    const compacted = this.getCompacted();
    const result: Turn[] = [];

    if (compacted.summary_preamble && compacted.compressed_turn_count > 0) {
      result.push({
        role: 'system',
        content: compacted.summary_preamble,
      });
    }

    result.push(...compacted.recent_turns);
    return result;
  }

  get turnCount(): number { return this.turns.length; }

  reset(): void { this.turns = []; }
}

// ─── Singleton for agent use ──────────────────────────────────────────────────

export const contextManager = new RollingContextManager();
