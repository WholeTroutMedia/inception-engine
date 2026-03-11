/**
 * @inception/forge — AssetArchiver
 *
 * Converts CheckpointEvents into durable ForgeAsset records.
 * Persists to JSON store on NAS (sovereign-first). Each asset gets:
 *   - A unique UUID asset_id
 *   - A delta fingerprint from the checkpoint
 *   - Default draft commerce metadata
 *   - A SHA-256 provenance hash of the full record
 *
 * Future: swap JSON store for SCRIBE MCP or IPFS for distributed archiving.
 */

import { createHash, randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type {
  CheckpointEvent,
  CommerceMetadata,
  ForgeAsset,
  ForgeSessionConfig,
  AssetFingerprint,
} from './types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArchiverConfig {
  /** Root directory for asset JSON records */
  storage_path: string;
  /** Default creator address for royalty splits */
  platform_address?: string;
  /** Default commerce metadata applied to all new assets */
  default_commerce?: Partial<CommerceMetadata>;
}

// ─── AssetArchiver ────────────────────────────────────────────────────────────

export class AssetArchiver {
  private readonly storage_path: string;
  private readonly platform_address: string;
  private readonly default_commerce: Partial<CommerceMetadata>;

  constructor(config: ArchiverConfig) {
    this.storage_path = config.storage_path;
    this.platform_address = config.platform_address ?? 'ie:platform';
    this.default_commerce = config.default_commerce ?? {};
    this.ensureStorageDir();
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Create and persist a ForgeAsset from a checkpoint event.
   */
  async archive(
    checkpoint: CheckpointEvent,
    sessionConfig?: Partial<ForgeSessionConfig>
  ): Promise<ForgeAsset> {
    const asset_id = randomUUID();
    const created_at = checkpoint.timestamp;

    const fingerprint: AssetFingerprint = {
      perceptual_hash: this.computePerceptualHash(checkpoint.snapshot_payload),
      style_vector: [],  // Populated async by Genkit forge-flow.ts
      delta_score: checkpoint.delta_score,
    };

    const commerce: CommerceMetadata = {
      license: 'personal',
      marketplace_targets: ['both'],
      royalty_config: {
        creator_address: checkpoint.creator_id,
        platform_address: this.platform_address,
      },
      status: 'draft',
      ...this.default_commerce,
      ...(sessionConfig?.default_commerce ?? {}),
    };

    const assetRecord: Omit<ForgeAsset, 'provenance_hash'> = {
      asset_id,
      session_id: checkpoint.session_id,
      creator_id: checkpoint.creator_id,
      created_at,
      asset_type: 'animation_frame',
      fingerprint,
      commerce,
    };

    const provenance_hash = this.computeProvenanceHash(assetRecord);
    const asset: ForgeAsset = { ...assetRecord, provenance_hash };

    await this.persist(asset);
    return asset;
  }

  /**
   * Retrieve a single asset by ID. Returns null if not found.
   */
  async getAsset(asset_id: string): Promise<ForgeAsset | null> {
    const path = this.assetPath(asset_id);
    if (!existsSync(path)) return null;
    try {
      const raw = readFileSync(path, 'utf-8');
      return JSON.parse(raw) as ForgeAsset;
    } catch {
      return null;
    }
  }

  /**
   * List all assets for a given session.
   */
  async listSessionAssets(session_id: string): Promise<ForgeAsset[]> {
    const indexPath = this.sessionIndexPath(session_id);
    if (!existsSync(indexPath)) return [];

    const index = JSON.parse(readFileSync(indexPath, 'utf-8')) as string[];
    const assets: ForgeAsset[] = [];

    for (const asset_id of index) {
      const asset = await this.getAsset(asset_id);
      if (asset) assets.push(asset);
    }

    return assets;
  }

  /**
   * Update the commerce metadata of an existing asset.
   * Re-computes provenance hash after update.
   */
  async updateCommerce(
    asset_id: string,
    commerce: Partial<CommerceMetadata>
  ): Promise<ForgeAsset> {
    const existing = await this.getAsset(asset_id);
    if (!existing) throw new Error(`Asset not found: ${asset_id}`);

    const updated: ForgeAsset = {
      ...existing,
      commerce: { ...existing.commerce, ...commerce },
    };

    // Re-compute provenance hash after mutation
    const { provenance_hash: _, ...withoutHash } = updated;
    void _;
    updated.provenance_hash = this.computeProvenanceHash(withoutHash);

    await this.persist(updated);
    return updated;
  }

  /**
   * Update the fingerprint (e.g., when async LoRA job completes).
   */
  async updateFingerprint(
    asset_id: string,
    fingerprint: Partial<AssetFingerprint>
  ): Promise<ForgeAsset> {
    const existing = await this.getAsset(asset_id);
    if (!existing) throw new Error(`Asset not found: ${asset_id}`);

    const updated: ForgeAsset = {
      ...existing,
      fingerprint: { ...existing.fingerprint, ...fingerprint },
    };

    const { provenance_hash: _, ...withoutHash } = updated;
    void _;
    updated.provenance_hash = this.computeProvenanceHash(withoutHash);

    await this.persist(updated);
    return updated;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async persist(asset: ForgeAsset): Promise<void> {
    // Write asset record
    writeFileSync(this.assetPath(asset.asset_id), JSON.stringify(asset, null, 2), 'utf-8');

    // Update session index
    const indexPath = this.sessionIndexPath(asset.session_id);
    const index: string[] = existsSync(indexPath)
      ? (JSON.parse(readFileSync(indexPath, 'utf-8')) as string[])
      : [];

    if (!index.includes(asset.asset_id)) {
      index.push(asset.asset_id);
      writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    }
  }

  private computePerceptualHash(payload: unknown): string {
    // Deterministic hash of the serialized snapshot payload
    // In production, replace with actual perceptual hash (pHash) of rendered frame
    const str = JSON.stringify(payload);
    return createHash('sha256').update(str).digest('hex').slice(0, 16);
  }

  private computeProvenanceHash(record: unknown): string {
    return createHash('sha256').update(JSON.stringify(record)).digest('hex');
  }

  private assetPath(asset_id: string): string {
    return join(this.storage_path, 'assets', `${asset_id}.json`);
  }

  private sessionIndexPath(session_id: string): string {
    return join(this.storage_path, 'sessions', `${session_id}.json`);
  }

  private ensureStorageDir(): void {
    const dirs = [
      this.storage_path,
      join(this.storage_path, 'assets'),
      join(this.storage_path, 'sessions'),
      join(this.storage_path, 'sales'),
    ];
    for (const dir of dirs) {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    }
  }
}
