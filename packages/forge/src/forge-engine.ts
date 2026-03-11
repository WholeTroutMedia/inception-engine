/**
 * @inception/forge — ForgeEngine
 *
 * Top-level orchestrator for the FORGE Real-Time Asset Economy.
 * Single entry point — attach to a live-animate session and everything else
 * (delta-gating, archiving, commerce, theme bundling) happens automatically.
 *
 * Usage:
 *   const forge = new ForgeEngine({ storage_path: '/nas/forge' });
 *   forge.attachSession('session-123', liveAnimateEngine, { creator_id: 'user:justin' });
 *   forge.on('asset:created', (asset) => console.log(asset.asset_id));
 *
 *   // NBA Jam example:
 *   const bundle = await forge.createThemeBundle({
 *     name: 'Retro NBA Jam',
 *     style_preset: 'retro-arcade',
 *     audio_mood: 'energetic',
 *     era: '1993',
 *     context: 'basketball',
 *   });
 */

import { EventEmitter } from 'events';
import { DeltaDetector } from './delta-detector.js';
import { SessionWatcher, type LiveAnimateEmitter } from './session-watcher.js';
import { AssetArchiver } from './asset-archiver.js';
import { CommerceRegistry } from './commerce-registry.js';
import { ThemeBundler, type FoleyEngineInterface, type LivingCanvasApplyConfig } from './theme-bundler.js';
import { recordComputeJob } from './compute-ledger.js';
import { ForgeCloudRouter, type ForgeCloudRouterConfig } from './cloud-router.js';
import type {
  BundleConfig,
  ForgeAsset,
  ForgeEngineConfig,
  ForgeSessionConfig,
  MarketplaceTarget,
  SaleRecord,
  ThemeBundle,
} from './types.js';

// ─── ForgeEngine ──────────────────────────────────────────────────────────────

export class ForgeEngine extends EventEmitter {
  private readonly config: Required<ForgeEngineConfig>;
  private readonly archiver: AssetArchiver;
  private readonly registry: CommerceRegistry;
  private readonly bundler: ThemeBundler;
  private readonly activeSessions = new Map<string, SessionWatcher>();
  private readonly cloudRouter: ForgeCloudRouter | null;

  constructor(config: ForgeEngineConfig & { cloudRouter?: ForgeCloudRouterConfig }) {
    super();
    // Apply defaults
    this.config = {
      storage_path: config.storage_path,
      default_delta_threshold: config.default_delta_threshold ?? 0.15,
      default_max_checkpoints: config.default_max_checkpoints ?? 50,
      platform_address: config.platform_address ?? 'ie:platform',
      lora_jobs_enabled: config.lora_jobs_enabled ?? false,
    };

    this.archiver = new AssetArchiver({
      storage_path: this.config.storage_path,
      platform_address: this.config.platform_address,
    });

    this.registry = new CommerceRegistry({
      storage_path: this.config.storage_path,
      platform_address: this.config.platform_address,
    });

    this.bundler = new ThemeBundler({
      storage_path: this.config.storage_path,
    });

    // Optional cloud router — if configured, asset archive jobs route through cloud mesh
    this.cloudRouter = config.cloudRouter
      ? new ForgeCloudRouter(config.cloudRouter)
      : null;

    console.log(
      `[forge] 🔥 ForgeEngine initialized — storage: ${this.config.storage_path}` +
      (this.cloudRouter ? ' | cloud-mesh: enabled' : ' | cloud-mesh: local only')
    );
  }

  // ─── Session Management ───────────────────────────────────────────────────

  /**
   * Attach FORGE to a live-animate session.
   * Automatically begins delta-gating and archiving snapshots.
   *
   * Emits: 'asset:created' for each checkpoint that produces a ForgeAsset.
   */
  attachSession(
    engine: LiveAnimateEmitter,
    sessionConfig: ForgeSessionConfig
  ): SessionWatcher {
    const { session_id } = sessionConfig;

    if (this.activeSessions.has(session_id)) {
      throw new Error(`Session ${session_id} is already attached`);
    }

    const detector = new DeltaDetector(
      sessionConfig.delta_threshold ?? this.config.default_delta_threshold
    );

    const watcher = new SessionWatcher(engine, detector, {
      ...sessionConfig,
      max_checkpoints: sessionConfig.max_checkpoints ?? this.config.default_max_checkpoints,
    });

    // Wire: checkpoint → archive (optionally via cloud router) → emit
    watcher.on('checkpoint', async (checkpoint) => {
      try {
        let asset: ForgeAsset;

        if (this.cloudRouter) {
          // Route archive job through cloud mesh — cheapest available target
          const jobResult = await this.cloudRouter.routeJob({
            jobId: `archive-${session_id}-${checkpoint.frame_index ?? Date.now()}`,
            jobType: 'asset-gen',
            computeEstimate: 'light', // archive is lightweight
            payload: { checkpoint, sessionConfig },
          });

          // Record compute cost to ledger (fire-and-forget)
          void recordComputeJob({
            jobId: jobResult.jobId,
            jobType: 'asset-gen',
            provider: jobResult.provider as import('./compute-ledger.js').ComputeProvider,
            targetId: jobResult.targetId,
            status: jobResult.status,
            actualCostUSD: jobResult.actualCostUSD,
            actualLatencyMs: jobResult.actualLatencyMs,
            attempts: jobResult.attempts,
            sessionId: session_id,
            recordedAt: new Date().toISOString(),
          });

          // Fall back to local archive regardless (cloud target may not store files)
          asset = await this.archiver.archive(checkpoint, sessionConfig);
          if (jobResult.actualCostUSD > 0) {
            this.emit('compute:cost', { jobId: jobResult.jobId, costUSD: jobResult.actualCostUSD, provider: jobResult.provider });
          }
        } else {
          asset = await this.archiver.archive(checkpoint, sessionConfig);
        }

        this.emit('asset:created', asset);
        console.log(`[forge] 📦 Asset created: ${asset.asset_id} (session: ${session_id})`);
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      }
    });

    watcher.on('session_end', (event) => {
      this.activeSessions.delete(session_id);
      this.emit('session:end', event);
    });

    watcher.on('budget_exhausted', (sid) => {
      this.emit('session:budget_exhausted', sid);
    });

    watcher.on('error', (err) => {
      this.emit('error', err);
    });

    watcher.start();
    this.activeSessions.set(session_id, watcher);

    console.log(`[forge] 🎯 Session attached: ${session_id}`);
    return watcher;
  }

  /**
   * Detach and finalize a session.
   */
  detachSession(session_id: string): void {
    const watcher = this.activeSessions.get(session_id);
    if (!watcher) return;
    watcher.stop();
    this.activeSessions.delete(session_id);
  }

  // ─── Theme Bundles ────────────────────────────────────────────────────────

  /**
   * Create a new ThemeBundle (e.g., "Retro NBA Jam").
   * Emits: 'bundle:ready'
   */
  async createThemeBundle(config: BundleConfig, foley?: FoleyEngineInterface): Promise<ThemeBundle> {
    // Optionally wire Foley engine for audio rendering
    if (foley && !(this.bundler as unknown as { foley?: FoleyEngineInterface }).foley) {
      (this.bundler as unknown as { foley: FoleyEngineInterface }).foley = foley;
    }

    const bundle = await this.bundler.createBundle(config);
    this.emit('bundle:ready', bundle);
    return bundle;
  }

  /**
   * Get the living-canvas apply config for a bundle.
   * Pass this to living-canvas to apply the theme to a stream or TV output.
   */
  getApplyConfig(bundle: ThemeBundle): LivingCanvasApplyConfig {
    return this.bundler.buildApplyConfig(bundle);
  }

  // ─── Commerce ─────────────────────────────────────────────────────────────

  /**
   * List an asset for sale.
   * Emits: 'asset:listed'
   */
  async listAsset(
    asset_id: string,
    price_cents: number,
    targets: MarketplaceTarget[] = ['both']
  ): Promise<void> {
    const result = await this.registry.list(asset_id, price_cents, targets);
    this.emit('asset:listed', result);
  }

  /**
   * Delist an asset (mark draft).
   */
  async delistAsset(asset_id: string): Promise<void> {
    await this.registry.delist(asset_id);
    this.emit('asset:delisted', asset_id);
  }

  /**
   * Record a sale and calculate royalty distributions.
   * Emits: 'asset:sold'
   */
  async recordSale(
    asset_id: string,
    buyer_id: string,
    sale_price_cents: number
  ): Promise<SaleRecord> {
    const sale = await this.registry.recordSale(asset_id, buyer_id, sale_price_cents);
    this.emit('asset:sold', sale);
    return sale;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async getAsset(asset_id: string): Promise<ForgeAsset | null> {
    return this.archiver.getAsset(asset_id);
  }

  async getSessionAssets(session_id: string): Promise<ForgeAsset[]> {
    return this.archiver.listSessionAssets(session_id);
  }

  async calculateRoyalties(asset_id: string, sale_price_cents: number) {
    return this.registry.calculateRoyalties(asset_id, sale_price_cents);
  }

  get activeSessions_count(): number {
    return this.activeSessions.size;
  }

  getSessionWatcher(session_id: string): SessionWatcher | null {
    return this.activeSessions.get(session_id) ?? null;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /** Gracefully stop all active sessions */
  async shutdown(): Promise<void> {
    for (const [session_id, watcher] of this.activeSessions) {
      watcher.stop();
      console.log(`[forge] 🛑 Session terminated on shutdown: ${session_id}`);
    }
    this.activeSessions.clear();
    console.log('[forge] 🛑 ForgeEngine shutdown complete');
  }
}
