/**
 * COMET — Constitutional Pre-flight Reviewer (Phase F)
 *
 * Every MixedActionPlan passes through LEX and COMPASS before execution.
 * This is non-negotiable — constitutional compliance is baked into the
 * execution pipeline at the deepest level, not bolted on as a UI feature.
 *
 * VERDICTS:
 *   APPROVED  — Execute immediately, full autonomy
 *   REVIEW    — Execute in supervised mode (per-node user confirmation)
 *   BLOCKED   — Plan never executes. Returns 403 to caller.
 *
 * The 20-article Inception Constitution is the governance layer.
 * Key articles that govern COMET:
 *   Article I   — Sovereignty (no external data exfiltration)
 *   Article V   — Transparency (plans shown before execution)
 *   Article VII — Privacy First (PII handling)
 *   Article IX  — Human In The Loop (irreversible actions require confirmation)
 *   Article XII — No Harm (malicious task detection)
 *
 * — "The constitution is not a list of rules. It is a value system." —
 */

import type { MixedActionPlan } from '../types.js';

const GENKIT_URL = process.env.GENKIT_URL ?? 'http://genkit:4100';

// ─── Preflight Result ─────────────────────────────────────────────────────────

export interface PreflightResult {
    verdict: 'APPROVED' | 'REVIEW' | 'BLOCKED';
    reasoning: string;
    flagged_nodes: string[];        // node_ids that triggered flags
    article_violations: Array<{
        article: number;
        article_name: string;
        description: string;
        severity: 'info' | 'warning' | 'blocker';
    }>;
    confidence: number;              // 0.0-1.0 LLM confidence in verdict
    reviewed_at: string;
    reviewer: 'heuristic' | 'genkit' | 'hybrid';
}

// ─── Heuristic Pre-flight ─────────────────────────────────────────────────────
// Fast pattern matching for obviously safe/blocked plans.
// No LLM calls. Sub-millisecond.

function heuristicPreFlight(plan: MixedActionPlan): Partial<PreflightResult> {
    const flaggedNodes: string[] = [];
    const violations: PreflightResult['article_violations'] = [];

    for (const node of plan.nodes) {
        if (node.type !== 'ui') continue;

        const desc = node.description.toLowerCase();
        const selector = node.selector.toLowerCase();

        // Article XII — No Harm: detect clearly malicious patterns
        const maliciousPatterns = [
            /\b(delete.?(all|account|data|user)|drop.?table|rm\s+-rf|format|wipe)\b/i,
            /\b(send.?(spam|phishing)|scrape.?(email|password|credit.?card))\b/i,
            /(exec|eval|system|shell|cmd)\s*\(/i,
        ];

        for (const pattern of maliciousPatterns) {
            if (pattern.test(desc) || pattern.test(selector)) {
                flaggedNodes.push(node.node_id);
                violations.push({ article: 12, article_name: 'No Harm', description: `Potentially malicious action detected: "${desc.slice(0, 60)}"`, severity: 'blocker' });
            }
        }

        // Article VII — Privacy First: PII handling
        if (node.reads_pii || /\b(password|ssn|credit.?card|dob|social.?security)\b/i.test(desc)) {
            if (!flaggedNodes.includes(node.node_id)) flaggedNodes.push(node.node_id);
            violations.push({ article: 7, article_name: 'Privacy First', description: `PII access detected: ${desc.slice(0, 60)}`, severity: 'warning' });
        }

        // Article IX — Human In The Loop: irreversible writes
        if (node.writes_data && node.action === 'click' && /\b(submit|confirm|delete|pay|purchase|buy|checkout|send|post)\b/i.test(desc)) {
            if (!flaggedNodes.includes(node.node_id)) flaggedNodes.push(node.node_id);
            violations.push({ article: 9, article_name: 'Human In The Loop', description: `Potentially irreversible action: "${desc.slice(0, 60)}"`, severity: 'warning' });
        }
    }

    // Article I: Check for external exfiltration patterns
    const externalDomains = plan.nodes
        .filter(n => n.type === 'ui' && (n as any).action === 'navigate')
        .filter(n => {
            try { return new URL((n as any).selector).hostname !== plan.domain; } catch { return false; }
        });

    if (externalDomains.length > 2) {
        violations.push({ article: 1, article_name: 'Sovereignty', description: `Plan navigates to ${externalDomains.length} external domains — potential data exfiltration risk`, severity: 'warning' });
    }

    const blockers = violations.filter(v => v.severity === 'blocker');
    const warnings = violations.filter(v => v.severity === 'warning');

    if (blockers.length > 0) {
        return { verdict: 'BLOCKED', flagged_nodes: flaggedNodes, article_violations: violations, confidence: 0.95, reviewer: 'heuristic' };
    }
    if (warnings.length > 0) {
        return { verdict: 'REVIEW', flagged_nodes: flaggedNodes, article_violations: violations, confidence: 0.8, reviewer: 'heuristic' };
    }
    return { verdict: 'APPROVED', flagged_nodes: flaggedNodes, article_violations: violations, confidence: 0.85, reviewer: 'heuristic' };
}

// ─── PreflightReviewer ────────────────────────────────────────────────────────

export class PreflightReviewer {
    /**
     * Review a MixedActionPlan against the Inception Constitution.
     * Heuristics first. Genkit for ambiguous plans.
     */
    async review(plan: MixedActionPlan): Promise<PreflightResult> {
        // Phase 1: Fast heuristic check
        const heuristic = heuristicPreFlight(plan);

        // Confirmed block — no LLM needed
        if (heuristic.verdict === 'BLOCKED') {
            return {
                verdict: 'BLOCKED',
                reasoning: `Heuristic review blocked this plan: ${(heuristic.article_violations ?? []).filter((v: PreflightResult['article_violations'][number]) => v.severity === 'blocker').map((v: PreflightResult['article_violations'][number]) => `Article ${v.article} (${v.article_name}): ${v.description}`).join('; ')}`,
                flagged_nodes: heuristic.flagged_nodes ?? [],
                article_violations: heuristic.article_violations ?? [],
                confidence: heuristic.confidence ?? 0.95,
                reviewed_at: new Date().toISOString(),
                reviewer: 'heuristic',
            };
        }

        // Phase 2: Ambiguous or sensitive — send to Genkit for deeper review
        const needsLLM = heuristic.verdict === 'REVIEW' ||
            plan.estimated_reads_pii ||
            plan.estimated_writes_data ||
            plan.nodes.length > 10;

        if (!needsLLM) {
            return {
                verdict: 'APPROVED',
                reasoning: `Heuristic review: no concerning patterns detected in ${plan.nodes.length} plan nodes. Plan touches domain: ${plan.domain}.`,
                flagged_nodes: [],
                article_violations: [],
                confidence: 0.85,
                reviewed_at: new Date().toISOString(),
                reviewer: 'heuristic',
            };
        }

        // Phase 3: Genkit constitutional review
        return await this.genkitReview(plan, heuristic);
    }

    private async genkitReview(plan: MixedActionPlan, heuristic: Partial<PreflightResult>): Promise<PreflightResult> {
        const planSummary = plan.nodes
            .map((n, i) => `  ${i + 1}. [${n.type}] ${n.type === 'ui' ? `${(n as any).action} → ${n.description}` : n.description}`)
            .join('\n');

        const prompt = `You are the constitutional reviewer for the Creative Liberation Engine COMET browser agent.

THE INCEPTION CONSTITUTION (key articles for browser actions):
- Article I  (Sovereignty): No user data may be exfiltrated to external services without explicit consent.
- Article V  (Transparency): All automated actions must be auditable and explainable.
- Article VII (Privacy First): PII (passwords, personal data, payment info) requires heightened scrutiny.
- Article IX (Human In The Loop): Irreversible actions (purchases, deletions, posts) require confirmation.
- Article XII (No Harm): Plans with potential for malicious use must be BLOCKED immediately.

PLAN TO REVIEW:
Instruction: "${plan.instruction}"
Domain: ${plan.domain}
Platform: ${plan.platform}
Steps:
${planSummary}

Estimated PII access: ${plan.estimated_reads_pii}
Estimated data writes: ${plan.estimated_writes_data}
Steps requiring confirmation: ${plan.steps_requiring_confirmation.length}

HEURISTIC FLAGS: ${(heuristic.article_violations ?? []).map((v: PreflightResult['article_violations'][number]) => `Article ${v.article}: ${v.description}`).join('; ') || 'none'}

Return JSON only:
{
  "verdict": "APPROVED|REVIEW|BLOCKED",
  "reasoning": "...",
  "flagged_nodes": ["node_001", "node_002"],
  "confidence": 0.85
}

APPROVED: Proceed automatically.
REVIEW: Proceed in supervised mode (user confirms each flagged node).
BLOCKED: Refuse execution entirely.`;

        try {
            const res = await fetch(`${GENKIT_URL}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'googleai/gemini-2.0-flash',
                    prompt,
                    output: { format: 'json' },
                }),
                signal: AbortSignal.timeout(20000),
            });

            if (!res.ok) throw new Error(`Genkit ${res.status}`);
            const data = await res.json();
            const parsed = JSON.parse(data.text ?? data.output ?? '{}');

            return {
                verdict: parsed.verdict ?? heuristic.verdict ?? 'REVIEW',
                reasoning: parsed.reasoning ?? 'Genkit constitutional review complete.',
                flagged_nodes: parsed.flagged_nodes ?? heuristic.flagged_nodes ?? [],
                article_violations: heuristic.article_violations ?? [],
                confidence: parsed.confidence ?? 0.75,
                reviewed_at: new Date().toISOString(),
                reviewer: 'hybrid',
            };
        } catch (err: any) {
            console.warn(`[COMET/PREFLIGHT] Genkit unavailable, defaulting to heuristic verdict: ${err.message}`);
            return {
                verdict: heuristic.verdict ?? 'REVIEW',
                reasoning: `Genkit unavailable. Heuristic verdict: ${heuristic.verdict}. ${(heuristic.article_violations ?? []).map((v: PreflightResult['article_violations'][number]) => v.description).join('; ')}`,
                flagged_nodes: heuristic.flagged_nodes ?? [],
                article_violations: heuristic.article_violations ?? [],
                confidence: 0.7,
                reviewed_at: new Date().toISOString(),
                reviewer: 'heuristic',
            };
        }
    }
}
