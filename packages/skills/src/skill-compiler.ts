/**
 * SkillCompiler — Converts agent charters (.md) to distributable YAML skill packs
 * @module skills
 * Ref: Issue #61 HELIX A
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

export interface SkillMetadata {
  name: string;
  version: string;
  agent: string;
  capabilities: string[];
  triggers: string[];
  dependencies: string[];
  description: string;
}

export interface SkillPack {
  schema_version: '1.0.0';
  metadata: SkillMetadata;
  tools: ToolDefinition[];
  prompts: PromptDefinition[];
  resources: ResourceDefinition[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: string;
}

export interface PromptDefinition {
  name: string;
  template: string;
  arguments: { name: string; description: string; required: boolean }[];
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  mimeType: string;
}

export class SkillCompiler {
  private charterPath: string;
  private outputPath: string;

  constructor(charterPath = '.averi/agents', outputPath = 'dist/skills') {
    this.charterPath = charterPath;
    this.outputPath = outputPath;
  }

  /** Parse a charter markdown file into structured sections */
  parseCharter(filePath: string): Map<string, string> {
    const content = readFileSync(filePath, 'utf-8');
    const sections = new Map<string, string>();
    let currentSection = 'preamble';
    let buffer: string[] = [];

    for (const line of content.split('\n')) {
      const heading = line.match(/^##\s+(.+)/);
      if (heading) {
        sections.set(currentSection, buffer.join('\n').trim());
        currentSection = heading[1].toLowerCase().replace(/\s+/g, '_');
        buffer = [];
      } else {
        buffer.push(line);
      }
    }
    sections.set(currentSection, buffer.join('\n').trim());
    return sections;
  }

  /** Extract capabilities from charter sections */
  extractCapabilities(sections: Map<string, string>): string[] {
    const caps: string[] = [];
    const capSection = sections.get('capabilities') || sections.get('tools') || '';
    for (const line of capSection.split('\n')) {
      const match = line.match(/^[-*]\s+\*\*(.+?)\*\*/);
      if (match) caps.push(match[1].toLowerCase().replace(/\s+/g, '-'));
    }
    return caps;
  }

  /** Extract triggers from charter */
  extractTriggers(sections: Map<string, string>): string[] {
    const triggers: string[] = [];
    const trigSection = sections.get('triggers') || sections.get('activation') || '';
    for (const line of trigSection.split('\n')) {
      const match = line.match(/^[-*]\s+(.+)/);
      if (match) triggers.push(match[1].trim());
    }
    return triggers;
  }

  /** Compile a single charter into a SkillPack */
  compileCharter(filePath: string): SkillPack {
    const sections = this.parseCharter(filePath);
    const agentName = basename(filePath, '.md').toUpperCase();
    const preamble = sections.get('preamble') || '';
    const nameMatch = preamble.match(/agent:\s*(.+)/i);

    return {
      schema_version: '1.0.0',
      metadata: {
        name: `skill-${agentName.toLowerCase()}`,
        version: '1.0.0',
        agent: agentName,
        capabilities: this.extractCapabilities(sections),
        triggers: this.extractTriggers(sections),
        dependencies: [],
        description: nameMatch?.[1] || `Skill pack for ${agentName}`,
      },
      tools: this.extractTools(sections),
      prompts: this.extractPrompts(sections),
      resources: [],
    };
  }

  /** Extract tool definitions from charter */
  private extractTools(sections: Map<string, string>): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    const toolSection = sections.get('tools') || sections.get('capabilities') || '';
    for (const line of toolSection.split('\n')) {
      const match = line.match(/^[-*]\s+\*\*(.+?)\*\*[:\s]*(.*)/);
      if (match) {
        tools.push({
          name: match[1].toLowerCase().replace(/\s+/g, '_'),
          description: match[2].trim() || match[1],
          inputSchema: { type: 'object', properties: {} },
          handler: `handlers/${match[1].toLowerCase().replace(/\s+/g, '-')}`,
        });
      }
    }
    return tools;
  }

  /** Extract prompt templates from charter */
  private extractPrompts(sections: Map<string, string>): PromptDefinition[] {
    const prompts: PromptDefinition[] = [];
    const promptSection = sections.get('prompts') || sections.get('system_prompt') || '';
    if (promptSection) {
      prompts.push({
        name: 'system',
        template: promptSection.slice(0, 500),
        arguments: [],
      });
    }
    return prompts;
  }

  /** Compile all charters in the charter directory */
  compileAll(): SkillPack[] {
    if (!existsSync(this.charterPath)) {
      throw new Error(`Charter path not found: ${this.charterPath}`);
    }
    const files = readdirSync(this.charterPath).filter((f: string) => f.endsWith('.md'));
    const packs: SkillPack[] = [];

    for (const file of files) {
      const pack = this.compileCharter(join(this.charterPath, file));
      packs.push(pack);
    }
    return packs;
  }

  /** Write compiled skill packs to YAML files */
  writeSkillPacks(packs: SkillPack[]): string[] {
    if (!existsSync(this.outputPath)) {
      mkdirSync(this.outputPath, { recursive: true });
    }
    const written: string[] = [];
    for (const pack of packs) {
      const outFile = join(this.outputPath, `${pack.metadata.name}.yaml`);
      const yaml = this.toYaml(pack);
      writeFileSync(outFile, yaml, 'utf-8');
      written.push(outFile);
    }
    return written;
  }

  /** Simple YAML serializer (no external deps) */
  private toYaml(obj: unknown, indent = 0): string {
    const pad = ' '.repeat(indent);
    if (obj === null || obj === undefined) return `${pad}null\n`;
    if (typeof obj === 'string') return obj.includes('\n') ? `|\n${obj.split('\n').map(l => `${pad}  ${l}`).join('\n')}\n` : `${pad}${obj}\n`;
    if (typeof obj === 'number' || typeof obj === 'boolean') return `${pad}${obj}\n`;
    if (Array.isArray(obj)) return obj.map(item => `${pad}- ${typeof item === 'object' ? '\n' + this.toYaml(item, indent + 2) : item}`).join('\n') + '\n';
    if (typeof obj === 'object') {
      return Object.entries(obj as Record<string, unknown>)
        .map(([k, v]) => {
          if (typeof v === 'object' && v !== null) return `${pad}${k}:\n${this.toYaml(v, indent + 2)}`;
          return `${pad}${k}: ${typeof v === 'string' && v.includes('\n') ? '|\n' + v.split('\n').map(l => `${pad}  ${l}`).join('\n') : v}`;
        }).join('\n') + '\n';
    }
    return `${pad}${String(obj)}\n`;
  }

  /** Compile charter content string into a SkillPack — convenience alias for mcp-server usage */

  compile(content: string, agentName: string): SkillPack {
    const sections = this.parseContent(content);
    return {
      schema_version: '1.0.0',
      metadata: {
        name: `skill-${agentName.toLowerCase()}`,
        version: '1.0.0',
        agent: agentName.toUpperCase(),
        capabilities: this.extractCapabilities(sections),
        triggers: this.extractTriggers(sections),
        dependencies: [],
        description: `Skill pack for ${agentName}`,
      },
      tools: this.extractTools(sections),
      prompts: this.extractPrompts(sections),
      resources: [],
    };
  }

  /** Parse charter content from string (used by compile()) */
  private parseContent(content: string): Map<string, string> {
    const sections = new Map<string, string>();
    let currentSection = 'preamble';
    let buffer: string[] = [];
    for (const line of content.split('\n')) {
      const heading = line.match(/^##\s+(.+)/);
      if (heading) {
        sections.set(currentSection, buffer.join('\n').trim());
        currentSection = heading[1].toLowerCase().replace(/\s+/g, '_');
        buffer = [];
      } else {
        buffer.push(line);
      }
    }
    sections.set(currentSection, buffer.join('\n').trim());
    return sections;
  }
}