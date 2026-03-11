/**
 * KEEPER — Session State & Context Manager
 *
 * Maintains active session context across the agent hive lifecycle.
 * Tracks current mode, active agents, task state, and injects relevant
 * memory context from SCRIBE before each planning cycle.
 *
 * KEEPER is the conductor — it knows the current score at all times.
 *
 * Hive: LEADERSHIP | Constitutional Access: false
 * Mode compatibility: IDEATE, PLAN, SHIP, VALIDATE
 */

import type { AgentDefinition } from '../types.js';

export const KEEPER: AgentDefinition = {
    id: 'KEEPER',
    name: 'KEEPER',
    description: 'Session state — active context tracking, mode management, memory injection for AVERI',
    hive: 'LEADERSHIP',
    modes: ['IDEATE', 'PLAN', 'SHIP', 'VALIDATE'],
    constitutionalAccess: false,
};

// ─── KEEPER Types ─────────────────────────────────────────────────────────────

export type OperationalMode = 'IDEATE' | 'PLAN' | 'SHIP' | 'VALIDATE';

export interface SessionContext {
    sessionId: string;
    mode: OperationalMode;
    activeAgents: string[];
    currentTask: string | null;
    currentWorkstream: string | null;
    contextTokens: string[];
    priorMemorySnippets: string[];
    startTime: string;
    lastUpdated: string;
}

// ─── In-Memory Session Store ──────────────────────────────────────────────────

const sessions = new Map<string, SessionContext>();

export const KeeperState = {
    /**
     * Create or resume a session.
     */
    open(sessionId: string, mode: OperationalMode = 'PLAN'): SessionContext {
        if (sessions.has(sessionId)) {
            return sessions.get(sessionId)!;
        }
        const ctx: SessionContext = {
            sessionId,
            mode,
            activeAgents: [],
            currentTask: null,
            currentWorkstream: null,
            contextTokens: [],
            priorMemorySnippets: [],
            startTime: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        };
        sessions.set(sessionId, ctx);
        console.log(`[KEEPER] Session opened: ${sessionId} — Mode: ${mode}`);
        return ctx;
    },

    /**
     * Update session mode (IDEATE → PLAN → SHIP → VALIDATE).
     */
    setMode(sessionId: string, mode: OperationalMode): void {
        const ctx = sessions.get(sessionId);
        if (!ctx) return;
        console.log(`[KEEPER] ${sessionId}: ${ctx.mode} → ${mode}`);
        ctx.mode = mode;
        ctx.lastUpdated = new Date().toISOString();
    },

    /**
     * Register an agent as active in the current session.
     */
    activateAgent(sessionId: string, agentId: string): void {
        const ctx = sessions.get(sessionId);
        if (!ctx) return;
        if (!ctx.activeAgents.includes(agentId)) {
            ctx.activeAgents.push(agentId);
            ctx.lastUpdated = new Date().toISOString();
        }
    },

    /**
     * Set the current task being worked on.
     */
    setTask(sessionId: string, taskId: string | null, workstream: string | null = null): void {
        const ctx = sessions.get(sessionId);
        if (!ctx) return;
        ctx.currentTask = taskId;
        ctx.currentWorkstream = workstream;
        ctx.lastUpdated = new Date().toISOString();
        if (taskId) console.log(`[KEEPER] ${sessionId}: Task claimed → ${taskId} (${workstream ?? 'unspecified'})`);
    },

    /**
     * Inject memory snippets from SCRIBE into the active session context.
     */
    injectMemory(sessionId: string, snippets: string[]): void {
        const ctx = sessions.get(sessionId);
        if (!ctx) return;
        ctx.priorMemorySnippets = [...ctx.priorMemorySnippets, ...snippets].slice(-20);
        ctx.lastUpdated = new Date().toISOString();
    },

    /**
     * Retrieve current session context (for ATHENA/IRIS planning input).
     */
    get(sessionId: string): SessionContext | null {
        return sessions.get(sessionId) ?? null;
    },

    /**
     * Close a session and clear its state.
     */
    close(sessionId: string): void {
        sessions.delete(sessionId);
        console.log(`[KEEPER] Session closed: ${sessionId}`);
    },

    /** All active session IDs */
    activeSessions(): string[] {
        return [...sessions.keys()];
    },

    /** Total session count */
    count(): number {
        return sessions.size;
    },
};
