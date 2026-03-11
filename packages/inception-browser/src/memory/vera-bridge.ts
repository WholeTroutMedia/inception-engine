/**
 * VERA Bridge — Syncs browser learnings to VERA's memory system.
 * Fire-and-forget POST to Genkit server /memory/write endpoint.
 */

const GENKIT_URL = process.env.GENKIT_URL ?? "http://localhost:4100";
const VERA_ENDPOINTS = [`${GENKIT_URL}/memory/write`];

export interface VeraMemoryEntry {
    type: "episodic" | "semantic" | "pattern";
    source: "inception-browser";
    content: string;
    url?: string;
    agentId?: string;
    tags?: string[];
    timestamp: string;
}

export class VeraBridge {
    /** Fire-and-forget: sync a memory entry to VERA. Never blocks tool execution. */
    sync(entry: Omit<VeraMemoryEntry, "source" | "timestamp">): void {
        const payload: VeraMemoryEntry = {
            ...entry,
            source: "inception-browser",
            timestamp: new Date().toISOString(),
        };

        void this.trySend(payload);
    }

    private async trySend(payload: VeraMemoryEntry): Promise<void> {
        for (const endpoint of VERA_ENDPOINTS) {
            try {
                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(5000),
                });
                if (res.ok) return;
            } catch { /* try next endpoint */ }
        }
        // Silent failure — VERA memory loss is non-critical
    }
}

// Singleton
export const veraBridge = new VeraBridge();
