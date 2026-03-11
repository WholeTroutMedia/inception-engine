/**
 * DIRA-03: VERA Auto-Resolve Flow
 * packages/genkit/src/dira/auto-resolve.ts
 *
 * When a new ProductionCase arrives:
 *   1. scribeRecall against 'production_cases' collection (limit=5)
 *   2. If top match similarity >= 0.85 AND previous outcome = 'auto-resolved' / 'success'
 *      -> auto-apply stored resolution without human
 *   3. Log decision to audit trail via productionCaseToScribeInput (unified tag contract)
 *   4. Otherwise flag for escalation
 *
 * Source: IECR Google Doc Tab 8 - 70% productivity thesis
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { scribeRecall, scribeRemember } from '../memory/scribe.js';
import { productionCaseToScribeInput } from './types.js';
import {
  createProductionCase,
  ProductionCaseType,
  ProductionCaseOutcome,
  PRODUCTION_CASES_COLLECTION,
} from './types.js';

// -----------------------------------------------------------------------
// SCHEMAS
// -----------------------------------------------------------------------

const AutoResolveInputSchema = z.object({
  type: z.enum(['exception','quality','distribution','curation','performance','coordination'])
        .describe('Production case type'),
  workflow: z.string().describe('Which workflow step generated this case'),
  trigger: z.string().describe('Error message or failure description'),
  reportedBy: z.string().default('system'),
  tags: z.array(z.string()).default([]),
});

const AutoResolveOutputSchema = z.object({
  caseId: z.string(),
  autoResolved: z.boolean(),
  resolution: z.string(),
  outcome: z.enum(['auto-resolved','escalated','partial']),
  matchSimilarity: z.number().optional(),
  matchedCaseId: z.string().optional(),
  auditNote: z.string(),
});

export type AutoResolveInput = z.infer<typeof AutoResolveInputSchema>;
export type AutoResolveOutput = z.infer<typeof AutoResolveOutputSchema>;

// -----------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------

const AUTO_RESOLVE_THRESHOLD = 0.85;

// -----------------------------------------------------------------------
// DIRA AUTO-RESOLVE FLOW
// -----------------------------------------------------------------------

export const DIRAAutoResolveFlow = ai.defineFlow(
  {
    name: 'DIRA_AutoResolve',
    inputSchema: AutoResolveInputSchema,
    outputSchema: AutoResolveOutputSchema,
  },
  async (input): Promise<AutoResolveOutput> => {
    const startTime = Date.now();
    console.log(`[DIRA] New case - type: ${input.type}, workflow: ${input.workflow}`);
    console.log(`[DIRA] Trigger: ${input.trigger.slice(0, 120)}`);

    // Phase 1: Recall similar past cases from corpus
    let recallResult: Awaited<ReturnType<typeof scribeRecall>>;
    try {
      recallResult = await scribeRecall({
        query: `${input.type} ${input.workflow} ${input.trigger}`,
        limit: 5,
        tags: [input.type, input.workflow, ...input.tags],
        successOnly: false,
      });
    } catch (err) {
      console.warn('[DIRA] ⚠️ Recall failed — defaulting to escalation:', err);
      recallResult = { results: [], totalFound: 0, query: input.trigger };
    }

    const memories = recallResult.results ?? [];

    // Phase 2: Find best matching case above threshold
    const bestMatch = memories.find((m: { relevanceScore?: number; tags?: string[] }) =>
      (m.relevanceScore ?? 0) >= AUTO_RESOLVE_THRESHOLD &&
      (m.tags?.includes('auto-resolved') === true)
    );

    let resolution: string;
    let outcome: ProductionCaseOutcome;
    let autoResolved: boolean;
    let matchSimilarity: number | undefined;
    let matchedCaseId: string | undefined;

    if (bestMatch) {
      // Auto-resolve: apply stored resolution
      resolution = bestMatch.content ?? 'Apply previous resolution (see matched case)';
      outcome = 'auto-resolved';
      autoResolved = true;
      matchSimilarity = bestMatch.relevanceScore;
      matchedCaseId = bestMatch.id;
      console.log(`[DIRA] ✅ AUTO-RESOLVE - match: ${matchedCaseId} (${(matchSimilarity! * 100).toFixed(1)}% similarity)`);
    } else {
      // Escalate for human decision
      outcome = 'escalated';
      autoResolved = false;
      resolution = `No auto-resolve match found (best: ${
        memories.length > 0
          ? `${((memories[0].relevanceScore ?? 0) * 100).toFixed(1)}%`
          : 'no matches'
      }). Escalating to human.`;
      console.log(`[DIRA] ⚠️ ESCALATE — no high-confidence match`);
    }

    // Phase 3: Record new case to corpus for future matching
    const newCase = createProductionCase({
      type: input.type as ProductionCaseType,
      workflow: input.workflow,
      trigger: input.trigger,
      resolution,
      outcome,
      autoResolved,
      matchSimilarity,
      matchedCaseId,
      timeToResolve: Date.now() - startTime,
      tags: [input.type, input.workflow, outcome, ...input.tags],
      reportedBy: input.reportedBy,
    });

    const scribeInput = productionCaseToScribeInput(newCase);
    await scribeRemember(scribeInput);

    const auditNote = autoResolved
      ? `Auto-resolved using case ${matchedCaseId} (${(matchSimilarity! * 100).toFixed(1)}% match). No human required. ⚡`
      : `Escalated. No match above ${AUTO_RESOLVE_THRESHOLD * 100}% threshold. Human decision required. 🔴`;

    return {
      caseId: newCase.id,
      autoResolved,
      resolution,
      outcome,
      matchSimilarity,
      matchedCaseId,
      auditNote,
    };
  }
);