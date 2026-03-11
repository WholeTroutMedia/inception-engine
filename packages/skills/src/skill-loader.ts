/**
 * SkillLoader — Runtime skill loading with hot-reload support
 * @module skills
 * Ref: Issue #61 HELIX A
 */
import { existsSync, readFileSync, watchFile, unwatchFile, readdirSync } from 'fs';
import { join } from 'path';
import type { SkillPack } from './skill-compiler';
import { SkillRegistry } from './skill-registry';

export interface LoaderConfig {
  skillsDir: string;
  hotReload: boolean;
  watchInterval: number;
  onLoad?: (pack: SkillPack) => void;
  onUnload?: (name: string) => void;
  onError?: (error: Error) => void;
}

export interface LoadedSkill {
  pack: SkillPack;
  loadedAt: string;
  filePath: string;
  active: boolean;
}

export class SkillLoader {
  private config: LoaderConfig;
  private registry: SkillRegistry;
  private loaded: Map<string, LoadedSkill> = new Map();
  private watchers: Map<string, boolean> = new Map();

  constructor(registry: SkillRegistry, config: Partial<LoaderConfig> = {}) {
    this.registry = registry;
    this.config = {
      skillsDir: 'dist/skills',
      hotReload: true,
      watchInterval: 2000,
      ...config,
    };
  }

  /** Load all skill packs from the skills directory */
  loadAll(): LoadedSkill[] {
    if (!existsSync(this.config.skillsDir)) {
      throw new Error(`Skills directory not found: ${this.config.skillsDir}`);
    }

    const files = readdirSync(this.config.skillsDir)
      .filter((f: string) => f.endsWith('.yaml') || f.endsWith('.json'));

    const results: LoadedSkill[] = [];
    for (const file of files) {
      try {
        const loaded = this.loadSkill(join(this.config.skillsDir, file));
        results.push(loaded);
      } catch (error) {
        this.config.onError?.(error as Error);
      }
    }
    return results;
  }

  /** Load a single skill pack from file */
  loadSkill(filePath: string): LoadedSkill {
    if (!existsSync(filePath)) {
      throw new Error(`Skill file not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    const pack = this.parseSkillFile(content, filePath);

    // Register with registry
    this.registry.register(pack);

    const loaded: LoadedSkill = {
      pack,
      loadedAt: new Date().toISOString(),
      filePath,
      active: true,
    };

    this.loaded.set(pack.metadata.name, loaded);
    this.config.onLoad?.(pack);

    // Enable hot-reload watching
    if (this.config.hotReload) {
      this.watchSkill(filePath, pack.metadata.name);
    }

    return loaded;
  }

  /** Unload a skill by name */
  unload(name: string): boolean {
    const loaded = this.loaded.get(name);
    if (!loaded) return false;

    loaded.active = false;
    this.stopWatching(loaded.filePath);
    this.registry.unregister(name);
    this.loaded.delete(name);
    this.config.onUnload?.(name);
    return true;
  }

  /** Reload a specific skill */
  reload(name: string): LoadedSkill | null {
    const existing = this.loaded.get(name);
    if (!existing) return null;

    this.unload(name);
    return this.loadSkill(existing.filePath);
  }

  /** Get all currently loaded skills */
  getLoaded(): LoadedSkill[] {
    return Array.from(this.loaded.values());
  }

  /** Get a specific loaded skill */
  get(name: string): LoadedSkill | undefined {
    return this.loaded.get(name);
  }

  /** Stop all file watchers */
  stopAll(): void {
    for (const [filePath] of this.watchers) {
      this.stopWatching(filePath);
    }
    this.watchers.clear();
  }

  /** Parse a YAML or JSON skill file into a SkillPack */
  private parseSkillFile(content: string, filePath: string): SkillPack {
    if (filePath.endsWith('.json')) {
      return JSON.parse(content) as SkillPack;
    }
    // Simple YAML parser for skill packs
    return this.parseYaml(content);
  }

  /** Minimal YAML parser for skill packs */
  private parseYaml(content: string): SkillPack {
    const lines = content.split('\n');
    const result: Record<string, unknown> = {};
    let currentKey = '';
    let currentIndent = 0;

    for (const line of lines) {
      const trimmed = line.trimStart();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.length - trimmed.length;
      const kvMatch = trimmed.match(/^([\w_]+):\s*(.*)/);

      if (kvMatch) {
        const [, key, value] = kvMatch;
        if (indent === 0) {
          currentKey = key;
          currentIndent = indent;
          result[key] = value || {};
        } else if (typeof result[currentKey] === 'object') {
          (result[currentKey] as Record<string, unknown>)[key] = value;
        }
      }
    }

    return result as unknown as SkillPack;
  }

  /** Watch a skill file for changes (hot-reload) */
  private watchSkill(filePath: string, name: string): void {
    if (this.watchers.has(filePath)) return;

    watchFile(filePath, { interval: this.config.watchInterval }, () => {
      try {
        this.reload(name);
      } catch (error) {
        this.config.onError?.(error as Error);
      }
    });
    this.watchers.set(filePath, true);
  }

  /** Stop watching a skill file */
  private stopWatching(filePath: string): void {
    if (this.watchers.has(filePath)) {
      unwatchFile(filePath);
      this.watchers.delete(filePath);
    }
  }
}