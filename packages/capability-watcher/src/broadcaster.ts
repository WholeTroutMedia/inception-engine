/**
 * capability-watcher — Broadcaster
 *
 * HTTP client that POSTs capability_update events to the Creative Liberation Engine
 * dispatch server's `/api/capabilities/broadcast` endpoint.
 */

export interface BroadcastPayload {
    changed_files: string[];
    source: 'watcher' | 'manual' | 'deploy';
}

export interface BroadcastResult {
    success: boolean;
    version?: {
        hash: string;
        timestamp: string;
        changed_files: string[];
        source: string;
    };
    error?: string;
}

export async function broadcastCapabilityUpdate(
    dispatchUrl: string,
    payload: BroadcastPayload,
): Promise<BroadcastResult> {
    const url = `${dispatchUrl}/api/capabilities/broadcast`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5_000),
        });

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}: ${await response.text()}` };
        }

        const data = (await response.json()) as BroadcastResult;
        return data;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Broadcast failed: ${message}` };
    }
}
