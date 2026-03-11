/**
 * @creative-liberation-engine/skills — Type definitions
 */

export interface Skill {
  id: string;
  name: string;
  type: 'capability' | 'tool' | 'protocol' | 'integration';
  description?: string;
  version: string;
  agent: string;
  dependencies?: string[];
}

export interface SkillManifest {
  agent: string;
  version: string;
  skills: Skill[];
  generatedAt: string;
  source: 'charter' | 'capability-profile' | 'manual';
}

export interface CharterInput {
  agentName: string;
  charterPath: string;
  content: string;
}

export interface CoworkOutput {
  fromAgent: string;
  toAgent: string;
  sharedSkills: string[];
  protocol: 'cowork-v1';
  timestamp: string;
}

export interface SkillRegistryEntry {
  skill: Skill;
  registeredAt: string;
  status: 'active' | 'deprecated' | 'experimental';
}

export interface CompileOptions {
  chartersDir: string;
  outputDir: string;
  format: 'yaml' | 'json';
  verbose?: boolean;
}