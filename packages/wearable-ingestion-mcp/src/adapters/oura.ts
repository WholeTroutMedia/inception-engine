/**
 * Oura Ring Adapter
 *
 * Normalizes Oura API webhook payloads into universal WearableSignals.
 * Oura has a public REST API: https://cloud.ouraring.com/v2/docs
 * Webhooks available via: https://cloud.ouraring.com/v2/webhook/subscription
 */

import { v4 as uuidv4 } from 'uuid';
import type { WearableAdapter, WearableSignal } from '../types.js';

interface OuraActivityPayload {
  event_type: 'create' | 'update' | 'delete';
  data_type: 'activity' | 'sleep' | 'readiness' | 'heart_rate' | 'daily_activity';
  object: {
    id: string;
    day?: string;
    timestamp?: string;
    score?: number;
    heart_rate?: { bpm: number; source: string } | { items: Array<{ timestamp: string; bpm: number }> };
    steps?: number;
    low_activity_time?: number;
    high_activity_time?: number;
    average_heart_rate?: number;
    total_sleep_duration?: number;
    efficiency?: number;
    contributors?: Record<string, number>;
  };
}

export const OuraAdapter: WearableAdapter = {
  source: 'oura',
  name: 'Oura Ring',

  async parse(raw: unknown, userId: string): Promise<WearableSignal> {
    const payload = raw as OuraActivityPayload;
    const obj = payload.object;

    const base = {
      id: uuidv4(),
      source: 'oura' as const,
      userId,
      capturedAt: obj.timestamp || obj.day
        ? `${obj.day}T00:00:00.000Z`
        : new Date().toISOString(),
    };

    switch (payload.data_type) {
      case 'heart_rate':
        return {
          ...base,
          type: 'health_metric',
          payload: {
            heartRate: Array.isArray((obj.heart_rate as { items?: Array<{ bpm: number }> })?.items)
              ? (obj.heart_rate as { items: Array<{ bpm: number }> }).items.at(-1)?.bpm
              : (obj.heart_rate as { bpm?: number })?.bpm,
            raw: obj as Record<string, unknown>,
          },
        };

      case 'sleep':
        return {
          ...base,
          type: 'health_metric',
          payload: {
            sleepScore: obj.score,
            raw: obj as Record<string, unknown>,
          },
        };

      case 'daily_activity':
      case 'activity':
        return {
          ...base,
          type: 'health_metric',
          payload: {
            steps: obj.steps,
            heartRate: obj.average_heart_rate,
            raw: obj as Record<string, unknown>,
          },
        };

      default:
        return {
          ...base,
          type: 'health_metric',
          payload: { raw: obj as Record<string, unknown> },
        };
    }
  },
};
