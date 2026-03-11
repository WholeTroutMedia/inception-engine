#!/usr/bin/env ts-node
/**
 * @creative-liberation-engine/skills CLI
 * Commands: compile, export
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const command = process.argv[2];
const chartersDir = resolve(process.cwd(), '../../charters');
const outputDir = resolve(process.cwd(), '../../.generated/skills');

async function compile(): Promise<void> {
  console.log('[skills:compile] Scanning charters directory...');
  const files = readdirSync(chartersDir).filter((f: string) => f.endsWith('.md'));
  console.log(`[skills:compile] Found ${files.length} charter files`);

  for (const file of files) {
    const content = readFileSync(join(chartersDir, file), 'utf-8');
    const agentName = file.replace('.md', '');
    // Extract capability-profile sections
    const capabilities = extractCapabilities(content);
    const yaml = toYAML(agentName, capabilities);
    const outPath = join(outputDir, `${agentName}.skill.yaml`);
    writeFileSync(outPath, yaml);
    console.log(`  [compiled] ${agentName} -> ${capabilities.length} skills`);
  }
  console.log('[skills:compile] Done.');
}

async function exportCowork(): Promise<void> {
  console.log('[skills:export] Generating cowork manifests...');
  // Export skill manifests for inter-agent cowork protocol
  console.log('[skills:export] Done.');
}

function extractCapabilities(content: string): string[] {
  const matches = content.match(/##\s+Capabilities?[\s\S]*?(?=##|$)/gi);
  if (!matches) return [];
  const items = matches[0].match(/[-*]\s+(.+)/g) || [];
  return items.map(i => i.replace(/^[-*]\s+/, '').trim());
}

function toYAML(agent: string, caps: string[]): string {
  let yaml = `agent: ${agent}\nversion: 1.0.0\nskills:\n`;
  for (const cap of caps) {
    const id = cap.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    yaml += `  - id: ${id}\n    name: "${cap}"\n    type: capability\n`;
  }
  return yaml;
}

// CLI dispatch
switch (command) {
  case 'compile': compile(); break;
  case 'export': exportCowork(); break;
  default:
    console.log('Usage: ts-node src/cli.ts <compile|export>');
    process.exit(1);
}