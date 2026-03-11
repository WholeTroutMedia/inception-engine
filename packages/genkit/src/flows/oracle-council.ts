import { z } from 'genkit';
import { ai, LOCAL_MODEL_IDS, generateWithCache, generateWithFallback, FALLBACK_CHAINS } from '../index.js';

/**
 * ORACLE COUNCIL — Ensemble Reasoning Validator
 *
 * Rather than a single task-executor, the Oracle Council is an ensemble of 
 * specialized analytical personas that independently evaluate a proposed plan 
 * or scenario before synthesizing a final verdict.
 *
 * This reduces single-model bias and ensures multi-dimensional scrutiny 
 * (Strategic, Ethical, Risk) on critical decisions.
 */

export const OracleCouncilInputSchema = z.object({
    topic: z.string().describe('The proposal, plan, or dilemma to evaluate'),
    context: z.string().optional().describe('Any necessary background information'),
});

export const OracleCouncilOutputSchema = z.object({
    strategicAnalysis: z.string().describe('The long-term vision and impact assessment'),
    ethicalAnalysis: z.string().describe('The constitutional and moral alignment assessment'),
    riskAnalysis: z.string().describe('Mitigation strategies and edge-case assessment'),
    synthesizedVerdict: z.enum(['APPROVED', 'REJECTED', 'NEEDS_REVISION']).describe('The final consensus of the Council'),
    resolution: z.string().describe('The unified recommendation derived from the three analyses'),
});

export type OracleCouncilInput = z.infer<typeof OracleCouncilInputSchema>;
export type OracleCouncilOutput = z.infer<typeof OracleCouncilOutputSchema>;

export const OracleCouncilFlow = ai.defineFlow(
    {
        name: 'OracleCouncil',
        inputSchema: OracleCouncilInputSchema,
        outputSchema: OracleCouncilOutputSchema,
    },
    async (input): Promise<OracleCouncilOutput> => {
        console.log(`[ORACLE COUNCIL] 🏛️ Council convened to evaluate: ${input.topic.slice(0, 80)}`);

        // Create the base prompt
        const promptText = `Evaluate the following proposal:\n\nTopic: ${input.topic}\n\nContext: ${input.context || 'None'}`;

        // Phase 0: Semantic Cache Check
        try {
            const cacheCheck = await generateWithCache(ai, {
                model: 'SYSTEM_CACHE_PROXY',
                prompt: promptText + "\n[ORACLE_COUNCIL_FULL_RUN]"
            } as any, { similarityThreshold: 0.98, collectionName: 'oracle_council_cache', verbose: true }) as any;

            if (cacheCheck?.custom?.cacheHit && typeof cacheCheck.text === 'function') {
                console.log(`[ORACLE COUNCIL] ⚡ Semantic Cache Hit! Retrieving previous verdict.`);
                return JSON.parse(cacheCheck.text());
            }
        } catch (e) {
            // cache miss
        }

        console.log(`[ORACLE COUNCIL] ⏳ Running independent persona analyses (Hybrid Cloud/Local Execution)...`);

        const strategicPromise = generateWithFallback(ai, {
            model: 'SYSTEM_ROUTER_TIER3',
            prompt: promptText + `\n\nProvide your analysis from the strategic perspective. Focus on long-term viability, market positioning, and resource utilization.`,
            config: { temperature: 0.3, loras: ['warren-buffett-finance'] } as any,
        } as any, FALLBACK_CHAINS.tier3Max);

        const ethicalPromise = ai.generate({
            model: `ollama/${LOCAL_MODEL_IDS.fast}`,
            prompt: promptText + `\n\nProvide your analysis from the ethical and constitutional perspective. Focus on sovereignty, fairness, and alignment with the Creative Liberation Engine 20 Articles.`,
            config: { temperature: 0.1, loras: ['constitutional-originalist'] } as any,
        });

        const riskPromise = ai.generate({
            model: `ollama/${LOCAL_MODEL_IDS.fast}`,
            prompt: promptText + `\n\nProvide your analysis from the risk mitigation perspective. Focus on attack vectors, edge cases, technical debt, and worst-case scenarios.`,
            config: { temperature: 0.2, loras: ['stoic-philosophy'] } as any,
        });

        const [strategicResult, ethicalResult, riskResult] = await Promise.all([
            strategicPromise, ethicalPromise, riskPromise
        ]);

        const strategic = strategicResult.text ?? '';
        const ethical = ethicalResult.text;
        const risk = riskResult.text;

        console.log(`[ORACLE COUNCIL] ⚖️ Synthesis phase initiated...`);

        const synthesisPrompt = `You are the Speaker of the Oracle Council. You must review three independent analyses of a proposal and synthesize a final verdict.

Proposal:
${input.topic}

Strategic Analysis:
${strategic}

Ethical Analysis:
${ethical}

Risk Analysis:
${risk}

Synthesize these views into a final resolution, and issue a definitive verdict (APPROVED, REJECTED, or NEEDS_REVISION). If any analysis raises a constitutional or critical safety violation, the verdict must not be APPROVED.`;

        const { output } = await generateWithFallback(ai, {
            model: 'SYSTEM_ROUTER_TIER3',
            prompt: synthesisPrompt,
            output: { schema: OracleCouncilOutputSchema },
            config: { temperature: 0.2 }
        } as any, FALLBACK_CHAINS.tier3Max);

        if (!output) {
            throw new Error('Oracle Council failed to reach a synthesized verdict.');
        }

        console.log(`[ORACLE COUNCIL] 📜 Verdict Reached: ${output.synthesizedVerdict}`);

        const finalPayload = {
            ...output,
            strategicAnalysis: strategic,
            ethicalAnalysis: ethical,
            riskAnalysis: risk
        };

        return finalPayload as OracleCouncilOutput;
    }
);
