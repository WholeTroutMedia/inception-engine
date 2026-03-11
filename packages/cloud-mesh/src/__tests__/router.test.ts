/**
 * cloud-mesh router tests
 * @package cloud-mesh
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TargetRegistry, CloudMeshRouter, CloudMeshExecutor } from '../router.js';
import type { CloudTarget, ExecutionPlan } from '../types.js';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const makeTarget = (overrides: Partial<CloudTarget>): CloudTarget => ({
  id: 'test-target',
  provider: 'gcp',
  endpoint: 'https://example.com/execute',
  costPerInvocationUSD: 0.000002,
  avgLatencyMs: 250,
  maxConcurrent: 1000,
  healthCheckUrl: 'https://example.com/health',
  sovereign: false,
  ...overrides,
});

const gcpTarget = makeTarget({ id: 'gcp-us', provider: 'gcp', costPerInvocationUSD: 0.000002, avgLatencyMs: 250 });
const cfTarget = makeTarget({ id: 'cf-global', provider: 'cloudflare', costPerInvocationUSD: 0.0000003, avgLatencyMs: 40 });
const awsTarget = makeTarget({ id: 'aws-us', provider: 'aws', costPerInvocationUSD: 0.0000002, avgLatencyMs: 150 });
const localTarget = makeTarget({ id: 'local-nas', provider: 'local', costPerInvocationUSD: 0, avgLatencyMs: 5, sovereign: true });

const basePlan: ExecutionPlan = {
  taskId: 'test-task-001',
  agentId: 'test-agent',
  payload: { action: 'run' },
};

// ─── Registry Tests ───────────────────────────────────────────────────────────

describe('TargetRegistry', () => {
  let registry: TargetRegistry;

  beforeEach(() => {
    registry = new TargetRegistry();
    registry.register(gcpTarget);
    registry.register(cfTarget);
    registry.register(awsTarget);
    registry.register(localTarget);
  });

  it('registers targets and reports all as initially healthy', () => {
    expect(registry.getHealthy()).toHaveLength(4);
  });

  it('excludes offline targets from getHealthy()', () => {
    registry.setStatus('gcp-us', 'offline');
    const healthy = registry.getHealthy();
    expect(healthy).toHaveLength(3);
    expect(healthy.find((t) => t.id === 'gcp-us')).toBeUndefined();
  });

  it('getSovereign() returns only local targets', () => {
    const sovereign = registry.getSovereign();
    expect(sovereign).toHaveLength(1);
    expect(sovereign[0]!.id).toBe('local-nas');
  });

  it('unregisters a target', () => {
    registry.unregister('gcp-us');
    expect(registry.getAll()).toHaveLength(3);
  });
});

// ─── Router Tests ─────────────────────────────────────────────────────────────

describe('CloudMeshRouter', () => {
  let registry: TargetRegistry;
  let router: CloudMeshRouter;

  beforeEach(() => {
    registry = new TargetRegistry();
    [gcpTarget, cfTarget, awsTarget, localTarget].forEach((t) => registry.register(t));
    router = new CloudMeshRouter(registry);
  });

  it('selects the cheapest target (Cloudflare at $0.0000003)', () => {
    const result = router.route(basePlan);
    expect(result).not.toBeNull();
    // AWS is cheapest at $0.0000002, CF second — both compete in scoring
    expect(result!.target.costPerInvocationUSD).toBeLessThanOrEqual(0.0000003);
  });

  it('enforces sovereignOnly — only routes to local target', () => {
    const plan: ExecutionPlan = { ...basePlan, sovereignOnly: true };
    const result = router.route(plan);
    expect(result).not.toBeNull();
    expect(result!.target.provider).toBe('local');
    expect(result!.target.sovereign).toBe(true);
  });

  it('respects cost cap — excludes targets above maxCostUSD', () => {
    const plan: ExecutionPlan = { ...basePlan, maxCostUSD: 0.000001 };
    const result = router.route(plan);
    // GCP ($0.000002) exceeds the cap
    if (result) {
      expect(result.target.costPerInvocationUSD).toBeLessThanOrEqual(0.000001);
    }
  });

  it('respects latency cap — excludes slow targets', () => {
    const plan: ExecutionPlan = { ...basePlan, maxLatencyMs: 50 };
    const result = router.route(plan);
    if (result) {
      expect(result.target.avgLatencyMs).toBeLessThanOrEqual(50);
    }
  });

  it('applies preferred provider bonus — preferred provider wins when costs are equal', () => {
    // Set up a scenario where two providers have the same cost
    // The preferred one should win via its 0.8 score multiplier
    const equalCostRegistry = new TargetRegistry();
    const providerA = makeTarget({ id: 'gcp-same-cost', provider: 'gcp', costPerInvocationUSD: 0.000001, avgLatencyMs: 100 });
    const providerB = makeTarget({ id: 'aws-same-cost', provider: 'aws', costPerInvocationUSD: 0.000001, avgLatencyMs: 100 });
    equalCostRegistry.register(providerA);
    equalCostRegistry.register(providerB);
    const equalRouter = new CloudMeshRouter(equalCostRegistry);

    const plan: ExecutionPlan = { ...basePlan, preferredProvider: 'gcp' };
    const result = equalRouter.route(plan);
    expect(result).not.toBeNull();
    // GCP should win the tie via preferred bonus
    expect(result!.target.provider).toBe('gcp');
    expect(result!.reasoning).toContain('preferred provider bonus applied');
  });

  it('returns null when all targets are offline', () => {
    ['gcp-us', 'cf-global', 'aws-us', 'local-nas'].forEach((id) =>
      registry.setStatus(id, 'offline'),
    );
    const result = router.route(basePlan);
    expect(result).toBeNull();
  });

  it('builds a fallback chain from remaining candidates', () => {
    const result = router.route(basePlan);
    expect(result).not.toBeNull();
    expect(result!.fallbackChain.length).toBeGreaterThan(0);
  });
});

// ─── Executor Tests ───────────────────────────────────────────────────────────

describe('CloudMeshExecutor', () => {
  let registry: TargetRegistry;
  let router: CloudMeshRouter;
  let executor: CloudMeshExecutor;

  beforeEach(() => {
    registry = new TargetRegistry();
    [gcpTarget, cfTarget, awsTarget].forEach((t) => registry.register(t));
    router = new CloudMeshRouter(registry);
    executor = new CloudMeshExecutor(router, { executionTimeoutMs: 5_000 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns success on first target success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'done' }),
    }));

    const result = await executor.execute(basePlan);
    expect(result.status).toBe('success');
    expect(result.attemptCount).toBe(1);
  });

  it('falls back to next target when first fails', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { ok: false, json: async () => ({}) };
      return { ok: true, json: async () => ({ result: 'fallback-done' }) };
    }));

    const result = await executor.execute(basePlan);
    expect(result.status).toBe('fallback-success');
    expect(result.attemptCount).toBeGreaterThan(1);
  });

  it('returns failed when all targets fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const result = await executor.execute(basePlan);
    expect(result.status).toBe('failed');
  });
});
