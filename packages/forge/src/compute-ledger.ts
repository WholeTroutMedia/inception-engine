/**
 * FORGE â€” Compute Cost Ledger
 *
 * Tracks per-job cloud execution costs in Redis.
 * This is separate from the economy asset ledger â€” it's the
 * infrastructure cost layer: what did we spend on compute
 * to generate/process each asset job?
 *
 * Keys:
 *   forge:compute:jobs   â€” Hash: jobId â†’ ComputeJobRecord (JSON)
 *   forge:compute:stream â€” Stream: append-only cost events
 *   forge:compute:total  â€” String: running total USD spend
 */

import { Redis } from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379';
const JOBS_KEY   = 'forge:compute:jobs';
const STREAM_KEY = 'forge:compute:stream';
const TOTAL_KEY  = 'forge:compute:total';

let _redis: Redis | null = null;
function db(): Redis {
  if (!_redis) {
    _redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
    _redis.on('error', (e: Error) => console.error('[forge:compute-ledger]', e.message));
  }
  return _redis;
}

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ComputeProvider = 'gcp' | 'cloudflare' | 'aws' | 'fly' | 'local' | 'none';
export type ComputeJobStatus = 'success' | 'failed' | 'fallback-success';

export interface ComputeJobRecord {
  jobId: string;
  jobType: string;
  provider: ComputeProvider;
  targetId: string;
  status: ComputeJobStatus;
  actualCostUSD: number;
  actualLatencyMs: number;
  attempts: number;
  assetId?: string;
  sessionId?: string;
  recordedAt: string;
}

export interface ComputeCostSummary {
  totalJobsRun: number;
  totalCostUSD: number;
  avgCostPerJobUSD: number;
  avgLatencyMs: number;
  byProvider: Record<ComputeProvider, { jobs: number; costUSD: number }>;
  recentJobs: ComputeJobRecord[];
  updatedAt: string;
}

// â”€â”€â”€ Write â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function recordComputeJob(record: ComputeJobRecord): Promise<void> {
  const now = record.recordedAt ?? new Date().toISOString();
  const r = { ...record, recordedAt: now };

  // Store full record in hash (by jobId for lookups)
  await db().hset(JOBS_KEY, r.jobId, JSON.stringify(r));

  // Append to stream (capped at 5000 entries â€” ~1 MB)
  await db().xadd(
    STREAM_KEY, 'MAXLEN', '~', 5000, '*',
    'job', r.jobId,
    'provider', r.provider,
    'costUSD', r.actualCostUSD.toFixed(10),
    'latencyMs', String(r.actualLatencyMs),
    'status', r.status,
  );

  // Atomically increment total spend
  if (r.actualCostUSD > 0) {
    await db().incrbyfloat(TOTAL_KEY, r.actualCostUSD);
  }

  console.log(
    `[forge:compute] ${r.jobType} â†’ ${r.provider} $${r.actualCostUSD.toFixed(8)} ${r.actualLatencyMs}ms [${r.status}]`
  );
}

// â”€â”€â”€ Read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getComputeJob(jobId: string): Promise<ComputeJobRecord | null> {
  const raw = await db().hget(JOBS_KEY, jobId);
  return raw ? (JSON.parse(raw) as ComputeJobRecord) : null;
}

export async function getComputeCostSummary(limit = 50): Promise<ComputeCostSummary> {
  const [allRaw, totalStr] = await Promise.all([
    db().hgetall(JOBS_KEY),
    db().get(TOTAL_KEY),
  ]);

  const all: ComputeJobRecord[] = Object.values(allRaw).map(
    (v) => JSON.parse(v) as ComputeJobRecord
  );

  const totalCostUSD = parseFloat(totalStr ?? '0');
  const totalJobsRun = all.length;
  const avgCostPerJobUSD = totalJobsRun > 0 ? totalCostUSD / totalJobsRun : 0;
  const totalLatency = all.reduce((s, j) => s + j.actualLatencyMs, 0);
  const avgLatencyMs = totalJobsRun > 0 ? Math.round(totalLatency / totalJobsRun) : 0;

  const byProvider: Record<ComputeProvider, { jobs: number; costUSD: number }> = {
    gcp: { jobs: 0, costUSD: 0 },
    cloudflare: { jobs: 0, costUSD: 0 },
    aws: { jobs: 0, costUSD: 0 },
    fly: { jobs: 0, costUSD: 0 },
    local: { jobs: 0, costUSD: 0 },
    none: { jobs: 0, costUSD: 0 },
  };

  for (const job of all) {
    const p = job.provider in byProvider ? job.provider : 'none';
    byProvider[p].jobs += 1;
    byProvider[p].costUSD += job.actualCostUSD;
  }

  const recentJobs = all
    .sort((a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    )
    .slice(0, limit);

  return {
    totalJobsRun,
    totalCostUSD,
    avgCostPerJobUSD,
    avgLatencyMs,
    byProvider,
    recentJobs,
    updatedAt: new Date().toISOString(),
  };
}
