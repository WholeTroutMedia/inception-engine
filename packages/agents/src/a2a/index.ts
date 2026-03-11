/**
 * A2A Protocol — Public API
 * Creative Liberation Engine v5.0.0 (GENESIS)
 */

export {
  issueAgentIdentity,
  buildA2AMessage,
  dispatchA2AMessage,
  validateA2AMessage,
  globalA2ARegistry,
  A2ARegistry,
  type AgentIdentity,
  type AgentTier,
  type AgentCapability,
  type A2AMessage,
  type A2AResponse,
} from './protocol.js';

export {
  bootstrapAVERIAgents,
  getAVERIAgent,
  type AVERIBootstrapConfig,
} from './registry.js';
