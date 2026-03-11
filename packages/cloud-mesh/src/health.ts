/**
 * Cloud Mesh — Health Monitor
 *
 * Periodically pings all registered cloud targets and updates their
 * health status in the TargetRegistry. Dead targets graduate from
 * 'degraded' → 'offline' after exceeding the failure threshold.
 *
 * @package cloud-mesh
 */

import type { MeshConfig, TargetHealth } from './types.js';
import { TargetRegistry } from './router.js';

export class MeshHealthMonitor {
  private registry: TargetRegistry;
  private config: Pick<MeshConfig, 'healthCheckIntervalMs' | 'failureThreshold' | 'healthCheckTimeoutMs'>;
  private failureCounts = new Map<string, number>();
  private healthLog: TargetHealth[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    registry: TargetRegistry,
    config: Pick<MeshConfig, 'healthCheckIntervalMs' | 'failureThreshold' | 'healthCheckTimeoutMs'>,
  ) {
    this.registry = registry;
    this.config = config;
  }

  /** Start background health monitoring */
  start(): void {
    if (this.timer) return;

    // Run immediately on start, then on interval
    void this.checkAll();
    this.timer = setInterval(() => {
      void this.checkAll();
    }, this.config.healthCheckIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getHealthLog(): TargetHealth[] {
    return [...this.healthLog];
  }

  async checkAll(): Promise<TargetHealth[]> {
    const targets = this.registry.getAll();
    const results = await Promise.all(
      targets.map((t) => this.checkTarget(t.id, t.healthCheckUrl)),
    );
    this.healthLog = results;
    return results;
  }

  async checkTarget(targetId: string, healthCheckUrl: string): Promise<TargetHealth> {
    const target = this.registry.getTarget(targetId);
    const provider = target?.provider ?? 'local';
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.healthCheckTimeoutMs,
    );

    const start = Date.now();
    let success = false;
    let latencyMs: number | undefined;

    try {
      const res = await fetch(healthCheckUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      latencyMs = Date.now() - start;
      success = res.ok;
    } catch {
      // timeout or network error
    } finally {
      clearTimeout(timer);
    }

    const prevFailures = this.failureCounts.get(targetId) ?? 0;

    if (success) {
      this.failureCounts.set(targetId, 0);
      this.registry.setStatus(targetId, 'healthy');

      return {
        targetId,
        provider,
        status: 'healthy',
        lastCheckedAt: new Date().toISOString(),
        lastLatencyMs: latencyMs,
        consecutiveFailures: 0,
      };
    } else {
      const newFailures = prevFailures + 1;
      this.failureCounts.set(targetId, newFailures);

      const status = newFailures >= this.config.failureThreshold ? 'offline' : 'degraded';
      this.registry.setStatus(targetId, status);

      return {
        targetId,
        provider,
        status,
        lastCheckedAt: new Date().toISOString(),
        lastLatencyMs: latencyMs,
        consecutiveFailures: newFailures,
      };
    }
  }
}
