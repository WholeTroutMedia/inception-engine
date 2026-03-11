import { Redis } from 'ioredis';
import { type SAREvent, SAREventSchema, type Tier, SAR_KEYS } from '../schema/index.js';

// â”€â”€â”€ SAR Event Bus â€” Redis Streams â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Publishers push entity change events to Redis Streams.
// Subscribers (AVERI boot, NERVE engine) consume them in real-time.

export class SAREventBus {
    private redis: Redis;
    private readonly MAX_LEN = 10_000;  // Rolling 10k events per tier

    constructor(redis: Redis) {
        this.redis = redis;
    }

    // â”€â”€ Publish an event to the tier's stream â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async publish(event: Omit<SAREvent, 'id' | 'timestamp'>): Promise<string> {
        const full: SAREvent = {
            ...event,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
        };

        // Validate
        SAREventSchema.parse(full);

        const key = SAR_KEYS.eventStream(full.tier);
        const id = await this.redis.xadd(
            key,
            'MAXLEN', '~', String(this.MAX_LEN),
            '*',
            'data', JSON.stringify(full)
        );

        return id ?? full.id;
    }

    // â”€â”€ Read recent events from a tier's stream â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async readRecent(tier: Tier, count = 50): Promise<SAREvent[]> {
        const key = SAR_KEYS.eventStream(tier);
        const entries = await this.redis.xrevrange(key, '+', '-', 'COUNT', count);
        return entries.map(([, fields]: [string, string[]]) => {
            const dataIdx = fields.indexOf('data');
            if (dataIdx === -1) return null;
            try {
                return SAREventSchema.parse(JSON.parse(fields[dataIdx + 1]));
            } catch {
                return null;
            }
        }).filter((e: SAREvent | null): e is SAREvent => e !== null);
    }

    // â”€â”€ Subscribe to new events (blocking read) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async subscribe(
        tier: Tier,
        lastId: string,
        handler: (event: SAREvent) => Promise<void>,
        signal?: AbortSignal
    ): Promise<void> {
        const key = SAR_KEYS.eventStream(tier);
        let cursor = lastId;

        while (!signal?.aborted) {
            const results = await this.redis.xread(
                'COUNT', '10',
                'BLOCK', '2000',
                'STREAMS', key, cursor
            );

            if (!results) continue;

            for (const [, entries] of results) {
                for (const [id, fields] of entries) {
                    cursor = id;
                    const dataIdx = fields.indexOf('data');
                    if (dataIdx === -1) continue;
                    try {
                        const event = SAREventSchema.parse(JSON.parse(fields[dataIdx + 1]));
                        await handler(event);
                    } catch (err) {
                        console.error('[EventBus] Parse error:', err);
                    }
                }
            }
        }
    }

    // â”€â”€ Get last event ID for a tier (for resuming subscriptions) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async getLastId(tier: Tier): Promise<string> {
        const key = SAR_KEYS.eventStream(tier);
        const entries = await this.redis.xrevrange(key, '+', '-', 'COUNT', 1);
        return entries[0]?.[0] ?? '0-0';
    }
}

// â”€â”€ SAR Store â€” entity read/write against Redis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export class SARStore {
    private redis: Redis;

    constructor(redis: Redis) {
        this.redis = redis;
    }

    async set<T extends object>(tier: Tier, category: string, id: string, entity: T): Promise<void> {
        const key = SAR_KEYS.entity(tier, category, id);
        const indexKey = SAR_KEYS.categoryIndex(tier, category);

        await this.redis.pipeline()
            .set(key, JSON.stringify(entity))
            .sadd(indexKey, id)
            .exec();
    }

    async get<T>(tier: Tier, category: string, id: string): Promise<T | null> {
        const key = SAR_KEYS.entity(tier, category, id);
        const data = await this.redis.get(key);
        if (!data) return null;
        return JSON.parse(data) as T;
    }

    async getAll<T>(tier: Tier, category: string): Promise<T[]> {
        const indexKey = SAR_KEYS.categoryIndex(tier, category);
        const ids = await this.redis.smembers(indexKey);
        if (ids.length === 0) return [];

        const pipeline = this.redis.pipeline();
        for (const id of ids) {
            pipeline.get(SAR_KEYS.entity(tier, category, id));
        }
        const results = await pipeline.exec();
        return (results ?? [])
            .map(([err, val]: [Error | null, unknown]) => (err || !val ? null : JSON.parse(val as string) as T))
            .filter((v: T | null): v is T => v !== null);
    }

    async remove(tier: Tier, category: string, id: string): Promise<void> {
        const key = SAR_KEYS.entity(tier, category, id);
        const indexKey = SAR_KEYS.categoryIndex(tier, category);
        await this.redis.pipeline().del(key).srem(indexKey, id).exec();
    }

    async setSnapshot(tier: Tier, snapshot: unknown): Promise<void> {
        await this.redis.set(SAR_KEYS.snapshot(tier), JSON.stringify(snapshot), 'EX', 3600);
    }

    async getSnapshot<T>(tier: Tier): Promise<T | null> {
        const data = await this.redis.get(SAR_KEYS.snapshot(tier));
        return data ? JSON.parse(data) as T : null;
    }
}

// â”€â”€ Factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function createSARClients(redisUrl = 'redis://127.0.0.1:6379') {
    const redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 100, 3000),
    });

    return {
        eventBus: new SAREventBus(redis),
        store: new SARStore(redis),
        redis,
    };
}
