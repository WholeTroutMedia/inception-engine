/**
 * @inception/inception-browser — Barrel Export
 *
 * Sovereign Playwright-native browser MCP server for the Creative Liberation Engine.
 * Constitutional tools for navigation, interaction, extraction, and intelligence.
 * Persistent SQLite sessions. VERA governance. AI vision + action planning.
 */

// ─── Core Engine ────────────────────────────────────────────────────────────
import { BrowserEngine } from './browser/engine.js';
import { SessionManager } from './browser/session.js';

export { BrowserEngine, BrowserEngine as BrowserCore } from './browser/engine.js';
export { SessionManager } from './browser/session.js';
export { getSession, listSessionRecords, deleteSession, logAction, queryHistory } from './memory/session-store.js';

// Instances
export const engine = new BrowserEngine();
export const session = new SessionManager();

// ─── Browser Layer ──────────────────────────────────────────────────────────
export { StealthProfile, generateStealthProfile, applyStealthPatches } from './browser/stealth.js';
export { SessionRecorder as BrowserRecorder } from './browser/recorder.js';

export { navigationTools, handleNavigationTool } from './tools/navigation.js';
export { interactionTools, handleInteractionTool } from './tools/interaction.js';
export { extractionTools, handleExtractionTool } from './tools/extraction.js';
export { governanceTools, handleGovernanceTool } from './tools/governance.js';
export { sessionTools, handleSessionTool } from './tools/sessions.js';
export { tabTools, handleTabTool } from './tools/tabs.js';
export { formTools, handleFormTool } from './tools/forms.js';
export { fileTools, handleFileTool } from './tools/files.js';
export { networkTools, handleNetworkTool } from './tools/network.js';
export { evaluateTools, handleEvaluateTool } from './tools/evaluate.js';
export { intelligenceTools, handleIntelligenceTool } from './tools/intelligence.js';
export { terminalTools, handleTerminalTool } from './tools/terminal.js';

// ─── Intelligence Layer ──────────────────────────────────────────────────────
export { DomAnalyzer } from './intelligence/dom-analyzer.js';
export { ActionPlanner } from './intelligence/action-planner.js';
export { ElementRanker } from './intelligence/element-ranker.js';
export { HybridPerception } from './intelligence/hybrid-perception.js';
export { VisionModel } from './intelligence/vision-model.js';

// ─── Memory Layer ────────────────────────────────────────────────────────────
export type { SessionRecord, ActionRecord as SessionLog } from './memory/session-store.js';
export { PatternLearner } from './memory/pattern-learner.js';
export type { Pattern, PatternStep } from './memory/pattern-learner.js';
export { VeraBridge, veraBridge } from './memory/vera-bridge.js';
export type { VeraMemoryEntry } from './memory/vera-bridge.js';

// ─── Orchestration ───────────────────────────────────────────────────────────
export { AgentRouter, router } from './orchestration/agent-router.js';
export type { RouteRequest, RouteResult } from './orchestration/agent-router.js';
export { BrowserPool, pool } from './orchestration/pool.js';
export type { PoolInstance } from './orchestration/pool.js';

// ─── Governance ──────────────────────────────────────────────────────────────
export { ConstitutionalGovernance, governance } from './governance/constitutional.js';
export type { GovernanceRule, GovernanceResult, BrowserAction } from './governance/constitutional.js';

// ─── Browser Mesh (CDP + Node Registry) ─────────────────────────────────────
export { cdpManager } from './cdp/cdp-manager.js';
export type { BrowserNode, TabRecord, BrowserType, NodeMode, NodeStatus } from './cdp/cdp-manager.js';
export { nodeRegistry } from './cdp/node-registry.js';
export { cdpTools, handleCdpTool } from './tools/cdp.js';
export { startDispatchHeartbeat } from './dispatch-heartbeat.js';
