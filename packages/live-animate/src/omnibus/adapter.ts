/**
 * @inception/live-animate — OmnibusAdapter
 *
 * Abstract base class for all OMNIBUS data stream adapters.
 * Mirrors the ZigSimBridge pattern from sensor-mesh:
 *   EventEmitter → start() / stop() → emit('event', InceptionEvent)
 *
 * Built-in: auto-reconnect, rate limiting, health stats.
 *
 * Usage:
 *   class NbaAdapter extends OmnibusAdapter { ... }
 *   const adapter = new NbaAdapter({ maxFps: 30 });
 *   adapter.on('event', (e: InceptionEvent) => renderer.update(e));
 *   adapter.start();
 */

import { EventEmitter } from 'events';
import type { InceptionEvent } from '../types/inception-event.js';

export interface OmnibusAdapterConfig {
  /** Vertical identifier */
  vertical: InceptionEvent['vertical'];
  /** Max events per second to emit (rate limiter) */
  maxFps?: number;
  /** Auto-reconnect on connection loss */
  autoReconnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelayMs?: number;
  /** Verbose logging */
  verbose?: boolean;
}

export interface AdapterStats {
  running: boolean;
  eventCount: number;
  droppedCount: number;
  lastEventTime: number;
  connectionErrors: number;
}

// ─── OmnibusAdapter Base Class ────────────────────────────────────────────────

export abstract class OmnibusAdapter extends EventEmitter {
  protected readonly config: Required<OmnibusAdapterConfig>;
  protected running = false;
  protected eventCount = 0;
  protected droppedCount = 0;
  protected connectionErrors = 0;
  protected lastEventTime = 0;

  // Rate limiter: token bucket
  private lastEmitTime = 0;
  private readonly minIntervalMs: number;

  constructor(config: OmnibusAdapterConfig) {
    super();
    this.config = {
      vertical: config.vertical,
      maxFps: config.maxFps ?? 30,
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelayMs: config.reconnectDelayMs ?? 5000,
      verbose: config.verbose ?? false,
    };
    this.minIntervalMs = Math.floor(1000 / this.config.maxFps);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  public async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    console.log(`[omnibus:${this.config.vertical}] ▶️  Starting ${this.constructor.name}`);
    await this.connect();
  }

  public async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    await this.disconnect();
    console.log(
      `[omnibus:${this.config.vertical}] ⏹️  Stopped — ${this.eventCount} events emitted, ${this.droppedCount} dropped`
    );
  }

  // ─── Abstract Interface ─────────────────────────────────────────────────────

  /** Open the data connection. Called by start(). */
  protected abstract connect(): Promise<void>;

  /** Close the data connection. Called by stop(). */
  protected abstract disconnect(): Promise<void>;

  // ─── Protected Helpers ──────────────────────────────────────────────────────

  /**
   * Emit an InceptionEvent, respecting the rate limiter.
   * Subclasses call this instead of emit() directly.
   */
  protected emitEvent(event: InceptionEvent): void {
    const now = Date.now();
    if (now - this.lastEmitTime < this.minIntervalMs) {
      this.droppedCount++;
      return;
    }
    this.lastEmitTime = now;
    this.eventCount++;
    this.lastEventTime = now;
    if (this.config.verbose) {
      console.log(`[omnibus:${this.config.vertical}] 📡 ${event.type} — entity:${event.entityId ?? 'n/a'}`);
    }
    this.emit('event', event);
  }

  /**
   * Handle connection errors with optional auto-reconnect.
   */
  protected async handleError(err: Error): Promise<void> {
    this.connectionErrors++;
    console.error(`[omnibus:${this.config.vertical}] ❌ Error: ${err.message}`);
    this.emit('error', err);
    if (this.config.autoReconnect && this.running) {
      console.log(
        `[omnibus:${this.config.vertical}] 🔄 Reconnecting in ${this.config.reconnectDelayMs}ms...`
      );
      await new Promise(r => setTimeout(r, this.config.reconnectDelayMs));
      if (this.running) await this.connect();
    }
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  public getStats(): AdapterStats {
    return {
      running: this.running,
      eventCount: this.eventCount,
      droppedCount: this.droppedCount,
      lastEventTime: this.lastEventTime,
      connectionErrors: this.connectionErrors,
    };
  }
}
