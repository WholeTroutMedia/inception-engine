/**
 * Wire Ingestion MCP — Ingestion Engine
 *
 * Schedules cron jobs for every feed in the registry.
 * Fetches, parses, deduplicates, and writes to Redis streams.
 */

import cron from 'node-cron';
import { ALL_FEEDS, FEED_COUNT } from './feeds.js';
import { parseFeed } from './parser.js';
import { cacheEntry } from './cache.js';
import type { FeedSource } from './types.js';

interface IngestionStats {
  totalFetched: number;
  totalNew: number;
  errors: number;
  lastRun: string;
}

const stats: IngestionStats = {
  totalFetched: 0,
  totalNew: 0,
  errors: 0,
  lastRun: '',
};

const activeJobs = new Map<string, cron.ScheduledTask>();

async function ingestFeed(source: FeedSource): Promise<void> {
  try {
    const entries = await parseFeed(source);
    stats.totalFetched += entries.length;

    let newCount = 0;
    for (const entry of entries) {
      const written = await cacheEntry(entry);
      if (written) newCount++;
    }
    stats.totalNew += newCount;

    if (newCount > 0) {
      console.log(`[wire] ${source.name}: +${newCount} new / ${entries.length} fetched`);
    }
  } catch (err) {
    stats.errors++;
    console.error(`[wire] error fetching ${source.name}:`, err);
  }
  stats.lastRun = new Date().toISOString();
}

/**
 * Convert interval seconds to a cron expression.
 * Minimum resolution: 1 minute.
 */
function toCron(intervalSeconds: number): string {
  if (intervalSeconds <= 60)   return '* * * * *';        // every minute
  if (intervalSeconds <= 120)  return '*/2 * * * *';
  if (intervalSeconds <= 180)  return '*/3 * * * *';
  if (intervalSeconds <= 300)  return '*/5 * * * *';
  if (intervalSeconds <= 600)  return '*/10 * * * *';
  return '*/15 * * * *';
}

/**
 * Start all feed ingestion jobs. Run once immediately, then on schedule.
 */
export async function startIngester(): Promise<void> {
  console.log(`[wire] 🚀 Starting ingestion for ${FEED_COUNT} feeds across 10 categories`);

  // Stagger initial runs to avoid thundering herd
  let delay = 0;
  for (const source of ALL_FEEDS) {
    setTimeout(() => ingestFeed(source), delay);
    delay += 150; // 150ms between each initial fetch
  }

  // Schedule recurring jobs
  for (const source of ALL_FEEDS) {
    const expression = toCron(source.intervalSeconds);
    const job = cron.schedule(expression, () => ingestFeed(source), {
      scheduled: true,
      timezone: 'UTC',
    });
    activeJobs.set(source.id, job);
  }

  console.log(`[wire] ✅ All ${FEED_COUNT} feeds scheduled`);
}

/**
 * Stop all ingestion jobs gracefully.
 */
export function stopIngester(): void {
  for (const [id, job] of activeJobs) {
    job.stop();
    activeJobs.delete(id);
  }
  console.log('[wire] Ingester stopped.');
}

export function getStats(): IngestionStats {
  return { ...stats };
}

// Standalone runner
if (process.argv[1]?.endsWith('ingester.js') || process.argv[1]?.endsWith('ingester.ts')) {
  startIngester().catch(console.error);
}
