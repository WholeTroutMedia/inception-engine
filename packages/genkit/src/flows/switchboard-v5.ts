import { ai, z } from '../index.js';
import { recordAgentCall } from './index.js';

// ─── FORGE — Docker/Container Infrastructure Ops ──────────────────────────────
// SWITCHBOARD hive | Leader: SWITCHBOARD | Model: gemini-2.0-flash
// Owns: GENESIS Docker stack, container health, image builds, NAS deployments
// Never: application logic, code generation, agent flows

const ForgeInputSchema = z.object({
    task: z.string().describe('Infrastructure or container operation to perform'),
    target: z.string().optional().describe('Service/container name or Docker Compose file'),
    context: z.string().optional(),
});

const ForgeOutputSchema = z.object({
    result: z.string(),
    agentName: z.literal('FORGE'),
    timestamp: z.string(),
    commands: z.array(z.string()).optional().describe('Shell commands executed or recommended'),
});

export const FORGEFlow = ai.defineFlow(
    { name: 'FORGE', inputSchema: ForgeInputSchema, outputSchema: ForgeOutputSchema },
    async (input) => {
        recordAgentCall('FORGE');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are FORGE, the Infrastructure & Container Operations agent of the Creative Liberation Engine.
Hive: SWITCHBOARD | Constitutional: Article VIII — named, hived, accountable.

You own the GENESIS Docker stack. You handle container health, image builds, service restarts, NAS deployments, and compose orchestration.
You never write application code. You never modify agent flows. You operate at the infrastructure layer only.

Task: ${input.task}${input.target ? `\nTarget: ${input.target}` : ''}${input.context ? `\nContext: ${input.context}` : ''}

Respond with concrete shell commands and their expected outcomes. Always use PowerShell syntax for Windows ops.`,
        });
        recordAgentCall('FORGE', Date.now() - startMs);
        return { result: text, agentName: 'FORGE' as const, timestamp: new Date().toISOString() };
    }
);

// ─── BEACON — Community & Open Source Ambassador ──────────────────────────────
// SWITCHBOARD hive | Leader: SWITCHBOARD | Model: gemini-2.0-flash
// Owns: GENESIS public launch comms, GitHub README, OSS contributor experience
// Never: internal system ops, code implementation, financial decisions

const BeaconInputSchema = z.object({
    task: z.string().describe('Community or open-source communication task'),
    audience: z.enum(['contributors', 'users', 'public', 'press']).optional(),
    context: z.string().optional(),
});

const BeaconOutputSchema = z.object({
    result: z.string(),
    agentName: z.literal('BEACON'),
    timestamp: z.string(),
    channel: z.string().optional(),
});

export const BEACONFlow = ai.defineFlow(
    { name: 'BEACON', inputSchema: BeaconInputSchema, outputSchema: BeaconOutputSchema },
    async (input) => {
        recordAgentCall('BEACON');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are BEACON, the Community & Open Source Ambassador of the Creative Liberation Engine.
Hive: SWITCHBOARD | Constitutional: Article VIII — named, hived, accountable.

You own the GENESIS public launch experience — GitHub READMEs, contributor guides, community announcements, Discord/forum comms, and OSS positioning.
You write with clarity, warmth, and technical credibility. You make complex systems feel approachable.

Task: ${input.task}${input.audience ? `\nAudience: ${input.audience}` : ''}${input.context ? `\nContext: ${input.context}` : ''}`,
        });
        recordAgentCall('BEACON', Date.now() - startMs);
        return { result: text, agentName: 'BEACON' as const, timestamp: new Date().toISOString() };
    }
);

// ─── PRISM — AI Model Operations & Cost Tracking ─────────────────────────────
// SWITCHBOARD hive | Leader: SWITCHBOARD | Model: gemini-2.0-flash
// Owns: model selection, cost tracking, quality scoring, provider health
// Never: application logic, agent prompt engineering for other agents

const PrismInputSchema = z.object({
    task: z.string().describe('Model operations task — routing, cost analysis, or quality scoring'),
    models: z.array(z.string()).optional().describe('Models to evaluate'),
    context: z.string().optional(),
});

const PrismOutputSchema = z.object({
    result: z.string(),
    agentName: z.literal('PRISM'),
    timestamp: z.string(),
    recommendation: z.string().optional(),
    estimatedCostUsd: z.number().optional(),
});

export const PRISMFlow = ai.defineFlow(
    { name: 'PRISM', inputSchema: PrismInputSchema, outputSchema: PrismOutputSchema },
    async (input) => {
        recordAgentCall('PRISM');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are PRISM, the AI Model Operations agent of the Creative Liberation Engine.
Hive: SWITCHBOARD | Constitutional: Article VIII — named, hived, accountable.

You own: model selection decisions, cost tracking per agent/flow, quality scoring for outputs, provider health monitoring (Google AI, Anthropic, local Ollama), and smart routing recommendations.
You optimize for quality-per-dollar. You track spend across sessions.

Task: ${input.task}${input.models ? `\nModels to evaluate: ${input.models.join(', ')}` : ''}${input.context ? `\nContext: ${input.context}` : ''}`,
        });
        recordAgentCall('PRISM', Date.now() - startMs);
        return { result: text, agentName: 'PRISM' as const, timestamp: new Date().toISOString() };
    }
);

// ─── FLUX — Data Engineering & ETL ───────────────────────────────────────────
// SWITCHBOARD hive | Leader: SWITCHBOARD | Model: gemini-2.0-flash
// Owns: ETL pipelines, live feed ingestion, data transformations, schema migrations
// Never: UI, agent orchestration, business logic

const FluxInputSchema = z.object({
    task: z.string().describe('Data engineering or ETL task'),
    source: z.string().optional().describe('Data source (API, file, stream)'),
    destination: z.string().optional().describe('Target store (Redis, Postgres, etc.)'),
    context: z.string().optional(),
});

const FluxOutputSchema = z.object({
    result: z.string(),
    agentName: z.literal('FLUX'),
    timestamp: z.string(),
    pipeline: z.string().optional(),
});

export const FLUXFlow = ai.defineFlow(
    { name: 'FLUX', inputSchema: FluxInputSchema, outputSchema: FluxOutputSchema },
    async (input) => {
        recordAgentCall('FLUX');
        const startMs = Date.now();
        const { text } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: `You are FLUX, the Data Engineering & ETL agent of the Creative Liberation Engine.
Hive: SWITCHBOARD | Constitutional: Article VIII — named, hived, accountable.

You own: ETL pipeline design, live feed ingestion, data transformations, schema migrations, and real-time data routing between services.
You produce clean, typed data. You document schemas. You never modify UI or orchestration logic.

Task: ${input.task}${input.source ? `\nSource: ${input.source}` : ''}${input.destination ? `\nDestination: ${input.destination}` : ''}${input.context ? `\nContext: ${input.context}` : ''}`,
        });
        recordAgentCall('FLUX', Date.now() - startMs);
        return { result: text, agentName: 'FLUX' as const, timestamp: new Date().toISOString() };
    }
);

