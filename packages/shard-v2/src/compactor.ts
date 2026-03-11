import Redis from 'ioredis';

export interface CompactionMetrics {
    shardsCompacted: number;
    bytesSaved: number;
    durationMs: number;
}

/**
 * SHARD v2 - Memory Compactor
 * Periodically compresses and consolidates long-term context arrays within ioredis.
 */
export class MemoryCompactor {
    private redis: Redis;

    constructor(redisUrl?: string) {
        this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    }

    /**
     * Compacts a specific session transcript or memory array by summarizing older entries 
     * or deduplicating redundant data.
     */
    public async compactSession(sessionId: string): Promise<number> {
        const key = `transcript:${sessionId}`;
        const data = await this.redis.get(key);
        
        if (!data) return 0;
        
        const originalLength = Buffer.byteLength(data, 'utf8');
        
        // Basic compaction: remove redundant whitespace and compress structure if it's a raw string
        // If it's JSON, we re-serialize and remove nulls/empty fields.
        let compactedData = data;
        try {
            const parsed = JSON.parse(data);
            compactedData = JSON.stringify(parsed, (k, v) => (v === null || v === '' ? undefined : v));
        } catch {
            compactedData = data.replace(/\s+/g, ' ').trim();
        }

        const newLength = Buffer.byteLength(compactedData, 'utf8');
        const bytesSaved = Math.max(0, originalLength - newLength);

        if (bytesSaved > 0) {
            // Keep the same TTL
            const ttl = await this.redis.ttl(key);
            if (ttl > 0) {
                await this.redis.set(key, compactedData, 'EX', ttl);
            } else {
                await this.redis.set(key, compactedData);
            }
        }

        return bytesSaved;
    }

    /**
     * Run a global compaction cycle across all transcripts.
     */
    public async runCompactionCycle(): Promise<CompactionMetrics> {
        const start = Date.now();
        let compactedCount = 0;
        let totalSaved = 0;

        console.log(`[SHARD v2] Starting memory compaction cycle...`);

        // Use scan to avoid blocking Redis
        let cursor = '0';
        do {
            const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', 'transcript:*', 'COUNT', 100);
            cursor = nextCursor;

            for (const key of keys) {
                const sessionId = key.replace('transcript:', '');
                const saved = await this.compactSession(sessionId);
                if (saved > 0) {
                    compactedCount++;
                    totalSaved += saved;
                }
            }
        } while (cursor !== '0');

        const metrics: CompactionMetrics = {
            shardsCompacted: compactedCount,
            bytesSaved: totalSaved,
            durationMs: Date.now() - start
        };

        console.log(`[SHARD v2] Compaction complete. Compacted ${metrics.shardsCompacted} shards, saved ${metrics.bytesSaved} bytes in ${metrics.durationMs}ms.`);
        return metrics;
    }
}
