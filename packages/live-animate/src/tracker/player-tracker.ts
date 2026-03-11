/**
 * @inception/live-animate — PlayerTracker
 *
 * State machine that consumes InceptionEvents and maintains a
 * real-time map of entity positions, velocities, and trajectories.
 *
 * This is the bridge between raw event ingest and the renderer:
 *   InceptionEvents → PlayerTracker → TrackedEntity[] → Renderer
 *
 * Features:
 *   - Smooth position interpolation (Kalman-style dead reckoning)
 *   - Multi-entity tracking (all players on field simultaneously)
 *   - Trajectory history (last N positions = motion trail)
 *   - Action state machine (what is this entity doing right now?)
 *   - Stale entity cleanup (auto-remove if no update in X ms)
 */

import { EventEmitter } from 'events';
import type { InceptionEvent, SportsPlayerEvent } from '../types/inception-event.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrackedEntity {
  id: string;
  name: string;
  groupId: string;
  /** Current normalized position (0-1) */
  position: { x: number; y: number; z?: number };
  /** Current velocity (normalized units/sec) */
  velocity: { x: number; y: number; z?: number };
  /** Last N positions for trail rendering */
  trail: Array<{ x: number; y: number; timestamp: number }>;
  /** Current action state */
  currentAction: string;
  /** Last update timestamp */
  lastUpdated: number;
  /** Is this entity currently stale? */
  stale: boolean;
  /** Additional metadata from payload */
  meta: Record<string, unknown>;
}

export interface TrackerConfig {
  /** Max trail length (positions to keep) */
  trailLength?: number;
  /** Ms before entity is considered stale */
  staleThresholdMs?: number;
  /** Interpolation factor 0-1 (0=raw, 1=fully smooth) */
  smoothing?: number;
}

// ─── PlayerTracker ────────────────────────────────────────────────────────────

export class PlayerTracker extends EventEmitter {
  private entities: Map<string, TrackedEntity> = new Map();
  private readonly trailLength: number;
  private readonly staleThresholdMs: number;
  private readonly smoothing: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: TrackerConfig = {}) {
    super();
    this.trailLength = config.trailLength ?? 30;
    this.staleThresholdMs = config.staleThresholdMs ?? 10000;
    this.smoothing = config.smoothing ?? 0.3;
  }

  public start(): void {
    // Cleanup stale entities every 5s
    this.cleanupTimer = setInterval(() => this.cleanupStale(), 5000);
  }

  public stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Ingest an InceptionEvent and update entity state.
   * Call this for every event from any adapter.
   */
  public ingest(event: InceptionEvent): void {
    if (!event.entityId) return;

    const entityId = event.entityId;
    const existing = this.entities.get(entityId);
    const now = Date.now();

    const newPos = event.normalizedPosition ?? { x: 0.5, y: 0.5 };

    if (existing) {
      // Compute velocity from position delta + time delta
      const dt = Math.max(1, now - existing.lastUpdated) / 1000; // seconds
      const rawVelX = (newPos.x - existing.position.x) / dt;
      const rawVelY = (newPos.y - existing.position.y) / dt;

      // Smooth velocity (low-pass filter)
      const velX = existing.velocity.x * (1 - this.smoothing) + rawVelX * this.smoothing;
      const velY = existing.velocity.y * (1 - this.smoothing) + rawVelY * this.smoothing;

      // Smooth position
      const smoothX = existing.position.x * (1 - this.smoothing) + newPos.x * this.smoothing;
      const smoothY = existing.position.y * (1 - this.smoothing) + newPos.y * this.smoothing;

      // Update trail
      const trail = [
        ...existing.trail,
        { x: existing.position.x, y: existing.position.y, timestamp: existing.lastUpdated },
      ].slice(-this.trailLength);

      const updated: TrackedEntity = {
        ...existing,
        position: { x: smoothX, y: smoothY, z: newPos.z },
        velocity: { x: velX, y: velY },
        trail,
        currentAction: this.extractAction(event),
        lastUpdated: now,
        stale: false,
        meta: this.mergeMeta(existing.meta, event.payload),
      };

      this.entities.set(entityId, updated);
      this.emit('update', updated, event);

    } else {
      // New entity
      const entity: TrackedEntity = {
        id: entityId,
        name: event.entityName ?? entityId,
        groupId: event.groupId ?? 'unknown',
        position: { x: newPos.x, y: newPos.y, z: newPos.z },
        velocity: { x: 0, y: 0 },
        trail: [],
        currentAction: this.extractAction(event),
        lastUpdated: now,
        stale: false,
        meta: event.payload,
      };
      this.entities.set(entityId, entity);
      this.emit('enter', entity, event);
    }
  }

  /**
   * Get a snapshot of all current tracked entities.
   * This is what the renderer reads every frame.
   */
  public getSnapshot(): TrackedEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Dead-reckon positions forward in time using current velocity.
   * Call this from the render loop to get smooth per-frame positions.
   */
  public interpolate(elapsedMs: number): TrackedEntity[] {
    const dt = elapsedMs / 1000;
    return Array.from(this.entities.values()).map(entity => ({
      ...entity,
      position: {
        x: Math.max(0, Math.min(1, entity.position.x + entity.velocity.x * dt)),
        y: Math.max(0, Math.min(1, entity.position.y + entity.velocity.y * dt)),
        z: entity.position.z,
      },
    }));
  }

  private extractAction(event: InceptionEvent): string {
    const payload = event.payload as Partial<SportsPlayerEvent>;
    return payload?.action ?? event.type;
  }

  private mergeMeta(
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>
  ): Record<string, unknown> {
    return { ...existing, ...incoming };
  }

  private cleanupStale(): void {
    const now = Date.now();
    for (const [id, entity] of this.entities) {
      if (now - entity.lastUpdated > this.staleThresholdMs) {
        const staled = { ...entity, stale: true };
        this.entities.set(id, staled);
        this.emit('stale', staled);
      }
    }
  }

  public getEntityCount(): number {
    return this.entities.size;
  }
}
