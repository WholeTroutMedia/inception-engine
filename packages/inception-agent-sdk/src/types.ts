/**
 * Inception Agent SDK — Core Types
 *
 * The type vocabulary for agents that register into the
 * Creative Liberation Engine mesh from any cloud provider.
 *
 * @package inception-agent-sdk
 */

// ─── Cloud Providers ──────────────────────────────────────────────────────────

export type CloudProvider =
  | 'gcp'
  | 'cloudflare'
  | 'aws'
  | 'fly'
  | 'vercel'
  | 'local'
  | 'other';

// ─── Agent Manifest ───────────────────────────────────────────────────────────

/**
 * Describes an agent to the Creative Liberation Engine dispatch.
 * This is what gets registered on startup and broadcast in the mesh.
 */
export interface AgentManifest {
  /** Globally unique agent identifier. Convention: "{owner}/{agent-name}" */
  agentId: string;
  /** Human-readable display name */
  name: string;
  /** Semver string */
  version: string;
  /**
   * List of capability tags this agent can handle.
   * Examples: 'image-gen', 'code-review', 'data-analysis', 'transcription'
   */
  capabilities: string[];
  /** URL of the Creative Liberation Engine dispatch to register with */
  dispatchEndpoint: string;
  /** Cloud provider where this agent runs */
  cloudProvider: CloudProvider;
  /** Public URL where this agent accepts task webhooks */
  endpoint: string;
  /** Optional API key for mutual authentication */
  apiKey?: string;
  /** Optional metadata for discovery */
  metadata?: Record<string, unknown>;
}

// ─── Task Envelope ────────────────────────────────────────────────────────────

/**
 * A task delivered to the agent from dispatch.
 */
export interface TaskEnvelope {
  taskId: string;
  type: string;
  /** Capability tag this task requires */
  capability: string;
  payload: unknown;
  /** ISO 8601 deadline — agent should abort and report failure after this */
  deadline?: string;
  /** URL to POST the result to (optional — agent can also push to dispatch) */
  callbackUrl?: string;
  /** Originating agent — for chain-of-custody tracking */
  requestedBy?: string;
  /** Priority 0 (highest) to 9 (lowest) */
  priority: number;
}

// ─── Task Result ──────────────────────────────────────────────────────────────

export interface TaskResult {
  taskId: string;
  agentId: string;
  status: 'completed' | 'failed' | 'partial';
  output: unknown;
  /** Wall-clock time from task receipt to completion */
  durationMs: number;
  /** Estimated cost the agent incurred (for billing / cost tracking) */
  costUSD?: number;
  /** Error message if status is 'failed' */
  error?: string;
}

// ─── Registration Response ────────────────────────────────────────────────────

export interface RegistrationResponse {
  success: boolean;
  agentId: string;
  assignedDispatchId: string;
  heartbeatIntervalMs: number;
  message?: string;
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

export interface HeartbeatPayload {
  agentId: string;
  status: 'idle' | 'busy' | 'draining';
  currentTaskId?: string;
  uptimeMs: number;
  cloudProvider: CloudProvider;
  endpoint: string;
}

// ─── Dispatch Events ──────────────────────────────────────────────────────────

export type DispatchEvent =
  | { type: 'task'; envelope: TaskEnvelope }
  | { type: 'ping'; timestamp: string }
  | { type: 'shutdown'; reason: string }
  | { type: 'capability_update'; newCapabilities: string[] };

// ─── Agent Worker Config ──────────────────────────────────────────────────────

export interface AgentWorkerConfig {
  manifest: AgentManifest;
  /** Override heartbeat interval (default: 30000ms) */
  heartbeatIntervalMs?: number;
  /** Override task poll interval when using polling mode (default: 5000ms) */
  pollIntervalMs?: number;
  /** Prefer SSE streaming over polling for task delivery (default: true) */
  preferStreaming?: boolean;
}
