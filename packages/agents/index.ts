/**
 * @inception/agents — Public Package Index
 *
 * The complete agent runtime for the Creative Liberation Engine v5.
 * Import from here to access any agent, hive, or the registry.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  40+ Agents  •  7 Hives  •  6 LoRAs  •  1 Registry  •  Genkit Flows │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   import { BOLT, BoltFlow, AgentRegistry } from '@inception/agents';
 *   const result = await BOLT.run({ task: 'Build login page' });
 */

// ─── NEURAL (Base Classes) ────────────────────────────────────────────────────
export { InceptionAgent } from './neural/agent.js';
export { AgentRegistry } from './neural/registry.js';
export type {
    AgentConfig, AgentTask, AgentResult, AgentTool,
    AgentHive, AgentRole, AgentMode, AccessTier,
} from './neural/agent.js';

// ─── TOOLS ────────────────────────────────────────────────────────────────────
export {
    FILE_READ, FILE_WRITE, FILE_LIST,
    GIT_STATUS, GIT_COMMIT, GIT_PUSH,
    NPM_RUN, NPM_INSTALL,
    HTTP_GET,
    AURORA_TOOLS, KEEPER_TOOLS, LEX_TOOLS, RELAY_TOOLS,
} from './tools/index.js';

// ─── AVERI HIVE (Strategic Leadership) ───────────────────────────────────────
export {
    ATHENA, VERA, IRIS,
    AthenaFlow, VeraFlow, IrisFlow,
} from './hives/averi/index.js';

// ─── AURORA HIVE (Design & Engineering) ──────────────────────────────────────
export {
    AURORA, BOLT, COMET, BROWSER,
    AuroraFlow, BoltFlow, CometFlow, BrowserFlow,
} from './hives/aurora/index.js';

// ─── KEEPER HIVE (Knowledge, Memory & Intelligence) ──────────────────────────
export {
    KEEPER, ARCH, CODEX, ECHO, SCRIBE, COMMERCE,
    KeeperFlow, ArchFlow, CodexFlow, EchoFlow, ScribeFlow, CommerceFlow,
} from './hives/keeper/index.js';

// ─── LEX HIVE (Legal, Constitutional & QA) ───────────────────────────────────
export {
    LEX, COMPASS, PROOF, SENTINEL, HARBOR, ARCHON,
    LexFlow, CompassFlow, ProofFlow, SentinelFlow, HarborFlow, ArchonFlow,
} from './hives/lex/index.js';

// ─── SWITCHBOARD HIVE (Operations & Infrastructure) ──────────────────────────
export {
    SWITCHBOARD_AGENT, RELAY, FORGE, BEACON, PRISM, FLUX,
    SwitchboardFlow, RelayFlow, ForgeFlow, BeaconFlow, PrismFlow, FluxFlow,
} from './hives/switchboard/index.js';

// ─── BROADCAST HIVE (Media & Live Ops) ───────────────────────────────────────
export {
    ATLAS, SIGNAL, SHOWRUNNER, GRAPHICS, CONTROL_ROOM, STUDIO,
    AtlasFlow, SignalFlow, ShowrunnerFlow, GraphicsFlow, ControlRoomFlow, StudioFlow,
} from './hives/broadcast/index.js';

// ─── ENHANCEMENT HIVE (LoRA Specialists) ─────────────────────────────────────
export {
    SPATIAL, ORIGIN, VISION, AUDIO, SYNTAX, SIFT,
    SpatialFlow, OriginFlow, VisionFlow, AudioFlow, SyntaxFlow, SiftFlow,
} from './hives/enhancement/index.js';

// ─── BUILDER HIVE (Foundational Engineering) ─────────────────────────────────
export {
    NEXUS, ZERO, GENKI, CLAUDE, CHRONOS,
    NexusFlow, ZeroFlow, GenkiFlow, ClaudeFlow, ChronosFlow,
} from './hives/builder/index.js';
