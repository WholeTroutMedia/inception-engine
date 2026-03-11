/**
 * @inception/live-animate — Public API
 *
 * Everything you need to animate the universe.
 *
 * Quick start:
 *
 *   import { LiveAnimateEngine, NbaAdapter } from '@inception/live-animate';
 *
 *   const engine = new LiveAnimateEngine({
 *     adapter: new NbaAdapter(),
 *     canvas: document.getElementById('stage') as HTMLCanvasElement,
 *     style: 'neon',
 *   });
 *   await engine.start();
 *
 * Multi-vertical (pipe multiple adapters through a single tracker):
 *
 *   const nba = new NbaAdapter();
 *   const flights = new OpenSkyAdapter({ boundingBox: [24, -125, 50, -66] }); // US airspace
 *   // Register both adapters to a shared engine via manual wiring
 */

// ─── Engine ───────────────────────────────────────────────────────────────────
export { LiveAnimateEngine } from './engine.js';
export type { LiveAnimateConfig } from './engine.js';

// ─── Adapters ─────────────────────────────────────────────────────────────────
export { NbaAdapter } from './feeds/nba-stats.js';
export type { NbaAdapterConfig } from './feeds/nba-stats.js';

export { OpenF1Adapter } from './feeds/openf1.js';
export type { OpenF1AdapterConfig } from './feeds/openf1.js';

export { OpenSkyAdapter } from './feeds/opensky.js';
export type { OpenSkyAdapterConfig } from './feeds/opensky.js';

// ─── Core Infrastructure ──────────────────────────────────────────────────────
export { OmnibusAdapter } from './omnibus/adapter.js';
export type { OmnibusAdapterConfig, AdapterStats } from './omnibus/adapter.js';

export { PlayerTracker } from './tracker/player-tracker.js';
export type { TrackedEntity, TrackerConfig } from './tracker/player-tracker.js';

// ─── Types ────────────────────────────────────────────────────────────────────
export {
  InceptionEventSchema,
  SportsPlayerEventSchema,
  AviationEventSchema,
  FinancialEventSchema,
  makeEvent,
} from './types/inception-event.js';
export type {
  InceptionEvent,
  SportsPlayerEvent,
  AviationEvent,
  FinancialEvent,
} from './types/inception-event.js';

// ─── Renderer (browser only) ──────────────────────────────────────────────────
export { AnimationRenderer } from './renderer/animation-renderer.js';
export type { RenderConfig, RenderStyle } from './renderer/animation-renderer.js';

// ─── AI Vision Layer ──────────────────────────────────────────────────────────
export { GeminiVisionLayer } from './vision/gemini-vision.js';
export type { GeminiVisionConfig, VisionFeedType, VisionLoopConfig } from './vision/gemini-vision.js';

