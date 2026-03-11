/**
 * Cloud Mesh Router — Core Types
 *
 * Defines the execution routing layer that makes Creative Liberation Engine
 * cloud-provider-agnostic. Every task flows through the mesh;
 * the mesh decides where it runs.
 *
 * @package cloud-mesh
 */

// ─── Cloud Providers ──────────────────────────────────────────────────────────

export type CloudProvider =
  | 'gcp'          // Google Cloud Run — stateless burst
  | 'cloudflare'   // Cloudflare Workers — global edge, sub-50ms
  | 'aws'          // AWS Lambda Function URLs — burst overflow
  | 'fly'          // Fly.io — always-on lightweight daemons
  | 'local';       // Sovereign NAS — P0 privacy, zero cost

export type TargetStatus = 'healthy' | 'degraded' | 'offline';

// ─── Cloud Target ─────────────────────────────────────────────────────────────

/**
 * A single cloud execution target. The mesh maintains a registry of these
 * and selects the optimal one per task.
 */
export interface CloudTarget {
  /** Unique identifier for this target, e.g. "gcp-us-central1" */
  id: string;
  provider: CloudProvider;
  /** Full URL to POST task payloads to */
  endpoint: string;
  region?: string;
  /** Cost in USD per invocation (not per second — per call) */
  costPerInvocationUSD: number;
  /** Average observed latency in milliseconds */
  avgLatencyMs: number;
  /** Max simultaneous in-flight requests */
  maxConcurrent: number;
  /** URL to GET for health check — expects 200 */
  healthCheckUrl: string;
  /** Static API key or Bearer token for this target, if required */
  authToken?: string;
  /** Whether this target is permanently sovereign (never routed to unless explicit) */
  sovereign: boolean;
}

// ─── Execution Plan ───────────────────────────────────────────────────────────

/**
 * Describes a task to be routed and executed. The router selects
 * the best CloudTarget and returns a MeshRoutingResult.
 */
export interface ExecutionPlan {
  taskId: string;
  agentId: string;
  /** Capability required for this task — e.g. "image-gen", "code-review" */
  capability?: string;
  /** Only route to local sovereign infrastructure */
  sovereignOnly?: boolean;
  /** Hard cap — reject any target exceeding this cost */
  maxCostUSD?: number;
  /** Hard cap — reject any target slower than this */
  maxLatencyMs?: number;
  /** Preferred provider — used as tie-breaker, not hard constraint */
  preferredProvider?: CloudProvider;
  /** The actual task payload forwarded to the target */
  payload: unknown;
}

// ─── Routing Result ───────────────────────────────────────────────────────────

export interface MeshRoutingResult {
  target: CloudTarget;
  estimatedCostUSD: number;
  estimatedLatencyMs: number;
  reasoning: string;
  /** Ordered list of fallback targets if primary fails */
  fallbackChain: CloudTarget[];
}

// ─── Execution Result ─────────────────────────────────────────────────────────

export interface MeshExecutionResult {
  taskId: string;
  provider: CloudProvider;
  targetId: string;
  status: 'success' | 'failed' | 'fallback-success';
  output: unknown;
  actualLatencyMs: number;
  actualCostUSD: number;
  attemptCount: number;
}

// ─── Health State ─────────────────────────────────────────────────────────────

export interface TargetHealth {
  targetId: string;
  provider: CloudProvider;
  status: TargetStatus;
  lastCheckedAt: string;
  lastLatencyMs?: number;
  consecutiveFailures: number;
}

// ─── Mesh Config ──────────────────────────────────────────────────────────────

export interface MeshConfig {
  targets: CloudTarget[];
  /** How often to ping health check URLs in milliseconds */
  healthCheckIntervalMs: number;
  /** Number of consecutive failures before marking a target offline */
  failureThreshold: number;
  /** Timeout for individual health check requests */
  healthCheckTimeoutMs: number;
  /** Timeout for actual task execution requests */
  executionTimeoutMs: number;
}
