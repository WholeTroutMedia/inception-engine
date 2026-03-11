/**
 * @inception/forge — CommerceRegistry Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { CommerceRegistry, defaultRoyaltyCalculator } from '../commerce-registry.js';
import { AssetArchiver } from '../asset-archiver.js';
import type { CheckpointEvent } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCheckpoint(session_id = 'session-xyz'): CheckpointEvent {
  return {
    session_id,
    creator_id: 'user:creator',
    snapshot_payload: [{ id: 'e1', x: 10, y: 10 }],
    delta_score: 0.5,
    timestamp: new Date().toISOString(),
    checkpoint_index: 1,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CommerceRegistry', () => {
  let tmpDir: string;
  let registry: CommerceRegistry;
  let archiver: AssetArchiver;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'forge-registry-'));
    registry = new CommerceRegistry({ storage_path: tmpDir });
    archiver = new AssetArchiver({ storage_path: tmpDir });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── defaultRoyaltyCalculator ───────────────────────────────────────────

  describe('defaultRoyaltyCalculator', () => {
    it('splits $100 correctly: creator 80%, platform 10%, pool 5%', () => {
      const result = defaultRoyaltyCalculator.calculate({
        asset_id: 'test',
        creator_address: 'creator:1',
        platform_address: 'ie:platform',
        sale_price_cents: 10000, // $100
      });

      expect(result.creator_payout_cents).toBe(8000);   // $80
      expect(result.platform_payout_cents).toBe(1000); // $10
      expect(result.pool_payout_cents).toBe(500);       // $5
      expect(result.collaborator_payouts).toHaveLength(0);
    });

    it('splits $10 — rounding correct', () => {
      const result = defaultRoyaltyCalculator.calculate({
        asset_id: 'test',
        creator_address: 'creator:1',
        platform_address: 'ie:platform',
        sale_price_cents: 1000,
      });
      expect(result.creator_payout_cents).toBe(800);
      expect(result.platform_payout_cents).toBe(100);
      expect(result.pool_payout_cents).toBe(50);
    });

    it('includes collaborator payout', () => {
      const result = defaultRoyaltyCalculator.calculate({
        asset_id: 'test',
        creator_address: 'creator:1',
        platform_address: 'ie:platform',
        collaborators: [{ address: 'collab:1', share_bps: 250 }],
        sale_price_cents: 10000,
      });

      expect(result.collaborator_payouts).toHaveLength(1);
      expect(result.collaborator_payouts[0]?.payout_cents).toBe(250); // 2.5% of $100
    });

    it('handles $0 sale price', () => {
      const result = defaultRoyaltyCalculator.calculate({
        asset_id: 'test',
        creator_address: 'creator:1',
        platform_address: 'ie:platform',
        sale_price_cents: 0,
      });
      expect(result.creator_payout_cents).toBe(0);
    });
  });

  // ─── list() ───────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('throws for negative price_cents', async () => {
      // Need an existing asset first
      const asset = await archiver.archive(makeCheckpoint());
      await expect(registry.list(asset.asset_id, -100)).rejects.toThrow(RangeError);
    });

    it('lists an asset and returns listing result', async () => {
      const asset = await archiver.archive(makeCheckpoint());
      const result = await registry.list(asset.asset_id, 999, ['real']);

      expect(result.asset_id).toBe(asset.asset_id);
      expect(result.status).toBe('listed');
      expect(result.price_cents).toBe(999);
      expect(result.marketplace_targets).toContain('real');
    });

    it('updates asset commerce status to listed', async () => {
      const asset = await archiver.archive(makeCheckpoint());
      await registry.list(asset.asset_id, 1999);

      const updated = await archiver.getAsset(asset.asset_id);
      expect(updated?.commerce.status).toBe('listed');
      expect(updated?.commerce.price_cents).toBe(1999);
    });
  });

  // ─── delist() ─────────────────────────────────────────────────────────────

  describe('delist()', () => {
    it('returns asset to draft status', async () => {
      const asset = await archiver.archive(makeCheckpoint());
      await registry.list(asset.asset_id, 500);
      await registry.delist(asset.asset_id);

      const updated = await archiver.getAsset(asset.asset_id);
      expect(updated?.commerce.status).toBe('draft');
    });
  });

  // ─── recordSale() ─────────────────────────────────────────────────────────

  describe('recordSale()', () => {
    it('records a sale and returns SaleRecord', async () => {
      const asset = await archiver.archive(makeCheckpoint());
      await registry.list(asset.asset_id, 1000);

      const sale = await registry.recordSale(asset.asset_id, 'buyer:1', 1000);

      expect(sale.asset_id).toBe(asset.asset_id);
      expect(sale.buyer_id).toBe('buyer:1');
      expect(sale.sale_price_cents).toBe(1000);
      expect(sale.royalty_distribution.creator_payout_cents).toBe(800);
    });

    it('marks asset as sold after sale', async () => {
      const asset = await archiver.archive(makeCheckpoint());
      await registry.list(asset.asset_id, 500);
      await registry.recordSale(asset.asset_id, 'buyer:1', 500);

      const updated = await archiver.getAsset(asset.asset_id);
      expect(updated?.commerce.status).toBe('sold');
      expect(updated?.commerce.buyer_id).toBe('buyer:1');
    });

    it('throws when asset is not listed', async () => {
      const asset = await archiver.archive(makeCheckpoint());
      // Asset is draft, not listed
      await expect(
        registry.recordSale(asset.asset_id, 'buyer:1', 500)
      ).rejects.toThrow('not listed');
    });

    it('throws for non-existent asset', async () => {
      await expect(
        registry.recordSale('ghost-id', 'buyer:1', 500)
      ).rejects.toThrow('not found');
    });
  });

  // ─── calculateRoyalties() ─────────────────────────────────────────────────

  describe('calculateRoyalties()', () => {
    it('calculates without recording a sale', async () => {
      const asset = await archiver.archive(makeCheckpoint());
      const dist = await registry.calculateRoyalties(asset.asset_id, 5000);

      expect(dist.creator_payout_cents).toBe(4000); // 80% of $50
      expect(dist.platform_payout_cents).toBe(500); // 10%
      expect(dist.pool_payout_cents).toBe(250);      // 5%

      // Asset should still be draft
      const check = await archiver.getAsset(asset.asset_id);
      expect(check?.commerce.status).toBe('draft');
    });
  });
});
