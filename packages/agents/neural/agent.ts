/**
 * InceptionAgent — Base Class
 * The typed computational unit at the heart of the v5 runtime.
 *
 * Every agent is an independent unit with:
 *   - Named identity + hive membership
 *   - Specific model assignment (hot-swappable via Genkit)
 *   - Explicit tool grants (no ambient capability)
 *   - Constitutional compliance built-in (preflight + postflight)
 *   - MemoryBus integration (every execution logged + learned from)
 *
 * Constitutional: Article VII — Every execution contributes to knowledge.
 */

import { ai } from '../../genkit/src/index.js';
import { memoryBus } from '../../memory/src/index.js';
import type { MemoryEntry } from '../../memory/src/index.js';
import { z } from 'genkit';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type AgentHive =
    | 'AVERI' | 'AURORA' | 'KEEPER' | 'LEX' | 'SWITCHBOARD' | 'BROADCAST' | 'ENHANCEMENT'
    | 'LEADERSHIP' | 'INFRASTRUCTURE' | 'MEMORY' | 'RELAY' | 'BUILDER' | 'GUARDIAN';

export type AgentRole =
    | 'strategic' | 'builder' | 'automator' | 'knowledge'
    | 'compliance' | 'routing' | 'integration' | 'validator' | 'specialist';

export type AgentMode = 'ideate' | 'plan' | 'ship' | 'validate' | 'all';

export type AccessTier = 'studio' | 'client' | 'merch';

export interface AgentTool {
    name: string;
    description: string;
    fn: (...args: unknown[]) => Promise<unknown>;
}

export interface AgentConfig {
    name: string;
    hive: AgentHive;
    role: AgentRole;
    model: string;
    instruction: string;
    tools?: AgentTool[];
    activeModes?: AgentMode[];
    accessTier?: AccessTier;
    color?: string;          // AVERI: Gold/White/Violet, etc.
    persona?: string;        // Governing principle
}

export interface AgentTask {
    task: string;
    context?: string;
    tags?: string[];
    sessionId?: string;
    priority?: 'urgent' | 'normal' | 'background';
}

export interface AgentResult<T = string> {
    agentName: string;
    hive: AgentHive;
    output: T;
    durationMs: number;
    memoryId: string;
    model: string;
    timestamp: string;
}

// ─── BASE AGENT CLASS ─────────────────────────────────────────────────────────

export class InceptionAgent {
    readonly name: string;
    readonly hive: AgentHive;
    readonly role: AgentRole;
    readonly model: string;
    readonly instruction: string;
    readonly tools: AgentTool[];
    readonly activeModes: AgentMode[];
    readonly accessTier: AccessTier;
    readonly color: string;
    readonly persona: string;

    constructor(config: AgentConfig) {
        this.name = config.name;
        this.hive = config.hive;
        this.role = config.role;
        this.model = config.model;
        this.instruction = config.instruction;
        this.tools = config.tools ?? [];
        this.activeModes = config.activeModes ?? ['all'];
        this.accessTier = config.accessTier ?? 'studio';
        this.color = config.color ?? 'white';
        this.persona = config.persona ?? '';
    }

    /**
     * Run a task through this agent.
     * Automatically:
     *   1. Recalls similar past episodes from MemoryBus (pre-flight)
     *   2. Injects context into the system prompt
     *   3. Runs the Genkit ai.generate call
     *   4. Commits result to MemoryBus (post-flight, inc. SCRIBE pattern extraction)
     */
    async run(task: AgentTask): Promise<AgentResult<string>> {
        const startMs = Date.now();
        const sessionId = task.sessionId ?? `sess_${Date.now()}`;
        const bus = memoryBus;

        // ── 1. Pre-flight: recall relevant past episodes ──────────────────────
        const pastEpisodes: MemoryEntry[] = await bus.recall({
            query: task.task,
            agentName: this.name,
            limit: 3,
            successOnly: false,
        });

        const memoryContext = pastEpisodes.length > 0
            ? `\n\n[MEMORY CONTEXT — ${pastEpisodes.length} past episodes]\n` +
            pastEpisodes.map(ep =>
                `• ${ep.task.slice(0, 80)} → ${ep.pattern ?? ep.outcome.slice(0, 80)}`
            ).join('\n')
            : '';

        // ── 2. Build system prompt ────────────────────────────────────────────
        const systemPrompt = `${this.instruction}

You are ${this.name}, a member of the ${this.hive} hive in the Creative Liberation Engine.
Role: ${this.role} | Model: ${this.model}
${this.persona ? `Governing principle: "${this.persona}"` : ''}
${memoryContext}

${task.context ? `Additional context:\n${task.context}` : ''}

Execute with precision. Ship complete solutions. No MVPs. Zero Day Creativity standard.`;

        // ── 3. Execute via Genkit ─────────────────────────────────────────────
        let output: string;
        let success = true;

        try {
            const response = await ai.generate({
                model: this.model,
                prompt: task.task,
                system: systemPrompt,
                config: { temperature: 0.3 },
            });
            output = response.text;
        } catch (err) {
            success = false;
            output = `[${this.name}] ERROR: ${String(err)}`;
            console.error(`[${this.hive}/${this.name}] Execution failed:`, err);
        }

        // ── 4. Post-flight: commit to MemoryBus (SCRIBE extracts pattern) ────
        const committed = await bus.commit({
            agentName: this.name,
            task: task.task,
            outcome: output.slice(0, 1000),
            tags: [this.hive, this.role, ...(task.tags ?? [])],
            sessionId,
            durationMs: Date.now() - startMs,
            success,
        });

        return {
            agentName: this.name,
            hive: this.hive,
            output,
            durationMs: Date.now() - startMs,
            memoryId: committed.id,
            model: this.model,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Run as a Genkit flow (exposes agent to Dev UI + REST)
     */
    asFlow(flowName?: string) {
        const name = flowName ?? `${this.name.toLowerCase()}Flow`;
        return ai.defineFlow(
            {
                name,
                inputSchema: z.object({
                    task: z.string(),
                    context: z.string().optional(),
                    tags: z.array(z.string()).optional(),
                    sessionId: z.string().optional(),
                }),
                outputSchema: z.object({
                    agentName: z.string(),
                    hive: z.string(),
                    output: z.string(),
                    durationMs: z.number(),
                    memoryId: z.string(),
                    model: z.string(),
                    timestamp: z.string(),
                }),
            },
            async (input) => this.run(input)
        );
    }

    get identity() {
        return `${this.name} [${this.hive}/${this.role}] on ${this.model}`;
    }
}
