/**
 * SkillEngine — Agent Skills Library + Cowork-compatible YAML distribution
 *
 * HELIX J: Agent Skills Library (Phase C)
 * Closes #61
 *
 * Components:
 *   SkillCompiler  — converts .averi/agents/*.md charters to YAML skill packs
 *   SkillRegistry  — versioned skill catalog with dependency resolution
 *   SkillLoader    — runtime skill loading with hot-reload support
 *   CoworkExporter — exports skills to ~/.claude/skills/ format
 */

import { z } from 'zod';

// ── Skill Schema ──────────────────────────────────────────────────

export const SkillMetadataSchema = z.object({
  name: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  agent: z.string(),
  description: z.string(),
  triggers: z.array(z.string()),
  dependencies: z.array(z.string()).default([]),
  capabilities: z.array(z.string()),
  classification: z.enum(['class1', 'class2', 'class3']).default('class1'),
  tags: z.array(z.string()).default([]),
});
export type SkillMetadata = z.infer<typeof SkillMetadataSchema>;

export const SkillPackSchema = z.object({
  metadata: SkillMetadataSchema,
  instructions: z.string(),
  examples: z.array(z.object({
    input: z.string(),
    output: z.string(),
  })).default([]),
  constraints: z.array(z.string()).default([]),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    inputSchema: z.record(z.string(), z.unknown()).optional(),
  })).default([]),
});
export type SkillPack = z.infer<typeof SkillPackSchema>;

// ── Skill Compiler ────────────────────────────────────────────────

export class SkillCompiler {
  /**
   * Parse an agent charter markdown file into a SkillPack.
   * Extracts YAML frontmatter + structured sections.
   */
  compile(charterMarkdown: string, agentId: string): SkillPack {
    const sections = this.parseSections(charterMarkdown);
    const metadata: SkillMetadata = {
      name: sections.title || agentId,
      version: '1.0.0',
      agent: agentId,
      description: sections.purpose || '',
      triggers: this.extractList(sections.triggers || ''),
      dependencies: this.extractList(sections.dependencies || ''),
      capabilities: this.extractList(sections.capabilities || ''),
      classification: 'class1',
      tags: [agentId],
    };

    return {
      metadata: SkillMetadataSchema.parse(metadata),
      instructions: sections.instructions || sections.purpose || '',
      examples: [],
      constraints: this.extractList(sections.constraints || ''),
      tools: [],
    };
  }

  /** Batch-compile all 36 agent charters from .averi/agents/ */
  compileAll(charters: Map<string, string>): SkillPack[] {
    return Array.from(charters.entries()).map(([id, md]) => this.compile(md, id));
  }

  /** Serialize a SkillPack to YAML-compatible object */
  toYAML(pack: SkillPack): string {
    const lines: string[] = [
      `name: ${pack.metadata.name}`,
      `version: ${pack.metadata.version}`,
      `agent: ${pack.metadata.agent}`,
      `description: ${pack.metadata.description}`,
      `classification: ${pack.metadata.classification}`,
      `triggers:`,
      ...pack.metadata.triggers.map(t => `  - ${t}`),
      `capabilities:`,
      ...pack.metadata.capabilities.map(c => `  - ${c}`),
      `dependencies:`,
      ...pack.metadata.dependencies.map(d => `  - ${d}`),
      `instructions: |`,
      ...pack.instructions.split('\n').map(l => `  ${l}`),
    ];
    if (pack.constraints.length > 0) {
      lines.push(`constraints:`);
      pack.constraints.forEach(c => lines.push(`  - ${c}`));
    }
    return lines.join('\n');
  }

  private parseSections(md: string): Record<string, string> {
    const sections: Record<string, string> = {};
    let currentKey = 'title';
    const lines = md.split('\n');
    for (const line of lines) {
      const heading = line.match(/^#{1,3}\s+(.+)/);
      if (heading) {
        currentKey = heading[1].toLowerCase().replace(/[^a-z0-9]/g, '_');
        sections[currentKey] = '';
      } else {
        sections[currentKey] = (sections[currentKey] || '') + line + '\n';
      }
    }
    return sections;
  }

  private extractList(text: string): string[] {
    return text.split('\n')
      .map(l => l.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean);
  }
}

// ── Skill Registry ────────────────────────────────────────────────

export class SkillRegistry {
  private skills = new Map<string, Map<string, SkillPack>>();

  register(pack: SkillPack): void {
    const key = pack.metadata.name;
    if (!this.skills.has(key)) this.skills.set(key, new Map());
    this.skills.get(key)!.set(pack.metadata.version, pack);
  }

  get(name: string, version?: string): SkillPack | undefined {
    const versions = this.skills.get(name);
    if (!versions) return undefined;
    if (version) return versions.get(version);
    // Return latest version
    const sorted = Array.from(versions.keys()).sort().reverse();
    return sorted.length > 0 ? versions.get(sorted[0]) : undefined;
  }

  list(): SkillMetadata[] {
    const all: SkillMetadata[] = [];
    for (const versions of this.skills.values()) {
      for (const pack of versions.values()) {
        all.push(pack.metadata);
      }
    }
    return all;
  }

  /** Resolve dependency tree for a skill */
  resolveDependencies(name: string): SkillPack[] {
    const resolved: SkillPack[] = [];
    const visited = new Set<string>();
    const resolve = (n: string) => {
      if (visited.has(n)) return;
      visited.add(n);
      const pack = this.get(n);
      if (!pack) throw new Error(`Skill not found: ${n}`);
      for (const dep of pack.metadata.dependencies) {
        resolve(dep);
      }
      resolved.push(pack);
    };
    resolve(name);
    return resolved;
  }

  /** Search skills by tag or capability */
  search(query: string): SkillPack[] {
    const results: SkillPack[] = [];
    const q = query.toLowerCase();
    for (const versions of this.skills.values()) {
      for (const pack of versions.values()) {
        const match = pack.metadata.tags.some(t => t.includes(q))
          || pack.metadata.capabilities.some(c => c.includes(q))
          || pack.metadata.name.includes(q);
        if (match) results.push(pack);
      }
    }
    return results;
  }
}

// ── Skill Loader ──────────────────────────────────────────────────

export class SkillLoader {
  private loaded = new Map<string, SkillPack>();
  private watchers = new Map<string, () => void>();

  constructor(private registry: SkillRegistry) {}

  load(name: string): SkillPack {
    const deps = this.registry.resolveDependencies(name);
    for (const dep of deps) {
      this.loaded.set(dep.metadata.name, dep);
    }
    return deps[deps.length - 1];
  }

  unload(name: string): void {
    this.loaded.delete(name);
    this.watchers.get(name)?.();
    this.watchers.delete(name);
  }

  reload(name: string): SkillPack {
    this.unload(name);
    return this.load(name);
  }

  getLoaded(): SkillPack[] {
    return Array.from(this.loaded.values());
  }

  /** Register a hot-reload callback */
  onReload(name: string, callback: () => void): void {
    this.watchers.set(name, callback);
  }
}

// ── Cowork Exporter ───────────────────────────────────────────────

export class CoworkExporter {
  private compiler = new SkillCompiler();

  /**
   * Export a SkillPack to Claude Desktop / Cowork compatible format.
   * Output goes to ~/.claude/skills/{agent-name}.yaml
   */
  exportForCowork(pack: SkillPack): { path: string; content: string } {
    const filename = pack.metadata.agent
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    return {
      path: `.claude/skills/${filename}.yaml`,
      content: this.compiler.toYAML(pack),
    };
  }

  /** Export all skills as a claude_desktop_config.json snippet */
  exportConfigJson(packs: SkillPack[]): object {
    return {
      skills: packs.map(p => ({
        name: p.metadata.name,
        version: p.metadata.version,
        path: `.claude/skills/${p.metadata.agent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.yaml`,
        triggers: p.metadata.triggers,
      })),
    };
  }

  /** Batch export all registered skills */
  exportAll(registry: SkillRegistry): Array<{ path: string; content: string }> {
    return registry.list()
      .map(meta => registry.get(meta.name)!)
      .map(pack => this.exportForCowork(pack));
  }
}