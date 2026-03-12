/**
 * Task Graph — cle-core runtime types
 * Canonical type definitions for the IECR Director Agent pipeline.
 * These types are shared across all packages and the console UI.
 * T-IECR-008
 */

// ── Engine Modules ────────────────────────────────────────────────

export type EngineModule = "VIDEO" | "AUDIO" | "3D" | "DESIGN" | "CODE" | "ASSETS";

export const ENGINE_MODULES: readonly EngineModule[] = [
    "VIDEO", "AUDIO", "3D", "DESIGN", "CODE", "ASSETS",
] as const;

export const ENGINE_LABELS: Record<EngineModule, string> = {
    VIDEO: "IE Video",
    AUDIO: "IE Audio",
    "3D": "IE 3D",
    DESIGN: "IE Design",
    CODE: "IE Code",
    ASSETS: "IE Assets",
};

export const ENGINE_ICONS: Record<EngineModule, string> = {
    VIDEO: "◧",
    AUDIO: "◉",
    "3D": "⬡",
    DESIGN: "◈",
    CODE: "⬢",
    ASSETS: "◎",
};

export const ENGINE_DESCRIPTIONS: Record<EngineModule, string> = {
    VIDEO: "Agent-operated NLE — compositing, color, effects via WGSL shaders",
    AUDIO: "Full synthesis, recording, and mastering — node-based audio graph",
    "3D": "Real-time PBR engine with USD/glTF and built-in world builder",
    DESIGN: "Infinite canvas for print and web — integrated typography and layout",
    CODE: "Generates shaders, scripts, and runtime tools on demand",
    ASSETS: "Universal asset management with semantic search via NAS + IPFS",
};

// ── SubTask ───────────────────────────────────────────────────────

export interface SubTask {
    id: string;
    engine: EngineModule;
    intent: string;
    inputs: string[];
    outputs: string[];
    priority: number;
    status?: SubTaskStatus;
    result?: EngineTaskResult;
}

export type SubTaskStatus = "pending" | "queued" | "running" | "complete" | "failed";

export interface EngineTaskResult {
    assetId: string;
    type: string;
    description: string;
    path?: string;
}

// ── TaskGraph ─────────────────────────────────────────────────────

export interface TaskGraph {
    sessionId: string;
    sourcePrompt: string;
    tasks: SubTask[];
    estimatedDurationMs?: number;
    enginesRequired: EngineModule[];
    createdAt?: Date;
    completedAt?: Date;
}

// ── Operating Modes ───────────────────────────────────────────────

export type IECRMode = "CANVAS" | "CONSOLE" | "GRAPH";

export const IECR_MODES: Record<IECRMode, { label: string; description: string; icon: string }> = {
    CANVAS: {
        label: "The Canvas",
        description: "Spatial workspace — projects live as visual objects",
        icon: "◈",
    },
    CONSOLE: {
        label: "The Console",
        description: "Natural language command surface — voice or text",
        icon: "○",
    },
    GRAPH: {
        label: "The Graph",
        description: "Node-based master pipeline — direct engine manipulation",
        icon: "⬡",
    },
};

// ── Engine Health ─────────────────────────────────────────────────

export type EngineStatus = "online" | "busy" | "offline" | "initializing";

export interface EngineHealth {
    engine: EngineModule;
    status: EngineStatus;
    lastInvoked?: Date;
    invocationsToday: number;
    avgLatencyMs?: number;
    queueDepth?: number;
}

// ── Director Delegation ───────────────────────────────────────────

export interface EngineDelegation {
    engine: EngineModule;
    taskId: string;
    flowEndpoint: string;
}

export interface DirectorResult {
    taskGraph: TaskGraph;
    summary: string;
    engineDelegations: EngineDelegation[];
}
