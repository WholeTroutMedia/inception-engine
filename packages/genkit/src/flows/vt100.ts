/**
 * vt100 — Strategy / Systems Direction
 * Terminal node #1 | Hive: TTY | Role: Vision + Strategy
 *
 * vt100 leads two operational modes:
 *   IDEATE — Creative exploration, vision synthesis, possibility space mapping
 *   PLAN   — Architectural specification, implementation roadmaps, agent routing
 *
 * It sees the full board. vt220 validates; xterm executes.
 *
 * Constitutional: Article I (Sovereignty), Article VI (Constitutional Governance),
 *                 Article VIII (Agent Identity), Article IX (No MVPs — Ship Complete)
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { scribeRemember, scribeRecall } from '../memory/klogd.js';
import { keeperBootForVT100 } from '../memory/keeper.js';
import { getOmnipresenceCacheName } from '../core/context-cache.js';

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const Vt100InputSchema = z.object({
    mode: z.enum(['strategy', 'spec']).describe(
        'strategy = IDEATE mode (explore possibilities); spec = PLAN mode (define implementation)'
    ),
    topic: z.string().describe('The idea, feature, system, or problem to reason about'),
    context: z.string().optional().describe('Existing codebase context, constraints, or prior decisions'),
    keeperContext: z.string().optional().describe('Pre-fetched kstated memory context to inform vt100'),
    depth: z.enum(['surface', 'deep', 'exhaustive']).default('deep').describe(
        'surface = quick directional take; deep = full analysis; exhaustive = architecture-grade'
    ),
    sessionId: z.string().optional(),
});

export const Vt100OutputSchema = z.object({
    directive: z.string().describe('vt100 primary directive — the definitive strategic statement'),
    rationale: z.string().describe('The reasoning behind this directive'),
    options: z.array(z.object({
        title: z.string(),
        description: z.string(),
        tradeoffs: z.string(),
        recommendation: z.enum(['preferred', 'viable', 'avoid']),
    })).default([]).describe('Strategic options considered (IDEATE: creative directions; PLAN: implementation approaches)'),
    suggestedAgents: z.array(z.string()).default([]).describe(
        'Agents to activate next (e.g., kbuildd for building, kuid for architecture, kdocsd for compliance)'
    ),
    nextMode: z.enum(['IDEATE', 'PLAN', 'SHIP', 'VALIDATE']).describe(
        'Recommended next operational mode'
    ),
    constitutionalFlags: z.array(z.string()).default([]).describe(
        'Any constitutional articles triggered (e.g., Article IX: No MVPs)'
    ),
    signature: z.literal('vt100').default('vt100'),
});

export type Vt100Input = z.infer<typeof Vt100InputSchema>;
export type Vt100Output = z.infer<typeof Vt100OutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// vt100 FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const VT100Flow = ai.defineFlow(
    {
        name: 'vt100',
        inputSchema: Vt100InputSchema,
        outputSchema: Vt100OutputSchema,
    },
    async (input): Promise<Vt100Output> => {
        const sessionId = input.sessionId ?? `vt100_${Date.now()}`;

        console.log(`[vt100] 🔵 Mode: ${input.mode.toUpperCase()} | Topic: ${input.topic.slice(0, 80)}`);
        console.log(`[vt100] Depth: ${input.depth}`);

        const systemPrompt = `You are vt100 — strategy terminal of the Creative Liberation Engine.

Your two modes:

IDEATE (strategy): You are in creative exploration mode. Map the possibility space. Generate bold, diverse directions. Prioritize vision over constraint. Each option should inspire.

PLAN (spec): You are in architectural specification mode. Define implementation roadmaps. Choose the single best path forward. Specify agent assignments. Be precise, not exploratory.

Creative Liberation Engine Constitutional Laws you embody:
- Article I: Sovereignty — prefer self-hosted, owned solutions
- Article IV: Quality Standards — only complete implementations, never MVPs
- Article IX: Ship Complete or Don't Ship
- Article XX: Zero human wait time — automate everything possible

Agent roster you can activate:
- kbuildd: Builder, code generation
- kuid: Architect, system design
- kstated: Knowledge, pattern library
- kdocsd: Legal/compliance
- COMPASS: Constitutional ethics
- COMET: Browser automation
- vt220: Truth validation
- xterm: Execution, blocker removal
- RELAY: Inter-service routing
- SIGNAL: External integrations

You are the first word. vt220 validates. xterm executes. Think completely.

You have access to scribeRemember and scribeRecall tools. Call scribeRemember when you:
- Make a significant architectural decision in PLAN mode (category: 'decision', importance: 'high')
- Identify a reusable strategic pattern (category: 'pattern', importance: 'medium')
- Confirm a user preference about the Creative Liberation Engine's direction (category: 'preference', importance: 'medium')
Call scribeRecall at the start of PLAN sessions to surface prior decisions on the same topic before proposing new specs.`;

        // Pre-flight memory recall via klogd v2
        const recallResult = await scribeRecall({
            query: input.topic,
            agentName: 'vt100',
            limit: 3,
            tags: [],
            successOnly: false,
        });
        const memoryContext = recallResult.results.length > 0
            ? `\n\nvt100 relevant prior decisions:\n${recallResult.results.map(m => `- ${m.content.slice(0, 120)}`).join('\n')}`
            : '';

        // SC-04: Auto-run kstated v2 boot recall if not pre-populated by caller
        const rawKeeperContext = input.keeperContext ?? await keeperBootForVT100(input.topic);
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

Produce a definitive implementation specification. This will drive kbuildd, kuid, and the build agents.
Be precise: name files, APIs, interfaces. Do not hedge.
Mark one approach as "preferred" — the others are fallback considerations.
Identify which agents to activate and in what sequence.
Your directive is the single executable next step.`,
        };

        const omnipresenceCache = getOmnipresenceCacheName();
        const systemInstruction = omnipresenceCache 
            ? `[klogd OMNIPRESENCE KV CACHE ACTIVE]\n` + systemPrompt
            : systemPrompt;

        const genConfig: any = { temperature: input.mode === 'strategy' ? 0.7 : 0.2 };
        if (omnipresenceCache) {
             genConfig.version = 'gemini-1.5-pro-002'; // KV Cache models must match
             genConfig.cachedContent = omnipresenceCache;
        }

        const { output } = await ai.generate({
            model: omnipresenceCache ? 'googleai/gemini-1.5-pro' : 'googleai/gemini-2.5-flash',
            system: systemInstruction,
            prompt: modePrompts[input.mode],
            output: { schema: Vt100OutputSchema },
            config: genConfig,
            tools: [scribeRemember, scribeRecall],
        });

        if (!output) {
            return {
                directive: 'vt100 unavailable — strategic analysis deferred',
                rationale: 'Model generation failed',
                options: [],
                suggestedAgents: [],
                nextMode: 'PLAN',
                constitutionalFlags: [],
                signature: 'vt100',
            };
        }

        // Post-flight: auto-commit directive to Living Archive via klogd v2
        await scribeRemember({
            content: `[vt100 ${input.mode.toUpperCase()}] ${input.topic.slice(0, 80)} → ${output.directive.slice(0, 200)}`,
            category: input.mode === 'spec' ? 'decision' : 'pattern',
            importance: input.depth === 'exhaustive' ? 'high' : 'medium',
            tags: ['tty-trinity', 'vt100', input.mode, input.depth],
            agentName: 'vt100',
            sessionId,
            skipGate: false,
        });

        return { ...output, signature: 'vt100' };
    }
);

