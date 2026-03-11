/**
 * @inception/cowork-bridge â€” Config Loader
 *
 * Reads .cowork/config.json, agent-ownership.json, and model-router.json
 * from the workspace root. Validates with Zod schemas.
 */

import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { CoworkConfigSchema, type CoworkConfig, type ModelRouterConfig, type AgentOwnershipConfig, type BridgeState } from './types.js';

const DISPATCH_URL = process.env.DISPATCH_URL ?? 'http://127.0.0.1:5050';

export async function loadCoworkConfig(workspaceRoot: string): Promise<CoworkConfig | null> {
  const configPath = join(workspaceRoot, '.cowork', 'config.json');
  try {
    const raw = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return CoworkConfigSchema.parse(parsed);
  } catch (err) {
    console.warn(`[cowork-bridge] No .cowork/config.json found at ${configPath}`);
    return null;
  }
}

export async function loadModelRouterConfig(workspaceRoot: string): Promise<ModelRouterConfig | null> {
  const configPath = join(workspaceRoot, '.cowork', 'model-router.json');
  try {
    const raw = await readFile(configPath, 'utf-8');
    return JSON.parse(raw) as ModelRouterConfig;
  } catch {
    // Return default single-backend config
    return {
      defaultBackend: 'claude-sonnet',
      backends: [
        {
          id: 'claude-sonnet',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          apiKeyEnvVar: 'ANTHROPIC_API_KEY',
        },
      ],
      agentOverrides: {},
      workstreamOverrides: {},
    };
  }
}

export async function loadOwnershipConfig(workspaceRoot: string): Promise<AgentOwnershipConfig | null> {
  const configPath = join(workspaceRoot, '.cowork', 'agent-ownership.json');
  try {
    const raw = await readFile(configPath, 'utf-8');
    return JSON.parse(raw) as AgentOwnershipConfig;
  } catch {
    // Return permissive default
    return {
      agents: [],
      defaultPolicy: {
        maxConcurrentTasks: 1,
        allowAllWorkstreams: true,
        allowAllTools: true,
      },
    };
  }
}

export async function initBridge(workspaceRoot: string): Promise<BridgeState> {
  const absRoot = resolve(workspaceRoot);
  const [config, modelRouter, ownership] = await Promise.all([
    loadCoworkConfig(absRoot),
    loadModelRouterConfig(absRoot),
    loadOwnershipConfig(absRoot),
  ]);

  const contextMdPath = config?.context?.files?.[0]
    ? join(absRoot, config.context.files[0])
    : null;

  return {
    config,
    modelRouter,
    ownership,
    dispatchUrl: DISPATCH_URL,
    contextMdPath,
    initialized: true,
  };
}