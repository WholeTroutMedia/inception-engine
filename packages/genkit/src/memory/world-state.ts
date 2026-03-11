/**
 * World State Manager — Helix H: Living World State
 *
 * The living nervous system of the Creative Liberation Engine.
 * Every significant generative event writes to it. Every flow reads from it.
 * The compounding creative intelligence that makes each generation smarter.
 *
 * Storage: @inception/memory bus (ChromaDB + memoryBus) for semantic recall,
 * plus a lightweight in-process cache for fast synchronous reads.
 *
 * Constitutional: Article VII (Knowledge Compounding) — every execution
 * contributes to the shared context of the engine.
 */

import type {
    EngineWorldState,
    WorldStateEvent,
    WorldStateEventType,
} from '@inception/core';
import { memoryBus } from '@inception/memory';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATE_AGENT = 'WORLD_STATE';
const RECALL_TAG  = 'world-state-snapshot';
const TAG_WINDOW  = 10; // Events used for dominantIntent computation

// ── Default world state factory ───────────────────────────────────────────────

function createDefaultWorldState(): EngineWorldState {
    const now = new Date().toISOString();
    return {
        epoch:               0,
        startedAt:           now,
        lastUpdated:         now,
        dominantIntent:      'creative-liberation-engine',
        sessionCount:        0,
        generationCount:     0,
        critiqueRetryCount:  0,
        averageIFS:          70,
        activeCharacters:    [],
        recentEvents:        [],
        transmission:        null,
    };
}

// ── Tag frequency → dominantIntent ───────────────────────────────────────────

function computeDominantIntent(events: WorldStateEvent[]): string {
    const recent = events.slice(0, TAG_WINDOW).flatMap((e) => e.tags);
    const freq: Record<string, number> = {};
    for (const tag of recent) freq[tag] = (freq[tag] ?? 0) + 1;
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? 'creative-liberation-engine';
}

// ── WorldStateManager ─────────────────────────────────────────────────────────

export class WorldStateManager {
    /** In-process cache — primary read path for hot paths. */
    private cache: EngineWorldState | null = null;

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Get the current world state.
     * Returns in-memory cache if warm; falls back to memoryBus recall; then default.
     */
    async get(): Promise<EngineWorldState> {
        if (this.cache) return this.cache;

        try {
            const results = await memoryBus.recall({
                query: 'world state engine snapshot',
                agentName: STATE_AGENT,
                limit: 1,
                successOnly: true,
            });

            const latest = results[0];
            if (latest?.outcome) {
                const parsed = JSON.parse(latest.outcome) as EngineWorldState;
                this.cache = parsed;
                return parsed;
            }
        } catch (err) {
            console.warn('[WorldState] memoryBus recall failed, using default:', (err as Error).message);
        }

        const defaultState = createDefaultWorldState();
        this.cache = defaultState;
        return defaultState;
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Commit a WorldStateEvent — mutates epoch, counters, dominantIntent.
     * Persists the full state snapshot via memoryBus for cross-session recall.
     */
    async commit(event: WorldStateEvent): Promise<EngineWorldState> {
        const current = await this.get();

        const recentEvents = [event, ...current.recentEvents].slice(0, 20);

        const updated: EngineWorldState = {
            ...current,
            epoch:      current.epoch + 1,
            lastUpdated: event.at,
            dominantIntent: computeDominantIntent(recentEvents),
            recentEvents,
            sessionCount:       event.type === 'session_open'    ? current.sessionCount + 1       : current.sessionCount,
            generationCount:    event.type === 'generation'      ? current.generationCount + 1    : current.generationCount,
            critiqueRetryCount: event.type === 'critique_retry'  ? current.critiqueRetryCount + 1 : current.critiqueRetryCount,
        };

        // Update in-process cache immediately
        this.cache = updated;

        // Persist snapshot to memoryBus (fire and forget — never block the call stack)
        memoryBus.commit({
            agentName: STATE_AGENT,
            task:      `[WORLD_STATE] epoch=${updated.epoch} | ${event.type}`,
            outcome:   JSON.stringify(updated),
            tags:      [RECALL_TAG, event.type, ...event.tags.slice(0, 5)],
            sessionId: event.sessionId ?? `world_${updated.epoch}`,
            success:   true,
        }).catch((err: Error) => {
            console.warn('[WorldState] memoryBus persist failed (non-critical):', err.message);
        });

        console.log(`[WorldState] epoch=${updated.epoch} dominantIntent="${updated.dominantIntent}" event=${event.type}`);
        return updated;
    }

    // ── IFS rolling average ───────────────────────────────────────────────────

    /**
     * Record an IFS score. Uses exponential moving average (α=0.1).
     * Non-blocking — world state is updated in cache only; full commit not required.
     */
    async recordIFSScore(score: number): Promise<void> {
        if (!this.cache) await this.get();
        if (!this.cache) return;

        const alpha = 0.1;
        this.cache.averageIFS = Math.round(alpha * score + (1 - alpha) * this.cache.averageIFS);

        // Emit a lightweight generation event
        await this.emit(
            score < 65 ? 'ifs_fail' : 'generation',
            `IFS score: ${score}`,
            ['ifs', score < 65 ? 'ifs-fail' : 'ifs-pass'],
        );
    }

    // ── Convenience emit ──────────────────────────────────────────────────────

    /**
     * Fire-and-forget world state event for flows that don't need the updated state.
     */
    async emit(
        type: WorldStateEventType,
        summary: string,
        tags: string[],
        sessionId?: string,
    ): Promise<void> {
        await this.commit({
            type,
            summary,
            tags,
            at: new Date().toISOString(),
            sessionId,
        });
    }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const worldState = new WorldStateManager();
