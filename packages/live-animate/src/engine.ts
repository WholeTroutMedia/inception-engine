/**
 * @inception/live-animate — LiveAnimateEngine
 *
 * The main orchestrator. Wires together:
 *   OmnibusAdapter → PlayerTracker → AnimationRenderer
 *
 * Usage:
 *   const engine = new LiveAnimateEngine({
 *     adapter: new NbaAdapter(),
 *     canvas: document.getElementById('stage'),
 *     style: 'tactical',
 *   });
 *   engine.start();
 *
 * For Node/CLI demos:
 *   const engine = new LiveAnimateEngine({ adapter: new OpenF1Adapter() });
 *   engine.on('snapshot', (entities) => console.log(entities));
 *   engine.start();
 */

import { EventEmitter } from 'events';
import type { OmnibusAdapter } from './omnibus/adapter.js';
import { PlayerTracker, type TrackedEntity, type TrackerConfig } from './tracker/player-tracker.js';
import type { InceptionEvent } from './types/inception-event.js';

// AnimationRenderer is browser-only; import lazily
let AnimationRenderer: typeof import('./renderer/animation-renderer.js').AnimationRenderer | null = null;

export interface LiveAnimateConfig {
  /** The data adapter to use */
  adapter: OmnibusAdapter;
  /** Canvas element (browser only — omit for Node/headless) */
  canvas?: HTMLCanvasElement;
  /** Visual style when canvas is provided */
  style?: 'tactical' | 'cartoon' | 'heat' | 'wireframe' | 'neon';
  /** Group colors (team colors by groupId) */
  groupColors?: Record<string, string>;
  /** Player tracker config */
  trackerConfig?: TrackerConfig;
  /** Snapshot emit rate in ms (default: 100ms = 10fps for external consumers) */
  snapshotRateMs?: number;
}

// ─── LiveAnimateEngine ────────────────────────────────────────────────────────

export class LiveAnimateEngine extends EventEmitter {
  private readonly adapter: OmnibusAdapter;
  private readonly tracker: PlayerTracker;
  private renderer: InstanceType<typeof import('./renderer/animation-renderer.js').AnimationRenderer> | null = null;
  private readonly config: LiveAnimateConfig;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private eventCount = 0;

  constructor(config: LiveAnimateConfig) {
    super();
    this.config = config;
    this.adapter = config.adapter;
    this.tracker = new PlayerTracker(config.trackerConfig);
  }

  public async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    console.log('[live-animate] 🚀 Engine starting...');

    // Wire adapter → tracker
    this.adapter.on('event', (event: InceptionEvent) => {
      this.eventCount++;
      this.tracker.ingest(event);
      this.emit('event', event);
    });

    this.adapter.on('error', (err: Error) => {
      console.error('[live-animate] ❌ Adapter error:', err.message);
      this.emit('error', err);
    });

    // Wire tracker → renderer (if canvas provided)
    if (this.config.canvas) {
      await this.initRenderer(this.config.canvas);
    }

    this.tracker.on('update', (entity: TrackedEntity) => {
      if (this.renderer) {
        this.renderer.updateEntities(this.tracker.getSnapshot());
      }
    });

    this.tracker.on('enter', (entity: TrackedEntity) => {
      console.log(`[live-animate] 👋 New entity: ${entity.name} (${entity.id})`);
      this.emit('entityEnter', entity);
    });

    // Start snapshot emitter for external consumers
    const snapshotRate = this.config.snapshotRateMs ?? 100;
    this.snapshotTimer = setInterval(() => {
      const snapshot = this.tracker.getSnapshot();
      this.emit('snapshot', snapshot);
    }, snapshotRate);

    // Start tracker + adapter (order matters)
    this.tracker.start();
    await this.adapter.start();

    console.log(`[live-animate] ✅ Engine live — ${this.config.adapter.constructor.name} → ${this.config.canvas ? 'Canvas' : 'Headless'}`);
  }

  public async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    await this.adapter.stop();
    this.tracker.stop();
    this.renderer?.stop();

    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }

    console.log(`[live-animate] ⏹️  Engine stopped — ${this.eventCount} total events processed`);
  }

  private async initRenderer(canvas: HTMLCanvasElement): Promise<void> {
    // Dynamic import to avoid breaking Node environments
    const mod = await import('./renderer/animation-renderer.js');
    AnimationRenderer = mod.AnimationRenderer;
    this.renderer = new AnimationRenderer({
      canvas,
      style: this.config.style ?? 'tactical',
      groupColors: this.config.groupColors ?? {},
    });
    this.renderer.start();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Get current entity count */
  public getEntityCount(): number {
    return this.tracker.getEntityCount();
  }

  /** Get entity snapshot (for React hooks, WebSocket relay, etc.) */
  public getSnapshot(): TrackedEntity[] {
    return this.tracker.getSnapshot();
  }

  /** Get adapter telemetry stats */
  public getStats() {
    return {
      adapter: this.adapter.getStats(),
      entities: this.tracker.getEntityCount(),
      events: this.eventCount,
    };
  }

  /**
   * Relay snapshot over WebSocket — call this with a WebSocket.Server
   * to stream entity data to any browser client.
   */
  public relayToWebSocket(ws: { send: (data: string) => void }): void {
    this.on('snapshot', (entities: TrackedEntity[]) => {
      try {
        ws.send(JSON.stringify({ type: 'snapshot', entities, ts: Date.now() }));
      } catch {
        // Client disconnected
      }
    });
  }
}
