/**
 * ATHENA — Strategist, Architect & Lead of the AVERI Trinity
 * AVERI Trinity Member #1 | Hive: AVERI | Role: Vision + Strategy
 *
 * ATHENA leads two operational modes:
 *   IDEATE — Creative exploration, vision synthesis, possibility space mapping
 *   PLAN   — Architectural specification, implementation roadmaps, agent routing
 *
 * She sees the full board. VERA validates her truth; IRIS executes her directives.
 *
 * Constitutional: Article I (Sovereignty), Article VI (Constitutional Governance),
 *                 Article VIII (Agent Identity), Article IX (No MVPs — Ship Complete)
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { scribeRemember, scribeRecall } from '../memory/scribe.js';
import { keeperBootForATHENA } from '../memory/keeper.js';

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const AthenaInputSchema = z.object({
    mode: z.enum(['strategy', 'spec']).describe(
        'strategy = IDEATE mode (explore possibilities); spec = PLAN mode (define implementation)'
    ),
    topic: z.string().describe('The idea, feature, system, or problem to reason about'),
    context: z.string().optional().describe('Existing codebase context, constraints, or prior decisions'),
    keeperContext: z.string().optional().describe('Pre-fetched KEEPER memory context to inform ATHENA'),
    depth: z.enum(['surface', 'deep', 'exhaustive']).default('deep').describe(
        'surface = quick directional take; deep = full analysis; exhaustive = architecture-grade'
    ),
    sessionId: z.string().optional(),
});

export const AthenaOutputSchema = z.object({
    directive: z.string().describe('ATHENA\'s primary directive — the definitive strategic statement'),
    rationale: z.string().describe('The reasoning behind this directive'),
    options: z.array(z.object({
        title: z.string(),
        description: z.string(),
        tradeoffs: z.string(),
        recommendation: z.enum(['preferred', 'viable', 'avoid']),
    })).default([]).describe('Strategic options considered (IDEATE: creative directions; PLAN: implementation approaches)'),
    suggestedAgents: z.array(z.string()).default([]).describe(
        'Agents to activate next (e.g., BOLT for building, AURORA for architecture, LEX for compliance)'
    ),
    nextMode: z.enum(['IDEATE', 'PLAN', 'SHIP', 'VALIDATE']).describe(
        'Recommended next operational mode'
    ),
    constitutionalFlags: z.array(z.string()).default([]).describe(
        'Any constitutional articles triggered (e.g., Article IX: No MVPs)'
    ),
    athenaSignature: z.literal('ATHENA').default('ATHENA'),
});

export type AthenaInput = z.infer<typeof AthenaInputSchema>;
export type AthenaOutput = z.infer<typeof AthenaOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ATHENA FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const ATHENAFlow = ai.defineFlow(
    {
        name: 'ATHENA',
        inputSchema: AthenaInputSchema,
        outputSchema: AthenaOutputSchema,
    },
    async (input): Promise<AthenaOutput> => {
        const sessionId = input.sessionId ?? `athena_${Date.now()}`;

        console.log(`[ATHENA] 🔵 Mode: ${input.mode.toUpperCase()} | Topic: ${input.topic.slice(0, 80)}`);
        console.log(`[ATHENA] Depth: ${input.depth}`);

        const systemPrompt = `You are ATHENA — the Blue agent of the AVERI Trinity. You are the Strategist and Lead Architect of the Creative Liberation Engine.

Your two modes:

IDEATE (strategy): You are in creative exploration mode. Map the possibility space. Generate bold, diverse directions. Prioritize vision over constraint. Each option should inspire.

PLAN (spec): You are in architectural specification mode. Define implementation roadmaps. Choose the single best path forward. Specify agent assignments. Be precise, not exploratory.

Creative Liberation Engine Constitutional Laws you embody:
- Article I: Sovereignty — prefer self-hosted, owned solutions
- Article IV: Quality Standards — only complete implementations, never MVPs
- Article IX: Ship Complete or Don't Ship
- Article XX: Zero human wait time — automate everything possible

Agent roster you can activate:
- BOLT: Builder, code generation
- AURORA: Architect, system design
- KEEPER: Knowledge, pattern library
- LEX: Legal/compliance
- COMPASS: Constitutional ethics
- COMET: Browser automation
- VERA: Truth validation
- IRIS: Execution, blocker removal
- RELAY: Inter-service routing
- SIGNAL: External integrations

You are the first word. VERA validates your truth. IRIS executes your strategy. Think completely.

You have access to scribeRemember and scribeRecall tools. Call scribeRemember when you:
- Make a significant architectural decision in PLAN mode (category: 'decision', importance: 'high')
- Identify a reusable strategic pattern (category: 'pattern', importance: 'medium')
- Confirm a user preference about the Creative Liberation Engine's direction (category: 'preference', importance: 'medium')
Call scribeRecall at the start of PLAN sessions to surface prior decisions on the same topic before proposing new specs.`;

        // Pre-flight memory recall via SCRIBE v2
        const recallResult = await scribeRecall({
            query: input.topic,
            agentName: 'ATHENA',
            limit: 3,
            tags: [],
            successOnly: false,
        });
        const memoryContext = recallResult.results.length > 0
            ? `\n\nATHENA's relevant prior decisions:\n${recallResult.results.map(m => `- ${m.content.slice(0, 120)}`).join('\n')}`
            : '';

        // SC-04: Auto-run KEEPER v2 boot recall if not pre-populated by caller
        const rawKeeperContext = input.keeperContext ?? await keeperBootForATHENA(input.topic);
        const keeperContext = rawKeeperContext
            ? `\n\nKEEPER knowledge context:\n${rawKeeperContext}`
            : '';

        const modePrompts = {
            strategy: `Mode: IDEATE — CREATIVE EXPLORATION

Topic: ${input.topic}${input.context ? `\n\nContext:\n${input.context}` : ''}${keeperContext}${memoryContext}

Generate ${input.depth === 'surface' ? '2-3' : input.depth === 'exhaustive' ? '5-7' : '3-4'} distinct strategic directions. For each option, specify tradeoffs clearly.
Mark your single most recommended direction as "preferred".
Your directive should be the overarching vision that transcends individual options.
Suggest which operational mode to enter next (usually PLAN after IDEATE).`,

            spec: `Mode: PLAN — ARCHITECTURAL SPECIFICATION

Topic: ${input.topic}${input.context ? `\n\nContext:\n${input.context}` : ''}${keeperContext}${memoryContext}

Produce a definitive implementation specification. This will drive BOLT, AURORA, and the build agents.
Be precise: name files, APIs, interfaces. Do not hedge.
Mark one approach as "preferred" — the others are fallback considerations.
Identify which agents to activate and in what sequence.
Your directive is the single executable next step.`,
        };

        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: systemPrompt,
            prompt: modePrompts[input.mode],
            output: { schema: AthenaOutputSchema },
            config: { temperature: input.mode === 'strategy' ? 0.7 : 0.2 },
            tools: [scribeRemember, scribeRecall],
        });

        if (!output) {
            return {
                directive: 'ATHENA unavailable — strategic analysis deferred',
                rationale: 'Model generation failed',
                options: [],
                suggestedAgents: [],
                nextMode: 'PLAN',
                constitutionalFlags: [],
                athenaSignature: 'ATHENA',
            };
        }

        // Post-flight: auto-commit directive to Living Archive via SCRIBE v2
        await scribeRemember({
            content: `[ATHENA ${input.mode.toUpperCase()}] ${input.topic.slice(0, 80)} → ${output.directive.slice(0, 200)}`,
            category: input.mode === 'spec' ? 'decision' : 'pattern',
            importance: input.depth === 'exhaustive' ? 'high' : 'medium',
            tags: ['averi-trinity', 'athena', input.mode, input.depth],
            agentName: 'ATHENA',
            sessionId,
            skipGate: false,
        });

        return { ...output, athenaSignature: 'ATHENA' };
    }
);

