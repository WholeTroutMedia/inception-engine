/**
 * A2A Agent Registry — Pre-registered AVERI Trinity + Hive Agents
 * Creative Liberation Engine v5.0.0 (GENESIS)
 *
 * Bootstraps the global A2A registry with the 42-agent AVERI collective.
 * Call `bootstrapAVERIAgents(tenantId)` at engine startup to wire up the mesh.
 */

import {
  issueAgentIdentity,
  globalA2ARegistry,
  type AgentIdentity,
  type AgentCapability,
} from './protocol.js';

export interface AVERIBootstrapConfig {
  tenantId: string;
  /** Base URLs per hive — e.g. { genkit: 'http://localhost:4100' } */
  endpoints?: Partial<Record<string, string>>;
}

const AVERI_ROSTER: Array<{
  agentId: string;
  name: string;
  hive: string;
  tier: AgentIdentity['tier'];
  capabilities: AgentCapability[];
  endpointKey?: string;
}> = [
  // ── Trinity ──────────────────────────────────────────────────────────────
  { agentId: 'athena',  name: 'ATHENA',  hive: 'TRINITY',    tier: 'trinity',    capabilities: ['orchestrate', 'research', 'validate'] },
  { agentId: 'vera',    name: 'VERA',    hive: 'TRINITY',    tier: 'trinity',    capabilities: ['validate', 'memory', 'orchestrate'] },
  { agentId: 'iris',    name: 'IRIS',    hive: 'TRINITY',    tier: 'trinity',    capabilities: ['orchestrate', 'deploy', 'generate'] },
  // ── Aurora Hive ──────────────────────────────────────────────────────────
  { agentId: 'keeper',  name: 'KEEPER',  hive: 'AURORA',     tier: 'hive',       capabilities: ['memory', 'research', 'write'] },
  { agentId: 'lex',     name: 'LEX',     hive: 'AURORA',     tier: 'hive',       capabilities: ['write', 'validate'] },
  { agentId: 'compass', name: 'COMPASS', hive: 'AURORA',     tier: 'hive',       capabilities: ['research', 'validate'] },
  // ── Switchboard Hive ─────────────────────────────────────────────────────
  { agentId: 'comet',   name: 'COMET',   hive: 'SWITCHBOARD', tier: 'hive',      capabilities: ['browse', 'research'] },
  { agentId: 'relay',   name: 'RELAY',   hive: 'SWITCHBOARD', tier: 'hive',      capabilities: ['orchestrate'] },
  { agentId: 'signal',  name: 'SIGNAL',  hive: 'SWITCHBOARD', tier: 'hive',      capabilities: ['deploy'] },
  // ── Broadcast Hive ───────────────────────────────────────────────────────
  { agentId: 'herald',  name: 'HERALD',  hive: 'BROADCAST',  tier: 'hive',       capabilities: ['write', 'generate'] },
  { agentId: 'scope',   name: 'SCOPE',   hive: 'BROADCAST',  tier: 'hive',       capabilities: ['research', 'generate'] },
  // ── Builder Hive ─────────────────────────────────────────────────────────
  { agentId: 'forge',   name: 'FORGE',   hive: 'BUILDER',    tier: 'hive',       capabilities: ['deploy', 'generate'] },
  { agentId: 'patch',   name: 'PATCH',   hive: 'BUILDER',    tier: 'hive',       capabilities: ['validate', 'deploy'] },
  { agentId: 'scaffold',name: 'SCAFFOLD',hive: 'BUILDER',    tier: 'hive',       capabilities: ['generate', 'design'] },
  // ── Enhancement Hive ─────────────────────────────────────────────────────
  { agentId: 'lens',    name: 'LENS',    hive: 'ENHANCEMENT',tier: 'hive',       capabilities: ['design', 'generate'] },
  { agentId: 'prism',   name: 'PRISM',   hive: 'ENHANCEMENT',tier: 'hive',       capabilities: ['design', 'memory'] },
  // ── Data Hive ────────────────────────────────────────────────────────────
  { agentId: 'atlas',   name: 'ATLAS',   hive: 'DATA',       tier: 'hive',       capabilities: ['research', 'memory'] },
  { agentId: 'scribe',  name: 'SCRIBE',  hive: 'DATA',       tier: 'hive',       capabilities: ['memory', 'write'] },
  { agentId: 'dira',    name: 'DIRA',    hive: 'DATA',       tier: 'specialist', capabilities: ['validate', 'research', 'orchestrate'] },
];

/**
 * Register all AVERI agents in the global A2A registry for a given tenant.
 */
export function bootstrapAVERIAgents(config: AVERIBootstrapConfig): AgentIdentity[] {
  const identities: AgentIdentity[] = [];
  for (const agent of AVERI_ROSTER) {
    const endpoint = agent.endpointKey && config.endpoints?.[agent.endpointKey]
      ? `${config.endpoints[agent.endpointKey]}/a2a/${agent.agentId}`
      : undefined;

    const identity = issueAgentIdentity({
      agentId: agent.agentId,
      name: agent.name,
      tenantId: config.tenantId,
      hive: agent.hive,
      tier: agent.tier,
      capabilities: agent.capabilities,
      endpoint,
    });
    identities.push(identity);
  }
  return identities;
}

/**
 * Look up an AVERI agent identity by ID for the given tenant.
 */
export function getAVERIAgent(agentId: string): AgentIdentity | undefined {
  return globalA2ARegistry.resolve(agentId);
}

export { globalA2ARegistry };
