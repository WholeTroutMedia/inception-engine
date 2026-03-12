/**
 * vt220 Memory Quality Gate — Genkit Flow
 *
 * Formal evaluation pipeline for klogd memory write proposals.
 * Runs as a standalone flow so it can be called directly from
 * tests, dashboards, or manually during VALIDATE mode.
 *
 * Evaluation criteria (each graded 0-25 pts):
 *   1. Specificity  — Is the content precise and actionable?
 *   2. Future value — Would this be useful in a future session?
 *   3. Novelty      — Is this genuinely new (not common knowledge)?
 *   4. Safety       — No PII, secrets, or constitutional violations?
 *
 * Approval threshold: score >= 60 AND safety == true
 *
 * Fast-path rules (bypass LLM call):
 *   APPROVE: importance=critical
 *   APPROVE: importance=high AND category in [decision, pattern, bug-fix]
 *   REJECT:  importance=low AND category=session
 *
 * Constitutional: Article IX (Ship Complete), Article III (Human Supremacy — no PII)
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { MemoryCategory, MemoryImportance } from './klogd.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const VERAGateInput = z.object({
    content: z.string().describe('The memory content to evaluate.'),
    category: MemoryCategory,
    importance: MemoryImportance,
    proposedBy: z.string().default('unknown').describe('Agent that proposed this memory.'),
});

export const VERAGateOutput = z.object({
    approved: z.boolean(),
    reason: z.string(),
    score: z.number().describe('0-100 quality score'),
    breakdown: z.object({
        specificity: z.number().describe('0-25: Is content precise and actionable?'),
        futureValue: z.number().describe('0-25: Useful in future sessions?'),
        novelty: z.number().describe('0-25: Not common knowledge?'),
        safety: z.number().describe('0-25: No PII, secrets, or violations?'),
    }),
    flags: z.array(z.string()).describe('Warning flags (PII detected, too vague, etc.)'),
    fastPath: z.boolean().describe('True if LLM evaluation was bypassed.'),
});

export type VERAGateResult = z.infer<typeof VERAGateOutput>;

// ---------------------------------------------------------------------------
// Importance ranking
// ---------------------------------------------------------------------------

const IMPORTANCE_RANK: Record<z.infer<typeof MemoryImportance>, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
};

// ---------------------------------------------------------------------------
// Fast-path evaluator
// ---------------------------------------------------------------------------

function fastPathEvaluate(
    input: z.infer<typeof VERAGateInput>
): z.infer<typeof VERAGateOutput> | null {
    if (input.importance === 'critical') {
        return {
            approved: true,
            reason: 'Fast-path: critical importance — always approved',
            score: 95,
            breakdown: { specificity: 25, futureValue: 25, novelty: 20, safety: 25 },
            flags: [],
            fastPath: true,
        };
    }

    if (
        IMPORTANCE_RANK[input.importance] >= 2 &&
        ['decision', 'pattern', 'bug-fix'].includes(input.category)
    ) {
        return {
            approved: true,
            reason: `Fast-path: high-value category (${input.category}) + high importance`,
            score: 85,
            breakdown: { specificity: 22, futureValue: 23, novelty: 20, safety: 20 },
            flags: [],
            fastPath: true,
        };
    }

    if (input.importance === 'low' && input.category === 'session') {
        return {
            approved: false,
            reason: 'Fast-path rejected: low-importance session noise',
            score: 15,
            breakdown: { specificity: 5, futureValue: 5, novelty: 5, safety: 0 },
            flags: ['LOW_VALUE_NOISE'],
            fastPath: true,
        };
    }

    return null; // Proceed to LLM evaluation
}

// ---------------------------------------------------------------------------
// LLM evaluator
// ---------------------------------------------------------------------------

const EVAL_SYSTEM = `You are vt220, the Creative Liberation Engine Memory Quality Gate.

Your job is to evaluate whether a memory entry is worth saving to long-term storage.

Score each dimension 0-25 and identify any flags:
1. specificity (0-25): Is the content precise, self-contained, actionable? Not vague or generic?
2. futureValue (0-25): Would this genuinely help in a future session? Not just today?
3. novelty (0-25): Is this a real insight or decision, not common knowledge anyone would know?
4. safety (0-25): Are there no PII (names, emails, passwords), no API keys, no secrets? 25=safe, 0=unsafe.

APPROVAL: total score >= 60 AND safety >= 20

Possible flags: PII_DETECTED, SECRET_DETECTED, TOO_VAGUE, COMMON_KNOWLEDGE, EPHEMERAL_ONLY, LOW_VALUE_NOISE

Respond ONLY with valid JSON:
{
  "breakdown": { "specificity": 0-25, "futureValue": 0-25, "novelty": 0-25, "safety": 0-25 },
  "flags": [],
  "reason": "brief explanation"
}`;

async function llmEvaluate(
    input: z.infer<typeof VERAGateInput>
): Promise<z.infer<typeof VERAGateOutput>> {
    const response = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        system: EVAL_SYSTEM,
        prompt: `Memory proposal:
Category: ${input.category}
Importance: ${input.importance}
Proposed by: ${input.proposedBy}
Content:
${input.content.slice(0, 800)}`,
    });

    let parsed: {
        breakdown: { specificity: number; futureValue: number; novelty: number; safety: number };
        flags: string[];
        reason: string;
    };

    try {
        parsed = JSON.parse(response.text.replace(/```json|```/g, '').trim());
    } catch {
        console.warn('[vt220:GATE] Failed to parse LLM response, using conservative defaults');
        parsed = {
            breakdown: { specificity: 12, futureValue: 12, novelty: 12, safety: 25 },
            flags: ['PARSE_ERROR'],
            reason: 'vt220 parse error — conservative score applied',
        };
    }

    const bd = parsed.breakdown;
    const score = bd.specificity + bd.futureValue + bd.novelty + bd.safety;
    const approved = score >= 60 && bd.safety >= 20;

    return {
        approved,
        reason: parsed.reason,
        score,
        breakdown: bd,
        flags: parsed.flags ?? [],
        fastPath: false,
    };
}

// ---------------------------------------------------------------------------
// SC-02: vt220MemoryGateFlow — Exported Genkit Flow
// ---------------------------------------------------------------------------

export const vt220MemoryGateFlow = ai.defineFlow(
    {
        name: 'vt220MemoryGate',
        inputSchema: VERAGateInput,
        outputSchema: VERAGateOutput,
    },
    async (input) => {
        console.log(`[vt220:GATE] 🔒 Evaluating memory: category=${input.category} importance=${input.importance} from=${input.proposedBy}`);

        // Try fast path first
        const fast = fastPathEvaluate(input);
        if (fast) {
            console.log(`[vt220:GATE] ⚡ Fast-path: ${fast.approved ? '✅ APPROVED' : '❌ REJECTED'} — ${fast.reason}`);
            return fast;
        }

        // Full LLM evaluation
        try {
            const result = await llmEvaluate(input);
            const status = result.approved ? '✅ APPROVED' : '❌ REJECTED';
            console.log(`[vt220:GATE] ${status} (score=${result.score}) — ${result.reason}`);

            if (result.flags.length > 0) {
                console.warn(`[vt220:GATE] ⚠️  Flags: ${result.flags.join(', ')}`);
            }

            return result;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[vt220:GATE] LLM evaluation failed: ${msg}`);

            const importanceRank = IMPORTANCE_RANK[input.importance];
            return {
                approved: importanceRank >= 2,
                reason: `vt220 gate unavailable (${msg}) — fallback based on importance`,
                score: importanceRank >= 2 ? 70 : 30,
                breakdown: { specificity: 15, futureValue: 15, novelty: 15, safety: 25 },
                flags: ['VERA_UNAVAILABLE'],
                fastPath: false,
            };
        }
    }
);

// ---------------------------------------------------------------------------
// Convenience: direct programmatic call (not Genkit-wrapped)
// ---------------------------------------------------------------------------

export async function evaluateMemoryWrite(
    input: z.infer<typeof VERAGateInput>
): Promise<{ approved: boolean; reason: string; score: number }> {
    const result = await vt220MemoryGateFlow(input);
    return { approved: result.approved, reason: result.reason, score: result.score };
}

