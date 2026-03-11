import { readFileSync, readdirSync, existsSync, type Dirent } from 'fs';
import { join } from 'path';

export interface AuditResult {
  id: string;
  title: string;
  description: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  workstream: string;
  package: string;
  category: 'missing-tests' | 'ts-errors' | 'todos' | 'missing-docker' | 'missing-exports';
}

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? '/workspace';
const PACKAGES_DIR = join(WORKSPACE_ROOT, 'packages');
const COMPOSE_FILE = join(WORKSPACE_ROOT, 'docker-compose.genesis.yml');

/**
 * Scan all packages and return structured audit findings.
 */
export async function auditWorkspace(): Promise<AuditResult[]> {
  const results: AuditResult[] = [];

  if (!existsSync(PACKAGES_DIR)) {
    console.warn(`[director/auditor] packages dir not found: ${PACKAGES_DIR}`);
    return results;
  }

  const packages = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d: Dirent) => d.isDirectory())
    .map((d: Dirent) => d.name);

  for (const pkg of packages) {
    const pkgDir = join(PACKAGES_DIR, pkg);
    const srcDir = join(pkgDir, 'src');

    // 1. Missing test infrastructure
    const hasTests =
      existsSync(join(pkgDir, '__tests__')) ||
      existsSync(join(pkgDir, 'src', '__tests__')) ||
      existsSync(join(pkgDir, 'vitest.config.ts')) ||
      existsSync(join(pkgDir, 'vitest.config.js'));

    if (!hasTests && existsSync(srcDir)) {
      results.push({
        id: `audit-${pkg}-no-tests`,
        title: `Add test suite to @inception/${pkg}`,
        description: `Package @inception/${pkg} has no test infrastructure (vitest.config.ts or __tests__/ directory). Add unit tests for core logic -- Article IX compliance.`,
        severity: 'P1',
        workstream: deriveWorkstream(pkg),
        package: pkg,
        category: 'missing-tests',
      });
    }

    // 2. TODOs in source files
    if (existsSync(srcDir)) {
      const todos = findTodosInDir(srcDir, pkg);
      results.push(...todos);
    }

    // 3. Missing index.ts exports check
    const indexFile = join(pkgDir, 'src', 'index.ts');
    if (!existsSync(indexFile) && existsSync(srcDir)) {
      results.push({
        id: `audit-${pkg}-no-index`,
        title: `Add index.ts to @inception/${pkg}`,
        description: `Package @inception/${pkg} has no src/index.ts. All public APIs must be explicitly exported.`,
        severity: 'P2',
        workstream: deriveWorkstream(pkg),
        package: pkg,
        category: 'missing-exports',
      });
    }
  }

  // 4. Docker compose gap -- packages with Dockerfiles not in compose
  const composeContent = existsSync(COMPOSE_FILE)
    ? readFileSync(COMPOSE_FILE, 'utf-8')
    : '';

  for (const pkg of packages) {
    const dockerfile = join(PACKAGES_DIR, pkg, 'Dockerfile');
    if (existsSync(dockerfile) && !composeContent.includes(pkg)) {
      results.push({
        id: `audit-${pkg}-no-compose`,
        title: `Add ${pkg} service to docker-compose.genesis.yml`,
        description: `Package @inception/${pkg} has a Dockerfile but is not listed in docker-compose.genesis.yml. Add it to the GENESIS stack.`,
        severity: 'P1',
        workstream: 'infra-docker',
        package: pkg,
        category: 'missing-docker',
      });
    }
  }

  return results;
}

function findTodosInDir(dir: string, pkg: string): AuditResult[] {
  const results: AuditResult[] = [];
  try {
    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      if (file.isDirectory()) {
        results.push(...findTodosInDir(join(dir, file.name), pkg));
        continue;
      }
      if (!file.name.endsWith('.ts') && !file.name.endsWith('.tsx')) continue;
      const content = readFileSync(join(dir, file.name), 'utf-8');
      const todoLines = content
        .split('\n')
        .filter((l: string) => /\/\/\s*(TODO|FIXME|HACK)/i.test(l));
      if (todoLines.length > 0) {
        results.push({
          id: `audit-${pkg}-todos-${file.name}`,
          title: `Resolve ${todoLines.length} TODO(s) in ${pkg}/src/${file.name}`,
          description: `Found ${todoLines.length} TODO/FIXME comment(s) in @inception/${pkg}. Article IX: no stubs in shipped code. File: ${file.name}`,
          severity: 'P2',
          workstream: deriveWorkstream(pkg),
          package: pkg,
          category: 'todos',
        });
      }
    }
  } catch {
    // Best-effort scan -- silently skip unreadable files
  }
  return results;
}

/**
 * Maps package names to their AVERI workstream.
 * Covers all 40+ packages in the brainchild-v5 monorepo.
 */
function deriveWorkstream(pkg: string): string {
  const map: Record<string, string> = {
    // ─── Infrastructure & deployment
    dispatch:              'infra-docker',
    director:              'infra-docker',
    engine:                'infra-docker',
    config:                'infra-docker',
    'nas-watcher':         'infra-docker',
    'comet-browser':       'comet-browser',
    'mcp-browser':         'comet-browser',
    'inception-browser':   'comet-browser',
    comet:                 'comet-browser',

    // ─── Genkit / AI flows
    genkit:                'genkit-flows',
    genmedia:              'genkit-flows',
    blueprints:            'genkit-flows',
    'god-prompt':          'genkit-flows',

    // ─── Console / UI
    console:               'console-ui',
    ui:                    'console-ui',
    'gen-ui':              'console-ui',
    'theme-engine':        'console-ui',
    'design-tokens':       'console-ui',
    'design-sandbox':      'console-ui',
    'design-governance':   'console-ui',
    'design-agent':        'console-ui',
    'eslint-plugin-design-system': 'console-ui',

    // ─── Content / Ghost
    ghost:                 'content-ghost',
    memory:                'content-ghost',
    scribe:                'content-ghost',

    // ─── MCP / routing
    'mcp-router':          'mcp-routing',
    'synology-media-mcp':  'synology-mcp',
    'davinci-resolve-mcp': 'mcp-routing',
    toolbox:               'mcp-routing',

    // ─── Agents
    agents:                'agent-runtime',
    'claude-agent':        'agent-runtime',
    'finance-agent':       'agent-runtime',
    'cowork-bridge':       'agent-runtime',

    // ─── Core platform
    'inception-core':      'inception-core',
    data:                  'inception-core',
    auth:                  'inception-core',
    social:                'inception-core',
    blockchain:            'inception-core',
    plugs:                 'inception-core',
    constitution:          'inception-core',

    // ─── Campaign / monetisation
    campaign:              'zero-day',
    'zero-day':            'zero-day',
    'atlas-live':          'zero-day',
  };
  return map[pkg] ?? 'free';
}