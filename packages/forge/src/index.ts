/**
 * @inception/forge — Public API
 *
 * Main entry point. Import from '@inception/forge'.
 */

// ─── Core Engine ──────────────────────────────────────────────────────────────
export { ForgeEngine } from './forge-engine.js';

// ─── Subsystems ───────────────────────────────────────────────────────────────
export { DeltaDetector } from './delta-detector.js';
export { SessionWatcher } from './session-watcher.js';
export { AssetArchiver } from './asset-archiver.js';
export { CommerceRegistry } from './commerce-registry.js';
export { ThemeBundler, BUILT_IN_PRESETS, AUDIO_PRESETS } from './theme-bundler.js';

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  // Assets
  ForgeAsset,
  AssetType,
  AssetStatus,
  AssetFingerprint,

  // Commerce
  CommerceMetadata,
  RoyaltyConfig,
  MarketplaceTarget,
  LicenseType,
  SaleRecord,
  RoyaltyDistribution,

  // Bundles
  ThemeBundle,
  BundleConfig,
  FoleyAudioProfile,
  SpatialAudioMap,

  // Sessions
  CheckpointEvent,
  ForgeSessionConfig,
  ForgeEngineConfig,
} from './types.js';

export type {
  EntitySnapshot,
  DeltaResult,
  BudgetStatus,
} from './delta-detector.js';

export type {
  LiveAnimateEmitter,
  SessionWatcherConfig,
  SessionEndEvent,
} from './session-watcher.js';

export type {
  StylePreset,
  LivingCanvasApplyConfig,
  FoleyEngineInterface,
} from './theme-bundler.js';

// ─── ECONOMY LAYER ──────────────────────────────────────────────────────────
export * from './economy-types.js';
export { mintAsset, getAsset, listAssets, updateAssetPrice, recordTransfer, recentTransactions, computeStats } from './ledger.js';
export { runPricingCycle } from './pricing.js';
export { processRoyalties, getPendingBalance, getRoyaltyHistory, runDailyRoyaltySweep } from './royalties.js';

// ─── CLOUD MESH INTEGRATION ──────────────────────────────────────────────────
export { ForgeCloudRouter, getForgeCloudRouter } from './cloud-router.js';
export type { ForgeJobPayload, ForgeJobResult, ForgeCloudRouterConfig } from './cloud-router.js';
export { recordComputeJob, getComputeJob, getComputeCostSummary } from './compute-ledger.js';
export type { ComputeJobRecord, ComputeCostSummary, ComputeProvider, ComputeJobStatus } from './compute-ledger.js';

