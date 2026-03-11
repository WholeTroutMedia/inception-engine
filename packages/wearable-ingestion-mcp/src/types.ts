/**
 * Wearable Ingestion MCP — Core Types
 *
 * Universal signal schema for all wearable devices.
 * Every wearable adapter normalizes to WearableSignal.
 */

import { z } from 'zod';

// ─── Source Identifiers ───────────────────────────────────────────────────────

export const WearableSource = z.enum([
  'sandbar_stream',
  'oura',
  'samsung_galaxy',
  'meta_glasses',
  'apple_watch',
  'apple_airpods',
  'whsp_ring',
  'orii',
  'luna_ring',
  'generic',
] as const);
export type WearableSource = z.infer<typeof WearableSource>;

// ─── Signal Types ─────────────────────────────────────────────────────────────

export const WearableSignalType = z.enum([
  'voice_note',
  'voice_command',
  'health_metric',
  'gesture',
  'location',
  'notification',
  'conversation',
  'export',
  'memory',
] as const);
export type WearableSignalType = z.infer<typeof WearableSignalType>;

// ─── Intent Classification ────────────────────────────────────────────────────

export const IntentClass = z.enum([
  'action',
  'memory',
  'query',
  'ideate',
  'health',
  'unknown',
] as const);
export type IntentClass = z.infer<typeof IntentClass>;

// ─── Core Signal Schema ───────────────────────────────────────────────────────

export const WearableSignal = z.object({
  id: z.string().uuid(),
  source: WearableSource,
  type: WearableSignalType,
  intent: IntentClass.optional(),
  payload: z.object({
    // Voice artifacts
    transcript: z.string().optional(),
    audioUrl: z.string().url().optional(),
    durationMs: z.number().optional(),
    // Health metrics
    heartRate: z.number().optional(),
    hrv: z.number().optional(),
    sleepScore: z.number().optional(),
    steps: z.number().optional(),
    // Gesture
    gesture: z.enum(['tap', 'double_tap', 'swipe_left', 'swipe_right', 'hold', 'release'] as const).optional(),
    // Freeform extra
    raw: z.record(z.unknown()).optional(),
  }),
  userId: z.string(),
  capturedAt: z.string().datetime(),
  processedAt: z.string().datetime().optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string()).optional(),
});
export type WearableSignal = z.infer<typeof WearableSignal>;

// ─── Dispatch Task Shape ──────────────────────────────────────────────────────

export const DispatchTask = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(['critical', 'high', 'normal', 'low'] as const).default('normal'),
  source: z.string(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});
export type DispatchTask = z.infer<typeof DispatchTask>;

// ─── Adapter Interface ────────────────────────────────────────────────────────

export interface WearableAdapter {
  source: WearableSource;
  name: string;
  /** Parse a raw incoming webhook/API payload into a WearableSignal */
  parse(raw: unknown, userId: string): Promise<WearableSignal>;
  /** Validate the webhook signature for this device (optional) */
  validateSignature?(payload: string, signature: string, secret: string): boolean;
}

// ─── Ingestion Result ─────────────────────────────────────────────────────────

export interface IngestionResult {
  signal: WearableSignal;
  taskId?: string; // Dispatch task ID if an action was fired
  stored: boolean; // Whether stored in Redis
  intent: IntentClass;
}
