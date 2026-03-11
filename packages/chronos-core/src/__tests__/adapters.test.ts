/**
 * adapters.test.ts — Chronos Core Adapter Unit Tests
 * Tests TouchDesignerOSCAdapter and SomaticFeedbackAdapter
 * in isolation (no real Redis/OSC connection required).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock redis before any imports that use it ───────────────────────────────

vi.mock('redis', () => {
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    quit: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue('OK'),
    sendCommand: vi.fn().mockResolvedValue([]),
  };
  return {
    createClient: vi.fn(() => mockClient),
  };
});

// ─── Mock node-osc before TouchDesigner adapter import ───────────────────────

vi.mock('node-osc', () => ({
  Server: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn((cb?: () => void) => cb?.()),
  })),
  Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
    close: vi.fn(),
  })),
}));

import { TimeSeriesManager } from '../store/TimeSeriesManager';
import { TouchDesignerOSCAdapter } from '../adapters/TouchDesignerOSC';
import { SomaticFeedbackAdapter } from '../adapters/SomaticFeedback';

// ─── TimeSeriesManager Tests ──────────────────────────────────────────────────

describe('TimeSeriesManager', () => {
  let manager: TimeSeriesManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new TimeSeriesManager();
  });

  it('connects to Redis without throwing', async () => {
    await expect(manager.connect()).resolves.not.toThrow();
  });

  it('disconnects without throwing after connect', async () => {
    await manager.connect();
    await expect(manager.disconnect()).resolves.not.toThrow();
  });

  it('indexEvent completes without throwing', async () => {
    await manager.connect();

    const epoch = Date.now();
    await expect(
      manager.indexEvent(epoch, { modality: 'video', source: 'cam-0', features: { lux: 1200 } }, 0.95)
    ).resolves.not.toThrow();
  });

  it('queryTimeRange returns an array', async () => {
    await manager.connect();
    const now = Date.now();
    const results = await manager.queryTimeRange('audio', 'mic-1', now - 100, now + 100);
    expect(Array.isArray(results)).toBe(true);
  });
});

// ─── TouchDesignerOSCAdapter Tests ───────────────────────────────────────────

describe('TouchDesignerOSCAdapter', () => {
  let manager: TimeSeriesManager;
  let adapter: TouchDesignerOSCAdapter;

  beforeEach(async () => {
    vi.clearAllMocks();
    manager = new TimeSeriesManager();
    await manager.connect();
    adapter = new TouchDesignerOSCAdapter(7400, manager);
  });

  it('instantiates without throwing', () => {
    expect(adapter).toBeDefined();
  });

  it('starts without throwing (mock OSC Server)', async () => {
    await expect(adapter.start()).resolves.not.toThrow();
  });

  it('stops without throwing after start', async () => {
    await adapter.start();
    await expect(adapter.stop()).resolves.not.toThrow();
  });
});

// ─── SomaticFeedbackAdapter Tests ────────────────────────────────────────────

describe('SomaticFeedbackAdapter', () => {
  let manager: TimeSeriesManager;
  let adapter: SomaticFeedbackAdapter;

  beforeEach(async () => {
    vi.clearAllMocks();
    manager = new TimeSeriesManager();
    await manager.connect();
    adapter = new SomaticFeedbackAdapter(manager);
  });

  it('instantiates without throwing', () => {
    expect(adapter).toBeDefined();
  });

  it('starts without throwing', async () => {
    await expect(adapter.start()).resolves.not.toThrow();
  });

  it('stops cleanly after start', async () => {
    await adapter.start();
    await expect(adapter.stop()).resolves.not.toThrow();
  });
});
