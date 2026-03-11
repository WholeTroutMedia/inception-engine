/**
 * Sandbar Stream Adapter
 *
 * Normalizes Sandbar Stream API webhook payloads into universal WearableSignals.
 * Reference: https://www.sandbar.com/innervoice (developer API, pending access)
 *
 * Until official API access is granted, this adapter handles both:
 * 1. The official webhook format (TBD — pending developer program approval)
 * 2. A simulated payload format for local testing
 */

import { v4 as uuidv4 } from 'uuid';
import type { WearableAdapter, WearableSignal } from '../types.js';

// ─── Expected Sandbar Webhook Shapes ─────────────────────────────────────────
// Based on Sandbar's public documentation and CTO notes on their pipeline.
// Will be updated once developer API access is confirmed.

interface SandbarVoiceNotePayload {
  type: 'voice_note';
  id: string;
  userId: string;
  transcript?: string;
  audioUrl?: string;
  durationMs?: number;
  capturedAt: string;
  tags?: string[];
}

interface SandbarConversationPayload {
  type: 'conversation';
  id: string;
  userId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  capturedAt: string;
}

interface SandbarExportPayload {
  type: 'export';
  id: string;
  userId: string;
  targetApp: string;
  content: string;
  capturedAt: string;
}

type SandbarPayload = SandbarVoiceNotePayload | SandbarConversationPayload | SandbarExportPayload;

// ─── Adapter ──────────────────────────────────────────────────────────────────

export const SandbarStreamAdapter: WearableAdapter = {
  source: 'sandbar_stream',
  name: 'Sandbar Stream Ring',

  async parse(raw: unknown, userId: string): Promise<WearableSignal> {
    const payload = raw as SandbarPayload;

    const base = {
      id: uuidv4(),
      source: 'sandbar_stream' as const,
      userId: payload.userId || userId,
      capturedAt: payload.capturedAt || new Date().toISOString(),
    };

    switch (payload.type) {
      case 'voice_note':
        return {
          ...base,
          type: 'voice_note',
          payload: {
            transcript: payload.transcript,
            audioUrl: payload.audioUrl,
            durationMs: payload.durationMs,
            raw: payload as unknown as Record<string, unknown>,
          },
        };

      case 'conversation': {
        const lastUserMessage = payload.messages
          .filter((m) => m.role === 'user')
          .at(-1)?.content;
        return {
          ...base,
          type: 'conversation',
          payload: {
            transcript: lastUserMessage,
            raw: payload as unknown as Record<string, unknown>,
          },
        };
      }

      case 'export':
        return {
          ...base,
          type: 'export',
          payload: {
            transcript: payload.content,
            raw: payload as unknown as Record<string, unknown>,
          },
          metadata: {
            targetApp: payload.targetApp,
          },
        };

      default:
        return {
          ...base,
          type: 'voice_note',
          payload: {
            raw: payload as Record<string, unknown>,
          },
        };
    }
  },

  validateSignature(payload: string, signature: string, secret: string): boolean {
    // TODO: Implement HMAC-SHA256 validation once Sandbar publishes webhook signing docs
    // For now, accept all during development
    void payload; void signature; void secret;
    return true;
  },
};
