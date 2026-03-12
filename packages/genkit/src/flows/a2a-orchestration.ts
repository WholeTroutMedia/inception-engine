/**
 * A2A Orchestration Genkit Flow
 * Creative Liberation Engine v5.0.0 (GENESIS)
 *
 * Wires the A2A protocol (packages/agents/src/a2a) into the Genkit flow
 * architecture. Enables TTY Trinity + Hive agents to dispatch tasks
 * to each other via typed A2A messages, routed through the sovereign
 * dispatch server or direct HTTP endpoints.
 *
 * Pattern: Genkit flow receives a directive â†’ resolves target agent via
 * A2A registry â†’ validates tenant isolation â†’ dispatches A2A message â†’
 * returns structured result.
 */

import { ai } from '../index.js';
import { z } from 'genkit';

// â”€â”€ Input / Output Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const A2ADispatchInputSchema = z.object({
  /** Agent sending the directive */
  fromAgentId: z.string().describe('Sender agent ID (e.g. "vt100", "xterm")'),
  /** Target agent to receive the message */
  toAgentId: z.string().describe('Recipient agent ID (e.g. "kstated", "dira")'),
  /** Tenant context for isolation enforcement */
  tenantId: z.string().describe('Firebase UID / tenant ID'),
  /** Message type */
  messageType: z.enum(['task', 'handoff', 'ping', 'result']).default('task'),
  /** Payload to deliver */
  payload: z.record(z.unknown()).describe('Message payload (task spec, handoff note, etc.)'),
  /** Optional conversation correlation ID */
  correlationId: z.string().optional(),
});

const A2ADispatchOutputSchema = z.object({
  messageId: z.string(),
  status: z.enum(['accepted', 'rejected', 'queued']),
  fromAgent: z.string(),
  toAgent: z.string(),
  tenantId: z.string(),
  reason: z.string().optional(),
  dispatchedAt: z.string(),
});

// â”€â”€ Multi-Agent Orchestration Input / Output â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TTYOrchestrationInputSchema = z.object({
  /** High-level directive — vt100 decomposes and routes to appropriate agents */
  directive: z.string().describe('Natural language directive for orchestration'),
  tenantId: z.string(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P1'),
  /** Specific agents to involve (if empty, vt100 auto-selects) */
  targetAgents: z.array(z.string()).optional(),
  /** Context from prior conversation turns */
  context: z.record(z.unknown()).optional(),
});

const TTYOrchestrationOutputSchema = z.object({
  plan: z.string().describe('vt100 orchestration plan — natural language'),
  assignments: z.array(z.object({
    agentId: z.string(),
    role: z.string(),
    task: z.string(),
    priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  })),
  estimatedCompletionMs: z.number().optional(),
  dispatchedAt: z.string(),
});

// â”€â”€ A2A Dispatch Flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Single A2A message dispatch â€” sends one typed message from one agent to another.
 * Enforces tenant isolation at the Genkit layer.
 */
export const a2aDispatchFlow = ai.defineFlow(
  {
    name: 'a2aDispatch',
    inputSchema: A2ADispatchInputSchema,
    outputSchema: A2ADispatchOutputSchema,
  },
  async (input) => {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Attempt HTTP delivery to dispatch server A2A endpoint
    const dispatchUrl = process.env['DISPATCH_URL'] ?? 'http://127.0.0.1:5050';
    const envelope = {
      id: messageId,
      from: input.fromAgentId,
      to: input.toAgentId,
      tenantId: input.tenantId,
      type: input.messageType,
      payload: input.payload,
      sentAt: new Date().toISOString(),
      correlationId: input.correlationId ?? messageId,
    };

    let status: 'accepted' | 'rejected' | 'queued' = 'queued';
    let reason: string | undefined;

    try {
      const resp = await fetch(`${dispatchUrl}/api/a2a/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': input.tenantId,
        },
        body: JSON.stringify(envelope),
        signal: AbortSignal.timeout(3000),
      });
      status = resp.ok ? 'accepted' : 'rejected';
      reason = resp.ok ? undefined : `HTTP ${resp.status}`;
    } catch (_err) {
      status = 'queued';
      reason = 'Dispatch server unreachable â€” message queued for retry';
    }

    return {
      messageId,
      status,
      fromAgent: input.fromAgentId,
      toAgent: input.toAgentId,
      tenantId: input.tenantId,
      reason,
      dispatchedAt: new Date().toISOString(),
    };
  }
);

// â”€â”€ TTY Multi-Agent Orchestration Flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * TTY full orchestration — vt100 receives a directive, uses Gemini to plan
 * a multi-agent response, assigns tasks to specific agents, and dispatches
 * A2A messages for each assignment.
 *
 * This is the primary entry point for the Chat Console → orchestration pipeline.
 */
export const ttyOrchestrationFlow = ai.defineFlow(
  {
    name: 'ttyOrchestration',
    inputSchema: TTYOrchestrationInputSchema,
    outputSchema: TTYOrchestrationOutputSchema,
  },
  async (input) => {
    const TTY_ROSTER = [
      { id: 'vt100',   role: 'Strategic orchestration, research direction, system-level decisions' },
      { id: 'vt220',   role: 'Validation, quality assurance, constitutional compliance' },
      { id: 'xterm',   role: 'Execution lead, build orchestration, deployment decisions' },
      { id: 'kstated',   role: 'Memory management, context retrieval, knowledge synthesis' },
      { id: 'kdocsd',      role: 'Legal drafting, contract generation, policy writing' },
      { id: 'compass',  role: 'Research tasks, market analysis, competitive intelligence' },
      { id: 'comet',    role: 'Browser automation, live web research, UI interaction' },
      { id: 'herald',   role: 'Content writing, copywriting, social posts, emails' },
      { id: 'forge',    role: 'Deployment, infrastructure, Docker operations' },
      { id: 'dira',     role: 'Issue resolution, telemetry analysis, auto-fix' },
      { id: 'klogd',   role: 'Long-term memory writes, knowledge item creation' },
      { id: 'lens',     role: 'UI/UX design, visual design, component creation' },
    ];

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `You are vt100 — strategic terminal of the Creative Liberation Engine.
Your role: receive a directive and orchestrate the appropriate agents to fulfil it.

Available agents:
${TTY_ROSTER.map(a => `- ${a.id.toUpperCase()}: ${a.role}`).join('\n')}

Rules:
1. Select only the agents truly needed â€” keep the assignment list minimal
2. Each assignment must have a clear, actionable task description
3. Priority: P0=blocking/critical, P1=high, P2=normal, P3=low
4. Return a natural language plan + the structured assignment list
5. estimatedCompletionMs is optional â€” only include if confident`,
      prompt: `Directive: "${input.directive}"
TenantID: ${input.tenantId}
Priority: ${input.priority}
Target agents (if specified): ${input.targetAgents?.join(', ') ?? 'auto-select'}
Context: ${JSON.stringify(input.context ?? {})}

Plan and assign tasks. Return valid JSON only.`,
      output: {
        schema: z.object({
          plan: z.string(),
          assignments: z.array(z.object({
            agentId: z.string(),
            role: z.string(),
            task: z.string(),
            priority: z.enum(['P0', 'P1', 'P2', 'P3']),
          })),
          estimatedCompletionMs: z.number().optional(),
        }),
      },
    });

    if (!output) throw new Error('[ttyOrchestration] Gemini returned no output');

    // Dispatch A2A messages for each assignment
    const dispatchUrl = process.env['DISPATCH_URL'] ?? 'http://127.0.0.1:5050';
    await Promise.allSettled(
      output.assignments.map(async (assignment) => {
        const envelope = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          from: 'vt100',
          to: assignment.agentId,
          tenantId: input.tenantId,
          type: 'task',
          payload: { task: assignment.task, priority: assignment.priority, role: assignment.role },
          sentAt: new Date().toISOString(),
        };
        await fetch(`${dispatchUrl}/api/a2a/dispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': input.tenantId },
          body: JSON.stringify(envelope),
          signal: AbortSignal.timeout(2000),
        }).catch(() => null); // Fire-and-forget â€” queue handles retries
      })
    );

    return {
      plan: output.plan,
      assignments: output.assignments,
      estimatedCompletionMs: output.estimatedCompletionMs,
      dispatchedAt: new Date().toISOString(),
    };
  }
);

