/**
 * @cle/core — Public Package Barrel
 *
 * The Creative Liberation Engine's shared runtime foundation.
 * Exports constitutional primitives, agent types, provider types,
 * event types, and utility functions used by every other package.
 *
 * Constitutional: Article XVIII (Anti-Lock-In) — users can build on
 * and extend the engine without being locked into our proprietary layer.
 *
 * ZERO RUNTIME DEPENDENCIES — this keeps the package lightweight.
 * Types only, plus Node.js built-in utilities.
 */

// ─── Version & Constants ──────────────────────────────────────────────────────

export const CLE_VERSION = '5.0.0-genesis';

export const SACRED_MISSION = 'We are building a system that allows ALL ARTISTS to shape the future world, unencumbered by previous restrictions in ANY WAY, SHAPE, OR FORM.';

// ─── Constitution ─────────────────────────────────────────────────────────────

export const CONSTITUTION = {
    0: { name: 'Sacred Mission', immutable: true, summary: 'Artist liberation through sovereign technology' },
    1: { name: 'Separation of Powers', immutable: true, summary: 'No single agent accumulates unchecked authority' },
    2: { name: 'Living Archive', immutable: false, summary: 'All decisions preserved in the archive' },
    3: { name: 'Constitutional Compliance', immutable: true, summary: 'kdocsd enforces all articles' },
    4: { name: 'Transparency', immutable: false, summary: 'All reasoning observable' },
    5: { name: 'User Sovereignty', immutable: true, summary: 'User vision is supreme' },
    6: { name: 'Quality Gates', immutable: false, summary: 'krecd approval before SHIP' },
    7: { name: 'Knowledge Compounding', immutable: false, summary: 'Every execution contributes to knowledge' },
    8: { name: 'Agent Identity', immutable: false, summary: 'Defined identity per agent' },
    9: { name: 'Error Recovery', immutable: false, summary: 'Graceful failure always' },
    10: { name: 'Resource Stewardship', immutable: false, summary: 'No compute waste' },
    11: { name: 'Collaboration Protocol', immutable: false, summary: 'krelayd governs inter-agent comms' },
    12: { name: 'Mode Discipline', immutable: false, summary: 'IDEATE plans, SHIP codes' },
    13: { name: 'Version Control', immutable: false, summary: 'All changes tracked and reversible' },
    14: { name: 'Testing Mandate', immutable: false, summary: 'Untested code is unshipped code' },
    15: { name: 'Documentation', immutable: false, summary: 'All public interfaces documented' },
    16: { name: 'Security', immutable: false, summary: 'No secrets in code' },
    17: { name: 'Anti-Theft', immutable: true, summary: 'Never facilitate IP theft' },
    18: { name: 'Anti-Lock-In', immutable: true, summary: 'Users can always export and leave' },
    19: { name: 'Neural Architecture', immutable: true, summary: 'All 5 neural systems operational' },
} as const;

// ─── Hive Registry ────────────────────────────────────────────────────────────

export const HIVES = {
    AVERI: { lead: 'kruled', members: ['kruled', 'kstrigd', 'ksignd'] as const, mission: 'Strategic consciousness' },
    kuid: { lead: 'kuid', members: ['kuid', 'kbuildd', 'kwebd'] as const, mission: 'Design and engineering' },
    kstated: { lead: 'kstated', members: ['kstated', 'karchd', 'kcodexd'] as const, mission: 'Knowledge and patterns' },
    kdocsd: { lead: 'kdocsd', members: ['kdocsd', 'kcompd'] as const, mission: 'Constitutional compliance' },
    SWITCHBOARD: { lead: 'kswitchd', members: ['kswitchd', 'krelayd', 'ksignald'] as const, mission: 'Operations and routing' },
    VALIDATOR: { lead: 'krecd', members: ['ksecud', 'karchond', 'kproofd', 'kharbord', 'krecd'] as const, mission: 'Quality gates' },
    BROADCAST: { lead: 'katlasd', members: ['katlasd', 'kcontrolroomd', 'kshowrunnerd', 'kgraphicsd', 'kstudiod', 'ksystemsd'] as const, mission: 'Media and live ops' },
} as const;

// ─── Agent Types (from types/agents.ts) ──────────────────────────────────────

export type {
    OperationalMode,
    AccessTier,
    AgentRole,
    AgentStatus,
    AgentId,
    HiveId,
    AgentDefinition,
    HiveDefinition,
    HiveRegistry,
    AgentRosterEntry,
} from './types/agents.js';

// ─── Constitutional Types (from types/constitution.ts) ───────────────────────

export type {
    ArticleId,
    ArticleViolation,
    ConstitutionalReview,
    PreflightResult,
    ArticleDefinition,
} from './types/constitution.js';

export { IMMUTABLE_ARTICLES } from './types/constitution.js';

// ─── Flow Types (from types/flows.ts) ────────────────────────────────────────

export type {
    FlowContext,
    FlowInput,
    FlowOutput,
    IdeateFlowInput,
    PlanFlowInput,
    EDLSegment,
    DirectorFlowOutput,
} from './types/flows.js';

// ─── IECR Task Graph Types ────────────────────────────────────────────────────

export type {
    EngineModule,
    SubTask,
    SubTaskStatus,
    EngineTaskResult,
    TaskGraph,
    IECRMode,
    EngineHealth,
    EngineStatus,
    EngineDelegation,
    DirectorResult,
} from './types/task-graph.js';

export {
    ENGINE_MODULES,
    ENGINE_LABELS,
    ENGINE_ICONS,
    ENGINE_DESCRIPTIONS,
    IECR_MODES,
} from './types/task-graph.js';

export type { EngineRegistryEntry } from './types/engine-registry.js';
export { ENGINE_REGISTRY, EngineRegistry, engineRegistry } from './types/engine-registry.js';



// ─── Provider Types (from types/providers.ts) ─────────────────────────────────

export type {
    LLMProvider,
    ProviderStatus,
    ModelConfig,
    ModelAlias,
    ProviderHealth,
    ProviderHealthSnapshot,
    FallbackEntry,
    FallbackChain,
} from './types/providers.js';

// ─── Event Types (from types/events.ts) ──────────────────────────────────────

export type {
    BootEvent,
    ShutdownEvent,
    SessionEvent,
    AgentEpisodeEvent,
    MemoryWrite,
    MemoryEntry,
    CLEEvent,
} from './types/events.js';

// ─── Utilities: Result<T, E> monad (from utils/result.ts) ────────────────────

export type { Result } from './utils/result.js';
// Note: Ok and Err are both types AND constructor functions — import them
// directly from the sub-module to access both:
//   import { Ok, Err, isOk } from '@cle/core/utils/result'
// Or use the re-exported utility functions below:
export {
    isOk,
    isErr,
    unwrap,
    unwrapOr,
    map,
    mapErr,
    flatMap,
    tryResult,
    tryResultAsync,
} from './utils/result.js';
// Constructor functions (avoid naming conflict with type aliases)
export { Ok as okResult, Err as errResult } from './utils/result.js';

// ─── Utilities: Error formatting (from utils/errors.ts) ──────────────────────

export type {
    ErrorCode,
    CLEError,
    ErrorResponse,
} from './utils/errors.js';

export {
    makeError,
    formatError,
    errorMessage,
    truncate,
    toErrorResponse,
} from './utils/errors.js';

// ─── Constitutional Guard (keep in barrel for quick import) ──────────────────

/**
 * Lightweight constitutional pre-check.
 * For full enforcement, use the kdocsd Genkit flow inside the engine.
 */
export function constitutionalPreflight(task: string): { pass: boolean; flags: string[] } {
    const flags: string[] = [];
    if (/steal|scrape without permission|bypass drm|crack/i.test(task)) {
        flags.push('Art.XVII: Potential IP theft detected');
    }
    if (/hardcode.*(key|password|secret|token)/i.test(task)) {
        flags.push('Art.XVI: Hardcoded credentials detected');
    }
    return { pass: flags.length === 0, flags };
}

// ─── PSI Types (from types/psi.ts) ──────────────────────────────────────────

export type {
    DeviceCapability,
    StateMapping,
    AuraProfile
} from './types/psi.js';

// ─── Home Mesh Types (from types/home-mesh.ts) ─────────────────────────────

export * from './types/home-mesh.js';

// ─── Transmission Types (from types/transmission.ts) ──────────────────────

export type {
    ArtifactKind,
    TransmissionArtifact,
    TransmissionWorldState,
    TransmissionGenerateInput,
    TransmissionGenerateOutput,
    TransmissionReaderSignal,
} from './types/transmission.js';

export { ARTIFACT_KIND_LABELS } from './types/transmission.js';

// ─── Character Context (from types/character.ts) ──────────────────────────

export type {
    CharacterContext,
    CharacterContextUpdate,
    CharacterRegistry,
    CharacterSelectionHint,
} from './types/character.js';

// ─── Session Bracket (from types/session-bracket.ts) ─────────────────────

export type {
    StartStateType,
    EndStateType,
    BracketStartState,
    BracketEndState,
    SessionBracket,
    BracketProgressEvent,
} from './types/session-bracket.js';

// ─── Engine World State (from types/world-state.ts) ──────────────────────

export type {
    WorldStateEventType,
    WorldStateEvent,
    EngineWorldState,
    EngineWorldStatePatch,
} from './types/world-state.js';
