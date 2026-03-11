/**
 * @inception/cloud-mesh — Public API
 *
 * The multi-cloud execution router for the Creative Liberation Engine.
 * Routes agent tasks to the cheapest/fastest available cloud target.
 */

// Core types
export type {
  CloudProvider,
  CloudTarget,
  ExecutionPlan,
  MeshRoutingResult,
  MeshExecutionResult,
  MeshConfig,
  TargetHealth,
  TargetStatus,
} from './types.js';

// Router
export { TargetRegistry, CloudMeshRouter, CloudMeshExecutor } from './router.js';

// Health monitor
export { MeshHealthMonitor } from './health.js';

// Adapters
export { buildGcpTarget, fetchGcpAccessToken } from './adapters/gcp.js';
export { buildCloudflareTarget } from './adapters/cloudflare.js';
export { buildAwsTarget } from './adapters/aws.js';
export { buildFlyTarget } from './adapters/fly.js';

// ─── Convenience Factory ──────────────────────────────────────────────────────

import { TargetRegistry, CloudMeshRouter, CloudMeshExecutor } from './router.js';
import { MeshHealthMonitor } from './health.js';
import type { MeshConfig, CloudTarget } from './types.js';

/**
 * Create a fully initialized CloudMesh with executor and health monitor.
 *
 * ```ts
 * const mesh = createCloudMesh({
 *   targets: [gcpTarget, cloudflareTarget, awsTarget],
 *   healthCheckIntervalMs: 30_000,
 *   failureThreshold: 3,
 *   healthCheckTimeoutMs: 5_000,
 *   executionTimeoutMs: 30_000,
 * });
 *
 * mesh.monitor.start(); // Begin health monitoring
 * const result = await mesh.executor.execute(plan);
 * ```
 */
export function createCloudMesh(config: MeshConfig): {
  registry: TargetRegistry;
  router: CloudMeshRouter;
  executor: CloudMeshExecutor;
  monitor: MeshHealthMonitor;
} {
  const registry = new TargetRegistry();
  config.targets.forEach((t) => registry.register(t));

  const router = new CloudMeshRouter(registry);
  const executor = new CloudMeshExecutor(router, { executionTimeoutMs: config.executionTimeoutMs });
  const monitor = new MeshHealthMonitor(registry, {
    healthCheckIntervalMs: config.healthCheckIntervalMs,
    failureThreshold: config.failureThreshold,
    healthCheckTimeoutMs: config.healthCheckTimeoutMs,
  });

  return { registry, router, executor, monitor };
}
