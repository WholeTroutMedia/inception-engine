/**
 * @inception/forge — AssetArchiver Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { AssetArchiver } from '../asset-archiver.js';
import type { CheckpointEvent } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCheckpoint(overrides: Partial<CheckpointEvent> = {}): CheckpointEvent {
  return {
    session_id: 'session-abc',
    creator_id: 'user:justin',
    snapshot_payload: [{ id: 'e1', x: 10, y: 20 }],
    delta_score: 0.45,
    timestamp: new Date().toISOString(),
    checkpoint_index: 1,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AssetArchiver', () => {
  let tmpDir: string;
  let archiver: AssetArchiver;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'forge-archiver-'));
    archiver = new AssetArchiver({
      storage_path: tmpDir,
      platform_address: 'ie:platform-test',
    });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('archive()', () => {
    it('returns a ForgeAsset with correct shape', async () => {
      const asset = await archiver.archive(makeCheckpoint());
      expect(asset.asset_id).toMatch(/^[0-9a-f-]{36}$/); // UUID
      expect(asset.session_id).toBe('session-abc');
      expect(asset.creator_id).toBe('user:justin');
      expect(asset.asset_type).toBe('animation_frame');
      expect(asset.provenance_hash).toBeTruthy();
    });

    it('sets correct fingerprint delta_score', async () => {
      const asset = await archiver.archive(makeCheckpoint({ delta_score: 0.77 }));
      expect(asset.fingerprint.delta_score).toBe(0.77);
    });

    it('sets commerce status to draft', async () => {
      const asset = await archiver.archive(makeCheckpoint());
      expect(asset.commerce.status).toBe('draft');
    });

    it('sets creator royalty config', async () => {
      const asset = await archiver.archive(makeCheckpoint({ creator_id: 'user:test-creator' }));
      expect(asset.commerce.royalty_config.creator_address).toBe('user:test-creator');
      expect(asset.commerce.royalty_config.platform_address).toBe('ie:platform-test');
    });

    it('computes non-empty provenance_hash', async () => {
      const asset = await archiver.archive(makeCheckpoint());
      expect(asset.provenance_hash).toHaveLength(64); // SHA-256 hex
    });

    it('different checkpoints produce different asset_ids', async () => {
      const a = await archiver.archive(makeCheckpoint({ checkpoint_index: 1 }));
      const b = await archiver.archive(makeCheckpoint({ checkpoint_index: 2 }));
      expect(a.asset_id).not.toBe(b.asset_id);
    });
  });

  describe('getAsset()', () => {
    it('retrieves a persisted asset', async () => {
      const created = await archiver.archive(makeCheckpoint());
      const retrieved = await archiver.getAsset(created.asset_id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.asset_id).toBe(created.asset_id);
    });

    it('returns null for non-existent asset', async () => {
      const result = await archiver.getAsset('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('listSessionAssets()', () => {
    it('returns empty array for unknown session', async () => {
      const list = await archiver.listSessionAssets('unknown-session');
      expect(list).toEqual([]);
    });

    it('returns all assets for a session', async () => {
      const session_id = 'multi-asset-session';
      await archiver.archive(makeCheckpoint({ session_id, checkpoint_index: 1 }));
      await archiver.archive(makeCheckpoint({ session_id, checkpoint_index: 2 }));
      await archiver.archive(makeCheckpoint({ session_id, checkpoint_index: 3 }));

      const list = await archiver.listSessionAssets(session_id);
      expect(list).toHaveLength(3);
    });

    it('does not mix assets from different sessions', async () => {
      await archiver.archive(makeCheckpoint({ session_id: 'session-1' }));
      await archiver.archive(makeCheckpoint({ session_id: 'session-2' }));

      const list1 = await archiver.listSessionAssets('session-1');
      const list2 = await archiver.listSessionAssets('session-2');

      expect(list1).toHaveLength(1);
      expect(list2).toHaveLength(1);
      expect(list1[0]?.asset_id).not.toBe(list2[0]?.asset_id);
    });
  });

  describe('updateCommerce()', () => {
    it('updates status and price', async () => {
      const created = await archiver.archive(makeCheckpoint());
      const updated = await archiver.updateCommerce(created.asset_id, {
        status: 'listed',
        price_cents: 999,
      });
      expect(updated.commerce.status).toBe('listed');
      expect(updated.commerce.price_cents).toBe(999);
    });

    it('re-computes provenance_hash after update', async () => {
      const created = await archiver.archive(makeCheckpoint());
      const updated = await archiver.updateCommerce(created.asset_id, {
        status: 'listed',
      });
      expect(updated.provenance_hash).not.toBe(created.provenance_hash);
    });

    it('throws for non-existent asset', async () => {
      await expect(
        archiver.updateCommerce('ghost-id', { status: 'listed' })
      ).rejects.toThrow('Asset not found');
    });
  });

  describe('updateFingerprint()', () => {
    it('updates lora_checkpoint_path', async () => {
      const created = await archiver.archive(makeCheckpoint());
      const updated = await archiver.updateFingerprint(created.asset_id, {
        lora_checkpoint_path: '/nas/loras/abc.safetensors',
      });
      expect(updated.fingerprint.lora_checkpoint_path).toBe('/nas/loras/abc.safetensors');
    });
  });
});
