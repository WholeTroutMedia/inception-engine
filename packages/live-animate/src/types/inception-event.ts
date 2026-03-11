/**
 * @inception/live-animate
 *
 * OMNIBUS — Universal InceptionEvent Schema
 *
 * Every data stream on earth normalizes to this shape.
 * One schema. All verticals. Zero gatekeepers.
 *
 * Verticals:
 *   sports      → player positions, scores, actions
 *   aviation    → flight positions, altitude, velocity
 *   financial   → price ticks, orderbook deltas
 *   seismic     → earthquake events, magnitude, location
 *   weather     → temperature, wind, pressure cells
 *   scientific  → telemetry, measurements, events
 *   social      → content events, velocity, sentiment
 *   infra       → grid load, BGP prefix changes
 */

import { z } from 'zod';

// ─── Core Event Schema ────────────────────────────────────────────────────────

export const InceptionEventSchema = z.object({
  /** Unique event ID */
  id: z.string(),
  /** Data vertical — sports | aviation | financial | seismic | weather | scientific | social | infra */
  vertical: z.enum(['sports', 'aviation', 'financial', 'seismic', 'weather', 'scientific', 'social', 'infra', 'custom']),
  /** Sub-type within vertical: e.g. "nba.play", "f1.sector", "btc.tick" */
  type: z.string(),
  /** Source adapter ID: "nba-stats" | "opensky" | "coinbase" | "usgs" | etc. */
  source: z.string(),
  /** ISO timestamp of the real-world event (not ingestion time) */
  eventTime: z.string(),
  /** ISO timestamp of ingestion */
  ingestedAt: z.string(),
  /** Geospatial coordinates if applicable */
  geo: z.object({
    lat: z.number(),
    lon: z.number(),
    alt: z.number().optional(),
  }).optional(),
  /** Normalized 0-1 position in a bounded space (e.g. basketball court, racetrack) */
  normalizedPosition: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    z: z.number().min(0).max(1).optional(),
  }).optional(),
  /** Velocity vector (units per second in normalized space) */
  velocity: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number().optional(),
  }).optional(),
  /** Entity this event belongs to (player, aircraft, entity ID) */
  entityId: z.string().optional(),
  /** Human-readable entity name */
  entityName: z.string().optional(),
  /** Team, group, or category */
  groupId: z.string().optional(),
  /** Scalar value (score, price, magnitude, etc.) */
  value: z.number().optional(),
  /** Arbitrary structured payload — vertical-specific */
  payload: z.record(z.unknown()),
  /** Confidence score 0-1 (from vision inference, etc.) */
  confidence: z.number().min(0).max(1).optional(),
});

export type InceptionEvent = z.infer<typeof InceptionEventSchema>;

// ─── Sports-Specific Payload ──────────────────────────────────────────────────

export const SportsPlayerEventSchema = z.object({
  league: z.enum(['nba', 'nfl', 'mlb', 'nhl', 'premierLeague', 'laLiga', 'f1', 'nascar', 'tennis', 'esports', 'other']),
  sport: z.string(),
  gameId: z.string(),
  period: z.string().optional(),          // Q1, H1, Lap 42, etc.
  clockSeconds: z.number().optional(),
  playerId: z.string(),
  playerName: z.string(),
  teamId: z.string(),
  teamName: z.string(),
  action: z.enum([
    'position',      // routine position update
    'shot',          // shot attempt
    'score',         // scored
    'pass',          // pass
    'tackle',        // tackle / defense
    'foul',          // foul called
    'substitution',  // player in/out
    'possession',    // gained possession
    'sprint',        // high speed run
    'celebration',   // post-score
    'timeout',       // game pause
    'other',
  ]),
  ballPosition: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }).optional(),
  speed: z.number().optional(),           // mph / km/h
  score: z.object({
    home: z.number(),
    away: z.number(),
  }).optional(),
});

export type SportsPlayerEvent = z.infer<typeof SportsPlayerEventSchema>;

// ─── Aviation-Specific Payload ────────────────────────────────────────────────

export const AviationEventSchema = z.object({
  icao24: z.string(),           // ICAO 24-bit transponder address
  callsign: z.string().optional(),
  originCountry: z.string().optional(),
  altitude: z.number().optional(),        // meters
  groundSpeed: z.number().optional(),     // m/s
  heading: z.number().optional(),         // degrees
  verticalRate: z.number().optional(),    // m/s
  squawk: z.string().optional(),
  onGround: z.boolean(),
});

export type AviationEvent = z.infer<typeof AviationEventSchema>;

// ─── Financial-Specific Payload ───────────────────────────────────────────────

export const FinancialEventSchema = z.object({
  asset: z.string(),                      // BTC, ETH, AAPL, etc.
  assetType: z.enum(['crypto', 'stock', 'commodity', 'index', 'prediction']),
  price: z.number(),
  priceUsd: z.number().optional(),
  volume24h: z.number().optional(),
  changePercent24h: z.number().optional(),
  bid: z.number().optional(),
  ask: z.number().optional(),
  exchange: z.string().optional(),
});

export type FinancialEvent = z.infer<typeof FinancialEventSchema>;

// ─── Utility ─────────────────────────────────────────────────────────────────

export function makeEvent(
  partial: Omit<InceptionEvent, 'id' | 'ingestedAt'>
): InceptionEvent {
  return {
    ...partial,
    id: `${partial.source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ingestedAt: new Date().toISOString(),
  };
}
