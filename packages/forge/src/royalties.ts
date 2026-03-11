/**
 * FORGE â€” Royalty Router (Economy Layer)
 */

import { v4 as uuidv4 } from 'uuid';
import type { EconomyRoyaltyPayment } from './economy-types.js';
import { getAsset, recentTransactions } from './ledger.js';
import { Redis } from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379';
const ROYALTY_KEY = 'forge:econ:royalties';
const PAYOUT_THRESHOLD_USD = 1.00;

let _redis: Redis | null = null;
function db(): Redis {
  if (!_redis) {
    _redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
    _redis.on('error', (e: Error) => console.error('[forge:royalty]', e.message));
  }
  return _redis;
}

export async function processRoyalties(
  assetId: string, saleAmountUsd: number, periodStart: string, periodEnd: string,
): Promise<EconomyRoyaltyPayment | null> {
  const asset = await getAsset(assetId);
  if (!asset || asset.royaltyBps === 0) return null;

  const royaltyAmount = (saleAmountUsd * asset.royaltyBps) / 10000;
  const payment: EconomyRoyaltyPayment = {
    assetId,
    creatorId: asset.creatorId,
    amount: Math.round(royaltyAmount * 100) / 100,
    txId: uuidv4(),
    periodStart,
    periodEnd,
  };

  const pendingKey = `forge:econ:pending:${asset.creatorId}`;
  const currentPending = parseFloat((await db().get(pendingKey)) ?? '0');
  const newPending = currentPending + payment.amount;
  await db().set(pendingKey, newPending.toFixed(2));

  if (newPending >= PAYOUT_THRESHOLD_USD) {
    await db().set(pendingKey, '0');
    await db().lpush(ROYALTY_KEY, JSON.stringify({ ...payment, amount: newPending }));
    console.log(`[forge:royalty] Payout $${newPending.toFixed(2)} â†’ creator ${asset.creatorId}`);
  }

  return payment;
}

export async function getPendingBalance(creatorId: string): Promise<number> {
  const val = await db().get(`forge:econ:pending:${creatorId}`);
  return parseFloat(val ?? '0');
}

export async function getRoyaltyHistory(limit = 50): Promise<EconomyRoyaltyPayment[]> {
  const raw = await db().lrange(ROYALTY_KEY, 0, limit - 1);
  return raw.map(r => JSON.parse(r) as EconomyRoyaltyPayment);
}

export async function runDailyRoyaltySweep(): Promise<{ paymentsProcessed: number; totalUsd: number }> {
  const now = new Date();
  const periodEnd = now.toISOString();
  const periodStart = new Date(now.getTime() - 86400 * 1000).toISOString();
  const txs = await recentTransactions(5000);
  const transfers = txs.filter(
    t => t.type === 'transfer' && new Date(t.timestamp) >= new Date(periodStart),
  );
  let paymentsProcessed = 0, totalUsd = 0;
  for (const tx of transfers) {
    const payment = await processRoyalties(tx.assetId, tx.amount, periodStart, periodEnd);
    if (payment) { paymentsProcessed++; totalUsd += payment.amount; }
  }
  return { paymentsProcessed, totalUsd: Math.round(totalUsd * 100) / 100 };
}
