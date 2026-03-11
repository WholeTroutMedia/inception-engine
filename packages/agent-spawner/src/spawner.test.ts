/**
 * @inception/agent-spawner — Vitest Test Suite
 * Wave 31 Helix A
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs/promises at module level before any imports
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

import fs from 'fs/promises';
import { AgentSpawner, type SkillManifest, type SpawnOptions } from './spawner.js';

describe('AgentSpawner', () => {
  let spawner: AgentSpawner;

  beforeEach(() => {
    spawner = new AgentSpawner('/mock/base');
    vi.clearAllMocks();
  });

  // ── Constructor ────────────────────────────────────────────────────────────

  it('constructs with default baseDir', () => {
    const s = new AgentSpawner();
    expect(s).toBeInstanceOf(AgentSpawner);
  });

  it('constructs with custom baseDir', () => {
    const s = new AgentSpawner('/custom/dir');
    expect(s).toBeInstanceOf(AgentSpawner);
  });

  // ── spawnFromManifest — return value ──────────────────────────────────────

  it('returns pid and port on successful spawn', async () => {
    const manifest: SkillManifest = {
      agent: 'TestAgent',
      skills: [{ name: 'vision' }, { name: 'audio' }],
    };
    const result = await spawner.spawnFromManifest(manifest);
    expect(result).toHaveProperty('pid');
    expect(result).toHaveProperty('port');
    expect(typeof result.pid).toBe('number');
    expect(typeof result.port).toBe('number');
  });

  it('pid is always 9999 (mock pending cluster integration)', async () => {
    const manifest: SkillManifest = { agent: 'PidAgent', skills: [] };
    const result = await spawner.spawnFromManifest(manifest, { port: 5560 });
    expect(result.pid).toBe(9999);
  });

  // ── Port allocation ────────────────────────────────────────────────────────

  it('uses provided port option', async () => {
    const manifest: SkillManifest = { agent: 'PortTestAgent', skills: [] };
    const options: SpawnOptions = { port: 9000 };
    const result = await spawner.spawnFromManifest(manifest, options);
    expect(result.port).toBe(9000);
  });

  it('allocates a random port when none provided (range 4000–5000)', async () => {
    const manifest: SkillManifest = { agent: 'RandomPortAgent', skills: [] };
    const result = await spawner.spawnFromManifest(manifest);
    expect(result.port).toBeGreaterThanOrEqual(4000);
    expect(result.port).toBeLessThan(5000);
  });

  // ── File system calls ─────────────────────────────────────────────────────

  it('calls mkdir to create targetDir', async () => {
    const manifest: SkillManifest = { agent: 'MkdirAgent', skills: [] };
    await spawner.spawnFromManifest(manifest, { port: 5555 });
    expect(fs.mkdir).toHaveBeenCalledOnce();
    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('MkdirAgent'), { recursive: true });
  });

  it('uses provided targetDir', async () => {
    const manifest: SkillManifest = { agent: 'DirAgent', skills: [] };
    await spawner.spawnFromManifest(manifest, { port: 5556, targetDir: '/custom/target' });
    expect(fs.mkdir).toHaveBeenCalledWith('/custom/target', { recursive: true });
  });

  it('writes exactly 2 files: index.ts and package.json', async () => {
    const manifest: SkillManifest = { agent: 'WriteAgent', skills: [{ name: 'skill-a' }] };
    await spawner.spawnFromManifest(manifest, { port: 5557 });
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
  });

  it('writes index.ts with agent name in content', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    const manifest: SkillManifest = { agent: 'EntrypointAgent', skills: [{ name: 'code-gen' }] };
    await spawner.spawnFromManifest(manifest, { port: 5558 });

    const indexCall = mockWriteFile.mock.calls.find(([p]) =>
      typeof p === 'string' && (p.endsWith('index.ts') || (p as string).endsWith('index.ts'))
    );
    expect(indexCall).toBeDefined();
    expect(indexCall![1]).toContain('EntrypointAgent');
  });

  it('writes package.json with correct name and start script', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    const manifest: SkillManifest = { agent: 'PkgAgent', skills: [] };
    await spawner.spawnFromManifest(manifest, { port: 5559 });

    const pkgCall = mockWriteFile.mock.calls.find(([p]) =>
      typeof p === 'string' && p.endsWith('package.json')
    );
    expect(pkgCall).toBeDefined();
    const pkgContent = JSON.parse(pkgCall![1] as string);
    expect(pkgContent.name).toContain('pkgagent');
    expect(pkgContent.scripts.start).toBe('tsx index.ts');
    expect(pkgContent.type).toBe('module');
  });

  // ── SkillManifest edge cases ───────────────────────────────────────────────

  it('accepts manifest with empty skills array', async () => {
    const manifest: SkillManifest = { agent: 'EmptySkillsAgent', skills: [] };
    const result = await spawner.spawnFromManifest(manifest, { port: 5561 });
    expect(result).toBeDefined();
    expect(result.pid).toBe(9999);
  });

  it('accepts manifest with many skills', async () => {
    const manifest: SkillManifest = {
      agent: 'MultiSkillAgent',
      skills: [
        { name: 'vision' },
        { name: 'audio' },
        { name: 'spatial' },
        { name: 'code-gen' },
        { name: 'memory' },
      ],
    };
    const result = await spawner.spawnFromManifest(manifest, { port: 5562 });
    expect(result).toBeDefined();
  });

  it('generated entrypoint contains all skill names', async () => {
    const mockWriteFile = vi.mocked(fs.writeFile);
    const manifest: SkillManifest = {
      agent: 'SkillNamesAgent',
      skills: [{ name: 'alpha' }, { name: 'beta' }],
    };
    await spawner.spawnFromManifest(manifest, { port: 5563 });

    const indexCall = mockWriteFile.mock.calls.find(([p]) =>
      typeof p === 'string' && p.endsWith('index.ts')
    );
    const content = indexCall![1] as string;
    expect(content).toContain('alpha');
    expect(content).toContain('beta');
  });
});
