/**
 * FORGE â€” Asset Ledger (Economy Layer)
 * Immutable append-only registry of all economy assets. Redis-backed.
 */

import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import type { EconomyAsset, EconomyTransaction, MintRequest, ForgeEconomyStats } from './economy-types.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379';
const ASSET_KEY = 'forge:econ:assets';
const TX_STREAM = 'forge:econ:transactions';
const STATS_KEY = 'forge:econ:stats';

let _redis: Redis | null = null;
function db(): Redis {
  if (!_redis) {
    _redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
    _redis.on('error', (e: Error) => console.error('[forge:ledger]', e.message));
  }
  return _redis;
}

export async function mintAsset(req: MintRequest): Promise<EconomyAsset> {
  const now = new Date().toISOString();
  const asset: EconomyAsset = {
    id: uuidv4(),
    type: req.assetType,
    title: req.title,
    creatorId: req.creatorId,
    createdAt: now,
    mintedAt: now,
    supply: req.initialSupply,
    price: req.basePrice,
    demandScore: 0.5,
    royaltyBps: req.royaltyBps,
    tags: req.tags,
    metadata: req.metadata,
  };
  await db().hset(ASSET_KEY, asset.id, JSON.stringify(asset));

  const tx: EconomyTransaction = {
    id: uuidv4(),
    assetId: asset.id,
    type: 'mint',
    fromId: null,
    toId: req.creatorId,
    amount: 0,
    quantity: req.initialSupply,
    timestamp: now,
  };
  await db().xadd(TX_STREAM, 'MAXLEN', '~', 10000, '*', 'json', JSON.stringify(tx));
  return asset;
}

export async function getAsset(id: string): Promise<EconomyAsset | null> {
  const raw = await db().hget(ASSET_KEY, id);
  if (!raw) return null;
  return JSON.parse(raw) as EconomyAsset;
}

export async function updateAssetPrice(id: string, price: number, demandScore: number): Promise<void> {
  const asset = await getAsset(id);
  if (!asset) return;
  asset.price = price;
  asset.demandScore = demandScore;
  await db().hset(ASSET_KEY, id, JSON.stringify(asset));
}

export async function listAssets(type?: EconomyAsset['type']): Promise<EconomyAsset[]> {
  const all = await db().hgetall(ASSET_KEY);
  const assets = Object.values(all).map(v => JSON.parse(v) as EconomyAsset);
  return type ? assets.filter(a => a.type === type) : assets;
}

export async function recordTransfer(
  assetId: string, fromId: string, toId: string, quantity: number, amountUsd: number,
): Promise<EconomyTransaction> {
  const now = new Date().toISOString();
  const tx: EconomyTransaction = {
    id: uuidv4(), assetId, type: 'transfer', fromId, toId,
    amount: amountUsd, quantity, timestamp: now,
  };
  await db().xadd(TX_STREAM, 'MAXLEN', '~', 10000, '*', 'json', JSON.stringify(tx));
  return tx;
}

export async function recentTransactions(limit = 50): Promise<EconomyTransaction[]> {
  const msgs = await db().xrevrange(TX_STREAM, '+', '-', 'COUNT', limit.toString());
  return msgs.map(([, fields]) => {
    const jsonIdx = fields.indexOf('json');
    return JSON.parse(fields[jsonIdx + 1] ?? '{}') as EconomyTransaction;
  });
}

export async function computeStats(): Promise<ForgeEconomyStats> {
  const assets = await listAssets();
  const txs = await recentTransactions(1000);
  const totalVolume = txs.filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0);
  const creatorSet = new Set(assets.map(a => a.creatorId));
  const assetVolume = new Map<string, number>();
  for (const tx of txs) {
    if (tx.type === 'transfer') assetVolume.set(tx.assetId, (assetVolume.get(tx.assetId) ?? 0) + tx.amount);
  }
  const top5Assets = assets
    .sort((a, b) => (assetVolume.get(b.id) ?? 0) - (assetVolume.get(a.id) ?? 0))
    .slice(0, 5)
    .map(a => ({ id: a.id, title: a.title, price: a.price, volume: assetVolume.get(a.id) ?? 0 }));
  const stats: ForgeEconomyStats = {
    totalAssets: assets.length, totalTransactions: txs.length, totalVolume,
    activeCreators: creatorSet.size, top5Assets, updatedAt: new Date().toISOString(),
  };
  await db().set(STATS_KEY, JSON.stringify(stats), 'EX', 60);
  return stats;
}
