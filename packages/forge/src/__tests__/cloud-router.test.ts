/**
 * ForgeCloudRouter — Unit Tests
 *
 * Tests routing logic, cost tracking, and graceful failure handling.
 * Uses vitest's vi.mock hoisting to replace @inception/cloud-mesh.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Shared mock state — must be defined BEFORE vi.mock call uses them ─────────
const mockExecute = vi.fn();
const mockRoute = vi.fn();

vi.mock('@inception/cloud-mesh', () => ({
  createCloudMesh: vi.fn(() => ({
    router: { route: mockRoute },
    executor: { execute: mockExecute },
    monitor: { start: vi.fn(), stop: vi.fn() },
    registry: {},
  })),
}));

// Import AFTER mocks are set up
import { ForgeCloudRouter } from '../cloud-router.js';

const SUCCESS_RESULT = {
  provider: 'cloudflare',
  targetId: 'forge-cf-edge',
  status: 'success' as const,
  output: { ok: true },
  actualCostUSD: 0.0000003,
  actualLatencyMs: 42,
  attemptCount: 1,
};

describe('ForgeCloudRouter', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockRoute.mockReset();
  });

  it('initialises with zero cost and job count', () => {
    const router = new ForgeCloudRouter({ cfEndpoint: 'https://cf.test' });
    expect(router.getTotalCostUSD()).toBe(0);
    expect(router.getJobCount()).toBe(0);
    expect(router.getAvgCostPerJob()).toBe(0);
  });

  it('routes a light job and records cost', async () => {
    mockExecute.mockResolvedValueOnce(SUCCESS_RESULT);

    const router = new ForgeCloudRouter({ cfEndpoint: 'https://cf.test' });
    const result = await router.routeJob({
      jobId: 'test-001',
      jobType: 'asset-gen',
      computeEstimate: 'light',
      payload: { foo: 'bar' },
    });

    expect(result.status).toBe('success');
    expect(result.provider).toBe('cloudflare');
    expect(result.actualCostUSD).toBeCloseTo(0.0000003);
    expect(router.getTotalCostUSD()).toBeCloseTo(0.0000003);
    expect(router.getJobCount()).toBe(1);
  });

  it('prefers correct provider per compute estimate', async () => {
    mockExecute.mockResolvedValue(SUCCESS_RESULT);

    const router = new ForgeCloudRouter({
      cfEndpoint: 'https://cf.test',
      gcpEndpoint: 'https://gcp.test',
      sovereignEndpoint: 'http://nas.local:5050',
    });

    await router.routeJob({ jobId: 'j1', jobType: 'asset-gen', computeEstimate: 'light', payload: {} });
    expect(mockExecute.mock.calls[0][0].preferredProvider).toBe('cloudflare');
    expect(mockExecute.mock.calls[0][0].sovereignOnly).toBe(false);

    await router.routeJob({ jobId: 'j2', jobType: 'theme-bundle', computeEstimate: 'medium', payload: {} });
    expect(mockExecute.mock.calls[1][0].preferredProvider).toBe('gcp');
    expect(mockExecute.mock.calls[1][0].sovereignOnly).toBe(false);

    await router.routeJob({ jobId: 'j3', jobType: 'lora-train', computeEstimate: 'heavy', payload: {} });
    expect(mockExecute.mock.calls[2][0].preferredProvider).toBe('local');
    expect(mockExecute.mock.calls[2][0].sovereignOnly).toBe(true);
  });

  it('returns failed status when executor throws, does not add cost', async () => {
    mockExecute.mockRejectedValueOnce(new Error('timeout'));

    const router = new ForgeCloudRouter({ cfEndpoint: 'https://cf.test' });
    const result = await router.routeJob({
      jobId: 'fail-1',
      jobType: 'asset-gen',
      computeEstimate: 'light',
      payload: {},
    });

    expect(result.status).toBe('failed');
    expect(result.provider).toBe('none');
    expect(result.actualCostUSD).toBe(0);
    expect(router.getTotalCostUSD()).toBe(0);
    expect(router.getJobCount()).toBe(0);
  });

  it('accumulates cost and count across multiple successful jobs', async () => {
    mockExecute.mockResolvedValue(SUCCESS_RESULT);

    const router = new ForgeCloudRouter({ cfEndpoint: 'https://cf.test' });
    for (let i = 0; i < 4; i++) {
      await router.routeJob({ jobId: `j${i}`, jobType: 'asset-gen', computeEstimate: 'light', payload: {} });
    }

    expect(router.getJobCount()).toBe(4);
    expect(router.getTotalCostUSD()).toBeCloseTo(4 * 0.0000003);
    expect(router.getAvgCostPerJob()).toBeCloseTo(0.0000003);
  });

  it('previewRoute calls router.route, not executor.execute', async () => {
    mockRoute.mockResolvedValueOnce({ targetId: 'forge-cf-edge', provider: 'cloudflare' });

    const router = new ForgeCloudRouter({ cfEndpoint: 'https://cf.test' });
    await router.previewRoute({ jobId: 'p1', jobType: 'asset-gen', computeEstimate: 'light' });

    expect(mockRoute).toHaveBeenCalledOnce();
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
