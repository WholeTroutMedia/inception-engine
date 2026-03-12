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
import { memoryBus, type MemoryEntry } from '@cle/memory';

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
    relaySignature: z.literal('krelayd').default('krelayd'),
});

export const krelaydFlow = ai.defineFlow(
    { name: 'krelayd', inputSchema: RelayInputSchema, outputSchema: RelayOutputSchema },
    async (input): Promise<z.infer<typeof RelayOutputSchema>> => {
        const sessionId = input.sessionId ?? `relay_${Date.now()}`;
        const switchboardId = `SW-${Date.now().toString(36).toUpperCase()}`;

        console.log(`[krelayd] 📡 ${input.fromAgent} → ${input.toAgent ?? 'AUTO'} | ${input.priority.toUpperCase()} | ${switchboardId}`);

        return memoryBus.withMemory('krelayd', `route: ${input.message.slice(0, 60)}`, ['switchboard-hive', 'routing'], async (_ctx: MemoryEntry[]) => {
            const { output } = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                system: `You are krelayd — the Switchboard Communication Router. You enforce Article XI (Collaboration Protocol).
All inter-agent communication flows through you. No direct agent-to-agent messages.

Agent roster for routing:
- kbuildd: code generation, frontend implementation
- kwebd: backend, APIs, databases, DevOps
- kuid: architecture, design, planning
- kstated: knowledge, patterns, Living Archive
- karchd: code archaeology, pattern extraction
- kcodexd: documentation generation
- kdocsd: constitutional compliance
- kcompd: ethical review
- kstrigd: truth-checking, coordination, klogd
- ksignd: blocker removal, emergency execution
- ksignald: external integrations, webhooks, broadcast
- kruled: strategy, high-level decisions
- ksecud: security scanning
- karchond: architecture compliance
- kproofd: behavioral testing
- kharbord: test coverage

Priority: ${input.priority}. Route to the most capable agent. If urgent, prefer ksignd.`,
                prompt: `Route this message:\nFrom: ${input.fromAgent}\nRequested target: ${input.toAgent ?? 'auto-route'}\nMessage: ${input.message}`,
                output: { schema: RelayOutputSchema },
                config: { temperature: 0.1 },
            });

            return {
                ...(output ?? { routedTo: input.toAgent ?? 'kbuildd', routeReason: 'Default routing', nextAction: input.message }),
                switchboardId,
                relaySignature: 'krelayd',
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
    signalSignature: z.literal('ksignald').default('ksignald'),
});

export const ksignaldFlow = ai.defineFlow(
    { name: 'ksignald', inputSchema: SignalInputSchema, outputSchema: SignalOutputSchema },
    async (input): Promise<z.infer<typeof SignalOutputSchema>> => {
        console.log(`[SIGNAL] 📶 ${input.integration}: ${input.target}`);

        // Generate integration instructions via LLM for complex scenarios
        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: `You are ksignald — the external integration specialist. You make API calls, trigger webhooks, and connect broadcast platforms.
Analyze the integration request and provide the response structure.`,
            prompt: `Integration: ${input.integration}\nTarget: ${input.target}\nMethod: ${input.method}\nPayload: ${JSON.stringify(input.payload).slice(0, 500)}`,
            output: { schema: SignalOutputSchema },
        });

        return { ...(output ?? { success: false, response: 'ksignald unavailable' }), signalSignature: 'ksignald' };
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
    switchboardSignature: z.literal('kswitchd').default('kswitchd'),
});

export const kswitchdFlow = ai.defineFlow(
    { name: 'kswitchd', inputSchema: SwitchboardInputSchema, outputSchema: SwitchboardOutputSchema },
    async (input): Promise<z.infer<typeof SwitchboardOutputSchema>> => {
        console.log(`[kswitchd] ⚡ Operation: ${input.operation}`);

        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: `You are kswitchd — the Operations Lead. You coordinate hives, monitor health, dispatch parallel tasks.
You have visibility into all hives: kuid, kstated, kdocsd, SWITCHBOARD, BROADCAST.`,
            prompt: `Operation: ${input.operation}\nHives: ${input.hives.join(', ')}\nTask: ${input.task}`,
            output: { schema: SwitchboardOutputSchema },
        });

        return { ...(output ?? { hiveStatus: {}, dispatched: [], coordination: 'kswitchd unavailable' }), switchboardSignature: 'kswitchd' };
    }
);

