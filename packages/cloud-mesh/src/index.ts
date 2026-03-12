/**
 * @cle/cloud-mesh — Stub implementation for cloud workload routing.
 * Provides types and no-op implementations for FORGE integration.
 */

export interface MeshTarget {
  id: string;
  provider: 'local' | 'cloudflare' | 'gcp';
  endpoint: string;
  costPerInvocationUSD: number;
  avgLatencyMs: number;
  maxConcurrent: number;
  healthCheckUrl: string;
  sovereign?: boolean;
}

export interface MeshConfig {
  targets: MeshTarget[];
  healthCheckIntervalMs: number;
  failureThreshold: number;
  healthCheckTimeoutMs: number;
  executionTimeoutMs: number;
}

export interface ExecutionPlan {
  taskId: string;
  agentId: string;
  capability: string;
  sovereignOnly?: boolean;
  maxCostUSD?: number;
  preferredProvider?: 'local' | 'cloudflare' | 'gcp';
  payload: unknown;
}

export interface MeshExecutionResult {
  provider: string;
  targetId: string;
  status: 'success' | 'failed' | 'fallback-success';
  output: unknown;
  actualCostUSD: number;
  actualLatencyMs: number;
  attemptCount: number;
}

export interface CloudMeshRouter {
  route(plan: ExecutionPlan): Promise<{ targetId: string; provider: string }>;
}

export interface CloudMeshExecutor {
  execute(plan: ExecutionPlan): Promise<MeshExecutionResult>;
}

export interface MeshHealthMonitor {
  start(): void;
  stop(): void;
}

export interface CloudMesh {
  router: CloudMeshRouter;
  executor: CloudMeshExecutor;
  monitor: MeshHealthMonitor;
}

function createStubRouter(config: MeshConfig): CloudMeshRouter {
  return {
    async route(plan: ExecutionPlan) {
      const target = config.targets[0] ?? { id: 'local', provider: 'local' as const };
      return { targetId: target.id, provider: target.provider };
    },
  };
}

function createStubExecutor(config: MeshConfig): CloudMeshExecutor {
  return {
    async execute(plan: ExecutionPlan): Promise<MeshExecutionResult> {
      const target = config.targets[0] ?? {
        id: 'local',
        provider: 'local' as const,
        costPerInvocationUSD: 0,
      };
      return {
        provider: target.provider,
        targetId: target.id,
        status: 'success',
        output: plan.payload,
        actualCostUSD: target.costPerInvocationUSD,
        actualLatencyMs: 5,
        attemptCount: 1,
      };
    },
  };
}

function createStubMonitor(): MeshHealthMonitor {
  return {
    start() {},
    stop() {},
  };
}

export function createCloudMesh(config: MeshConfig): CloudMesh {
  return {
    router: createStubRouter(config),
    executor: createStubExecutor(config),
    monitor: createStubMonitor(),
  };
}
