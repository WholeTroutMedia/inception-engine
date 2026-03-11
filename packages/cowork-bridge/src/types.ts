// Cowork Bridge — Type Definitions
// Maps Claude Cowork protocol to IE dispatch primitives

import { z } from 'zod';

// .cowork/config.json schema (Claude Cowork protocol)
export const CoworkConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  mcpServers: z.record(z.string(), z.object({
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional(),
    url: z.string().optional(),
  })).optional(),
  context: z.object({
    files: z.array(z.string()).optional(),
    instructions: z.string().optional(),
  }).optional(),
  agents: z.record(z.string(), z.object({
    model: z.string().optional(),
    role: z.string().optional(),
    tools: z.array(z.string()).optional(),
    context: z.object({
      files: z.array(z.string()).optional(),
      instructions: z.string().optional(),
    }).optional(),
  })).optional(),
});

export type CoworkConfig = z.infer<typeof CoworkConfigSchema>;

// Model routing configuration
export interface ModelBackend {
  id: string;                    // e.g. 'claude-sonnet', 'gemini-pro', 'gpt-4o', 'local-llama'
  provider: ModelProvider;
  model: string;                 // provider-specific model ID
  apiKeyEnvVar?: string;         // env var name for API key
  baseUrl?: string;              // for local/custom endpoints
  maxTokens?: number;
  temperature?: number;
}

export type ModelProvider = 'anthropic' | 'google' | 'openai' | 'ollama' | 'local';

export interface ModelRouterConfig {
  defaultBackend: string;        // ModelBackend.id
  backends: ModelBackend[];
  agentOverrides: Record<string, string>;  // agent_id -> ModelBackend.id
  workstreamOverrides: Record<string, string>;  // workstream -> ModelBackend.id
}

// Agent ownership boundary enforcement
export interface AgentOwnership {
  agent_id: string;
  tool: string;                  // matches AgentTool from dispatch
  allowedWorkstreams: string[];  // workstreams this agent can claim tasks from
  allowedTools: string[];        // MCP tools this agent can invoke
  deniedTools: string[];         // MCP tools explicitly blocked
  maxConcurrentTasks: number;
  constitutionalOverrides: string[];  // articles that modify default behavior
}

export interface AgentOwnershipConfig {
  agents: AgentOwnership[];
  defaultPolicy: {
    maxConcurrentTasks: number;
    allowAllWorkstreams: boolean;
    allowAllTools: boolean;
  };
}

// Bridge runtime state
export interface BridgeState {
  config: CoworkConfig | null;
  modelRouter: ModelRouterConfig | null;
  ownership: AgentOwnershipConfig | null;
  dispatchUrl: string;
  contextMdPath: string | null;
  initialized: boolean;
}