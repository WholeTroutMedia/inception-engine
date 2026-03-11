/**
 * A2A Protocol — Agent-to-Agent Communication
 * Creative Liberation Engine v5.0.0 (GENESIS)
 *
 * Implements tenant-aware agent identity and inter-agent messaging.
 * Based on AWS prescriptive guidance for multi-tenant agent identity
 * spanning collaborating agents in complex orchestration pipelines.
 */

export type AgentTier = 'trinity' | 'hive' | 'specialist' | 'worker';
export type AgentCapability =
  | 'orchestrate'
  | 'generate'
  | 'research'
  | 'write'
  | 'validate'
  | 'deploy'
  | 'browse'
  | 'memory'
  | 'design';

export interface AgentIdentity {
  /** Unique agent ID within the cluster */
  agentId: string;
  /** Human-readable name */
  name: string;
  /** The tenant this agent is operating for */
  tenantId: string;
  /** Hive/collective this agent belongs to */
  hive: string;
  /** Agent tier determines capability surface */
  tier: AgentTier;
  /** What this agent can do */
  capabilities: AgentCapability[];
  /** Endpoint for receiving A2A messages */
  endpoint?: string;
  /** When this identity was issued */
  issuedAt: string;
  /** Session-scoped JWT or similar token */
  token?: string;
}

export interface A2AMessage {
  /** Unique message ID */
  id: string;
  /** Sender's agent ID */
  from: string;
  /** Recipient's agent ID */
  to: string;
  /** Tenant context — must match both agents' tenantId for cross-tenant guard */
  tenantId: string;
  /** Message type */
  type: 'task' | 'result' | 'error' | 'ping' | 'handoff';
  /** Payload */
  payload: unknown;
  /** ISO timestamp */
  sentAt: string;
  /** Conversation/trace ID for multi-hop correlation */
  correlationId?: string;
}

export interface A2AResponse {
  messageId: string;
  status: 'accepted' | 'rejected' | 'queued';
  reason?: string;
}

/**
 * A2ARegistry — Maintains the live roster of registered agent identities.
 * In production: backed by Redis pub/sub or the dispatch server.
 */
export class A2ARegistry {
  private agents = new Map<string, AgentIdentity>();

  register(identity: AgentIdentity): void {
    this.agents.set(identity.agentId, identity);
  }

  deregister(agentId: string): void {
    this.agents.delete(agentId);
  }

  resolve(agentId: string): AgentIdentity | undefined {
    return this.agents.get(agentId);
  }

  listByTenant(tenantId: string): AgentIdentity[] {
    return Array.from(this.agents.values()).filter(a => a.tenantId === tenantId);
  }

  listByCapability(capability: AgentCapability): AgentIdentity[] {
    return Array.from(this.agents.values()).filter(a => a.capabilities.includes(capability));
  }

  listAll(): AgentIdentity[] {
    return Array.from(this.agents.values());
  }
}

/** Singleton registry */
export const globalA2ARegistry = new A2ARegistry();

/**
 * Issue a new agent identity for a tenant session.
 */
export function issueAgentIdentity(params: Omit<AgentIdentity, 'issuedAt'>): AgentIdentity {
  const identity: AgentIdentity = {
    ...params,
    issuedAt: new Date().toISOString(),
  };
  globalA2ARegistry.register(identity);
  return identity;
}

/**
 * Validate that a message can cross the tenant boundary.
 * Strict isolation: agents from different tenants cannot message each other
 * unless both are in the 'trinity' tier (global AVERI leadership).
 */
export function validateA2AMessage(
  message: A2AMessage,
  senderIdentity: AgentIdentity,
  recipientIdentity: AgentIdentity
): { valid: boolean; reason?: string } {
  // Same tenant — always allowed
  if (senderIdentity.tenantId === recipientIdentity.tenantId) {
    return { valid: true };
  }

  // Cross-tenant allowed only for Trinity tier agents
  if (senderIdentity.tier === 'trinity' && recipientIdentity.tier === 'trinity') {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Cross-tenant A2A blocked: ${senderIdentity.agentId} (tenant: ${senderIdentity.tenantId}) → ${recipientIdentity.agentId} (tenant: ${recipientIdentity.tenantId}). Only Trinity agents can cross tenant boundaries.`,
  };
}

/**
 * Build a validated A2A message.
 */
export function buildA2AMessage(
  from: AgentIdentity,
  to: AgentIdentity,
  type: A2AMessage['type'],
  payload: unknown,
  correlationId?: string
): A2AMessage {
  const message: A2AMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: from.agentId,
    to: to.agentId,
    tenantId: from.tenantId,
    type,
    payload,
    sentAt: new Date().toISOString(),
    correlationId,
  };

  const validation = validateA2AMessage(message, from, to);
  if (!validation.valid) {
    throw new Error(`[A2A] ${validation.reason}`);
  }

  return message;
}

/**
 * Dispatch A2A message to an agent's HTTP endpoint.
 * Falls back to in-process delivery if no endpoint is registered.
 */
export async function dispatchA2AMessage(
  message: A2AMessage,
  registry: A2ARegistry = globalA2ARegistry
): Promise<A2AResponse> {
  const recipient = registry.resolve(message.to);

  if (!recipient) {
    return { messageId: message.id, status: 'rejected', reason: `Agent ${message.to} not found in registry` };
  }

  if (recipient.endpoint) {
    try {
      const resp = await fetch(recipient.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': message.tenantId,
          'X-A2A-Correlation-ID': message.correlationId ?? message.id,
        },
        body: JSON.stringify(message),
      });
      const status = resp.ok ? 'accepted' : 'rejected';
      return { messageId: message.id, status, reason: resp.ok ? undefined : `HTTP ${resp.status}` };
    } catch (err) {
      return { messageId: message.id, status: 'rejected', reason: String(err) };
    }
  }

  // No endpoint — queue for in-process pickup
  return { messageId: message.id, status: 'queued', reason: 'No endpoint; queued for in-process delivery' };
}
