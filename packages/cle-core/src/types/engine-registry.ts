/**
 * Engine Registry â€” cle-core
 * Maps each EngineModule to its Genkit flow endpoint and metadata.
 * T-IECR-009
 */

import type { EngineModule, EngineHealth, EngineStatus } from "./task-graph.js";

// â”€â”€ Registry Entry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface EngineRegistryEntry {
    module: EngineModule;
    flowName: string;
    genkitEndpoint: string;
    externalTools: string[];
    capabilities: string[];
}

// â”€â”€ Registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const GENKIT_BASE = process.env.GENKIT_API_URL ?? "http://127.0.0.1:4100";

export const ENGINE_REGISTRY: Record<EngineModule, EngineRegistryEntry> = {
    VIDEO: {
        module: "VIDEO",
        flowName: "ieVideoFlow",
        genkitEndpoint: `${GENKIT_BASE}/flows/ieVideoFlow`,
        externalTools: ["ffmpeg", "wgpu"],
        capabilities: ["trim", "composite", "color-grade", "effects", "encode", "kinetic-text"],
    },
    AUDIO: {
        module: "AUDIO",
        flowName: "ieAudioFlow",
        genkitEndpoint: `${GENKIT_BASE}/flows/ieAudioFlow`,
        externalTools: ["lyria", "sox"],
        capabilities: ["synthesize", "record", "mix", "master", "export-stems"],
    },
    "3D": {
        module: "3D",
        flowName: "ie3dFlow",
        genkitEndpoint: `${GENKIT_BASE}/flows/ie3dFlow`,
        externalTools: ["blender", "wgpu", "usd"],
        capabilities: ["pbr-render", "world-build", "animate", "glb-export", "ai-mesh"],
    },
    DESIGN: {
        module: "DESIGN",
        flowName: "ieDesignFlow",
        genkitEndpoint: `${GENKIT_BASE}/flows/ieDesignFlow`,
        externalTools: [],
        capabilities: ["brand-identity", "layout", "typography", "svg-export", "pdf"],
    },
    CODE: {
        module: "CODE",
        flowName: "ieCodeFlow",
        genkitEndpoint: `${GENKIT_BASE}/flows/ieCodeFlow`,
        externalTools: ["wgpu", "tsc"],
        capabilities: ["shader-gen", "script-gen", "compile", "test", "preset-rebuild"],
    },
    ASSETS: {
        module: "ASSETS",
        flowName: "ieAssetsFlow",
        genkitEndpoint: `${GENKIT_BASE}/flows/ieAssetsFlow`,
        externalTools: ["synology-media-mcp", "chromadb"],
        capabilities: ["semantic-search", "convert", "tag", "version", "nas-sync", "ipfs"],
    },
};

// â”€â”€ Health Tracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class EngineRegistry {
    private health: Map<EngineModule, EngineHealth> = new Map();

    constructor() {
        // Initialize all engines as online
        for (const module of Object.keys(ENGINE_REGISTRY) as EngineModule[]) {
            this.health.set(module, {
                engine: module,
                status: "online",
                invocationsToday: 0,
            });
        }
    }

    getHealth(module: EngineModule): EngineHealth {
        return this.health.get(module) ?? {
            engine: module,
            status: "offline",
            invocationsToday: 0,
        };
    }

    getAllHealth(): EngineHealth[] {
        return Array.from(this.health.values());
    }

    updateStatus(module: EngineModule, status: EngineStatus, latencyMs?: number): void {
        const current = this.health.get(module);
        if (!current) return;

        this.health.set(module, {
            ...current,
            status,
            lastInvoked: new Date(),
            invocationsToday: current.invocationsToday + 1,
            avgLatencyMs: latencyMs,
        });
    }

    getFlowEndpoint(module: EngineModule): string {
        return ENGINE_REGISTRY[module].genkitEndpoint;
    }

    async probeHealth(module: EngineModule): Promise<EngineStatus> {
        const entry = ENGINE_REGISTRY[module];
        try {
            const res = await fetch(entry.genkitEndpoint.replace("/flows/" + entry.flowName, "/health"), {
                signal: AbortSignal.timeout(2000),
            });
            const status: EngineStatus = res.ok ? "online" : "offline";
            this.updateStatus(module, status);
            return status;
        } catch {
            this.updateStatus(module, "offline");
            return "offline";
        }
    }
}

// Singleton
export const engineRegistry = new EngineRegistry();
