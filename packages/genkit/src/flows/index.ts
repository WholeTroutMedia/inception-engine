/**
 * @inception/genkit — Master Flows Index
 * Exports all Genkit flows for the Creative Liberation Engine
 *
 * This is the authoritative registry of all 52 active Genkit flows.
 * Import from here to get the full agent roster.
 *
 * Constitutional: Article VIII (Agent Identity) — every agent is named,
 * hived, and registered here.
 */

// ─── AVERI TRINITY ───────────────────────────────────────────────────────────
export { ATHENAFlow, AthenaInputSchema, AthenaOutputSchema } from './athena.js';
export { classifyTaskFlow } from './classify-task.js';
export { VERAFlow } from './vera.js';
export { IRISFlow } from './iris.js';
export { conversationalAveriFlow } from './conversationalAveri.js';

// ─── AURORA HIVE ─────────────────────────────────────────────────────────────
export { AURORAFlow } from './aurora.js';
export { AuroraVisualScorerFlow, AuroraVisualScorerInputSchema, AuroraVisualScorerOutputSchema } from './aurora-visual-scorer.js';
export { BOLTFlow } from './bolt.js';
export { COMETFlow } from './comet.js';

// ─── CONTINUITY ENGINE ───────────────────────────────────────────────────────
export { ContinuityEngineFlow, ContinuityIngestInputSchema, ContinuityIngestOutputSchema, ingestDirectory } from '../tools/continuity-engine.js';

// ─── KEEPER HIVE ─────────────────────────────────────────────────────────────
export { KEEPERFlow } from './keeper.js';
export { ARCHFlow, CODEXFlow } from './arch-codex.js';
export { KeeperBootFlow, keeperBootRecall, type KeeperBootResult } from '../memory/keeper-boot.js';

// ─── LEX HIVE ────────────────────────────────────────────────────────────────
export { LEXFlow, COMPASSFlow } from './lex-compass.js';

// ─── SWITCHBOARD HIVE ────────────────────────────────────────────────────────
export { RELAYFlow, SIGNALFlow, SWITCHBOARDFlow } from './relay-signal-switchboard.js';

// ─── VALIDATOR HIVE ──────────────────────────────────────────────────────────
export { SENTINELFlow, ARCHONFlow, PROOFFlow, HARBORFlow, RAMCREWFlow } from './validators.js';

// ─── BROADCAST HIVE ──────────────────────────────────────────────────────────
export { ATLASFlow, CONTROLROOMFlow, SHOWRUNNERFlow, GRAPHICSFlow, STUDIOFlow, SYSTEMSFlow } from './broadcast-hive.js';

// ─── OMNIMEDIA (V2 GOD NODE) ─────────────────────────────────────────────────
export { OmniMediaOrchestratorFlow } from './omnimedia-orchestrator.js';

// ─── MEMORY BUS ──────────────────────────────────────────────────────────────
export { memoryBus, MemoryBus, RecallMemoryFlow, CommitMemoryFlow } from './memory.js';

// ─── CREATIVE / MEDIA FLOWS (previously unregistered) ────────────────────────
export { CreativeDirectorFlow } from './creative-director.js';
export { HypeReelDirectorFlow } from './hype-reel-director.js';
export { GenMediaAssetGeneratorFlow } from './genmedia-asset-generator.js';
export { BlenderRendererFlow } from './blender-renderer.js';
export { VfxRendererFlow } from './vfx-renderer.js';

// ─── ADVISORY PERSONAS & WISDOM ──────────────────────────────────────────────
export { OracleCouncilFlow, OracleCouncilInputSchema, OracleCouncilOutputSchema } from './oracle-council.js';
export { ThreeWiseMenFlow, WiseMenInputSchema, WiseMenOutputSchema } from './three-wise-men.js';
export { SageFlow, SageInputSchema, SageOutputSchema } from './sage.js';

// ─── DISPATCH-FACING TASK EXECUTORS ──────────────────────────────────────────
export { infraDockerFlow } from './infra-docker.js';
export { cometBrowserFlow } from './comet-browser-flow.js';
export { genericTaskFlow } from './generic-task.js';
export { genkitFlowBuilder } from './genkit-flow-builder.js';
// ─── GENERATIVE UI & DESIGN INGESTION ─────────────────────────────────────────
export { genUiFlow } from './gen-ui.js';
export * from './design-ingest/index.js';

// ─── IECR CREATIVE RUNTIME ───────────────────────────────────────────────────
export { directorAgentFlow, EngineModuleSchema, SubTaskSchema, TaskGraphSchema, DirectorInputSchema, DirectorOutputSchema } from './director-agent.js';
export type { EngineModule, SubTask, TaskGraph } from './director-agent.js';
export { ieVideoFlow, ieAudioFlow, ie3dFlow, ieDesignFlow, ieCodeFlow, ieAssetsFlow } from './ie-engine-flows.js';

// ─── SWITCHBOARD V5 AGENTS ────────────────────────────────────────────────────
export { FORGEFlow, BEACONFlow, PRISMFlow, FLUXFlow } from './switchboard-v5.js';

// ─── REAL-TIME RESEARCH ─────────────────────────────────────────────────────
// webResearchFlow: any agent can call this to get live web data + citations
// detectResearchIntentFlow: intent classifier (regex fast-path + LLM fallback)
export { webResearchFlow, callPerplexity } from './web-research.js';
export type { WebResearchInput, WebResearchOutput } from './web-research.js';
export { detectResearchIntentFlow, classifyResearchIntentFast } from './research-intent.js';
export type { ResearchIntent } from './research-intent.js';

// ─── LIVE WIRE FEEDS ─────────────────────────────────────────────────────────
// wireQueryTool: search 100+ real-time feeds by topic, category, source, time
// wireLatestTool: get the newest entries across all categories
// 10 categories: news, sports, financial, science, literary, tech,
//                government, entertainment, health, business
export { wireQueryTool, wireLatestTool } from '../tools/wire-tool.js';

// ─── LORA ENHANCEMENT LAYERS ─────────────────────────────────────────────────
export { VISIONFlow, SYNTAXFlow, SIFTFlow, AUDIOFlow, SPATIALFlow } from './lora-agents.js';

// ─── INFORMAL AGENTS (NOW FORMALIZED) ────────────────────────────────────────
export { ARCHAEONFlow, GHOSTFlow, ALFREDFlow } from './informal-agents.js';

// ─── SANDBAR STREAM ───────────────────────────────────────────────────────────
export { innerVoiceFlow } from './inner-voice.js';


// ─────────────────────────────────────────────────────────────────────────────
// AGENT REGISTRY — queryable roster
// ─────────────────────────────────────────────────────────────────────────────

// Agent status types
export type AgentStatus = 'active' | 'standby' | 'planned';

export const AGENT_ROSTER = [
    // ── AVERI Trinity ──────────────────────────────────────────────────────────
    { name: 'ATHENA', hive: 'AVERI', role: 'Strategist', flow: 'ATHENA', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'VERA', hive: 'AVERI', role: 'Scribe & Memory', flow: 'VERA', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'IRIS', hive: 'AVERI', role: 'Executor', flow: 'IRIS', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },

    // ── AURORA Hive ────────────────────────────────────────────────────────────
    { name: 'AURORA', hive: 'AURORA', role: 'UX Architect', flow: 'AURORA', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'BOLT', hive: 'AURORA', role: 'Frontend Builder', flow: 'BOLT', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'COMET', hive: 'AURORA', role: 'Backend & APIs', flow: 'COMET', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'COMMERCE', hive: 'AURORA', role: 'ACO & Monetization', flow: null, model: 'gemini-2.5-pro', status: 'planned' as AgentStatus },
    { name: 'BROWSER', hive: 'AURORA', role: 'Computer Use Automation', flow: null, model: 'gemini-2.0-flash', status: 'planned' as AgentStatus },
    { name: 'AURORA_VISUAL_SCORER', hive: 'AURORA', role: 'Visual Logic Enforcer', flow: 'AuroraVisualScorer', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'CONTINUITY_ENGINE', hive: 'AURORA', role: 'Context Ingestion', flow: 'ContinuityEngine', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'DESIGN_INGEST', hive: 'AURORA', role: 'Design Pipeline Engine', flow: null, model: 'gemini-2.5-pro', status: 'active' as AgentStatus },

    // ── KEEPER Hive ────────────────────────────────────────────────────────────
    { name: 'KEEPER', hive: 'KEEPER', role: 'Knowledge Architect', flow: 'KEEPER', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'ARCH', hive: 'KEEPER', role: 'Pattern Extraction', flow: 'ARCH', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'CODEX', hive: 'KEEPER', role: 'Documentation', flow: 'CODEX', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'ECHO', hive: 'KEEPER', role: 'Trajectory Prediction', flow: null, model: 'gemini-2.5-pro', status: 'planned' as AgentStatus },

    // ── LEX Hive ───────────────────────────────────────────────────────────────
    { name: 'LEX', hive: 'LEX', role: 'Constitutional Compliance', flow: 'LEX', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'COMPASS', hive: 'LEX', role: 'Ethical North Star', flow: 'COMPASS', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },

    // ── SWITCHBOARD Hive ───────────────────────────────────────────────────────
    { name: 'RELAY', hive: 'SWITCHBOARD', role: 'Inter-agent Router', flow: 'RELAY', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'SIGNAL', hive: 'SWITCHBOARD', role: 'Integration', flow: 'SIGNAL', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'SWITCHBOARD', hive: 'SWITCHBOARD', role: 'Ops Coordinator', flow: 'SWITCHBOARD', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'RAM_CREW', hive: 'SWITCHBOARD', role: 'Data Integrity & QA', flow: 'RAM_CREW', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'FORGE', hive: 'SWITCHBOARD', role: 'Infrastructure & Docker Ops', flow: 'FORGE', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'BEACON', hive: 'SWITCHBOARD', role: 'Community & Open Source', flow: 'BEACON', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'PRISM', hive: 'SWITCHBOARD', role: 'AI Model Ops & Cost Tracking', flow: 'PRISM', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'FLUX', hive: 'SWITCHBOARD', role: 'Data Engineering & ETL', flow: 'FLUX', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'ARCHAEON', hive: 'SWITCHBOARD', role: 'Local LoRA Fine-Tuning Orchestrator', flow: 'ARCHAEON', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'GHOST', hive: 'COMPASS', role: 'Silent QA Shadow', flow: 'GHOST', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },

    // ── VALIDATOR Hive ─────────────────────────────────────────────────────────
    { name: 'SENTINEL', hive: 'VALIDATOR', role: 'Security (OWASP)', flow: 'SENTINEL', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'ARCHON', hive: 'VALIDATOR', role: 'Architecture Compliance', flow: 'ARCHON', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'PROOF', hive: 'VALIDATOR', role: 'Behavioral Correctness', flow: 'PROOF', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'HARBOR', hive: 'VALIDATOR', role: 'Test Completeness', flow: 'HARBOR', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },

    // ── BROADCAST Hive ─────────────────────────────────────────────────────────
    { name: 'ATLAS', hive: 'BROADCAST', role: 'Lead Producer', flow: 'ATLAS', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'CONTROL_ROOM', hive: 'BROADCAST', role: 'Live Ops', flow: 'CONTROL_ROOM', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'SHOWRUNNER', hive: 'BROADCAST', role: 'Production', flow: 'SHOWRUNNER', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'GRAPHICS', hive: 'BROADCAST', role: 'Graphics', flow: 'GRAPHICS', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'STUDIO', hive: 'BROADCAST', role: 'Studio Ops', flow: 'STUDIO', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'SYSTEMS', hive: 'BROADCAST', role: 'Infrastructure', flow: 'SYSTEMS', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },

    // ── OmniMedia ──────────────────────────────────────────────────────────────
    { name: 'OMNIMEDIA', hive: 'OMNIMEDIA', role: 'God Node Orchestrator', flow: 'OmniMediaOrchestrator', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },

    // ── Creative / Media ───────────────────────────────────────────────────────
    { name: 'CREATIVE_DIRECTOR', hive: 'GENMEDIA', role: 'Creative Director', flow: 'CreativeDirector', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'HYPE_REEL_DIRECTOR', hive: 'GENMEDIA', role: 'Hype Reel Director', flow: 'HypeReelDirector', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'GENMEDIA_ASSET', hive: 'GENMEDIA', role: 'Asset Generator', flow: 'GenMediaAssetGenerator', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'BLENDER', hive: 'GENMEDIA', role: '3D / Blender Renderer', flow: 'BlenderRenderer', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'VFX', hive: 'GENMEDIA', role: 'VFX Renderer', flow: 'VfxRenderer', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },

    // ── Finance Agent ──────────────────────────────────────────────────────────
    { name: 'FINANCE_AGENT', hive: 'FINANCE', role: 'Solana Vault & Trading', flow: null, model: 'gemini-2.0-flash', status: 'active' as AgentStatus },

    // ── Advisory Personas ──────────────────────────────────────────────────────
    { name: 'ORACLE_COUNCIL', hive: 'ADVISORY', role: 'Ensemble Validator', flow: 'OracleCouncil', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'THREE_WISE_MEN', hive: 'ADVISORY', role: 'Dialectic Validation Engine', flow: 'ThreeWiseMen', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'SAGE', hive: 'ADVISORY', role: 'System Healer', flow: 'Sage', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },

    // ── LoRA Enhancement Layers ────────────────────────────────────────────────
    { name: 'VISION', hive: 'LORA', role: 'Visual Intelligence Enhancement', flow: 'VISION', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'SYNTAX', hive: 'LORA', role: 'Code Intelligence Enhancement', flow: 'SYNTAX', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'SIFT', hive: 'LORA', role: 'Research Synthesis Enhancement', flow: 'SIFT', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'AUDIO', hive: 'LORA', role: 'Acoustic Intelligence Enhancement', flow: 'AUDIO', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'SPATIAL', hive: 'LORA', role: '3D/XR/Volumetric Enhancement', flow: 'SPATIAL', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },

    // ── AURORA Hive Additions ─────────────────────────────────────────────────
    { name: 'ALFRED', hive: 'AURORA', role: 'Portfolio Butler', flow: 'ALFRED', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
] as const;

export type AgentName = typeof AGENT_ROSTER[number]['name'];
export type HiveName = typeof AGENT_ROSTER[number]['hive'];

export function getAgent(name: AgentName) {
    return AGENT_ROSTER.find(a => a.name === name);
}

export function getHive(hive: HiveName) {
    return AGENT_ROSTER.filter(a => a.hive === hive);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT TELEMETRY — last-seen timestamps per agent (in-process, survives restarts via Redis)
// Call recordAgentCall() at the start of every flow to prove the agent is working.
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentActivity {
    name: AgentName;
    lastCall: string;      // ISO timestamp
    callCount: number;
    avgMs?: number;        // optional — populated if flow logs duration
}

const _agentActivity = new Map<AgentName, AgentActivity>();

export function recordAgentCall(name: AgentName, durationMs?: number): void {
    const existing = _agentActivity.get(name);
    const now = new Date().toISOString();
    if (existing) {
        existing.lastCall = now;
        existing.callCount += 1;
        if (durationMs) {
            // Rolling average
            existing.avgMs = existing.avgMs
                ? Math.round((existing.avgMs * 0.8) + (durationMs * 0.2))
                : durationMs;
        }
    } else {
        _agentActivity.set(name, { name, lastCall: now, callCount: 1, avgMs: durationMs });
    }
}

export function getAgentActivity(): AgentActivity[] {
    // Merge roster with activity — return all agents, even those never called
    return AGENT_ROSTER.map(agent => (
        _agentActivity.get(agent.name as AgentName) ??
        { name: agent.name as AgentName, lastCall: 'never', callCount: 0 }
    ));
}
export * from './continuous-loop.js';
