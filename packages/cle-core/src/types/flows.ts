/**
 * @cle/core — Genkit Flow Shared Schemas
 *
 * Shared input/output types used across genkit flows in the Creative Liberation Engine.
 * These are pure TypeScript interfaces — not Zod schemas (to avoid deps).
 *
 * Zero runtime dependencies.
 */

import type { OperationalMode, AgentId } from './agents.js';

// ─── Flow Context ─────────────────────────────────────────────────────────────

/** Shared context passed to every Genkit flow */
export interface FlowContext {
    /** Session identifier (e.g. "athena_1709876543") */
    sessionId?: string;
    /** The active operational mode */
    mode?: OperationalMode;
    /** The agent invoking this flow */
    calledBy?: AgentId;
    /** ISO timestamp when the flow was invoked */
    invokedAt?: string;
    /** Trace ID for linking spans across multi-agent chains */
    traceId?: string;
}

// ─── Base Flow I/O ─────────────────────────────────────────────────────────────

/** Minimum required input fields shared across all AVERI flows */
export interface FlowInput {
    sessionId?: string;
    context?: string;
}

/** Minimum required output fields shared across all AVERI flows */
export interface FlowOutput {
    /** Whether the flow completed successfully */
    success: boolean;
    /** Error message if success=false */
    error?: string;
    /** Agent that produced this output */
    producedBy?: AgentId;
    /** ISO timestamp */
    completedAt?: string;
}

// ─── AVERI Mode Flow Inputs ───────────────────────────────────────────────────

/** Common input for IDEATE-mode flows (strategy, creative, exploratory) */
export interface IdeateFlowInput extends FlowInput {
    topic: string;
    depth?: 'surface' | 'deep' | 'exhaustive';
    keeperContext?: string;
}

/** Common input for PLAN-mode flows (spec, architecture, deterministic) */
export interface PlanFlowInput extends FlowInput {
    topic: string;
    depth?: 'surface' | 'deep' | 'exhaustive';
    keeperContext?: string;
    athenaSpec?: string;
}

// ─── Director Flow Types (Hype Reel / Video) ──────────────────────────────────

/** A single EDL (Edit Decision List) segment */
export interface EDLSegment {
    timestamp: string;
    duration: number;
    description: string;
    cameraAngle?: string;
    transition?: string;
    music?: string;
    lyricsSnippet?: string;
}

/** Structured output of the HypeReelDirector flow */
export interface DirectorFlowOutput extends FlowOutput {
    edl: EDLSegment[];
    totalDuration: number;
    musicNotes?: string;
    productionNotes?: string;
}
