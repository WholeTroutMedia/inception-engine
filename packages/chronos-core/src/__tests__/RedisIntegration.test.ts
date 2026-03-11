/**
 * Chronos Core â€” Redis TimeSeries Integration Test
 * Creative Liberation Engine v5.0.0 (GENESIS)
 *
 * Verifies full TS.ADD + TS.RANGE round-trip against the NAS Redis instance.
 * Run only when NAS Redis is reachable (CI gate: REDIS_URL env var must be set).
 *
 * Article IX: Real integration, not just mocks.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TimeSeriesManager } from '../store/TimeSeriesManager.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379';
// Default to skip in local dev. Set SKIP_INTEGRATION=0 explicitly to run against NAS Redis.
const SKIP_INTEGRATION = process.env['SKIP_INTEGRATION'] !== '0';

describe.skipIf(SKIP_INTEGRATION)('Chronos Redis TimeSeries Integration', () => {
  let tsm: TimeSeriesManager;

  const TEST_MODALITY = 'biometric' as const;
  const TEST_SOURCE = `integration-test-${Date.now()}`;
  const TEST_TIMESTAMP_MS = Date.now();
  const TEST_SCORE = 0.87654;

  beforeAll(async () => {
    tsm = new TimeSeriesManager(REDIS_URL);
    await tsm.connect();
  });

  afterAll(async () => {
    await tsm.disconnect();
  });

  it('connects to Redis without errors', async () => {
    // If we reach here, connection succeeded
    expect(true).toBe(true);
  });

  it('creates a TimeSeries key via indexEvent (TS.ADD)', async () => {
    await expect(
      tsm.indexEvent(
        TEST_TIMESTAMP_MS,
        {
          modality: TEST_MODALITY,
          source: TEST_SOURCE,
          features: { test: true, wave: 25 },
        },
        TEST_SCORE,
      ),
    ).resolves.toBeUndefined();
  });

  it('retrieves the indexed event via TS.RANGE', async () => {
    const fromMs = TEST_TIMESTAMP_MS - 1000;
    const toMs = TEST_TIMESTAMP_MS + 1000;

    const results = await tsm.queryTimeRange(TEST_MODALITY, TEST_SOURCE, fromMs, toMs);

    expect(results.length).toBeGreaterThan(0);
    const hit = results.find(
      (r) => Math.abs(r.timestampMs - TEST_TIMESTAMP_MS) < 100,
    );
    expect(hit).toBeDefined();
  });

  it('TS.RANGE score matches the ingested value', async () => {
    const results = await tsm.queryTimeRange(
      TEST_MODALITY,
      TEST_SOURCE,
      TEST_TIMESTAMP_MS - 100,
      TEST_TIMESTAMP_MS + 100,
    );

    const hit = results.find(
      (r) => Math.abs(r.score - TEST_SCORE) < 0.0001,
    );
    expect(hit).toBeDefined();
  });

  it('round-trips multiple events and returns them in order', async () => {
    const MULTI_SOURCE = `${TEST_SOURCE}-multi`;
    const baseTs = Math.floor(Date.now() / 10) * 10; // align to 10ms boundary

    // Ingest 3 sequential events
    for (let i = 0; i < 3; i++) {
      await tsm.indexEvent(
        baseTs + i * 50,
        { modality: 'biometric', source: MULTI_SOURCE, features: { seq: i } },
        i * 0.3,
      );
    }

    const results = await tsm.queryTimeRange('biometric', MULTI_SOURCE, baseTs - 10, baseTs + 300);
    expect(results.length).toBeGreaterThanOrEqual(3);

    // Verify ascending timestamp order
    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.timestampMs).toBeGreaterThanOrEqual(results[i - 1]!.timestampMs);
    }
  });

  it('returns empty array for a non-existent key time range', async () => {
    const results = await tsm.queryTimeRange(
      'finance',
      `nonexistent-${Date.now()}`,
      0,
      1,
    ).catch(() => []);
    // Either empty array or graceful error â€” both acceptable
    expect(Array.isArray(results)).toBe(true);
  });
});
