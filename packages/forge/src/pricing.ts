/**
 * FORGE — Pricing Engine
 * Real-time asset valuation with demand curves and delta-gating.
 */

import type { PricingSignal } from './economy-types.js';
import { listAssets, updateAssetPrice, recentTransactions } from './ledger.js';

/**
 * Demand curve: price adjusts based on recent transaction velocity.
 * More buys → price rises. No activity → price drifts toward base.
 */
function calculateDemandCurve(
  basePrice: number,
  recentTxCount: number,
  currentPrice: number,
): { price: number; demandScore: number } {
  // Velocity-based scoring: 0 tx = 0.2 demand, 10+ tx = 0.9 demand
  const demandScore = Math.min(0.2 + (recentTxCount / 10) * 0.7, 0.95);

  // Price elasticity: demand score drives price 0.5x–2.5x of base
  const priceMultiplier = 0.5 + (demandScore * 2.0);
  const targetPrice = basePrice * priceMultiplier;

  // Smooth toward target (20% move per cycle to prevent spikes)
  const newPrice = currentPrice + (targetPrice - currentPrice) * 0.2;

  return { price: Math.round(newPrice * 100) / 100, demandScore };
}

/**
 * Run one pricing cycle across all assets.
 * Returns signals for all assets whose price changed by > 0.5%.
 */
export async function runPricingCycle(): Promise<PricingSignal[]> {
  const assets = await listAssets();
  const txs = await recentTransactions(200);
  const signals: PricingSignal[] = [];

  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5-minute demand window

  for (const asset of assets) {
    const recentTxCount = txs.filter(
      t => t.assetId === asset.id && now - new Date(t.timestamp).getTime() < windowMs,
    ).length;

    const { price, demandScore } = calculateDemandCurve(
      asset.price * (1 / (0.5 + asset.demandScore * 2.0)), // reverse to get base
      recentTxCount,
      asset.price,
    );

    const priceChangePercent = ((price - asset.price) / asset.price) * 100;

    // Delta-gate: only emit signal if price changed > 0.5%
    if (Math.abs(priceChangePercent) > 0.5) {
      await updateAssetPrice(asset.id, price, demandScore);
      signals.push({
        assetId: asset.id,
        currentPrice: price,
        demandScore,
        supply: asset.supply,
        recentTxCount,
        priceChangePercent: Math.round(priceChangePercent * 100) / 100,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return signals;
}
