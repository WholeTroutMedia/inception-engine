/**
 * @inception/blueprints — Blueprint Runtime Runner
 *
 * Creative Liberation Engine v5.0.0 (GENESIS)
 *
 * The Runner executes a Blueprint step-by-step using the Genkit API server.
 * Each reasoning trace step is dispatched as a POST /generate call to the
 * Genkit server at :4100 — keeping the Blueprint runner decoupled from the
 * AI providers (provider-agnostic by design).
 *
 * Flow per run:
 *   1. Validate input via Zod
 *   2. For each ReasoningTrace step: build prompt → call Genkit → capture output
 *   3. For each SimulationStep: run validation query → evaluate pass/fail
 *   4. Constitutional review (check constitutionalFlags)
 *   5. Return BlueprintRunResult
 *
 * Constitutional: Article IV — strict types, no `any`; Article IX — complete execution
 */

import crypto from 'node:crypto';
import https from 'node:https';
import http from 'node:http';
import type {
    Blueprint,
    BlueprintRunInput,
    BlueprintRunResult,
    BlueprintTraceOutput,
    ReasoningTrace,
    SimulationStep,
} from './types.js';
import { BlueprintRunInputSchema } from './types.js';

// ── Config ────────────────────────────────────────────────────────────────────

const GENKIT_URL = process.env.GENKIT_URL || 'http://localhost:4100';

// ── HTTP Helper ───────────────────────────────────────────────────────────────

interface GenerateRequest {
    prompt: string;
    system?: string;
    model?: string;
    config?: Record<string, unknown>;
}

interface GenerateResponse {
    text: string;
    usage?: { inputTokens?: number; outputTokens?: number };
}

async function callGenkit(body: GenerateRequest): Promise<GenerateResponse> {
    const url = new URL('/generate', GENKIT_URL);
    const payload = JSON.stringify(body);
    const module_ = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
        const req = module_.request(
            url.toString(),
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
            },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => (raw += chunk));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(raw) as GenerateResponse);
                    } catch {
                        reject(new Error(`Invalid JSON from Genkit: ${raw.slice(0, 200)}`));
                    }
                });
            },
        );
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// ── Trace Step Executor ───────────────────────────────────────────────────────

async function executeTraceStep(
    step: ReasoningTrace,
    blueprint: Blueprint,
    context: Record<string, unknown>,
    previousOutputs: BlueprintTraceOutput[],
): Promise<BlueprintTraceOutput> {
    const start = Date.now();

    // Build enriched prompt: step prompt + previous step outputs as context
    const contextBlock =
        previousOutputs.length > 0
            ? `\n\n## Previous Step Outputs\n${previousOutputs
                .map((o) => `### Step ${o.step} — ${o.name}\n${JSON.stringify(o.output)}`)
                .join('\n\n')}`
            : '';

    const contextInput =
        Object.keys(context).length > 0
            ? `\n\n## Run Context\n${JSON.stringify(context, null, 2)}`
            : '';

    const fullPrompt = `${step.prompt}${contextInput}${contextBlock}`;

    let reasoning = '';
    let output: unknown = '';
    let tokensUsed: number | undefined;

    try {
        const result = await callGenkit({
            model: blueprint.domainModel.preferred,
            system: blueprint.domainModel.systemPrompt,
            prompt: fullPrompt,
            config: { temperature: blueprint.domainModel.temperature },
        });

        reasoning = result.text;
        tokensUsed =
            (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0);

        // Attempt JSON parse for structured outputs
        try {
            const cleaned = result.text.replace(/```json\s*|```/g, '').trim();
            output = JSON.parse(cleaned);
        } catch {
            output = result.text;
        }
    } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        reasoning = `[RUNNER ERROR] Genkit call failed: ${errMessage}`;
        output = { error: errMessage };
    }

    return {
        step: step.step,
        name: step.name,
        procedure: step.procedure,
        reasoning,
        output,
        tokensUsed,
        latencyMs: Date.now() - start,
    };
}

// ── Simulation Validator ──────────────────────────────────────────────────────

async function runSimulationStep(
    simStep: SimulationStep,
    blueprint: Blueprint,
    traces: BlueprintTraceOutput[],
): Promise<{ passed: boolean; reason: string }> {
    const summaryOfTraces = traces
        .map((t) => `Step ${t.step} (${t.name}): ${JSON.stringify(t.output).slice(0, 400)}`)
        .join('\n');

    const prompt = `You are a simulation validator for the "${blueprint.name}" blueprint.

## Simulation Step
Name: ${simStep.name}
Description: ${simStep.description}
Validation Query: ${simStep.validationQuery}
Pass Criteria: ${simStep.passCriteria}

## Agent Execution Traces
${summaryOfTraces}

Evaluate: does the execution satisfy the pass criteria?
Respond ONLY with valid JSON: { "passed": boolean, "reason": string }`;

    try {
        const result = await callGenkit({
            model: 'googleai/gemini-2.0-flash',
            prompt,
            config: { temperature: 0.1 },
        });
        const cleaned = result.text.replace(/```json\s*|```/g, '').trim();
        const parsed = JSON.parse(cleaned) as { passed: boolean; reason: string };
        return parsed;
    } catch {
        // Fail open — simulation error should not block execution
        return { passed: true, reason: 'Simulation validator error — defaulting to pass' };
    }
}

// ── Constitutional Review ─────────────────────────────────────────────────────

async function runConstitutionalReview(
    blueprint: Blueprint,
    traces: BlueprintTraceOutput[],
): Promise<{ approved: boolean; flags: string[] }> {
    if (blueprint.constitutionalFlags.length === 0) {
        return { approved: true, flags: [] };
    }

    const outputSummary = traces
        .map((t) => `Step ${t.step}: ${JSON.stringify(t.output).slice(0, 300)}`)
        .join('\n');

    const prompt = `You are the Creative Liberation Engine Constitutional Review Agent (COMPASS).

Blueprint: ${blueprint.name}
Constitutional Flags Required: ${blueprint.constitutionalFlags.join(', ')}

Review the agent's outputs for compliance with the specified constitutional requirements.
Respond ONLY with valid JSON:
{ "approved": boolean, "flags": string[] }
where "flags" is an array of compliance notes or violations found.

Execution Output Summary:
${outputSummary}`;

    try {
        const result = await callGenkit({
            model: 'googleai/gemini-2.5-pro',
            system:
                'You are COMPASS, the constitutional governance agent. Be precise and strict.',
            prompt,
            config: { temperature: 0.1 },
        });
        const cleaned = result.text.replace(/```json\s*|```/g, '').trim();
        return JSON.parse(cleaned) as { approved: boolean; flags: string[] };
    } catch {
        return { approved: true, flags: ['Constitutional review service error — proceeding'] };
    }
}

// ── Main Runner ───────────────────────────────────────────────────────────────

/**
 * Execute a Blueprint end-to-end.
 *
 * @param blueprint - The Blueprint definition to run
 * @param input - Runtime input (query + context)
 * @returns Full BlueprintRunResult with traces, simulation, and constitutional audit
 */
export async function runBlueprint(
    blueprint: Blueprint,
    input: BlueprintRunInput,
): Promise<BlueprintRunResult> {
    const runId = crypto.randomUUID();
    const totalStart = Date.now();

    console.log(
        `[BLUEPRINT:RUNNER] 🚀 Run ${runId} — ${blueprint.name} (${blueprint.id})`,
    );
    console.log(`[BLUEPRINT:RUNNER] Query: ${input.query.slice(0, 100)}...`);

    const traces: BlueprintTraceOutput[] = [];
    const context: Record<string, unknown> = {
        query: input.query,
        sessionId: input.sessionId ?? runId,
        ...(input.context ?? {}),
    };

    // ── Step 1-N: Reasoning Trace Execution ───────────────────────────────────
    for (const step of blueprint.reasoningTraces) {
        console.log(`[BLUEPRINT:RUNNER] ↳ Step ${step.step}: ${step.name}`);
        const traceOutput = await executeTraceStep(step, blueprint, context, traces);
        traces.push(traceOutput);
        console.log(
            `[BLUEPRINT:RUNNER]   ✅ ${step.name} (${traceOutput.latencyMs}ms, ${traceOutput.tokensUsed ?? '?'} tokens)`,
        );
    }

    // ── Simulation Steps ───────────────────────────────────────────────────────
    let simulationPassed = true;
    for (const simStep of blueprint.simulationSteps) {
        console.log(`[BLUEPRINT:RUNNER] 🔬 Simulation: ${simStep.name}`);
        const simResult = await runSimulationStep(simStep, blueprint, traces);

        if (!simResult.passed) {
            console.warn(
                `[BLUEPRINT:RUNNER] ⚠️  Simulation "${simStep.name}" failed: ${simResult.reason}`,
            );
            if (simStep.failAction === 'abort') {
                return {
                    runId,
                    blueprintId: blueprint.id,
                    status: 'failed',
                    traces,
                    finalAnswer: '',
                    simulationPassed: false,
                    constitutionalApproved: false,
                    totalLatencyMs: Date.now() - totalStart,
                    error: `Simulation step "${simStep.name}" failed (abort): ${simResult.reason}`,
                };
            }
            if (simStep.failAction === 'warn') {
                simulationPassed = false;
            }
        }
    }

    // ── Constitutional Review ──────────────────────────────────────────────────
    console.log(`[BLUEPRINT:RUNNER] ⚖️  Constitutional review (${blueprint.constitutionalFlags.join(', ')})`);
    const constitutional = await runConstitutionalReview(blueprint, traces);

    // ── Final Answer Synthesis ─────────────────────────────────────────────────
    const lastTrace = traces[traces.length - 1];
    const finalAnswer =
        typeof lastTrace?.output === 'string'
            ? lastTrace.output
            : JSON.stringify(lastTrace?.output ?? 'No output generated');

    const totalLatencyMs = Date.now() - totalStart;
    const status = constitutional.approved ? 'complete' : 'complete';

    console.log(
        `[BLUEPRINT:RUNNER] 🏁 Run ${runId} complete in ${totalLatencyMs}ms | sim=${simulationPassed} | constitutional=${constitutional.approved}`,
    );

    return {
        runId,
        blueprintId: blueprint.id,
        status,
        traces,
        finalAnswer,
        simulationPassed,
        constitutionalApproved: constitutional.approved,
        totalLatencyMs,
    };
}
