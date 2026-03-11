/**
 * @inception/live-animate — OpenSky Aviation Adapter
 *
 * OMNIBUS Vertical: Aviation & Transport
 *
 * Consumes the OpenSky Network REST API — completely free, no auth.
 * https://opensky-network.org/api
 *
 * Returns live position data for every commercial aircraft currently airborne.
 * This is the "duck migration" adapter — flights as entities in 2D space.
 *
 * Use cases:
 *   - Duck migration contact page (flights as animated ducks)
 *   - Live Plinko / prediction market on flight arrivals
 *   - Global air traffic visualization
 *   - Any creative use of real-world motion data
 */

import { OmnibusAdapter, type OmnibusAdapterConfig } from '../omnibus/adapter.js';
import { makeEvent, type InceptionEvent, type AviationEvent } from '../types/inception-event.js';

export interface OpenSkyAdapterConfig extends OmnibusAdapterConfig {
  /** Poll interval (default: 10000ms — OpenSky recommends ≥10s) */
  pollIntervalMs?: number;
  /** Bounding box to filter [lat_min, lon_min, lat_max, lon_max] */
  boundingBox?: [number, number, number, number];
  /** Max aircraft to track (default: 200) */
  maxAircraft?: number;
}

// OpenSky state vector fields (positional array format)
type StateVector = [
  string,       // 0: icao24
  string | null, // 1: callsign
  string,       // 2: origin_country
  number | null, // 3: time_position
  number,       // 4: last_contact
  number | null, // 5: longitude
  number | null, // 6: latitude
  number | null, // 7: baro_altitude (meters)
  boolean,      // 8: on_ground
  number | null, // 9: velocity (m/s)
  number | null, // 10: true_track (heading degrees)
  number | null, // 11: vertical_rate (m/s)
  number[] | null, // 12: sensors
  number | null, // 13: geo_altitude
  string | null, // 14: squawk
  boolean,      // 15: spi
  number,       // 16: position_source
];

// World bounds for normalization (lat -90→90, lon -180→180)
const LAT_RANGE = 180;
const LON_RANGE = 360;

function normalizeGlobal(lat: number, lon: number): { x: number; y: number } {
  return {
    x: (lon + 180) / LON_RANGE,           // 0=west, 1=east
    y: 1 - ((lat + 90) / LAT_RANGE),      // 0=north, 1=south (inverted for screen)
  };
}

// ─── OpenSky Adapter ──────────────────────────────────────────────────────────

export class OpenSkyAdapter extends OmnibusAdapter {
  private readonly pollIntervalMs: number;
  private readonly boundingBox?: [number, number, number, number];
  private readonly maxAircraft: number;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastStates = new Map<string, { lon: number; lat: number; time: number }>();

  constructor(config: OpenSkyAdapterConfig = {} as OpenSkyAdapterConfig) {
    super({
      maxFps: 10,          // Smooth position updates
      autoReconnect: true,
      ...config,
      vertical: 'aviation', // Always aviation
    });
    this.pollIntervalMs = config.pollIntervalMs ?? 10000; // OpenSky asks for ≥10s
    this.boundingBox = config.boundingBox;
    this.maxAircraft = config.maxAircraft ?? 200;
  }

  protected async connect(): Promise<void> {
    console.log('[opensky-adapter] ✈️  Connecting to OpenSky Network (no auth)...');
    await this.poll(); // Immediate first load
    this.pollTimer = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  protected async disconnect(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async poll(): Promise<void> {
    try {
      const url = new URL('https://opensky-network.org/api/states/all');
      if (this.boundingBox) {
        const [latMin, lonMin, latMax, lonMax] = this.boundingBox;
        url.searchParams.set('lamin', String(latMin));
        url.searchParams.set('lomin', String(lonMin));
        url.searchParams.set('lamax', String(latMax));
        url.searchParams.set('lomax', String(lonMax));
      }

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'CreativeLiberationEngine/1.0 (+https://github.com/Creative Liberation Engine Community)' },
      });

      if (!res.ok) {
        throw new Error(`OpenSky API returned ${res.status}`);
      }

      const data = await res.json() as { states?: StateVector[] };
      const states = (data.states ?? []).slice(0, this.maxAircraft);

      console.log(`[opensky-adapter] 📡 Tracking ${states.length} aircraft`);

      for (const state of states) {
        const event = this.mapStateToEvent(state);
        if (event) this.emitEvent(event);
      }
    } catch (err) {
      await this.handleError(err as Error);
    }
  }

  private mapStateToEvent(state: StateVector): InceptionEvent | null {
    const [
      icao24, callsign, originCountry, _timePos, _lastContact,
      longitude, latitude, baroAltitude, onGround, velocity,
      trueTrack, verticalRate,
    ] = state;

    if (!latitude || !longitude || onGround) return null; // Skip grounded aircraft

    const normPos = normalizeGlobal(latitude, longitude);

    // Compute velocity vector from heading + speed
    const speed = velocity ?? 0;
    const headingRad = ((trueTrack ?? 0) * Math.PI) / 180;
    const velScale = speed / 400; // Normalize ~400m/s max to 0-1/s
    const velX = Math.sin(headingRad) * velScale / LON_RANGE;
    const velY = -Math.cos(headingRad) * velScale / LAT_RANGE;

    const aviationPayload: AviationEvent = {
      icao24,
      callsign: callsign?.trim() || undefined,
      originCountry,
      altitude: baroAltitude ?? undefined,
      groundSpeed: velocity ?? undefined,
      heading: trueTrack ?? undefined,
      verticalRate: verticalRate ?? undefined,
      onGround,
    };

    return makeEvent({
      vertical: 'aviation',
      type: 'flight.position',
      source: 'opensky',
      eventTime: new Date().toISOString(),
      geo: { lat: latitude, lon: longitude, alt: baroAltitude ?? 0 },
      normalizedPosition: { x: normPos.x, y: normPos.y, z: (baroAltitude ?? 0) / 15000 },
      velocity: { x: velX, y: velY },
      entityId: icao24,
      entityName: callsign?.trim() || icao24,
      payload: aviationPayload,
    });
  }
}
