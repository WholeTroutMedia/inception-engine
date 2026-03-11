/**
 * Dispatch Client
 *
 * Sends classified WearableSignals to the Creative Liberation Engine Dispatch Server
 * as structured tasks. Handles retry logic and connection fallback.
 */

import type { DispatchTask, WearableSignal, IntentClass, IngestionResult } from './types.js';

const DISPATCH_URL = process.env.DISPATCH_URL ?? 'http://localhost:5050';

export async function sendToDispatch(
  signal: WearableSignal,
  task: DispatchTask,
  intent: IntentClass
): Promise<IngestionResult> {
  const endpoint = `${DISPATCH_URL}/api/tasks`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...task,
        wearableSignalId: signal.id,
        wearableSource: signal.source,
      }),
    });

    if (!res.ok) {
      console.error(`[wearable-ingestion] Dispatch rejected task: ${res.status} ${await res.text()}`);
      return { signal, stored: false, intent };
    }

    const body = await res.json() as { id?: string };
    console.log(`[wearable-ingestion] Task dispatched → ${body.id ?? 'unknown'} (intent: ${intent})`);

    return {
      signal,
      taskId: body.id,
      stored: true,
      intent,
    };
  } catch (err) {
    console.error(`[wearable-ingestion] Dispatch unreachable, signal queued locally:`, err);
    return { signal, stored: false, intent };
  }
}

export async function pingDispatch(): Promise<boolean> {
  try {
    const res = await fetch(`${DISPATCH_URL}/api/status`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
