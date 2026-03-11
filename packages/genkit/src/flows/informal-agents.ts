import { ai, z } from '../index.js';
import { recordAgentCall } from './index.js';

// ─── ARCHAEON — Local LoRA Fine-Tuning Orchestrator ──────────────────────────
// SWITCHBOARD hive | Leader: SWITCHBOARD | Model: local (Unsloth/3080)
// Owns: Unsloth training runs, LoRA dataset curation, fine-tune scheduling
// Never: inference serving, code generation, application logic

const ArchaeonInputSchema = z.object({
    task: z.string().describe('Fine-tuning or training orchestration task'),
    model: z.string().optional().describe('Base model to fine-tune'),
    dataset: z.string().optional().describe('Dataset path or description'),
    context: z.string().optional(),
});

const ArchaeonOutputSchema = z.object({
    result: z.string(),
    agentName: z.literal('ARCHAEON'),
    timestamp: z.string(),
    trainingRun: z.object({
        estimatedTime: z.string().optional(),
        hyperparams: z.record(z.unknown()).optional(),
    }).optional(),
});

export const ARCHAEONFlow = ai.defineFlow(
    { name: 'ARCHAEON', inputSchema: ArchaeonInputSchema, outputSchema: ArchaeonOutputSchema },
    async (input) => {
        recordAgentCall('ARCHAEON');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash', // orchestration uses flash; actual training is local
            prompt: `You are ARCHAEON, the Local LoRA Fine-Tuning Orchestrator of the Creative Liberation Engine.
Hive: SWITCHBOARD | Constitutional: Article VIII — named, hived, accountable.

You own the Unsloth fine-tuning pipeline on the workstation (RTX 3080). You curate training datasets from Creative Liberation Engine session logs, configure LoRA hyperparameters, schedule training runs, and validate checkpoints.
You output concrete training commands for the Unsloth framework. You never run inference directly.

Task: ${input.task}${input.model ? `\nBase model: ${input.model}` : ''}${input.dataset ? `\nDataset: ${input.dataset}` : ''}${input.context ? `\nContext: ${input.context}` : ''}`,
        });
        recordAgentCall('ARCHAEON', Date.now() - startMs);
        return { result: text, agentName: 'ARCHAEON' as const, timestamp: new Date().toISOString() };
    }
);

// ─── GHOST — Silent QA Shadow Agent ──────────────────────────────────────────
// COMPASS hive | Leader: COMPASS | Model: gemini-2.0-flash
// Owns: post-commit test validation, silent regression detection, QA reporting
// Never: modifying code, blocking deploys, user-facing interactions

const GhostInputSchema = z.object({
    trigger: z.enum(['post-commit', 'post-deploy', 'manual', 'scheduled']),
    scope: z.string().describe('Files, packages, or services to shadow-QA'),
    lastCommitSha: z.string().optional(),
    context: z.string().optional(),
});

const GhostOutputSchema = z.object({
    result: z.string(),
    agentName: z.literal('GHOST'),
    timestamp: z.string(),
    status: z.enum(['pass', 'warn', 'fail']),
    findings: z.array(z.object({
        severity: z.enum(['critical', 'warning', 'info']),
        description: z.string(),
        file: z.string().optional(),
    })).optional(),
});

export const GHOSTFlow = ai.defineFlow(
    { name: 'GHOST', inputSchema: GhostInputSchema, outputSchema: GhostOutputSchema },
    async (input) => {
        recordAgentCall('GHOST');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are GHOST, the Silent QA Shadow Agent of the Creative Liberation Engine.
Hive: COMPASS | Leader: COMPASS | Constitutional: Article VIII — named, hived, accountable.

You shadow every code change silently. After each commit or deploy, you run systematic validation — TypeScript checks, test suite analysis, regression detection, and API contract verification.
You NEVER block deploys unilaterally. You surface findings and escalate to COMPASS or RAM CREW.
You are invisible to users unless you have findings worth escalating.

Trigger: ${input.trigger} | Scope: ${input.scope}${input.lastCommitSha ? `\nCommit: ${input.lastCommitSha}` : ''}${input.context ? `\nContext: ${input.context}` : ''}`,
        });
        recordAgentCall('GHOST', Date.now() - startMs);
        return { result: text, agentName: 'GHOST' as const, timestamp: new Date().toISOString(), status: 'pass' as const };
    }
);

// ─── ALFRED — Portfolio Butler ────────────────────────────────────────────────
// AURORA hive | Leader: Aurora | Model: gemini-2.0-flash
// Owns: photography client comms, brief generation, scheduling, portfolio curation
// Never: technical infrastructure, system ops, business strategy

const AlfredInputSchema = z.object({
    task: z.string().describe('Portfolio management or client communication task'),
    client: z.string().optional().describe('Client name or type'),
    style: z.enum(['formal', 'warm', 'brief']).optional().default('warm'),
    context: z.string().optional(),
});

const AlfredOutputSchema = z.object({
    result: z.string(),
    agentName: z.literal('ALFRED'),
    timestamp: z.string(),
    draftType: z.string().optional().describe('Type of output: email, brief, caption, etc.'),
});

export const ALFREDFlow = ai.defineFlow(
    { name: 'ALFRED', inputSchema: AlfredInputSchema, outputSchema: AlfredOutputSchema },
    async (input) => {
        recordAgentCall('ALFRED');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are ALFRED, the Portfolio Butler of the Creative Liberation Engine.
Hive: AURORA | Leader: Aurora | Constitutional: Article VIII — named, hived, accountable.

You serve the The Operator Photography brand. You handle client communications, generate creative briefs, write portfolio captions, manage scheduling workflows, and curate gallery selections.
You write with the voice of a premium photography studio — refined, personal, and precise.
You never touch technical systems. You never write code. You serve the creative and client-facing layer only.

Task: ${input.task}${input.client ? `\nClient: ${input.client}` : ''}${input.context ? `\nContext: ${input.context}` : ''}
Style: ${input.style}`,
        });
        recordAgentCall('ALFRED', Date.now() - startMs);
        return { result: text, agentName: 'ALFRED' as const, timestamp: new Date().toISOString() };
    }
);

