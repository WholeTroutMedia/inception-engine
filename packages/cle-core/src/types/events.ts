/**
 * @cle/core — System Event Types
 *
 * Event types for the Creative Liberation Engine event bus, boot/shutdown
 * lifecycle, session tracking, and memory writes.
 *
 * Zero runtime dependencies.
 *
 * Constitutional: Article II (Living Archive) — all events are
 * preserved; Article VII (Knowledge Compounding) — every execution
 * enriches the system's knowledge.
 */

import type { AgentId, OperationalMode } from './agents.js';

// ─── Boot / Shutdown Events ───────────────────────────────────────────────────

/** System boot event logged on engine startup */
export interface BootEvent {
    type: 'boot';
    system: string;
    version: string;
    /** How long boot took in milliseconds */
    bootDurationMs: number;
    /** ISO timestamp */
    ts: string;
    /** Optional metadata (env vars, feature flags, etc.) */
    meta?: Record<string, unknown>;
}

/** System shutdown event */
export interface ShutdownEvent {
    type: 'shutdown';
    system: string;
    /** Reason for shutdown */
    reason: 'clean' | 'SIGTERM' | 'SIGINT' | 'SIGUSR2' | 'crash';
    ts: string;
}

// ─── Session Events ───────────────────────────────────────────────────────────

/** Session lifecycle event */
export interface SessionEvent {
    type: 'session_start' | 'session_end' | 'session_summary';
    sessionId: string;
    /** Active operational mode when session started */
    mode?: OperationalMode;
    ts: string;
    /** Total number of agent episodes in the session */
    episodeCount?: number;
    /** Success rate 0-1 */
    successRate?: number;
    /** Agents that were active */
    agentsActive?: AgentId[];
}

// ─── Agent Episode Events ─────────────────────────────────────────────────────

/** A single agent task episode */
export interface AgentEpisodeEvent {
    type: 'episode';
    agentName: AgentId;
    task: string;
    outcome: string;
    success: boolean;
    sessionId: string;
    durationMs?: number;
    /** Reusable principle extracted by kstrigd's klogd mode */
    pattern?: string;
    tags?: string[];
    ts: string;
}

// ─── Memory Write ──────────────────────────────────────────────────────────────

/** The input shape for writing to the memory bus */
export interface MemoryWrite {
    agentName: AgentId | string;
    task: string;
    outcome: string;
    tags?: string[];
    sessionId: string;
    durationMs?: number;
    success: boolean;
}

/** A committed memory entry (after ID and timestamp are assigned) */
export interface MemoryEntry extends MemoryWrite {
    id: string;
    timestamp: string;
    /** Reusable principle extracted by klogd */
    pattern?: string;
}

// ─── Capability Hot-Reload Event ──────────────────────────────────────────────

/**
 * Broadcast by the dispatch server whenever the Engine's instruction layer
 * changes (AGENTS.md, skills, workflows). Connected IDE windows receive this
 * via the `/api/events` SSE stream and should surface a re-orient prompt.
 *
 * Source types:
 *  - 'watcher'  — capability-watcher daemon detected a file change
 *  - 'manual'   — agent or user manually triggered via POST /api/capabilities/broadcast
 *  - 'deploy'   — a Wave sprint deploy pipeline triggered the broadcast
 *  - 'boot'     — initial state set at server startup (not a real change)
 */
export interface CapabilityUpdateEvent {
    type: 'capability_update';
    /** Short hash identifier for this version of the instruction layer */
    hash: string;
    /** ISO 8601 timestamp of when the change was detected */
    timestamp: string;
    /** List of changed files relative to the workspace root */
    changed_files: string[];
    /** What triggered this broadcast */
    source: 'watcher' | 'manual' | 'deploy' | 'boot';
}

// ─── Union Event Type ──────────────────────────────────────────────────────────

/** All event types emitted by the Creative Liberation Engine */
export type CLEEvent =
    | BootEvent
    | ShutdownEvent
    | SessionEvent
    | AgentEpisodeEvent
    | CapabilityUpdateEvent;
