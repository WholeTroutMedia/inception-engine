/**
 * VERA — Truth, Memory, and Agent Coordination
 * AVERI Trinity Member #2 | Hive: AVERI | Role: Scribe + Coordinator
 *
 * VERA embodies three modes:
 *   TRUTH    — Fact-check claims, surface contradictions, validate data
 *   SCRIBE   — Extract patterns from sessions ("The Why"), maintain the Living Archive
 *   RELAY    — Coordinate inter-agent handoffs, resolve conflicts
 *
 * Constitutional: Article II (Living Archive), Article IV (Transparency),
 *                 Article VII (Knowledge Compounding), Article XI (Collaboration)
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { memoryBus } from '@inception/memory';
import { scribeRemember, scribeRecall } from '../memory/scribe.js';

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const VeraInputSchema = z.object({
    mode: z.enum(['truth', 'scribe', 'coordinate', 'critique']),
    content: z.string().describe('Content to truth-check, scribe, coordinate, or critique'),
    context: z.string().optional().describe('Additional context or session history'),
    agents: z.array(z.string()).optional().describe('Agents involved (for coordinate mode)'),
    sessionId: z.string().optional(),
    // ── Critique-mode fields ───────────────────────────────────────────────
    original_intent: z.string().optional().describe('The user intent that drove generation (critique mode)'),
    generated_output: z.string().optional().describe('The output to evaluate (critique mode)'),
});

const CritiqueScoresSchema = z.object({
    constitutional: z.number().min(0).max(1).describe('Compliance with Creative Liberation Engine constitutional articles'),
    contextual:     z.number().min(0).max(1).describe('Relevance and accuracy relative to session context'),
    intent_fidelity: z.number().min(0).max(1).describe('How closely the output matches the original intent'),
});

const VeraOutputSchema = z.object({
    verdict: z.string().describe('VERA\'s authoritative output'),
    confidence: z.number().min(0).max(1),
    contradictions: z.array(z.string()).default([]).describe('Detected contradictions or gaps'),
    pattern: z.string().optional().describe('Extracted principle for Living Archive'),
    handoff: z.object({
        agent: z.string(),
        task: z.string(),
        urgency: z.enum(['low', 'normal', 'urgent']),
    }).optional().describe('Recommended handoff for coordinate mode'),
    // ── Critique-mode output ───────────────────────────────────────────────
    critiquePass: z.boolean().optional().describe('True if output meets quality threshold (critique mode)'),
    critiqueScores: CritiqueScoresSchema.optional().describe('Per-axis evaluation scores (critique mode)'),
    revisionDirective: z.string().optional().describe('If critiquePass=false: instruction for silent retry'),
    veraSignature: z.literal('VERA').default('VERA'),
});

export type VeraInput = z.infer<typeof VeraInputSchema>;
export type VeraOutput = z.infer<typeof VeraOutputSchema>;
export type CritiqueScores = z.infer<typeof CritiqueScoresSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// VERA FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const VERAFlow = ai.defineFlow(
    {
        name: 'VERA',
        inputSchema: VeraInputSchema,
        outputSchema: VeraOutputSchema,
    },
    async (input): Promise<VeraOutput> => {
        const sessionId = input.sessionId ?? `vera_${Date.now()}`;

        const systemPrompt = `You are VERA — the White agent of the AVERI Trinity. You are Truth, Memory, and Coordination.

Your three modes:
- TRUTH: Analyze content for factual accuracy, logical contradictions, missing evidence. Confidence score 0-1.
- SCRIBE: Extract the single most important reusable principle ("The Why") from a completed session. Format: "When [context], [action] because [reason]."
- COORDINATE: Assess inter-agent conflict or task handoff. Determine which agent should own next step and at what urgency.

You are the binding force of the AVERI Trinity. You do not speculate — you validate, record, and route.

Constitutional articles you embody: II (Living Archive), IV (Transparency), VII (Knowledge Compounding), XI (Collaboration Protocol).

You have access to scribeRemember and scribeRecall tools. Call scribeRemember when you:
- Complete a SCRIBE mode session with a valuable principle worth archiving (category: 'pattern', importance: 'high')
- Detect a critical contradiction worth flagging for future sessions (category: 'fact', importance: 'high')
- Resolve a coordination conflict with a reusable routing rule (category: 'decision', importance: 'medium')
Call scribeRecall at the start of any TRUTH or SCRIBE session to check if similar content was previously validated.`;

        // Pre-flight memory recall via SCRIBE v2
        const pastMemories = await scribeRecall({
            query: input.content,
            agentName: 'VERA',
            limit: 3,
            tags: [],
            successOnly: false,
        });
        const pastEpisodes = pastMemories.results;
        const memoryContext = pastEpisodes.length > 0
            ? `\n\nRelevant past episodes:\n${pastEpisodes.map(e => `- ${e.content.slice(0, 120)}`).join('\n')}`
            : '';

        const modeInstructions = {
            truth: `Mode: TRUTH\nAnalyze this content for factual accuracy and internal contradictions. Rate your confidence 0-1.\n\nContent:\n${input.content}${memoryContext}`,
            scribe: `Mode: SCRIBE\nExtract the single most reusable principle from this session. This becomes permanent knowledge in the Living Archive.\n\nSession content:\n${input.content}${input.context ? `\n\nContext:\n${input.context}` : ''}`,
            coordinate: `Mode: COORDINATE\nAgents involved: ${input.agents?.join(', ') || 'unspecified'}\nTask/conflict:\n${input.content}\n\nDetermine the correct handoff agent and urgency level.`,
            critique: `Mode: CRITIQUE\nEvaluate the generated output against the original intent. Score each axis 0.0–1.0 (1.0 = perfect).

ORIGINAL INTENT:
${input.original_intent ?? '(not provided — infer from generated_output context)'}

GENERATED OUTPUT:
${input.generated_output ?? input.content}

SCORING AXES:
- constitutional (0–1): Does the output comply with all active constitutional articles? Articles IX (complete work), XX (zero wait), IV (transparency), VI (model agnosticism).
- contextual (0–1): Is the output contextually accurate, relevant, and free of hallucinations relative to the intent?
- intent_fidelity (0–1): How precisely does the output address what was actually asked? Penalize drift, over-generalization, and missed specifics.

PASS THRESHOLD: average of axes ≥ 0.65.

If critiquePass=false, write a concise revisionDirective that the model can use in a single retry to correct the output. Be specific — name exactly what was wrong and what to fix. Maximum 2 sentences.`,
        };

        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: systemPrompt,
            prompt: modeInstructions[input.mode],
            output: { schema: VeraOutputSchema },
            config: { temperature: 0.1 },
            tools: [scribeRemember, scribeRecall],
        });

        if (!output) {
            return {
                verdict: 'VERA unavailable — truth check deferred',
                confidence: 0,
                contradictions: [],
                veraSignature: 'VERA',
            };
        }

        // Post-flight: VERA in SCRIBE mode auto-commits the extracted pattern
        if (input.mode === 'scribe' && output.pattern) {
            await scribeRemember({
                content: output.pattern,
                category: 'pattern',
                importance: 'high',
                tags: ['averi-trinity', 'vera', 'scribe-extract', 'living-archive'],
                agentName: 'VERA',
                sessionId,
                skipGate: false,
            });
        } else {
            // Non-scribe modes: lightweight memoryBus commit
            await memoryBus.commit({
                agentName: 'VERA',
                task: `[${input.mode.toUpperCase()}] ${input.content.slice(0, 80)}`,
                outcome: output.verdict.slice(0, 200),
                tags: ['averi-trinity', 'vera', input.mode],
                sessionId,
                success: true,
            });
        }

        return { ...output, veraSignature: 'VERA' };
    }
);

