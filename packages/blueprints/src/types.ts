/**
 * @inception/blueprints — Core Type Definitions
 *
 * The Blueprint pattern (adapted from NVIDIA's Nemotron telco model approach):
 * Domain LTM + reasoning traces + simulation validation = portable vertical template.
 *
 * A Blueprint is a complete agent configuration for a specific industry vertical.
 * It defines the domain model, reasoning trace steps, agent team, tools, and
 * simulation/validation pipeline.
 */

import { z } from 'zod';

// ─── Reasoning Trace ─────────────────────────────────────────────────────────

export const ReasoningTraceSchema = z.object({
    step: z.number().int().positive(),
    name: z.string(),
    procedure: z.string().describe('What a domain expert does at this step'),
    prompt: z.string().describe('The system prompt for this step'),
    tools: z.array(z.string()).default([]).describe('Tool names available at this step'),
    outputSchema: z.string().optional().describe('Zod schema name for structured output'),
    requiredCapabilities: z.array(z.string()).default([]),
});

export type ReasoningTrace = z.infer<typeof ReasoningTraceSchema>;

// ─── Simulation Step ─────────────────────────────────────────────────────────

export const SimulationStepSchema = z.object({
    name: z.string(),
    description: z.string(),
    validationQuery: z.string().describe('Query to validate results against'),
    passCriteria: z.string().describe('What "pass" looks like'),
    failAction: z.enum(['abort', 'warn', 'retry']).default('warn'),
});

export type SimulationStep = z.infer<typeof SimulationStepSchema>;

// ─── Blueprint Config ─────────────────────────────────────────────────────────

export const BlueprintDomainModelSchema = z.object({
    preferred: z.string().describe("Model ID, e.g. 'gemini-2.5-pro'"),
    systemPrompt: z.string().describe('Expert persona injected for this domain'),
    knowledgeBase: z
        .string()
        .optional()
        .describe('ChromaDB collection name for domain RAG'),
    temperature: z.number().min(0).max(2).default(0.3),
});

export const BlueprintSchema = z.object({
    id: z.string(),
    name: z.string(),
    vertical: z.enum(['finance', 'healthcare', 'media', 'telco', 'real-estate', 'custom']),
    description: z.string(),
    version: z.string().default('1.0.0'),
    tags: z.array(z.string()).default([]),

    // NVIDIA pattern fields
    domainModel: BlueprintDomainModelSchema,
    reasoningTraces: z.array(ReasoningTraceSchema).min(1),
    agentTeam: z.array(z.string()).describe('Agent IDs from the catalog'),
    simulationSteps: z.array(SimulationStepSchema).default([]),

    // Constitutional
    constitutionalFlags: z.array(z.string()).default([]).describe(
        'Special constitutional checks, e.g. ["hipaa-pii", "sox-compliance"]'
    ),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;

// ─── Run Types ────────────────────────────────────────────────────────────────

export const BlueprintRunInputSchema = z.object({
    blueprintId: z.string(),
    query: z.string(),
    context: z.record(z.string(), z.unknown()).optional(),
    sessionId: z.string().optional(),
});

export type BlueprintRunInput = z.infer<typeof BlueprintRunInputSchema>;

export interface BlueprintTraceOutput {
    step: number;
    name: string;
    procedure: string;
    reasoning: string;
    output: unknown;
    tokensUsed?: number;
    latencyMs?: number;
}

export interface BlueprintRunResult {
    runId: string;
    blueprintId: string;
    status: 'running' | 'complete' | 'failed';
    traces: BlueprintTraceOutput[];
    finalAnswer: string;
    simulationPassed: boolean;
    constitutionalApproved: boolean;
    totalLatencyMs: number;
    error?: string;
}
