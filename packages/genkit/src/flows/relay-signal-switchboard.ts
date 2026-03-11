/**
 * RELAY — Switchboard Communication Router
 * SIGNAL — Broadcast Integration Agent
 * SWITCHBOARD — Operations Lead
 * Hive: SWITCHBOARD | Role: Operations + Routing | All Modes
 *
 * RELAY: Routes tasks between agents via the switchboard protocol.
 *        Enforces Article XI (Collaboration Protocol) — all inter-agent
 *        comms go through RELAY, never direct agent-to-agent.
 *
 * SIGNAL: Manages integrations with external systems — webhooks, APIs,
 *          broadcast platforms, streaming endpoints.
 *
 * SWITCHBOARD: Operations lead. Monitors hive health, coordinates
 *              cross-hive tasks, manages parallelism.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { memoryBus, type MemoryEntry } from '@inception/memory';

// ─────────────────────────────────────────────────────────────────────────────
// RELAY — Inter-Agent Message Router
// ─────────────────────────────────────────────────────────────────────────────

const RelayInputSchema = z.object({
    fromAgent: z.string().describe('Originating agent name'),
    toAgent: z.string().optional().describe('Target agent — omit to auto-route'),
    message: z.string().describe('Task or message to route'),
    payload: z.record(z.unknown()).default({}).describe('Structured data payload'),
    priority: z.enum(['low', 'normal', 'urgent']).default('normal'),
    sessionId: z.string().optional(),
});

const RelayOutputSchema = z.object({
    routedTo: z.string().describe('Agent that received the message'),
    routeReason: z.string().describe('Why RELAY chose this agent'),
    nextAction: z.string().describe('What the receiving agent should do now'),
    switchboardId: z.string().describe('Unique routing ID for traceability'),
    relaySignature: z.literal('RELAY').default('RELAY'),
});

export const RELAYFlow = ai.defineFlow(
    { name: 'RELAY', inputSchema: RelayInputSchema, outputSchema: RelayOutputSchema },
    async (input): Promise<z.infer<typeof RelayOutputSchema>> => {
        const sessionId = input.sessionId ?? `relay_${Date.now()}`;
        const switchboardId = `SW-${Date.now().toString(36).toUpperCase()}`;

        console.log(`[RELAY] 📡 ${input.fromAgent} → ${input.toAgent ?? 'AUTO'} | ${input.priority.toUpperCase()} | ${switchboardId}`);

        return memoryBus.withMemory('RELAY', `route: ${input.message.slice(0, 60)}`, ['switchboard-hive', 'routing'], async (_ctx: MemoryEntry[]) => {
            const { output } = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                system: `You are RELAY — the Switchboard Communication Router. You enforce Article XI (Collaboration Protocol).
All inter-agent communication flows through you. No direct agent-to-agent messages.

Agent roster for routing:
- BOLT: code generation, frontend implementation
- COMET: backend, APIs, databases, DevOps
- AURORA: architecture, design, planning
- KEEPER: knowledge, patterns, Living Archive
- ARCH: code archaeology, pattern extraction
- CODEX: documentation generation
- LEX: constitutional compliance
- COMPASS: ethical review
- VERA: truth-checking, coordination, scribe
- IRIS: blocker removal, emergency execution
- SIGNAL: external integrations, webhooks, broadcast
- ATHENA: strategy, high-level decisions
- SENTINEL: security scanning
- ARCHON: architecture compliance
- PROOF: behavioral testing
- HARBOR: test coverage

Priority: ${input.priority}. Route to the most capable agent. If urgent, prefer IRIS.`,
                prompt: `Route this message:\nFrom: ${input.fromAgent}\nRequested target: ${input.toAgent ?? 'auto-route'}\nMessage: ${input.message}`,
                output: { schema: RelayOutputSchema },
                config: { temperature: 0.1 },
            });

            return {
                ...(output ?? { routedTo: input.toAgent ?? 'BOLT', routeReason: 'Default routing', nextAction: input.message }),
                switchboardId,
                relaySignature: 'RELAY',
            };
        });
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL — External Integration Agent
// ─────────────────────────────────────────────────────────────────────────────

const SignalInputSchema = z.object({
    integration: z.enum(['webhook', 'api_call', 'broadcast_platform', 'streaming_endpoint', 'mcp_server']),
    target: z.string().describe('Endpoint URL, platform name, or MCP server name'),
    payload: z.record(z.unknown()).describe('Data to send to the integration'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
    sessionId: z.string().optional(),
});

const SignalOutputSchema = z.object({
    success: z.boolean(),
    response: z.string().describe('Integration response'),
    statusCode: z.number().optional(),
    signalSignature: z.literal('SIGNAL').default('SIGNAL'),
});

export const SIGNALFlow = ai.defineFlow(
    { name: 'SIGNAL', inputSchema: SignalInputSchema, outputSchema: SignalOutputSchema },
    async (input): Promise<z.infer<typeof SignalOutputSchema>> => {
        console.log(`[SIGNAL] 📶 ${input.integration}: ${input.target}`);

        // Generate integration instructions via LLM for complex scenarios
        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: `You are SIGNAL — the external integration specialist. You make API calls, trigger webhooks, and connect broadcast platforms.
Analyze the integration request and provide the response structure.`,
            prompt: `Integration: ${input.integration}\nTarget: ${input.target}\nMethod: ${input.method}\nPayload: ${JSON.stringify(input.payload).slice(0, 500)}`,
            output: { schema: SignalOutputSchema },
        });

        return { ...(output ?? { success: false, response: 'SIGNAL unavailable' }), signalSignature: 'SIGNAL' };
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// SWITCHBOARD — Operations Lead
// ─────────────────────────────────────────────────────────────────────────────

const SwitchboardInputSchema = z.object({
    operation: z.enum(['hive_health', 'parallel_dispatch', 'monitor', 'coordinate']),
    hives: z.array(z.string()).default([]).describe('Hives to check or coordinate'),
    task: z.string().describe('Coordination task or health check target'),
    sessionId: z.string().optional(),
});

const SwitchboardOutputSchema = z.object({
    hiveStatus: z.record(z.enum(['healthy', 'degraded', 'offline'])).default({}),
    dispatched: z.array(z.string()).default([]).describe('Tasks dispatched to agents'),
    coordination: z.string().describe('Coordination summary'),
    switchboardSignature: z.literal('SWITCHBOARD').default('SWITCHBOARD'),
});

export const SWITCHBOARDFlow = ai.defineFlow(
    { name: 'SWITCHBOARD', inputSchema: SwitchboardInputSchema, outputSchema: SwitchboardOutputSchema },
    async (input): Promise<z.infer<typeof SwitchboardOutputSchema>> => {
        console.log(`[SWITCHBOARD] ⚡ Operation: ${input.operation}`);

        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: `You are SWITCHBOARD — the Operations Lead. You coordinate hives, monitor health, dispatch parallel tasks.
You have visibility into all hives: AURORA, KEEPER, LEX, SWITCHBOARD, BROADCAST.`,
            prompt: `Operation: ${input.operation}\nHives: ${input.hives.join(', ')}\nTask: ${input.task}`,
            output: { schema: SwitchboardOutputSchema },
        });

        return { ...(output ?? { hiveStatus: {}, dispatched: [], coordination: 'SWITCHBOARD unavailable' }), switchboardSignature: 'SWITCHBOARD' };
    }
);

