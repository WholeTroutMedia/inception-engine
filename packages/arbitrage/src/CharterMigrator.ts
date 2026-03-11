/**
 * CharterMigrator — Strips hardcoded models from agent charters
 *
 * HELIX K: Charter Migration Engine (Phase D)
 * References #69
 *
 * Scans all 40 agent charters in .averi/agents/*.md, detects hardcoded
 * model strings (gemini-2.5-pro, gemini-2.0-flash, etc.), and replaces
 * them with capability profiles that the ArbitrageRouter resolves at runtime.
 *
 * Also updates agent-status.json to version 5.1.0 with capability_schema_version.
 */

import { z } from 'zod';

// ── Capability Profile ────────────────────────────────────────────

export const CapabilityProfileSchema = z.object({
  reasoning: z.enum(['frontier', 'standard', 'fast']),
  speed: z.enum(['realtime', 'standard', 'batch']),
  context: z.enum(['large', 'medium', 'small']),
  modality: z.array(z.enum(['text', 'code', 'vision', 'audio', 'multimodal'])),
  privacy: z.enum(['local_only', 'cloud_ok', 'sovereign']),
  budget: z.enum(['premium', 'standard', 'economy']),
});
export type CapabilityProfile = z.infer<typeof CapabilityProfileSchema>;

// ── Known Model Patterns ─────────────────────────────────────────

const HARDCODED_MODEL_PATTERNS = [
  /gemini-[\d.]+-pro(-\w+)?/g,
  /gemini-[\d.]+-flash(-\w+)?/g,
  /gemini-[\d.]+-ultra/g,
  /claude-[\d.]+-\w+/g,
  /gpt-[\d.]+-\w+/g,
  /o[13]-\w+/g,
  /llama-[\d.]+-\w+/g,
  /mistral-\w+/g,
  /command-r-?\w*/g,
];

// ── Agent-to-Profile Mapping ─────────────────────────────────────

const DEFAULT_PROFILES: Record<string, CapabilityProfile> = {
  director: { reasoning: 'frontier', speed: 'standard', context: 'large', modality: ['text', 'code'], privacy: 'cloud_ok', budget: 'premium' },
  scribe: { reasoning: 'standard', speed: 'standard', context: 'large', modality: ['text'], privacy: 'cloud_ok', budget: 'standard' },
  dispatch: { reasoning: 'fast', speed: 'realtime', context: 'small', modality: ['text'], privacy: 'cloud_ok', budget: 'economy' },
  keeper: { reasoning: 'standard', speed: 'standard', context: 'large', modality: ['text'], privacy: 'sovereign', budget: 'standard' },
  sentinel: { reasoning: 'frontier', speed: 'standard', context: 'large', modality: ['text', 'code'], privacy: 'local_only', budget: 'premium' },
  arbitrage: { reasoning: 'frontier', speed: 'realtime', context: 'medium', modality: ['text'], privacy: 'cloud_ok', budget: 'economy' },
};

const FALLBACK_PROFILE: CapabilityProfile = {
  reasoning: 'standard', speed: 'standard', context: 'medium',
  modality: ['text'], privacy: 'cloud_ok', budget: 'standard',
};

// ── Migration Report ──────────────────────────────────────────────

export interface MigrationResult {
  agentId: string;
  filePath: string;
  modelsFound: string[];
  profileAssigned: CapabilityProfile;
  charterUpdated: string;
  status: 'migrated' | 'clean' | 'error';
}

// ── Charter Migrator ──────────────────────────────────────────────

export class CharterMigrator {
  private results: MigrationResult[] = [];

  /** Scan a single charter for hardcoded model strings */
  detectModels(charterContent: string): string[] {
    const found: string[] = [];
    for (const pattern of HARDCODED_MODEL_PATTERNS) {
      const matches = charterContent.match(new RegExp(pattern));
      if (matches) found.push(...matches);
    }
    return [...new Set(found)];
  }

  /** Migrate a single charter: strip models, inject capability profile */
  migrate(agentId: string, filePath: string, content: string): MigrationResult {
    const modelsFound = this.detectModels(content);

    if (modelsFound.length === 0) {
      const result: MigrationResult = {
        agentId, filePath, modelsFound: [], profileAssigned: FALLBACK_PROFILE,
        charterUpdated: content, status: 'clean',
      };
      this.results.push(result);
      return result;
    }

    const profile = DEFAULT_PROFILES[agentId] || FALLBACK_PROFILE;
    let updated = content;

    // Strip all hardcoded model references
    for (const pattern of HARDCODED_MODEL_PATTERNS) {
      updated = updated.replace(new RegExp(pattern), '{{arbitrage:resolve}}');
    }

    // Inject capability profile YAML block
    const profileBlock = [
      '',
      '## Model Requirements (Capability Profile)',
      '```yaml',
      `reasoning: ${profile.reasoning}`,
      `speed: ${profile.speed}`,
      `context: ${profile.context}`,
      `modality: [${profile.modality.join(', ')}]`,
      `privacy: ${profile.privacy}`,
      `budget: ${profile.budget}`,
      '```',
      '',
      '> Model selection is handled by the ArbitrageRouter at runtime.',
      '> Do NOT hardcode model names in this charter.',
      '',
    ].join('\n');

    // Insert profile block after first heading
    const firstHeadingEnd = updated.indexOf('\n', updated.indexOf('#'));
    if (firstHeadingEnd > 0) {
      updated = updated.slice(0, firstHeadingEnd + 1) + profileBlock + updated.slice(firstHeadingEnd + 1);
    }

    const result: MigrationResult = {
      agentId, filePath, modelsFound, profileAssigned: profile,
      charterUpdated: updated, status: 'migrated',
    };
    this.results.push(result);
    return result;
  }

  /** Batch migrate all charters */
  migrateAll(charters: Map<string, { path: string; content: string }>): MigrationResult[] {
    for (const [agentId, { path, content }] of charters) {
      this.migrate(agentId, path, content);
    }
    return this.results;
  }

  /** Generate migration summary report */
  report(): { total: number; migrated: number; clean: number; errors: number; models: string[] } {
    const migrated = this.results.filter(r => r.status === 'migrated');
    const allModels = migrated.flatMap(r => r.modelsFound);
    return {
      total: this.results.length,
      migrated: migrated.length,
      clean: this.results.filter(r => r.status === 'clean').length,
      errors: this.results.filter(r => r.status === 'error').length,
      models: [...new Set(allModels)],
    };
  }

  /** Generate updated agent-status.json */
  generateAgentStatus(): object {
    return {
      capability_schema_version: '1.0.0',
      engine: 'Creative Liberation Engine',
      version: '5.1.0',
      codename: 'GENESIS',
      model_routing: 'arbitrage',
      agents: Object.fromEntries(
        this.results.map(r => [
          r.agentId,
          {
            status: r.status === 'migrated' ? 'capability_profile' : r.status,
            profile: r.profileAssigned,
            legacy_models_removed: r.modelsFound,
          },
        ]),
      ),
    };
  }

  getResults(): readonly MigrationResult[] {
    return Object.freeze([...this.results]);
  }
}