/**
 * @inception/live-animate — OpenF1 Adapter
 *
 * OMNIBUS Vertical: Sports → Formula 1
 *
 * Uses the OpenF1 API — fully public, no auth, real-time.
 * https://openf1.org/
 *
 * Provides: driver positions, speeds, lap times, sector times,
 * pit stops, safety car, DRS, tyre compounds — all live.
 *
 * Track positions are normalized using the circuit bounding box.
 */

import { OmnibusAdapter, type OmnibusAdapterConfig } from '../omnibus/adapter.js';
import { makeEvent, type InceptionEvent } from '../types/inception-event.js';

export interface OpenF1AdapterConfig extends OmnibusAdapterConfig {
  pollIntervalMs?: number;
  /** Session key — auto-detects latest if not provided */
  sessionKey?: number;
}

interface OpenF1Position {
  session_key: number;
  driver_number: number;
  date: string;
  x: number;
  y: number;
  z: number;
}

interface OpenF1Driver {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
}

// ─── OpenF1 Adapter ──────────────────────────────────────────────────────────

export class OpenF1Adapter extends OmnibusAdapter {
  private readonly pollIntervalMs: number;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private sessionKey: number | null;
  private drivers: Map<number, OpenF1Driver> = new Map();
  private lastPositionTime: string | null = null;

  // Circuit bounding box for normalization (populated on first data)
  private minX = Infinity;
  private maxX = -Infinity;
  private minY = Infinity;
  private maxY = -Infinity;
  private boundsCalibrated = false;

  constructor(config: OpenF1AdapterConfig = {} as OpenF1AdapterConfig) {
    super({
      maxFps: 20,  // F1 position data at ~3.7Hz, burst to 15Hz
      autoReconnect: true,
      ...config,
      vertical: 'sports',   // Always sports
    });
    this.pollIntervalMs = config.pollIntervalMs ?? 1000;
    this.sessionKey = config.sessionKey ?? null;
  }

  protected async connect(): Promise<void> {
    console.log('[openf1-adapter] 🏎️  Connecting to OpenF1 API (no auth required)...');

    // Get latest session if not specified
    if (!this.sessionKey) {
      this.sessionKey = await this.fetchLatestSession();
      console.log(`[openf1-adapter] 🏁 Session: ${this.sessionKey}`);
    }

    // Load driver roster
    await this.loadDrivers();

    this.pollTimer = setInterval(() => this.poll(), this.pollIntervalMs);
    await this.poll();
  }

  protected async disconnect(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async fetchLatestSession(): Promise<number> {
    const res = await fetch('https://api.openf1.org/v1/sessions?session_type=Race&year=2025');
    const sessions = await res.json() as Array<{ session_key: number }>;
    return sessions[sessions.length - 1]?.session_key ?? 9000;
  }

  private async loadDrivers(): Promise<void> {
    const res = await fetch(
      `https://api.openf1.org/v1/drivers?session_key=${this.sessionKey}`
    );
    const drivers = await res.json() as OpenF1Driver[];
    for (const d of drivers) {
      this.drivers.set(d.driver_number, d);
    }
    console.log(`[openf1-adapter] 👨‍✈️  Loaded ${this.drivers.size} drivers`);
  }

  private async poll(): Promise<void> {
    try {
      const url = new URL('https://api.openf1.org/v1/location');
      url.searchParams.set('session_key', String(this.sessionKey));
      if (this.lastPositionTime) {
        url.searchParams.set('date>', this.lastPositionTime);
      }

      const res = await fetch(url.toString());
      if (!res.ok) return;

      const positions = await res.json() as OpenF1Position[];
      if (positions.length === 0) return;

      // Calibrate bounds from first batch
      if (!this.boundsCalibrated) {
        this.calibrateBounds(positions);
      }

      // Update last time
      this.lastPositionTime = positions[positions.length - 1]?.date ?? null;

      // Emit one event per driver position
      for (const pos of positions) {
        const driver = this.drivers.get(pos.driver_number);
        const event = this.mapPositionToEvent(pos, driver);
        this.emitEvent(event);
      }
    } catch (err) {
      await this.handleError(err as Error);
    }
  }

  private calibrateBounds(positions: OpenF1Position[]): void {
    for (const p of positions) {
      if (p.x < this.minX) this.minX = p.x;
      if (p.x > this.maxX) this.maxX = p.x;
      if (p.y < this.minY) this.minY = p.y;
      if (p.y > this.maxY) this.maxY = p.y;
    }
    this.boundsCalibrated = true;
    console.log(`[openf1-adapter] 📐 Track bounds calibrated: X[${this.minX}→${this.maxX}] Y[${this.minY}→${this.maxY}]`);
  }

  private normalizeTrack(x: number, y: number): { x: number; y: number } {
    const rangeX = this.maxX - this.minX || 1;
    const rangeY = this.maxY - this.minY || 1;
    return {
      x: Math.max(0, Math.min(1, (x - this.minX) / rangeX)),
      y: Math.max(0, Math.min(1, (y - this.minY) / rangeY)),
    };
  }

  private mapPositionToEvent(pos: OpenF1Position, driver?: OpenF1Driver): InceptionEvent {
    const normPos = this.normalizeTrack(pos.x, pos.y);

    return makeEvent({
      vertical: 'sports',
      type: 'f1.position',
      source: 'openf1',
      eventTime: pos.date,
      geo: {
        lat: 0,   // Track-relative, not geographic
        lon: 0,
        alt: pos.z,
      },
      normalizedPosition: { x: normPos.x, y: normPos.y, z: pos.z / 100 },
      entityId: String(pos.driver_number),
      entityName: driver?.full_name ?? `#${pos.driver_number}`,
      groupId: driver?.team_name,
      payload: {
        league: 'f1',
        sport: 'motorsport',
        gameId: String(this.sessionKey),
        playerId: String(pos.driver_number),
        playerName: driver?.full_name ?? `#${pos.driver_number}`,
        teamId: driver?.team_name ?? 'unknown',
        teamName: driver?.team_name ?? 'unknown',
        teamColor: driver?.team_colour ?? '#ffffff',
        acronym: driver?.name_acronym ?? `#${pos.driver_number}`,
        action: 'position',
        rawX: pos.x,
        rawY: pos.y,
        rawZ: pos.z,
      },
    });
  }
}
