import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ChronosEngine } from '../ChronosEngine';
import { TimeSeriesManager } from '../store/TimeSeriesManager';

describe('ChronosEngine Integration', () => {
  let engine: ChronosEngine;
  let ts: TimeSeriesManager;

  let redisAvailable = true;

  beforeAll(async () => {
    engine = new ChronosEngine();
    ts = new TimeSeriesManager();
    
    try {
      // Fast timeout for local test runs if NAS is offline
      const connectPromise = Promise.all([engine.boot(), ts.connect()]);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Redis Timeout')), 2000));
      
      await Promise.race([connectPromise, timeoutPromise]);
    } catch (e) {
      console.warn('⚠️ Redis unreachable, skipping Chronos integration tests');
      redisAvailable = false;
    }
  });

  afterAll(async () => {
    if (redisAvailable) {
      await engine.shutdown();
      await ts.disconnect();
    }
  });

  it('boots and maintains running state', () => {
    if (!redisAvailable) return;
    expect(engine.isRunning).toBe(true);
  });

  it('can ingest and query aligned events within 10ms variance', async () => {
    if (!redisAvailable) return;
    const epoch = Date.now();
    
    // Simulate events from two distinct modalities arriving
    await ts.indexEvent(epoch, { modality: 'video', source: 'test-cam', features: { color: 'red' } }, 1.0);
    await ts.indexEvent(epoch + 4, { modality: 'audio', source: 'test-mic', features: { peak: true } }, 0.8);

    // Query across the tight temporal window
    const videoEvents = await ts.queryTimeRange('video', 'test-cam', epoch - 10, epoch + 10);
    const audioEvents = await ts.queryTimeRange('audio', 'test-mic', epoch - 10, epoch + 10);

    // Verify both events were captured in the 20ms aperture
    expect(videoEvents.length).toBeGreaterThanOrEqual(1);
    expect(audioEvents.length).toBeGreaterThanOrEqual(1);

    // Verify sub-10ms variance
    const diff = Math.abs(audioEvents[0].timestampMs - videoEvents[0].timestampMs);
    expect(diff).toBeLessThan(10);
  });
});
