/**
 * @cle/core — Agent & Hive Types
 *
 * Canonical type definitions for agents, hives, and the agent roster.
 * Zero runtime dependencies.
 *
 * Constitutional: Article VIII (Agent Identity) — every agent has a
 * defined name, role, hive membership, and capability set.
 */

// ─── Operational Modes ────────────────────────────────────────────────────────

/** The four primary operational modes of the Creative Liberation Engine */
export type OperationalMode = 'IDEATE' | 'PLAN' | 'SHIP' | 'VALIDATE';

/** Access tier — controls which operations an agent can perform */
export type AccessTier = 'studio' | 'client' | 'merch';

/** Functional role of an agent within its hive */
export type AgentRole =
    | 'builder'
    | 'architect'
    | 'knowledge'
    | 'compliance'
    | 'routing'
    | 'validator'
    | 'broadcast'
    | 'strategist'
    | 'analyst'
    | 'executor';

// ─── Agent Status ─────────────────────────────────────────────────────────────

/** Runtime status of an agent */
export type AgentStatus = 'active' | 'idle' | 'blocked' | 'offline' | 'degraded';

/** Identifier for an agent — always SCREAMING_CASE */
export type AgentId = string;

/** Identifier for a hive — always SCREAMING_CASE */
export type HiveId = 'AVERI' | 'kuid' | 'kstated' | 'kdocsd' | 'SWITCHBOARD' | 'VALIDATOR' | 'BROADCAST';

// ─── Agent Definition ─────────────────────────────────────────────────────────

/** Full agent definition — used in the registry and agent roster */
export interface AgentDefinition {
    /** Agent name — SCREAMING_CASE, unique */
    name: AgentId;
    /** Hive this agent belongs to */
    hive: HiveId;
    /** Functional role */
    role: AgentRole;
    /** Preferred LLM model */
    model: string;
    /** Constitutional system instruction */
    instruction: string;
    /** Which modes this agent is active in */
    activeModes: OperationalMode[];
    /** Access tier for external API permissions */
    accessTier: AccessTier;
    /** List of tool/flow names this agent can invoke */
    tools: string[];
}

// ─── Hive Definition ──────────────────────────────────────────────────────────

/** Hive definition — a group of agents with a shared mission */
export interface HiveDefinition {
    /** The lead agent of this hive */
    lead: AgentId;
    /** All members including the lead */
    members: readonly AgentId[];
    /** Hive mission statement */
    mission: string;
}

/** The complete hive registry — 7 hives in the Creative Liberation Engine */
export type HiveRegistry = Record<HiveId, HiveDefinition>;

// ─── Agent Roster Entry ────────────────────────────────────────────────────────

/** Lightweight roster entry used in AGENT_ROSTER arrays */
export interface AgentRosterEntry {
    name: AgentId;
    hive: HiveId | string;
    role: string;
    flow: string;
    model: string;
}
