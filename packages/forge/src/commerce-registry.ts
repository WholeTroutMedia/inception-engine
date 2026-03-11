/**
 * @inception/forge — CommerceRegistry
 *
 * Asset ledger for listing, pricing, and tracking sales.
 * Sovereign-first: JSON store on NAS, with injectable royalty calculator.
 * At runtime, wire in @inception/blockchain royalty-engine for ERC-2981 splits.
 * No blockchain writes in Phase 1 — pure business logic.
 *
 * Default IE royalty splits: Creator 80% / Platform 10% / Pool 5% / Collabs 5%
 */

import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type {
  AssetStatus,
  CommerceMetadata,
  ForgeAsset,
  MarketplaceTarget,
  RoyaltyDistribution,
  SaleRecord,
} from './types.js';
import { AssetArchiver } from './asset-archiver.js';

// ─── Royalty Engine Interface (injectable) ────────────────────────────────────
// Decouples commerce-registry from @inception/blockchain at test time.
// At runtime, wire in the real royalty-engine from @inception/blockchain.

export interface RoyaltyCalculator {
  calculate(params: {
    asset_id: string;
    creator_address: string;
    platform_address: string;
    collaborators?: Array<{ address: string; share_bps: number }>;
    sale_price_cents: number;
  }): RoyaltyDistribution;
}

/** Default IE royalty calculator — pure 80/10/5/5 splits (no blockchain required) */
export const defaultRoyaltyCalculator: RoyaltyCalculator = {
  calculate(params) {
    const { sale_price_cents, collaborators = [] } = params;

    const CREATOR_BPS = 8000;
    const PLATFORM_BPS = 1000;
    const POOL_BPS = 500;

    const creator_payout_cents = Math.floor((sale_price_cents * CREATOR_BPS) / 10000);
    const platform_payout_cents = Math.floor((sale_price_cents * PLATFORM_BPS) / 10000);
    const pool_payout_cents = Math.floor((sale_price_cents * POOL_BPS) / 10000);

    const collaborator_payouts = collaborators.map(c => ({
      address: c.address,
      payout_cents: Math.floor((sale_price_cents * c.share_bps) / 10000),
    }));

    return { creator_payout_cents, platform_payout_cents, pool_payout_cents, collaborator_payouts };
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegistryConfig {
  storage_path: string;
  platform_address?: string;
  /** Optional custom royalty calculator — defaults to IE 80/10/5/5 */
  royalty_calculator?: RoyaltyCalculator;
}

export interface ListingResult {
  asset_id: string;
  status: AssetStatus;
  price_cents: number;
  marketplace_targets: MarketplaceTarget[];
  listed_at: string;
}

// ─── CommerceRegistry ─────────────────────────────────────────────────────────

export class CommerceRegistry {
  private readonly storage_path: string;
  private readonly platform_address: string;
  private readonly archiver: AssetArchiver;
  private readonly royaltyCalc: RoyaltyCalculator;

  constructor(config: RegistryConfig) {
    this.storage_path = config.storage_path;
    this.platform_address = config.platform_address ?? 'ie:platform';
    this.royaltyCalc = config.royalty_calculator ?? defaultRoyaltyCalculator;
    this.archiver = new AssetArchiver({
      storage_path: config.storage_path,
      platform_address: this.platform_address,
    });
    this.ensureStorageDir();
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * List an asset for sale at the given price.
   */
  async list(
    asset_id: string,
    price_cents: number,
    targets: MarketplaceTarget[] = ['both']
  ): Promise<ListingResult> {
    if (price_cents < 0) throw new RangeError(`price_cents must be ≥ 0, got ${price_cents}`);

    const listed_at = new Date().toISOString();

    await this.archiver.updateCommerce(asset_id, {
      price_cents,
      marketplace_targets: targets,
      status: 'listed',
      listed_at,
    });

    console.log(`[forge:commerce] 🏪 Listed asset ${asset_id} at $${(price_cents / 100).toFixed(2)}`);
    return { asset_id, status: 'listed', price_cents, marketplace_targets: targets, listed_at };
  }

  /**
   * Remove an asset from sale (returns to draft).
   */
  async delist(asset_id: string): Promise<void> {
    await this.archiver.updateCommerce(asset_id, {
      status: 'draft',
      price_cents: undefined,
    });
    console.log(`[forge:commerce] 🔒 Delisted asset ${asset_id}`);
  }

  /**
   * Record a sale. Calculates royalty distributions and persists sale record.
   */
  async recordSale(
    asset_id: string,
    buyer_id: string,
    sale_price_cents: number,
    currency: string = 'USD'
  ): Promise<SaleRecord> {
    const asset = await this.archiver.getAsset(asset_id);
    if (!asset) throw new Error(`Asset not found: ${asset_id}`);
    if (asset.commerce.status !== 'listed') {
      throw new Error(`Asset ${asset_id} is not listed (status: ${asset.commerce.status})`);
    }

    const royaltyDist = this.calculateRoyaltyDistribution(asset, sale_price_cents);

    const sale: SaleRecord = {
      sale_id: randomUUID(),
      asset_id,
      buyer_id,
      sale_price_cents,
      currency,
      sold_at: new Date().toISOString(),
      royalty_distribution: royaltyDist,
    };

    const salePath = join(this.storage_path, 'sales', `${sale.sale_id}.json`);
    writeFileSync(salePath, JSON.stringify(sale, null, 2), 'utf-8');

    await this.archiver.updateCommerce(asset_id, {
      status: 'sold',
      sold_at: sale.sold_at,
      buyer_id,
    });

    console.log(
      `[forge:commerce] 💸 Sale: ${asset_id} → ${buyer_id} ` +
      `$${(sale_price_cents / 100).toFixed(2)} ` +
      `(creator: $${(royaltyDist.creator_payout_cents / 100).toFixed(2)})`
    );

    return sale;
  }

  /**
   * Calculate royalty distribution for a hypothetical sale price.
   */
  async calculateRoyalties(
    asset_id: string,
    sale_price_cents: number
  ): Promise<RoyaltyDistribution> {
    const asset = await this.archiver.getAsset(asset_id);
    if (!asset) throw new Error(`Asset not found: ${asset_id}`);
    return this.calculateRoyaltyDistribution(asset, sale_price_cents);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private calculateRoyaltyDistribution(
    asset: ForgeAsset,
    sale_price_cents: number
  ): RoyaltyDistribution {
    const { royalty_config } = asset.commerce;
    return this.royaltyCalc.calculate({
      asset_id: asset.asset_id,
      creator_address: royalty_config.creator_address,
      platform_address: royalty_config.platform_address ?? this.platform_address,
      collaborators: royalty_config.collaborators,
      sale_price_cents,
    });
  }

  private ensureStorageDir(): void {
    const dirs = [this.storage_path, join(this.storage_path, 'sales')];
    for (const dir of dirs) {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    }
  }
}
