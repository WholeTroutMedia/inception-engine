/**
 * SkillRegistry — Versioned skill catalog with dependency resolution
 * @module skills
 * Ref: Issue #61 HELIX A
 */
import type { SkillPack, SkillMetadata } from './skill-compiler';

export interface RegistryEntry {
  metadata: SkillMetadata;
  versions: VersionRecord[];
  latest: string;
  deprecated: boolean;
}

export interface VersionRecord {
  version: string;
  hash: string;
  publishedAt: string;
  changelog: string;
  dependencies: DependencyRef[];
}

export interface DependencyRef {
  name: string;
  versionRange: string;
  optional: boolean;
}

export interface RegistryConfig {
  storagePath: string;
  maxVersions: number;
  enableAutoResolve: boolean;
}

export class SkillRegistry {
  private entries: Map<string, RegistryEntry> = new Map();
  private config: RegistryConfig;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      storagePath: '.averi/skill-registry',
      maxVersions: 50,
      enableAutoResolve: true,
      ...config,
    };
  }

  /** Register a new skill pack */
  register(pack: SkillPack): RegistryEntry {
    const existing = this.entries.get(pack.metadata.name);
    const versionRecord: VersionRecord = {
      version: pack.metadata.version,
      hash: this.computeHash(pack),
      publishedAt: new Date().toISOString(),
      changelog: '',
      dependencies: pack.metadata.dependencies.map(d => ({
        name: d,
        versionRange: '*',
        optional: false,
      })),
    };

    if (existing) {
      if (existing.versions.some(v => v.version === pack.metadata.version)) {
        throw new Error(`Version ${pack.metadata.version} already exists for ${pack.metadata.name}`);
      }
      existing.versions.push(versionRecord);
      existing.latest = pack.metadata.version;
      this.entries.set(pack.metadata.name, existing);
      return existing;
    }

    const entry: RegistryEntry = {
      metadata: pack.metadata,
      versions: [versionRecord],
      latest: pack.metadata.version,
      deprecated: false,
    };
    this.entries.set(pack.metadata.name, entry);
    return entry;
  }

  /** Resolve a skill by name, optionally at a specific version */
  resolve(name: string, version?: string): RegistryEntry | null {
    const entry = this.entries.get(name);
    if (!entry) return null;
    if (version && !entry.versions.some(v => v.version === version)) return null;
    return entry;
  }

  /** Resolve all dependencies for a skill (topological sort) */
  resolveDependencies(name: string): string[] {
    const resolved: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (n: string) => {
      if (visited.has(n)) return;
      if (visiting.has(n)) throw new Error(`Circular dependency detected: ${n}`);
      visiting.add(n);

      const entry = this.entries.get(n);
      if (entry) {
        const latestVersion = entry.versions.find(v => v.version === entry.latest);
        if (latestVersion) {
          for (const dep of latestVersion.dependencies) {
            if (!dep.optional || this.entries.has(dep.name)) {
              visit(dep.name);
            }
          }
        }
      }

      visiting.delete(n);
      visited.add(n);
      resolved.push(n);
    };

    visit(name);
    return resolved;
  }

  /** List all registered skills */
  list(): RegistryEntry[] {
    return Array.from(this.entries.values());
  }

  /** Search skills by capability */
  searchByCapability(capability: string): RegistryEntry[] {
    return this.list().filter(e =>
      e.metadata.capabilities.some(c => c.includes(capability))
    );
  }

  /** Deprecate a skill */
  deprecate(name: string): boolean {
    const entry = this.entries.get(name);
    if (!entry) return false;
    entry.deprecated = true;
    return true;
  }

  /** Remove a skill from registry */
  unregister(name: string): boolean {
    return this.entries.delete(name);
  }

  /** Get registry statistics */
  stats(): { total: number; deprecated: number; totalVersions: number } {
    const entries = this.list();
    return {
      total: entries.length,
      deprecated: entries.filter(e => e.deprecated).length,
      totalVersions: entries.reduce((sum, e) => sum + e.versions.length, 0),
    };
  }

  /** Get a skill pack by name and optional version — alias for resolve() used by mcp-server */
  get(name: string, version?: string): RegistryEntry | null {
    return this.resolve(name, version);
  }

  /** Search skills by query string across name, description, and capabilities */
  search(query: string): RegistryEntry[] {
    const q = query.toLowerCase();
    return this.list().filter(e =>
      e.metadata.name.toLowerCase().includes(q) ||
      e.metadata.description.toLowerCase().includes(q) ||
      e.metadata.capabilities.some(c => c.toLowerCase().includes(q)) ||
      e.metadata.agent.toLowerCase().includes(q)
    );
  }

  /** Compute a simple hash for deduplication */
  private computeHash(pack: SkillPack): string {
    const content = JSON.stringify(pack);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}