/**
 * Cloud Mesh Router
 *
 * Routes execution plans to the optimal cloud target based on:
 * 1. Sovereignty constraints (sovereign data = local only)
 * 2. Health status (offline targets excluded)
 * 3. Cost cap (targets exceeding maxCostUSD excluded)
 * 4. Latency cap (targets exceeding maxLatencyMs excluded)
 * 5. Cheapest wins among qualifying targets
 *
 * @package cloud-mesh
 */

import type {
  CloudTarget,
  ExecutionPlan,
  MeshRoutingResult,
  MeshExecutionResult,
  MeshConfig,
  TargetStatus,
} from './types.js';

// ─── Target Registry ──────────────────────────────────────────────────────────

export class TargetRegistry {
  private targets = new Map<string, CloudTarget>();
  private health = new Map<string, TargetStatus>();

  register(target: CloudTarget): void {
    this.targets.set(target.id, target);
    this.health.set(target.id, 'healthy');
  }

  unregister(targetId: string): void {
    this.targets.delete(targetId);
    this.health.delete(targetId);
  }

  setStatus(targetId: string, status: TargetStatus): void {
    this.health.set(targetId, status);
  }

  getStatus(targetId: string): TargetStatus {
    return this.health.get(targetId) ?? 'offline';
  }

  getAll(): CloudTarget[] {
    return Array.from(this.targets.values());
  }

  getHealthy(): CloudTarget[] {
    return this.getAll().filter(
      (t) => this.getStatus(t.id) === 'healthy',
    );
  }

  getSovereign(): CloudTarget[] {
    return this.getHealthy().filter((t) => t.provider === 'local');
  }

  getTarget(id: string): CloudTarget | undefined {
    return this.targets.get(id);
  }
}

// ─── Scoring Algorithm ────────────────────────────────────────────────────────

interface ScoredTarget {
  target: CloudTarget;
  score: number;
}

function scoreTarget(
  target: CloudTarget,
  plan: ExecutionPlan,
): number | null {
  // Hard constraint: cost cap
  if (
    plan.maxCostUSD !== undefined &&
    target.costPerInvocationUSD > plan.maxCostUSD
  ) {
    return null;
  }

  // Hard constraint: latency cap
  if (
    plan.maxLatencyMs !== undefined &&
    target.avgLatencyMs > plan.maxLatencyMs
  ) {
    return null;
  }

  // Score: lower is better
  // Weight: 60% cost, 40% latency — normalize to 0–1 ranges
  // Cost baseline: $0.001 per invocation = score 0, $1.00 = score 1
  const costScore = Math.min(target.costPerInvocationUSD / 0.001, 1.0);
  // Latency baseline: 50ms = score 0, 5000ms = score 1
  const latencyScore = Math.min(target.avgLatencyMs / 5000, 1.0);

  let score = 0.6 * costScore + 0.4 * latencyScore;

  // Boost preferred provider (lower score = more preferred)
  if (plan.preferredProvider && target.provider === plan.preferredProvider) {
    score *= 0.8;
  }

  return score;
}

// ─── Cloud Mesh Router ────────────────────────────────────────────────────────

export class CloudMeshRouter {
  private registry: TargetRegistry;

  constructor(registry: TargetRegistry) {
    this.registry = registry;
  }

  /**
   * Select the optimal execution target for a given plan.
   * Returns null if no qualifying target exists.
   */
  route(plan: ExecutionPlan): MeshRoutingResult | null {
    const candidates: CloudTarget[] = plan.sovereignOnly
      ? this.registry.getSovereign()
      : this.registry.getHealthy();

    if (candidates.length === 0) {
      return null;
    }

    const scored: ScoredTarget[] = candidates
      .map((t): ScoredTarget | null => {
        const s = scoreTarget(t, plan);
        return s !== null ? { target: t, score: s } : null;
      })
      .filter((s): s is ScoredTarget => s !== null)
      .sort((a, b) => a.score - b.score);

    if (scored.length === 0) {
      return null;
    }

    const [winner, ...rest] = scored;

    const reasoning = buildReasoning(winner, plan);

    return {
      target: winner.target,
      estimatedCostUSD: winner.target.costPerInvocationUSD,
      estimatedLatencyMs: winner.target.avgLatencyMs,
      reasoning,
      fallbackChain: rest.map((s) => s.target),
    };
  }

  getRegistry(): TargetRegistry {
    return this.registry;
  }
}

// ─── Mesh Executor ────────────────────────────────────────────────────────────

/**
 * Routes AND executes — handles fallback chain automatically.
 */
export class CloudMeshExecutor {
  private router: CloudMeshRouter;
  private config: Pick<MeshConfig, 'executionTimeoutMs'>;

  constructor(
    router: CloudMeshRouter,
    config: Pick<MeshConfig, 'executionTimeoutMs'>,
  ) {
    this.router = router;
    this.config = config;
  }

  async execute(plan: ExecutionPlan): Promise<MeshExecutionResult> {
    const routing = this.router.route(plan);

    if (!routing) {
      return {
        taskId: plan.taskId,
        provider: 'local',
        targetId: 'none',
        status: 'failed',
        output: null,
        actualLatencyMs: 0,
        actualCostUSD: 0,
        attemptCount: 0,
      };
    }

    const targetsToTry = [routing.target, ...routing.fallbackChain];

    for (let attempt = 0; attempt < targetsToTry.length; attempt++) {
      const target = targetsToTry[attempt];

      if (!target) continue;

      const result = await this.tryExecute(plan, target);

      if (result !== null) {
        return {
          taskId: plan.taskId,
          provider: target.provider,
          targetId: target.id,
          status: attempt === 0 ? 'success' : 'fallback-success',
          output: result,
          actualLatencyMs: target.avgLatencyMs,
          actualCostUSD: target.costPerInvocationUSD,
          attemptCount: attempt + 1,
        };
      }

      // Mark this target degraded for future routing decisions
      this.router.getRegistry().setStatus(target.id, 'degraded');
    }

    return {
      taskId: plan.taskId,
      provider: 'local',
      targetId: 'none',
      status: 'failed',
      output: null,
      actualLatencyMs: 0,
      actualCostUSD: 0,
      attemptCount: targetsToTry.length,
    };
  }

  private async tryExecute(
    plan: ExecutionPlan,
    target: CloudTarget,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.executionTimeoutMs,
    );

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (target.authToken) {
        headers['Authorization'] = `Bearer ${target.authToken}`;
      }

      const response = await fetch(target.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          taskId: plan.taskId,
          agentId: plan.agentId,
          payload: plan.payload,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return null;
      }

      return await response.json() as unknown;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildReasoning(
  winner: ScoredTarget,
  plan: ExecutionPlan,
): string {
  const parts: string[] = [];

  if (plan.sovereignOnly) {
    parts.push('sovereignty policy enforced → local only');
  }

  parts.push(
    `selected ${winner.target.provider}:${winner.target.id}`,
    `cost=$${winner.target.costPerInvocationUSD.toFixed(6)}/req`,
    `latency≈${winner.target.avgLatencyMs}ms`,
    `score=${winner.score.toFixed(4)}`,
  );

  if (plan.preferredProvider && winner.target.provider === plan.preferredProvider) {
    parts.push('(preferred provider bonus applied)');
  }

  return parts.join(' | ');
}
