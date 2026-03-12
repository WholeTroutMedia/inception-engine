/**
 * @cle/genkit — Master Flows Index
 * Exports all Genkit flows for the Creative Liberation Engine
 *
 * This is the authoritative registry of all 52 active Genkit flows.
 * Import from here to get the full agent roster.
 *
 * Constitutional: Article VIII (Agent Identity) — every agent is named,
 * hived, and registered here.
 */

// ─── TTY TRINITY ─────────────────────────────────────────────────────────────
export { VT100Flow, Vt100InputSchema, Vt100OutputSchema } from './vt100.js';
export { classifyTaskFlow } from './classify-task.js';
export { VT220Flow } from './vt220.js';
export { XTERMFlow } from './xterm.js';
export { conversationalVt100Flow } from './conversationalVt100.js';

// ─── kuid HIVE ─────────────────────────────────────────────────────────────
export { AURORAFlow } from './aurora.js';
export { AuroraVisualScorerFlow, AuroraVisualScorerInputSchema, AuroraVisualScorerOutputSchema } from './aurora-visual-scorer.js';
export { BOLTFlow } from './bolt.js';
export { kwebdFlow } from './comet.js';

// ─── CONTINUITY ENGINE ───────────────────────────────────────────────────────
export { ContinuityEngineFlow, ContinuityIngestInputSchema, ContinuityIngestOutputSchema, ingestDirectory } from '../tools/continuity-engine.js';

// ─── kstated HIVE ─────────────────────────────────────────────────────────────
export { kkeeperdFlow } from './keeper.js';
export { karchdFlow, kcodexdFlow } from './arch-codex.js';
export { KeeperBootFlow, keeperBootRecall } from '../memory/kstated-boot.js';
export type { KeeperBootResult } from '../memory/kstated-boot.js';

// ─── kdocsd HIVE ────────────────────────────────────────────────────────────────
export { kdocsdFlow, kcompdFlow } from './kdocsd-compass.js';

// ─── SWITCHBOARD HIVE ────────────────────────────────────────────────────────
export { krelaydFlow, ksignaldFlow, kswitchdFlow } from './relay-signal-switchboard.js';

// ─── VALIDATOR HIVE ──────────────────────────────────────────────────────────
export { ksecudFlow, karchondFlow, kproofdFlow, kharbordFlow, krecdFlow } from './validators.js';

// ─── BROADCAST HIVE ──────────────────────────────────────────────────────────
export { katlasdFlow, kcontrolroomdFlow, kshowrunnerdFlow, kgraphicsdFlow, kstudiodFlow, ksystemsdFlow } from './broadcast-hive.js';

// ─── OMNIMEDIA (V2 GOD NODE) ─────────────────────────────────────────────────
export { kgenmediaFlow } from './omnimedia-orchestrator.js';

// ─── MEMORY BUS ──────────────────────────────────────────────────────────────
export { memoryBus, RecallMemoryFlow, CommitMemoryFlow } from './memory.js';
export type { MemoryBus } from './memory.js';

// ─── CREATIVE / MEDIA FLOWS (previously unregistered) ────────────────────────
export { kcrdFlow } from './creative-director.js';
export { khrdFlow } from './hype-reel-director.js';
export { GenMediaAssetGeneratorFlow } from './genmedia-asset-generator.js';
export { BlenderRendererFlow } from './blender-renderer.js';
export { VfxRendererFlow } from './vfx-renderer.js';

// ─── ADVISORY PERSONAS & WISDOM ──────────────────────────────────────────────
export { OracleCouncilFlow, OracleCouncilInputSchema, OracleCouncilOutputSchema } from './oracle-council.js';
export { ThreeWiseMenFlow, WiseMenInputSchema, WiseMenOutputSchema } from './three-wise-men.js';
export { SageFlow, SageInputSchema, SageOutputSchema } from './sage.js';

// ─── DISPATCH-FACING TASK EXECUTORS ──────────────────────────────────────────
export { infraDockerFlow } from './infra-docker.js';
export { kwebdBrowserFlow } from './comet-browser-flow.js';
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
    // ── TTY Trinity ───────────────────────────────────────────────────────────
    { name: 'vt100', hive: 'TTY', role: 'Strategist', flow: 'vt100', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'vt220', hive: 'TTY', role: 'Memory & Truth', flow: 'vt220', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'xterm', hive: 'TTY', role: 'Executor', flow: 'xterm', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },

    // ── kuid Hive ────────────────────────────────────────────────────────────
    { name: 'kuid', hive: 'kuid', role: 'UX Architect', flow: 'kuid', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kbuildd', hive: 'kuid', role: 'Frontend Builder', flow: 'kbuildd', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kwebd', hive: 'kuid', role: 'Backend & APIs', flow: 'kwebd', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'COMMERCE', hive: 'kuid', role: 'ACO & Monetization', flow: null, model: 'gemini-2.5-pro', status: 'planned' as AgentStatus },
    { name: 'BROWSER', hive: 'kuid', role: 'Computer Use Automation', flow: null, model: 'gemini-2.0-flash', status: 'planned' as AgentStatus },
    { name: 'AURORA_VISUAL_SCORER', hive: 'kuid', role: 'Visual Logic Enforcer', flow: 'AuroraVisualScorer', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'CONTINUITY_ENGINE', hive: 'kuid', role: 'Context Ingestion', flow: 'ContinuityEngine', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'DESIGN_INGEST', hive: 'kuid', role: 'Design Pipeline Engine', flow: null, model: 'gemini-2.5-pro', status: 'active' as AgentStatus },

    // ── kstated Hive ────────────────────────────────────────────────────────────
    { name: 'kstated', hive: 'kstated', role: 'Knowledge Architect', flow: 'kstated', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'karchd', hive: 'kstated', role: 'Pattern Extraction', flow: 'karchd', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kcodexd', hive: 'kstated', role: 'Documentation', flow: 'kcodexd', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'ECHO', hive: 'kstated', role: 'Trajectory Prediction', flow: null, model: 'gemini-2.5-pro', status: 'planned' as AgentStatus },

    // ── kdocsd Hive ───────────────────────────────────────────────────────────────
    { name: 'kdocsd', hive: 'kdocsd', role: 'Constitutional Compliance', flow: 'kdocsd', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'kcompd', hive: 'kdocsd', role: 'Ethical North Star', flow: 'kcompd', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },

    // ── SWITCHBOARD Hive ───────────────────────────────────────────────────────
    { name: 'krelayd', hive: 'SWITCHBOARD', role: 'Inter-agent Router', flow: 'krelayd', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'ksignald', hive: 'SWITCHBOARD', role: 'Integration', flow: 'ksignald', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'kswitchd', hive: 'SWITCHBOARD', role: 'Ops Coordinator', flow: 'kswitchd', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'krecd', hive: 'SWITCHBOARD', role: 'Data Integrity & QA', flow: 'krecd', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kforged', hive: 'SWITCHBOARD', role: 'Infrastructure & Docker Ops', flow: 'kforged', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'kbeacond', hive: 'SWITCHBOARD', role: 'Community & Open Source', flow: 'kbeacond', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'kexecd', hive: 'SWITCHBOARD', role: 'AI Model Ops & Cost Tracking', flow: 'kexecd', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'kfluxd', hive: 'SWITCHBOARD', role: 'Data Engineering & ETL', flow: 'kfluxd', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'klorad', hive: 'SWITCHBOARD', role: 'Local LoRA Fine-Tuning Orchestrator', flow: 'klorad', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'kghostd', hive: 'kcompd', role: 'Silent QA Shadow', flow: 'kghostd', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },

    // ── VALIDATOR Hive ─────────────────────────────────────────────────────────
    { name: 'ksecud', hive: 'VALIDATOR', role: 'Security (OWASP)', flow: 'ksecud', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'karchond', hive: 'VALIDATOR', role: 'Architecture Compliance', flow: 'karchond', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kproofd', hive: 'VALIDATOR', role: 'Behavioral Correctness', flow: 'kproofd', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kharbord', hive: 'VALIDATOR', role: 'Test Completeness', flow: 'kharbord', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },

    // ── BROADCAST Hive ─────────────────────────────────────────────────────────
    { name: 'katlasd', hive: 'BROADCAST', role: 'Lead Producer', flow: 'katlasd', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kcontrolroomd', hive: 'BROADCAST', role: 'Live Ops', flow: 'kcontrolroomd', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'kshowrunnerd', hive: 'BROADCAST', role: 'Production', flow: 'kshowrunnerd', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'kgraphicsd', hive: 'BROADCAST', role: 'Graphics', flow: 'kgraphicsd', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kstudiod', hive: 'BROADCAST', role: 'Studio Ops', flow: 'kstudiod', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
    { name: 'ksystemsd', hive: 'BROADCAST', role: 'Infrastructure', flow: 'ksystemsd', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },

    // ── OmniMedia ──────────────────────────────────────────────────────────────
    { name: 'kgenmedia', hive: 'OMNIMEDIA', role: 'God Node Orchestrator', flow: 'kgenmedia', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },

    // ── Creative / Media ───────────────────────────────────────────────────────
    { name: 'kcrd', hive: 'GENMEDIA', role: 'Creative Director', flow: 'kcrd', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'khrd', hive: 'GENMEDIA', role: 'Hype Reel Director', flow: 'khrd', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kasset', hive: 'GENMEDIA', role: 'Asset Generator', flow: 'kasset', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'k3d', hive: 'GENMEDIA', role: '3D Renderer', flow: 'k3d', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kvfx', hive: 'GENMEDIA', role: 'VFX Renderer', flow: 'kvfx', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },

    // ── Finance Agent ──────────────────────────────────────────────────────────
    { name: 'FINANCE_AGENT', hive: 'FINANCE', role: 'Solana kstored & Trading', flow: null, model: 'gemini-2.0-flash', status: 'active' as AgentStatus },

    // ── Advisory Personas ──────────────────────────────────────────────────────
    { name: 'koracle', hive: 'ADVISORY', role: 'Ensemble Validator', flow: 'koracle', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kwise', hive: 'ADVISORY', role: 'Dialectic Validation Engine', flow: 'kwise', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'ksage', hive: 'ADVISORY', role: 'System Healer', flow: 'ksage', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },

    // ── LoRA Enhancement Layers ────────────────────────────────────────────────
    { name: 'kvisiond', hive: 'LORA', role: 'Visual Intelligence Enhancement', flow: 'kvisiond', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'ksyntaxd', hive: 'LORA', role: 'Code Intelligence Enhancement', flow: 'ksyntaxd', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'ksiftd', hive: 'LORA', role: 'Research Synthesis Enhancement', flow: 'ksiftd', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kaudiod', hive: 'LORA', role: 'Acoustic Intelligence Enhancement', flow: 'kaudiod', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },
    { name: 'kspatiald', hive: 'LORA', role: '3D/XR/Volumetric Enhancement', flow: 'kspatiald', model: 'gemini-2.5-pro', status: 'active' as AgentStatus },

    // ── kuid Hive Additions ─────────────────────────────────────────────────
    { name: 'kalfredd', hive: 'kuid', role: 'Portfolio Butler', flow: 'kalfredd', model: 'gemini-2.0-flash', status: 'active' as AgentStatus },
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
