/**
 * SCRIBE v2 — Persistent Memory Tools
 * SC-01: scribeRemember + scribeRecall Genkit tools
 *
 * Routes all writes through the VERA Memory Quality Gate before
 * committing to ChromaDB via the @inception/memory bus.
 * Provides structured recall with category and tag filtering.
 *
 * FIX (Issue #5 F1/F2): Category and importance are now stored as
 * structured metadata fields instead of being flattened into tags.
 * memoryBus.recall() now receives where clauses for server-side filtering.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { memoryBus } from '@inception/memory';

// ───
// SCHEMAS
// ───

export const MemoryCategory = z.enum([
  'decision',
  'pattern',
  'preference',
  'fact',
  'bug-fix',
  'session',
]);
export type MemoryCategory = z.infer<typeof MemoryCategory>;

export const MemoryImportance = z.enum(['low', 'medium', 'high', 'critical']);
export type MemoryImportance = z.infer<typeof MemoryImportance>;

export const ScribeRememberInputSchema = z.object({
  content: z.string().describe('The information to remember'),
  category: MemoryCategory.describe('Type of memory: decision, pattern, preference, fact, bug-fix, or session'),
  tags: z.array(z.string()).default([]).describe('Searchable tags for this memory'),
  importance: MemoryImportance.default('medium').describe('Importance level \u2014 low/medium/high/critical'),
  agentName: z.string().default('SCRIBE').describe('Agent committing this memory'),
  sessionId: z.string().optional(),
  skipGate: z.boolean().default(false).describe('Skip VERA quality gate (only for system-critical writes)'),
});

export const ScribeRememberOutputSchema = z.object({
  committed: z.boolean(),
  memoryId: z.string().optional().describe('ChromaDB document ID if committed'),
  gateVerdict: z.object({
    approved: z.boolean(),
    reason: z.string(),
  }),
  summary: z.string().describe('One-line summary of what was stored or rejected'),
});

export const ScribeRecallInputSchema = z.object({
  query: z.string().describe('Natural language query for semantic search'),
  category: MemoryCategory.optional().describe('Filter by memory category'),
  tags: z.array(z.string()).default([]).describe('Filter by tags (union match)'),
  limit: z.number().int().min(1).max(20).default(5),
  agentName: z.string().optional().describe('Filter memories written by a specific agent'),
  successOnly: z.boolean().default(false),
});

export const ScribeRecallOutputSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    content: z.string(),
    category: MemoryCategory,
    tags: z.array(z.string()),
    importance: MemoryImportance,
    agentName: z.string(),
    relevanceScore: z.number().optional(),
    createdAt: z.string().optional(),
  })),
  totalFound: z.number(),
  query: z.string(),
});

// ───
// SCRIBE REMEMBER FLOW (SC-01)
// ───

export const scribeRemember = ai.defineTool(
  {
    name: 'scribeRemember',
    description: 'Store a memory in the Creative Liberation Engine Living Archive. Routes through VERA quality gate. Use for decisions, patterns, preferences, facts, bug-fixes, and session summaries.',
    inputSchema: ScribeRememberInputSchema,
    outputSchema: ScribeRememberOutputSchema,
  },
  async (input): Promise<z.infer<typeof ScribeRememberOutputSchema>> => {
    console.log(`[SCRIBE] \ud83d\udcdd Remember \u2014 category:${input.category} importance:${input.importance} \u2014 ${input.content.slice(0, 60)}`);

    // Route through VERA gate unless explicitly skipped
    if (!input.skipGate) {
      const { veraMemoryGateFlow } = await import('./vera-gate.js');
      const gateResult = await veraMemoryGateFlow({ content: input.content, category: input.category, importance: input.importance, proposedBy: input.agentName ?? 'SCRIBE' });

      if (!gateResult.approved) {
        console.log(`[SCRIBE] \u274c VERA gate rejected: ${gateResult.reason}`);
        return {
          committed: false,
          gateVerdict: { approved: false, reason: gateResult.reason },
          summary: `Memory rejected: ${gateResult.reason}`,
        };
      }
      console.log(`[SCRIBE] \u2705 VERA gate approved: ${gateResult.reason}`);
    }

    // Fix F2: Store category and importance as structured metadata,
    // NOT flattened into the tags array (prevents collision with user tags)
    const entry = await memoryBus.commit({
      agentName: input.agentName,
      task: `[${input.category.toUpperCase()}] ${input.content.slice(0, 80)}`,
      outcome: input.content,
      tags: input.tags, // user tags only \u2014 no category/importance pollution
      metadata: {
        category: input.category,
        importance: input.importance,
      },
      sessionId: input.sessionId ?? `scribe_${Date.now()}`,
      success: true,
    });

    return {
      committed: true,
      memoryId: entry.id,
      gateVerdict: { approved: true, reason: 'Passed VERA quality gate' },
      summary: `Stored ${input.category} memory: "${input.content.slice(0, 60)}..."`,
    };
  }
);

// ───
// SCRIBE RECALL FLOW (SC-01)
// ───

export const scribeRecall = ai.defineTool(
  {
    name: 'scribeRecall',
    description: 'Retrieve memories from the Living Archive using semantic search. Filter by category, tags, or agent. Returns most relevant memories for the given query.',
    inputSchema: ScribeRecallInputSchema,
    outputSchema: ScribeRecallOutputSchema,
  },
  async (input): Promise<z.infer<typeof ScribeRecallOutputSchema>> => {
    console.log(`[SCRIBE] \ud83d\udd0d Recall \u2014 query:"${input.query.slice(0, 60)}" limit:${input.limit}`);

    // Fix F1: Build where clause for server-side filtering via ChromaDB metadata
    const where: Record<string, unknown> = {};
    if (input.category) where['category'] = input.category;
    if (input.tags.length > 0) where['tags'] = { '$in': input.tags };

    const rawResults = await memoryBus.recall({
      query: input.query,
      agentName: input.agentName,
      limit: input.limit,
      successOnly: input.successOnly,
      // Pass where clause for server-side filtering if bus supports it
      ...(Object.keys(where).length > 0 ? { where } : {}),
    });

    // Fallback: apply client-side filter only if memoryBus doesn't support where clause
    const filtered = rawResults.filter(entry => {
      const meta = (entry as any).metadata ?? {};
      const entryCategory = meta.category ?? (entry.tags ?? []).find((t: string) => ['decision', 'pattern', 'preference', 'fact', 'bug-fix', 'session'].includes(t));
      if (input.category && entryCategory !== input.category) return false;
      if (input.tags.length > 0 && !input.tags.some(t => entry.tags?.includes(t))) return false;
      return true;
    });

    return {
      results: filtered.map(entry => {
        const meta = (entry as any).metadata ?? {};
        return {
          id: entry.id ?? `mem_${Date.now()}`,
          content: entry.outcome ?? entry.task ?? '',
          // Fix F2: Read category/importance from metadata, fall back to tag scan for legacy entries
          category: (meta.category ?? (entry.tags ?? []).find((t: string) => ['decision', 'pattern', 'preference', 'fact', 'bug-fix', 'session'].includes(t)) ?? 'session') as MemoryCategory,
          tags: entry.tags ?? [],
          importance: (meta.importance ?? (entry.tags ?? []).find((t: string) => ['low', 'medium', 'high', 'critical'].includes(t)) ?? 'medium') as MemoryImportance,
          agentName: entry.agentName ?? 'SCRIBE',
          createdAt: entry.timestamp,
        };
      }),
      totalFound: filtered.length,
      query: input.query,
    };
  }
);

// Named exports for direct import in flow wiring
export { scribeRemember as scribeRememberTool, scribeRecall as scribeRecallTool };