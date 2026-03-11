/**
 * @inception/cowork-bridge â€” Model Router
 *
 * Routes agent requests to the appropriate model backend.
 * Supports Anthropic, Google, OpenAI, and local Ollama.
 * Reads config from .cowork/model-router.json.
 */

import type { ModelRouterConfig, ModelBackend, ModelProvider } from './types.js';

export class ModelRouter {
  private config: ModelRouterConfig;
  private backends: Map<string, ModelBackend>;

  constructor(config: ModelRouterConfig) {
    this.config = config;
    this.backends = new Map(config.backends.map(b => [b.id, b]));
  }

  /** Resolve which backend to use for a given agent + workstream */
  resolve(agentId?: string, workstream?: string): ModelBackend {
    // Agent-specific override takes priority
    if (agentId && this.config.agentOverrides[agentId]) {
      const backend = this.backends.get(this.config.agentOverrides[agentId]);
      if (backend) return backend;
    }

    // Workstream-level override
    if (workstream && this.config.workstreamOverrides[workstream]) {
      const backend = this.backends.get(this.config.workstreamOverrides[workstream]);
      if (backend) return backend;
    }

    // Default backend
    const defaultBackend = this.backends.get(this.config.defaultBackend);
    if (!defaultBackend) {
      throw new Error(`Default backend '${this.config.defaultBackend}' not found in config`);
    }
    return defaultBackend;
  }

  /** Get the API key for a backend from environment */
  getApiKey(backend: ModelBackend): string | undefined {
    if (!backend.apiKeyEnvVar) return undefined;
    return process.env[backend.apiKeyEnvVar];
  }

  /** Build the base URL for API calls */
  getBaseUrl(backend: ModelBackend): string {
    if (backend.baseUrl) return backend.baseUrl;

    switch (backend.provider) {
      case 'anthropic': return 'https://api.anthropic.com';
      case 'google': return 'https://generativelanguage.googleapis.com';
      case 'openai': return 'https://api.openai.com';
      case 'ollama': return process.env.OLLAMA_URL ?? 'http://localhost:11434';
      case 'local': return backend.baseUrl ?? 'http://localhost:8080';
    }
  }

  /** List all configured backends */
  listBackends(): ModelBackend[] {
    return Array.from(this.backends.values());
  }

  /** Add or update a backend at runtime */
  addBackend(backend: ModelBackend): void {
    this.backends.set(backend.id, backend);
    if (!this.config.backends.find(b => b.id === backend.id)) {
      this.config.backends.push(backend);
    }
  }

  /** Get current config (for serialization) */
  getConfig(): ModelRouterConfig {
    return {
      ...this.config,
      backends: Array.from(this.backends.values()),
    };
  }
}

/** Create a ModelRouter from config, with sensible defaults */
export function createModelRouter(config?: ModelRouterConfig | null): ModelRouter {
  const defaultConfig: ModelRouterConfig = {
    defaultBackend: 'claude-sonnet',
    backends: [
      {
        id: 'claude-sonnet',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKeyEnvVar: 'ANTHROPIC_API_KEY',
      },
      {
        id: 'gemini-pro',
        provider: 'google',
        model: 'gemini-2.5-pro',
        apiKeyEnvVar: 'GOOGLE_AI_KEY',
      },
      {
        id: 'local-llama',
        provider: 'ollama',
        model: 'llama3.1:70b',
        baseUrl: 'http://127.0.0.1:11434',
      },
    ],
    agentOverrides: {},
    workstreamOverrides: {},
  };

  return new ModelRouter(config ?? defaultConfig);
}