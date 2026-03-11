import express from 'express';
import { ProtocolGateway } from './gateway.js';

/**
 * @inception/mcp-router — Public API
 * MCP-01: Package index — all exports
 */

export * from './types.js';
export { routeTask, classifyDomains, getServersForDomain } from './router.js';
export { MCPServerRegistry, mcpRegistry } from './registry.js';
export { MCPLifecycleManager, mcpLifecycle } from './lifecycle.js';
export { mcpAutoloadMiddleware, activateForDomains } from './middleware.js';
export { AlloyDBMCPRegistry } from './alloydb-registry.js';
export { initMCPDynamicLoader } from './dynamic-loader.js';
export type { DynamicLoaderOptions, LoaderResult } from './dynamic-loader.js';
export { activateMCPRouter } from './activate.js';

// Helix-C: COMET Fetch Proxy (resolves P0 browser API restriction)
export { executeFetchProxy, fetchProxyTool, FetchProxyRequestSchema } from './fetch-proxy.js';
export type { FetchProxyRequest, FetchProxyResponse } from './fetch-proxy.js';

// Helix-D: Multi-Tenant Router (Phase 1B — Cloud Run tenant isolation)
export {
  InMemoryTenantRegistry,
  setTenantRegistry, getTenantRegistry,
  resolveTenantService, extractTenantId,
  buildTenantHeaders, registerTenant, deriveServiceName,
} from './tenant-router.js';
export type { TenantConfig, TenantRouteResult, TenantRegistry } from './tenant-router.js';

// Helix-A: Multi-Tenant Cloud Run Provisioner (Phase 1A — T20260308-470)
export { CloudRunProvisioner, cloudRunProvisioner, CloudRunServiceSpecSchema } from './cloud-run-provisioner.js';
export type { CloudRunServiceSpec, CloudRunServiceRecord } from './cloud-run-provisioner.js';

// Helix-C: Gitea Web Editor Race Condition Fix (T20260308-758)
export { GiteaFileGuard, giteaGuard, createGiteaFileGuard, ConflictError } from './gitea-race-fix.js';
export type { GiteaFileGuardOptions, UpdateFileParams } from './gitea-race-fix.js';

// Wave 4 Helix-A: Creative DNA Vectors (T20260308-696)
export {
  buildCreativeDNA, diffCreativeDNA, findSimilarCreators,
  cosineSimilarity, dimensionsToVector, deriveDominantStyle,
} from './creative-dna.js';
export type {
  CreativeDNA, CreativeDNADimensions, CreativeDNADiff, StyleEmbedding,
  ColorPaletteStyle, SubjectPreference, MoodSignature, TechnicalStyle, CompositionPattern,
} from './creative-dna.js';

// Wave 4 Helix-B: A2A Protocol (T20260308-506)
export { A2AClient, A2AServer, A2AError, ALFRED_AGENT_CARD, INCEPTION_ORCHESTRATOR_CARD, A2A_ERRORS } from './a2a-protocol.js';
export type {
  A2AAgentCard, A2AAgentSkill, A2AAgentCapabilities,
  A2ATask, A2ATaskState, A2ATaskStatus, A2AMessage, A2APart,
  A2ATextPart, A2AFilePart, A2ADataPart, A2AArtifact, A2AStreamEvent,
  A2AJsonRpcRequest, A2AJsonRpcResponse, A2ATaskHandler, A2AServerOptions, A2AClientOptions,
} from './a2a-protocol.js';

// Wave 29 Helix-C: Protocol Gateway (T20260309-101)
export { ProtocolGateway };

// Wave 29 Helix-D: Design Ingestion Pipeline - Mobbin API (T20260309-787)
export { extractMobbinPattern } from './mobbin-api.js';
export type { MobbinExtractionOptions, HelixDescriptor } from './mobbin-api.js';

