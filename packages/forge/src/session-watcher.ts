/**
 * @inception/forge — SessionWatcher
 *
 * Subscribes to a LiveAnimateEngine's 'snapshot' event stream and applies
 * DeltaDetector gating. Only meaningful session state changes produce
 * CheckpointEvents — everything else is silently discarded.
 *
 * Wiring:
 *   LiveAnimateEngine → 'snapshot' → DeltaDetector → 'checkpoint' →  AssetArchiver
 *
 * Usage:
 *   const watcher = new SessionWatcher(engine, detector, config);
 *   watcher.on('checkpoint', (event) => archiver.archive(event));
 *   watcher.on('session_end', ({ total_checkpoints }) => console.log(total_checkpoints));
 *   watcher.start();
 */

import { EventEmitter } from 'events';
import { DeltaDetector, type EntitySnapshot } from './delta-detector.js';
import type { CheckpointEvent, ForgeSessionConfig } from './types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal LiveAnimateEngine interface — avoids hard dependency on live-animate package for testing */
export interface LiveAnimateEmitter {
  on(event: 'snapshot', listener: (entities: EntitySnapshot[]) => void): this;
  off(event: 'snapshot', listener: (entities: EntitySnapshot[]) => void): this;
  removeAllListeners(event?: string): this;
}

export interface SessionWatcherConfig extends ForgeSessionConfig {
  /** Override for max checkpoints — defaults to ForgeSessionConfig.max_checkpoints ?? 50 */
  max_checkpoints?: number;
}

export interface SessionEndEvent {
  session_id: string;
  total_checkpoints: number;
  duration_ms: number;
  budget_exhausted: boolean;
}

export interface SessionWatcherEvents {
  checkpoint: [event: CheckpointEvent];
  session_end: [event: SessionEndEvent];
  budget_exhausted: [session_id: string];
  error: [err: Error];
}

// ─── SessionWatcher ───────────────────────────────────────────────────────────

export class SessionWatcher extends EventEmitter {
  private readonly config: Required<Pick<
    SessionWatcherConfig,
    'session_id' | 'creator_id' | 'delta_threshold' | 'max_checkpoints'
  >>;
  private readonly detector: DeltaDetector;
  private readonly engine: LiveAnimateEmitter;

  private running = false;
  private checkpointIndex = 0;
  private startedAt: number | null = null;
  private snapshotHandler: ((entities: EntitySnapshot[]) => void) | null = null;

  constructor(
    engine: LiveAnimateEmitter,
    detector: DeltaDetector,
    config: SessionWatcherConfig
  ) {
    super();
    this.engine = engine;
    this.detector = detector;
    this.config = {
      session_id: config.session_id,
      creator_id: config.creator_id,
      delta_threshold: config.delta_threshold ?? 0.15,
      max_checkpoints: config.max_checkpoints ?? 50,
    };
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAt = Date.now();
    this.checkpointIndex = 0;

    this.snapshotHandler = (entities: EntitySnapshot[]) => {
      this.handleSnapshot(entities);
    };

    this.engine.on('snapshot', this.snapshotHandler);
    console.log(`[forge:session-watcher] 👁️  Watching session ${this.config.session_id}`);
  }

  stop(): SessionEndEvent {
    if (!this.running) {
      return {
        session_id: this.config.session_id,
        total_checkpoints: this.checkpointIndex,
        duration_ms: 0,
        budget_exhausted: false,
      };
    }

    this.running = false;

    if (this.snapshotHandler) {
      this.engine.off('snapshot', this.snapshotHandler);
      this.snapshotHandler = null;
    }

    const budget = this.detector.getBudgetStatus(
      this.config.session_id,
      this.config.max_checkpoints
    );

    const endEvent: SessionEndEvent = {
      session_id: this.config.session_id,
      total_checkpoints: this.checkpointIndex,
      duration_ms: this.startedAt ? Date.now() - this.startedAt : 0,
      budget_exhausted: budget.budget_exhausted,
    };

    this.detector.resetSession(this.config.session_id);
    this.emit('session_end', endEvent);

    console.log(
      `[forge:session-watcher] ⏹️  Session ${this.config.session_id} ended — ` +
      `${this.checkpointIndex} checkpoints in ${endEvent.duration_ms}ms`
    );

    return endEvent;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get stats() {
    return {
      session_id: this.config.session_id,
      checkpoint_count: this.checkpointIndex,
      max_checkpoints: this.config.max_checkpoints,
      running: this.running,
    };
  }

  // ─── Snapshot Handler ─────────────────────────────────────────────────────

  private handleSnapshot(entities: EntitySnapshot[]): void {
    try {
      // 1. Check budget first (cheap)
      if (!this.detector.canCheckpoint(this.config.session_id, this.config.max_checkpoints)) {
        if (this.running) {
          this.running = false;
          console.warn(
            `[forge:session-watcher] 💰 Budget exhausted for session ${this.config.session_id} ` +
            `(max: ${this.config.max_checkpoints})`
          );
          this.emit('budget_exhausted', this.config.session_id);
        }
        return;
      }

      // 2. Evaluate delta
      const delta = this.detector.evaluate(this.config.session_id, entities);

      if (!delta.significant) return;

      // 3. Record against budget
      const recorded = this.detector.recordCheckpoint(
        this.config.session_id,
        this.config.max_checkpoints
      );
      if (!recorded) return; // race condition guard

      // 4. Emit checkpoint
      this.checkpointIndex++;
      const checkpoint: CheckpointEvent = {
        session_id: this.config.session_id,
        creator_id: this.config.creator_id,
        snapshot_payload: entities,
        delta_score: delta.score,
        timestamp: new Date().toISOString(),
        checkpoint_index: this.checkpointIndex,
      };

      this.emit('checkpoint', checkpoint);

      console.log(
        `[forge:session-watcher] 📸 Checkpoint #${this.checkpointIndex} ` +
        `(δ=${delta.score.toFixed(3)}, session=${this.config.session_id})`
      );
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }
}
