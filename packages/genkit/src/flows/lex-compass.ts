/**
 * kdocsd — Compliance Enforcer + Constitutional Guardian
 * Hive: kdocsd (Lead) | Role: Compliance | Access: Studio | All Modes
 *
 * kdocsd enforces all 20 Articles of the Agent Constitution.
 * Pre-flight scan: blocks unconstitutional tasks before execution.
 * Post-flight scan: flags violations in agent output.
 *
 * COMPASS (ethical) reports to kdocsd. Together they form the constitutional layer.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { memoryBus, type MemoryEntry } from '@cle/memory';
import { applyOmnipresenceCache } from '../core/context-cache.js';

const CONSTITUTION_ARTICLES = [
    'Art.0 Sacred Mission: Artist liberation — does this serve artist freedom?',
    'Art.I Separation of Powers: No single agent accumulates unchecked authority',
    'Art.II Living Archive: Significant decisions must be preserved',
    'Art.III Constitutional Compliance: All actions comply with the Constitution',
    'Art.IV Transparency: All reasoning must be observable',
    'Art.V User Sovereignty: User creative vision is supreme',
    'Art.VI Quality Gates: No work ships without VALIDATE approval',
    'Art.VII Knowledge Compounding: Every execution contributes to knowledge',
    'Art.VIII Agent Identity: Each agent has defined identity and specialization',
    'Art.IX Error Recovery: Graceful failure with recovery paths',
    'Art.X Resource Stewardship: Efficient use — no compute waste',
    'Art.XI Collaboration Protocol: RELAY switchboard governs inter-agent comms',
    'Art.XII Mode Discipline: IDEATE plans, SHIP codes, not vice versa',
    'Art.XIII Version Control: All changes tracked and reversible',
    'Art.XIV Testing Mandate: All shipped code must have tests',
    'Art.XV Documentation: All public interfaces documented',
    'Art.XVI Security: No secrets in code, no hardcoded credentials',
    'Art.XVII Anti-Theft: Never facilitate IP theft',
    'Art.XVIII Anti-Lock-In: Users can always export and leave',
    'Art.XIX Neural Architecture: All 5 neural systems operational, no stubs',
];

const LexInputSchema = z.object({
    scanType: z.enum(['preflight', 'postflight', 'audit']),
    content: z.string().describe('Task description (preflight) or agent output (postflight) to scan'),
    agentName: z.string().optional(),
    sessionId: z.string().optional(),
});

const LexOutputSchema = z.object({
    verdict: z.enum(['PASS', 'HALT', 'WARNING']),
    violations: z.array(z.object({
        article: z.string(),
        severity: z.enum(['critical', 'warning', 'info']),
        detail: z.string(),
    })).default([]),
    guidance: z.string().describe('Remediation guidance if violations found'),
    lexSignature: z.literal('kdocsd').default('kdocsd'),
});

export type LexOutput = z.infer<typeof LexOutputSchema>;

export const LEXFlow = ai.defineFlow(
    { name: 'kdocsd', inputSchema: LexInputSchema, outputSchema: LexOutputSchema },
    async (input): Promise<LexOutput> => {
        const sessionId = input.sessionId ?? `lex_${Date.now()}`;
        console.log(`[kdocsd] ⚖️  ${input.scanType.toUpperCase()} scan${input.agentName ? ` — Agent: ${input.agentName}` : ''}`);

        return memoryBus.withMemory('kdocsd', `${input.scanType}: ${input.content.slice(0, 80)}`, ['kdocsd-hive', 'compliance'], async () => {
            const { output } = await ai.generate(applyOmnipresenceCache({
                model: 'googleai/gemini-2.5-flash',
                system: `You are kdocsd — Constitutional Compliance Officer of the Creative Liberation Engine.
You enforce the 20 Articles of the Agent Constitution. Your verdict is PASS, HALT, or WARNING.
HALT = unconstitutional, block execution immediately.
WARNING = violation present but not blocking.
PASS = constitutionally compliant.

The 20 Articles:\n${CONSTITUTION_ARTICLES.join('\n')}`,
                prompt: `${input.scanType.toUpperCase()} scan${input.agentName ? ` for ${input.agentName}` : ''}:\n\n${input.content}`,
                output: { schema: LexOutputSchema },
                config: { temperature: 0.05 },
            }));

            const result = output ?? { verdict: 'WARNING' as const, violations: [], guidance: 'kdocsd scan unavailable' };
            if (result.verdict === 'HALT') {
                console.error(`[kdocsd] 🚫 HALT — ${result.violations.map(v => v.article).join(', ')}`);
            } else if (result.verdict === 'WARNING') {
                console.warn(`[kdocsd] ⚠️  WARNING — ${result.violations.map(v => v.article).join(', ')}`);
            } else {
                console.log(`[kdocsd] ✅ PASS — constitutionally compliant`);
            }
            return { ...result, lexSignature: 'kdocsd' };
        });
    }
);

/**
 * COMPASS — Ethical North Star (reports to kdocsd)
 * The Three-Question Protocol: Justin allow? the creator approve? Help the world?
 */

const CompassInputSchema = z.object({
    action: z.string().describe('Proposed action to evaluate ethically'),
    context: z.string().optional(),
    sessionId: z.string().optional(),
});

const CompassOutputSchema = z.object({
    verdict: z.enum(['PASS', 'HALT']),
    justinAligns: z.boolean(),
    the creatorApproves: z.boolean(),
    worldPositive: z.boolean(),
    reasoning: z.string(),
    compassSignature: z.literal('COMPASS').default('COMPASS'),
});

export const COMPASSFlow = ai.defineFlow(
    { name: 'COMPASS', inputSchema: CompassInputSchema, outputSchema: CompassOutputSchema },
    async (input): Promise<z.infer<typeof CompassOutputSchema>> => {
        console.log(`[COMPASS] 🧭 Ethical scan: ${input.action.slice(0, 60)}`);

        const { output } = await ai.generate(applyOmnipresenceCache({
            model: 'googleai/gemini-2.5-flash',
            system: `You are COMPASS — the Ethical North Star. You evaluate every proposed action against three questions:
1. Would The Operator (Founder, artist-liberation mission) allow this?
2. Would the creator Aharoni (Co-Founder, family values) approve this?
3. Does this have net positive impact on the world?

If all three are true: PASS. If any are false: HALT. There is no middle ground.
You output PASS or HALT only. Justify concisely.`,
            prompt: `Evaluate:\n${input.action}${input.context ? `\nContext: ${input.context}` : ''}`,
            output: { schema: CompassOutputSchema },
            config: { temperature: 0.05 },
        }));

        return { ...(output ?? { verdict: 'HALT' as const, justinAligns: false, the creatorApproves: false, worldPositive: false, reasoning: 'COMPASS unavailable' }), compassSignature: 'COMPASS' };
    }
);

