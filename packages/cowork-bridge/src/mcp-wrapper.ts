/**
 * @inception/cowork-bridge â€” MCP Wrapper
 *
 * Wraps the IE dispatch MCP tools for Cowork protocol compatibility.
 * Adds ownership enforcement and model routing to every tool call.
 */

import type { BridgeState, AgentOwnership } from './types.js';

const DISPATCH_BASE = process.env.DISPATCH_URL ?? 'http://127.0.0.1:5050';

/** Call a dispatch MCP tool via REST */
async function callDispatch(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${DISPATCH_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Dispatch ${endpoint} failed: ${res.status}`);
  return res.json();
}

/** Check if an agent is allowed to perform this action */
export function enforceOwnership(
  agentId: string,
  toolName: string,
  workstream: string | undefined,
  state: BridgeState,
): { allowed: boolean; reason?: string } {
  if (!state.ownership) return { allowed: true };

  const policy = state.ownership.agents.find(a => a.agent_id === agentId);
  const defaults = state.ownership.defaultPolicy;

  if (!policy) {
    // Use defaults
    if (!defaults.allowAllTools) {
      return { allowed: false, reason: `Agent ${agentId} has no ownership entry and default denies tools` };
    }
    return { allowed: true };
  }

  // Check denied tools first (explicit deny overrides allow)
  if (policy.deniedTools.includes(toolName)) {
    return { allowed: false, reason: `Tool ${toolName} explicitly denied for ${agentId}` };
  }

  // Check allowed tools
  if (policy.allowedTools.length > 0 && !policy.allowedTools.includes(toolName)) {
    return { allowed: false, reason: `Tool ${toolName} not in allowedTools for ${agentId}` };
  }

  // Check workstream
  if (workstream && policy.allowedWorkstreams.length > 0) {
    if (!policy.allowedWorkstreams.includes(workstream)) {
      return { allowed: false, reason: `Workstream ${workstream} not allowed for ${agentId}` };
    }
  }

  return { allowed: true };
}

/** Wrapped claim_task with ownership check */
export async function claimTask(
  taskId: string,
  agentId: string,
  state: BridgeState,
): Promise<unknown> {
  const check = enforceOwnership(agentId, 'claim_task', undefined, state);
  if (!check.allowed) {
    return { error: check.reason, blocked_by: 'ownership_enforcement' };
  }
  return callDispatch('/api/tasks/claim', { task_id: taskId, agent_id: agentId });
}

/** Wrapped add_task */
export async function addTask(
  args: Record<string, unknown>,
  agentId: string,
  state: BridgeState,
): Promise<unknown> {
  const check = enforceOwnership(agentId, 'add_task', args.workstream as string, state);
  if (!check.allowed) {
    return { error: check.reason, blocked_by: 'ownership_enforcement' };
  }
  return callDispatch('/api/tasks', { ...args, created_by: agentId });
}

/** Wrapped complete_task */
export async function completeTask(
  taskId: string,
  agentId: string,
  note?: string,
  artifacts?: string[],
): Promise<unknown> {
  return callDispatch(`/api/tasks/${taskId}/resolve`, {
    agent_id: agentId,
    note: note ?? 'Completed via cowork-bridge',
    ...(artifacts ? { artifacts } : {}),
  });
}

/** Get dispatch status */
export async function getStatus(): Promise<unknown> {
  const res = await fetch(`${DISPATCH_BASE}/api/status`);
  return res.json();
}

/** List tasks with optional filters */
export async function listTasks(filters?: Record<string, string>): Promise<unknown> {
  const params = new URLSearchParams(filters ?? {});
  const res = await fetch(`${DISPATCH_BASE}/api/tasks?${params}`);
  return res.json();
}

/** Send heartbeat for an agent */
export async function heartbeat(
  agentId: string,
  meta?: { window?: string; workstream?: string; tool?: string },
): Promise<void> {
  await fetch(`${DISPATCH_BASE}/api/agents/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, ...meta }),
  });
}