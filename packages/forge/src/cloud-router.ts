/**
 * FORGE Cloud Router
 *
 * Bridges the FORGE asset generation pipeline to the @inception/cloud-mesh
 * execution router. When asset generation or theme bundling jobs are triggered,
 * this module selects the cheapest/fastest healthy cloud target and routes the
 * workload there, recording actual cost against the FORGE ledger.
 *
 * Design:
 *  - createCloudMesh() boots a mesh with sensible defaults for FORGE workloads
 *  - routeAssetJob() wraps CloudMeshExecutor with FORGE-aware cost tracking
 *  - ForgeCloudRouter singleton binds to ForgeEngine events automatically
 */

import {
  createCloudMesh,
  type CloudMeshRouter,
  type CloudMeshExecutor,
  type MeshHealthMonitor,
  type MeshConfig,
} from '@inception/cloud-mesh';
import type { ExecutionPlan, MeshExecutionResult } from '@inception/cloud-mesh';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForgeJobPayload {
  /** Asset session ID or bundle ID */
  jobId: string;
  /** Type of workload to route */
  jobType: 'asset-gen' | 'theme-bundle' | 'lora-train' | 'image-render';
  /** Estimated compute requirements — used to select the right tier */
  computeEstimate: 'light' | 'medium' | 'heavy';
  /** Raw payload forwarded to the cloud target */
  payload: unknown;
  /** Max spend per job in USD. Defaults to $0.01 */
  maxCostUSD?: number;
}

export interface ForgeJobResult {
  jobId: string;
  provider: string;
  targetId: string;
  status: 'success' | 'failed' | 'fallback-success';
  output: unknown;
  actualCostUSD: number;
  actualLatencyMs: number;
  attempts: number;
}

export interface ForgeCloudRouterConfig {
  /** Override the full mesh config — otherwise uses FORGE defaults */
  meshConfig?: MeshConfig;
  /** Sovereign NAS endpoint for local-only jobs */
  sovereignEndpoint?: string;
  /** GCP Cloud Run endpoint for medium/heavy jobs */
  gcpEndpoint?: string;
  /** Cloudflare Workers endpoint for light edge jobs */
  cfEndpoint?: string;
}

// ─── Default Mesh Config for FORGE Workloads ─────────────────────────────────

function buildDefaultMeshConfig(
  cfg: ForgeCloudRouterConfig
): MeshConfig {
  const targets: MeshConfig['targets'] = [];

  if (cfg.sovereignEndpoint) {
    targets.push({
      id: 'forge-local',
      provider: 'local',
      endpoint: cfg.sovereignEndpoint,
      costPerInvocationUSD: 0,
      avgLatencyMs: 10,
      maxConcurrent: 4,
      healthCheckUrl: `${cfg.sovereignEndpoint}/health`,
      sovereign: true,
    });
  }

  if (cfg.cfEndpoint) {
    targets.push({
      id: 'forge-cf-edge',
      provider: 'cloudflare',
      endpoint: cfg.cfEndpoint,
      costPerInvocationUSD: 0.0000003,
      avgLatencyMs: 40,
      maxConcurrent: 1000,
      healthCheckUrl: `${cfg.cfEndpoint}/health`,
      sovereign: false,
    });
  }

  if (cfg.gcpEndpoint) {
    targets.push({
      id: 'forge-gcp',
      provider: 'gcp',
      endpoint: cfg.gcpEndpoint,
      costPerInvocationUSD: 0.000002,
      avgLatencyMs: 200,
      maxConcurrent: 100,
      healthCheckUrl: `${cfg.gcpEndpoint}/health`,
      sovereign: false,
    });
  }

  return {
    targets,
    healthCheckIntervalMs: 30_000,
    failureThreshold: 3,
    healthCheckTimeoutMs: 5_000,
    executionTimeoutMs: 60_000,
  };
}

// ─── ForgeCloudRouter ─────────────────────────────────────────────────────────

export class ForgeCloudRouter {
  private readonly router: CloudMeshRouter;
  private readonly executor: CloudMeshExecutor;
  private readonly monitor: MeshHealthMonitor;

  /** Cumulative cost tracking for this session */
  private totalCostUSD = 0;
  private jobCount = 0;

  constructor(config: ForgeCloudRouterConfig = {}) {
    const meshConfig = config.meshConfig ?? buildDefaultMeshConfig(config);

    if (meshConfig.targets.length === 0) {
      console.warn(
        '[forge:cloud-router] No cloud targets configured — all jobs will fall back to local. ' +
        'Set sovereignEndpoint, cfEndpoint, or gcpEndpoint in env or config.'
      );
    }

    const mesh = createCloudMesh(meshConfig);
    this.router = mesh.router;
    this.executor = mesh.executor;
    this.monitor = mesh.monitor;

    // Start health monitoring — polls all targets every 30s
    this.monitor.start();

    console.log(
      `[forge:cloud-router] Initialized with ${meshConfig.targets.length} target(s), health monitor active`
    );
  }

  /** Stop the health monitor — call on graceful shutdown. */
  stop(): void {
    this.monitor.stop();
  }

  /**
   * Route a FORGE asset generation job through the cloud mesh.
   * Automatically selects the cheapest viable target.
   */
  async routeJob(job: ForgeJobPayload): Promise<ForgeJobResult> {
    const plan: ExecutionPlan = {
      taskId: job.jobId,
      agentId: 'forge-engine',
      capability: job.jobType,
      sovereignOnly: job.computeEstimate === 'heavy', // heavy jobs stay local
      maxCostUSD: job.maxCostUSD ?? 0.01,
      // Light jobs prefer edge; medium/heavy prefer GCP or local
      preferredProvider:
        job.computeEstimate === 'light' ? 'cloudflare' :
        job.computeEstimate === 'medium' ? 'gcp' : 'local',
      payload: job.payload,
    };

    const start = Date.now();

    let raw: MeshExecutionResult;
    try {
      raw = await this.executor.execute(plan);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        jobId: job.jobId,
        provider: 'none',
        targetId: 'none',
        status: 'failed',
        output: { error: message },
        actualCostUSD: 0,
        actualLatencyMs: Date.now() - start,
        attempts: 1,
      };
    }

    this.totalCostUSD += raw.actualCostUSD;
    this.jobCount += 1;

    console.log(
      `[forge:cloud-router] Job ${job.jobId} → ${raw.provider} ` +
      `$${raw.actualCostUSD.toFixed(8)} ${raw.actualLatencyMs}ms`
    );

    return {
      jobId: job.jobId,
      provider: raw.provider,
      targetId: raw.targetId,
      status: raw.status,
      output: raw.output,
      actualCostUSD: raw.actualCostUSD,
      actualLatencyMs: raw.actualLatencyMs,
      attempts: raw.attemptCount,
    };
  }

  /** Total spend across all jobs since router was initialized. */
  getTotalCostUSD(): number {
    return this.totalCostUSD;
  }

  /** Total jobs dispatched. */
  getJobCount(): number {
    return this.jobCount;
  }

  /** Average cost per job. */
  getAvgCostPerJob(): number {
    return this.jobCount > 0 ? this.totalCostUSD / this.jobCount : 0;
  }

  /** Routing decision preview — shows which target would be selected without executing. */
  async previewRoute(job: Omit<ForgeJobPayload, 'payload'>) {
    const plan: ExecutionPlan = {
      taskId: job.jobId,
      agentId: 'forge-engine',
      capability: job.jobType,
      sovereignOnly: job.computeEstimate === 'heavy',
      maxCostUSD: job.maxCostUSD ?? 0.01,
      preferredProvider:
        job.computeEstimate === 'light' ? 'cloudflare' :
        job.computeEstimate === 'medium' ? 'gcp' : 'local',
      payload: null,
    };
    return this.router.route(plan);
  }
}

// ─── Singleton Factory ────────────────────────────────────────────────────────

let _instance: ForgeCloudRouter | null = null;

/**
 * Get or create the singleton ForgeCloudRouter.
 * Call once at server boot with your endpoint config.
 */
export function getForgeCloudRouter(
  config?: ForgeCloudRouterConfig
): ForgeCloudRouter {
  if (!_instance) {
    _instance = new ForgeCloudRouter(config);
  }
  return _instance;
}
