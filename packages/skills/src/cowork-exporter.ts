/**
 * CoworkExporter - Export skills to ~/.claude/skills/ for Claude Desktop
 * @module skills
 * Ref: Issue #61
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { SkillPack, ToolDefinition, PromptDefinition } from './skill-compiler';

export interface CoworkSkill {
  name: string;
  description: string;
  version: string;
  tools: { name: string; description: string; input_schema: Record<string, unknown> }[];
  prompts: { name: string; description: string; arguments: { name: string; description: string; required: boolean }[] }[];
  metadata: { author: string; source: string; agent: string; capabilities: string[]; exported_at: string };
}

export interface ExportConfig {
  outputDir: string;
  author: string;
  source: string;
  generateConfig: boolean;
  overwrite: boolean;
}

export class CoworkExporter {
  private config: ExportConfig;

  constructor(config: Partial<ExportConfig> = {}) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
    this.config = {
      outputDir: join(homeDir, '.claude', 'skills'),
      author: 'creative-liberation-engine',
      source: 'brainchild-v5',
      generateConfig: true,
      overwrite: false,
      ...config,
    };
  }

  exportSkill(pack: SkillPack): string {
    const coworkSkill = this.convertToCowork(pack);
    const skillDir = join(this.config.outputDir, pack.metadata.name);
    if (!existsSync(skillDir)) mkdirSync(skillDir, { recursive: true });
    const manifestPath = join(skillDir, 'manifest.json');
    if (!existsSync(manifestPath) || this.config.overwrite) {
      writeFileSync(manifestPath, JSON.stringify(coworkSkill, null, 2), 'utf-8');
    }
    const toolsDir = join(skillDir, 'tools');
    if (!existsSync(toolsDir)) mkdirSync(toolsDir, { recursive: true });
    for (const tool of coworkSkill.tools) {
      writeFileSync(join(toolsDir, `${tool.name}.json`), JSON.stringify(tool, null, 2), 'utf-8');
    }
    return skillDir;
  }

  exportAll(packs: SkillPack[]): string[] {
    const exported: string[] = [];
    for (const pack of packs) exported.push(this.exportSkill(pack));
    if (this.config.generateConfig) this.generateDesktopConfig(packs);
    return exported;
  }

  private convertToCowork(pack: SkillPack): CoworkSkill {
    return {
      name: pack.metadata.name,
      description: pack.metadata.description,
      version: pack.metadata.version,
      tools: pack.tools.map(t => ({ name: t.name, description: t.description, input_schema: t.inputSchema })),
      prompts: pack.prompts.map(p => ({ name: p.name, description: p.template.slice(0, 200), arguments: p.arguments })),
      metadata: {
        author: this.config.author, source: this.config.source,
        agent: pack.metadata.agent, capabilities: pack.metadata.capabilities,
        exported_at: new Date().toISOString(),
      },
    };
  }

  private generateDesktopConfig(packs: SkillPack[]): void {
    const configPath = join(this.config.outputDir, '..', 'claude_desktop_config.snippet.json');
    const mcpServers: Record<string, unknown> = {};
    for (const pack of packs) {
      mcpServers[`ie-${pack.metadata.name}`] = {
        command: 'npx', args: ['-y', `@creative-liberation-engine/${pack.metadata.name}`],
        env: { IE_AGENT: pack.metadata.agent, IE_VERSION: pack.metadata.version },
      };
    }
    writeFileSync(configPath, JSON.stringify({ mcpServers }, null, 2), 'utf-8');
  }
}