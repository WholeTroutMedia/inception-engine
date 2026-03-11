/**
 * Wire Ingestion MCP â€” Redis Cache Layer
 *
 * Writes wire entries to Redis streams keyed by category.
 * Provides fast query over the last N entries or by time range.
 */

import { Redis } from 'ioredis';
import type { WireEntry, WireQuery, WireCategory } from './types.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379';
const STREAM_PREFIX = 'wire:';
const MAX_STREAM_LEN = 5000; // per category stream

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
    _redis.on('error', (err: Error) => {
      console.error('[wire-cache] Redis error:', err.message);
    });
  }
  return _redis;
}

function streamKey(category: WireCategory): string {
  return `${STREAM_PREFIX}${category}`;
}

function dedupeKey(id: string): string {
  return `wire:dedupe:${id}`;
}

/**
 * Write a wire entry to Redis. Returns true if written, false if duplicate.
 */
export async function cacheEntry(entry: WireEntry): Promise<boolean> {
  const redis = getRedis();
  try {
    // Dedup check (TTL 24 hours)
    const exists = await redis.set(dedupeKey(entry.id), '1', 'EX', 86400, 'NX');
    if (exists === null) return false; // already exists

    const key = streamKey(entry.category);
    await redis.xadd(
      key,
      'MAXLEN', '~', MAX_STREAM_LEN,
      '*',
      'json', JSON.stringify(entry),
    );
    return true;
  } catch (err) {
    console.error('[wire-cache] write error:', err);
    return false;
  }
}

/**
 * Query wire entries from Redis by category, topic, source, time range.
 */
export async function queryEntries(query: WireQuery): Promise<WireEntry[]> {
  const redis = getRedis();
  const categories = query.category
    ? [query.category]
    : (['news','sports','financial','science','literary','tech','government','entertainment','health','business'] as WireCategory[]);

  const results: WireEntry[] = [];
  const now = Date.now();
  const sinceMs = query.since ? new Date(query.since).getTime() : now - 24 * 60 * 60 * 1000;

  for (const cat of categories) {
    try {
      const key = streamKey(cat);
      // Read from the stream â€” get up to 200 recent entries per category
      const messages = await redis.xrevrange(key, '+', '-', 'COUNT', '200');
      for (const [, fields] of messages) {
        const jsonIdx = fields.indexOf('json');
        if (jsonIdx === -1) continue;
        const raw = fields[jsonIdx + 1];
        if (!raw) continue;
        const entry = JSON.parse(raw) as WireEntry;

        // Time filter
        const entryMs = new Date(entry.publishedAt).getTime();
        if (entryMs < sinceMs) continue;

        // Source filter
        if (query.source && entry.source !== query.source) continue;

        // Topic filter (search title + summary)
        if (query.topic) {
          const needle = query.topic.toLowerCase();
          const haystack = `${entry.title} ${entry.summary ?? ''}`.toLowerCase();
          if (!haystack.includes(needle)) continue;
        }

        results.push(entry);
      }
    } catch {
      // category stream may not exist yet â€” skip
    }
  }

  // Sort by publishedAt desc, return top N
  results.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return results.slice(0, query.limit);
}

/**
 * Get the latest N entries from one or all categories.
 */
export async function latestEntries(
  category: WireCategory | undefined,
  limit: number,
): Promise<WireEntry[]> {
  return queryEntries({ category, limit, topic: undefined, source: undefined, since: undefined });
}

/**
 * Gracefully close the Redis connection.
 */
export async function closeCache(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
