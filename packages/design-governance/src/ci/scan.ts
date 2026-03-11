// packages/design-governance/src/ci/scan.ts
// T20260306-245: Design governance CI scan — drift detection, token analytics, census reporter

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Types ───────────────────────────────────────────────────────────────────

interface TokenEntry {
    path: string;
    name: string;
    value: string;
    type: string;
    tier: 'primitive' | 'semantic' | 'component' | 'unknown';
}

interface DriftReport {
    totalTokens: number;
    usedTokens: string[];
    orphanedTokens: string[];
    undeclaredValues: Array<{ file: string; line: number; value: string }>;
    driftScore: number; // 0-100, higher = more drift
    passGate: boolean;
}

interface CensusReport {
    totalComponents: number;
    conformingComponents: string[];
    deviatingComponents: Array<{ file: string; issues: string[] }>;
    complianceRate: number; // 0-100
}

// ─── Token Loader ────────────────────────────────────────────────────────────

function loadAllTokens(srcDir: string): TokenEntry[] {
    const tokens: TokenEntry[] = [];

    function walkJson(dir: string, tier: TokenEntry['tier']) {
        const items = readdirSync(dir);
        for (const item of items) {
            const full = join(dir, item);
            if (statSync(full).isDirectory()) {
                walkJson(full, tier);
            } else if (item.endsWith('.json')) {
                try {
                    const raw = JSON.parse(readFileSync(full, 'utf8'));
                    walkObject(raw, '', full, tier);
                } catch {
                    // Skip malformed JSON
                }
            }
        }
    }

    function walkObject(obj: Record<string, unknown>, path: string, filePath: string, tier: TokenEntry['tier']) {
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (value && typeof value === 'object' && '$value' in (value as object)) {
                const entry = value as { $value: unknown; $type?: string };
                tokens.push({
                    path: currentPath,
                    name: key,
                    value: String(entry.$value),
                    type: entry.$type ?? 'unknown',
                    tier,
                });
            } else if (value && typeof value === 'object') {
                walkObject(value as Record<string, unknown>, currentPath, filePath, tier);
            }
        }
    }

    const primitivesDir = join(srcDir, 'primitives');
    const semanticDir = join(srcDir, 'semantic');
    const componentDir = join(srcDir, 'component');

    if (statSync(primitivesDir).isDirectory()) walkJson(primitivesDir, 'primitive');
    if (statSync(semanticDir).isDirectory()) walkJson(semanticDir, 'semantic');
    try { if (statSync(componentDir).isDirectory()) walkJson(componentDir, 'component'); } catch { /* no component dir */ }

    return tokens;
}

// ─── Source Scanner ──────────────────────────────────────────────────────────

function scanSourceForTokenUsage(srcDir: string): { used: string[]; undeclared: Array<{ file: string; line: number; value: string }> } {
    const used = new Set<string>();
    const undeclared: Array<{ file: string; line: number; value: string }> = [];
    const CSS_VAR_RE = /var\(--([^)]+)\)/g;
    const LITERAL_HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
    const LITERAL_RGB_RE = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g;

    function walkDir(dir: string) {
        try {
            const items = readdirSync(dir);
            for (const item of items) {
                const full = join(dir, item);
                try {
                    if (statSync(full).isDirectory() && !full.includes('node_modules') && !full.includes('dist')) {
                        walkDir(full);
                    } else if (/\.(tsx|ts|css|scss)$/.test(item)) {
                        const content = readFileSync(full, 'utf8');
                        const lines = content.split('\n');
                        let m: RegExpExecArray | null;
                        while ((m = CSS_VAR_RE.exec(content)) !== null) {
                            used.add(m[1]);
                        }
                        lines.forEach((line, i) => {
                            if (LITERAL_HEX_RE.test(line) || LITERAL_RGB_RE.test(line)) {
                                // Skip comment lines
                                if (!line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('#')) {
                                    undeclared.push({ file: full, line: i + 1, value: line.trim().slice(0, 80) });
                                }
                            }
                        });
                    }
                } catch { /* skip unreadable files */ }
            }
        } catch { /* skip unreadable dirs */ }
    }

    walkDir(srcDir);
    return { used: Array.from(used), undeclared };
}

// ─── Drift Report ────────────────────────────────────────────────────────────

function generateDriftReport(tokens: TokenEntry[], sourceUsage: ReturnType<typeof scanSourceForTokenUsage>): DriftReport {
    const tokenCssNames = tokens.map((t) =>
        t.path.replace(/\./g, '-').toLowerCase()
    );

    const usedTokens = sourceUsage.used.filter((u) => tokenCssNames.includes(u));
    const orphanedPaths = tokenCssNames.filter((t) => !sourceUsage.used.includes(t));

    const orphanRate = orphanedPaths.length / Math.max(tokenCssNames.length, 1);
    const literalPenalty = Math.min(sourceUsage.undeclared.length * 2, 40);
    const driftScore = Math.floor(orphanRate * 60 + literalPenalty);

    return {
        totalTokens: tokens.length,
        usedTokens,
        orphanedTokens: orphanedPaths.slice(0, 20), // top 20
        undeclaredValues: sourceUsage.undeclared.slice(0, 20),
        driftScore,
        passGate: driftScore < 30, // <30 drift score = passing
    };
}

// ─── Census Report ───────────────────────────────────────────────────────────

function generateCensusReport(srcDir: string): CensusReport {
    const conforming: string[] = [];
    const deviating: Array<{ file: string; issues: string[] }> = [];

    function checkFile(file: string) {
        const content = readFileSync(file, 'utf8');
        const issues: string[] = [];

        // Check: uses inline style objects with literal colors
        if (/style=\{[^}]*color:\s*['"][^{]/.test(content)) {
            issues.push('Inline style with literal color value');
        }
        // Check: imports from wrong token path
        if (/from ['"]\.\.\/\.\.\/tokens\//.test(content)) {
            issues.push('Imports from non-standard token path (should use @inception/design-tokens)');
        }
        // Check: hardcoded px instead of token
        if (/\bpadding:\s*\d+px\b/.test(content) || /\bmargin:\s*\d+px\b/.test(content)) {
            issues.push('Hardcoded px spacing (should use spacing tokens)');
        }

        if (issues.length === 0) {
            conforming.push(file);
        } else {
            deviating.push({ file, issues });
        }
    }

    function walkComponents(dir: string) {
        try {
            const items = readdirSync(dir);
            for (const item of items) {
                const full = join(dir, item);
                if (statSync(full).isDirectory() && !full.includes('node_modules') && !full.includes('dist')) {
                    walkComponents(full);
                } else if (/\.(tsx|ts)$/.test(item)) {
                    checkFile(full);
                }
            }
        } catch { /* skip */ }
    }

    walkComponents(srcDir);

    const total = conforming.length + deviating.length;
    return {
        totalComponents: total,
        conformingComponents: conforming,
        deviatingComponents: deviating,
        complianceRate: total === 0 ? 100 : Math.floor((conforming.length / total) * 100),
    };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const TOKENS_SRC = resolve(__dirname, '../../../design-tokens/src');
    const CODE_SRC = resolve(__dirname, '../../../');
    const isReport = process.argv.includes('--report');

    console.log('\n🔍 Design Governance CI Scan\n');

    // Load tokens
    let tokens: TokenEntry[] = [];
    try {
        tokens = loadAllTokens(TOKENS_SRC);
        console.log(`📐 Loaded ${tokens.length} design tokens`);
    } catch (e) {
        console.warn(`⚠️  Could not load tokens from ${TOKENS_SRC}:`, (e as Error).message);
    }

    // Scan source
    const sourceUsage = scanSourceForTokenUsage(CODE_SRC);
    console.log(`🔎 Scanned source — found ${sourceUsage.used.length} CSS var usages, ${sourceUsage.undeclared.length} literal color values`);

    // Generate reports
    const drift = generateDriftReport(tokens, sourceUsage);
    const census = generateCensusReport(CODE_SRC);

    console.log('\n📊 Drift Report:');
    console.log(`  Total tokens: ${drift.totalTokens}`);
    console.log(`  Used tokens: ${drift.usedTokens.length}`);
    console.log(`  Orphaned tokens: ${drift.orphanedTokens.length}`);
    console.log(`  Undeclared literal values: ${drift.undeclaredValues.length}`);
    console.log(`  Drift score: ${drift.driftScore}/100 ${drift.passGate ? '✅' : '❌'}`);

    console.log('\n📋 Component Census:');
    console.log(`  Total components: ${census.totalComponents}`);
    console.log(`  Compliance rate: ${census.complianceRate}%`);
    if (census.deviatingComponents.length > 0) {
        console.log('  Issues found:');
        census.deviatingComponents.slice(0, 5).forEach(({ file, issues }) => {
            console.log(`    ${file.split(/[\\/]/).pop()}: ${issues.join(', ')}`);
        });
    }

    if (isReport) {
        const reportPath = resolve(process.cwd(), 'design-governance-report.json');
        writeFileSync(reportPath, JSON.stringify({ drift, census, generatedAt: new Date().toISOString() }, null, 2));
        console.log(`\n📄 Full report written to: ${reportPath}`);
    }

    // CI gate: fail if drift > 30 OR compliance < 70%
    const passed = drift.passGate && census.complianceRate >= 70;
    if (!passed) {
        console.error('\n❌ Design governance gate FAILED');
        if (!drift.passGate) console.error(`   Drift score ${drift.driftScore} exceeds threshold of 30`);
        if (census.complianceRate < 70) console.error(`   Component compliance ${census.complianceRate}% below threshold of 70%`);
        process.exit(1);
    }

    console.log('\n✅ Design governance gate PASSED\n');
}

main().catch((err) => {
    console.error('Fatal error in governance scan:', err);
    process.exit(1);
});
