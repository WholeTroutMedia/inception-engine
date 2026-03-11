/**
 * @inception/claude-agent — Smoke Test
 *
 * Quick validation that the Claude Agent SDK is wired correctly
 * and that CLAUDE.md is being loaded (Creative Liberation Engine identity).
 *
 * Run: pnpm --filter @inception/claude-agent smoke-test
 * Requires: ANTHROPIC_API_KEY in environment or .env
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from repo root (two levels up from packages/claude-agent)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '../../..', '.env') });

import { executeClaudeTask } from './executor.js';

async function smokeTest(): Promise<void> {
    console.log('🔥 Claude Agent SDK — Smoke Test');
    console.log('====================================');

    if (!process.env['ANTHROPIC_API_KEY']) {
        console.error('❌ ANTHROPIC_API_KEY not set. Add it to your .env file.');
        process.exit(1);
    }

    const result = await executeClaudeTask({
        id: 'SMOKE-001',
        title: 'List the top-level directories in this repository and tell me which package you think is the most critical to the Creative Liberation Engine based on CLAUDE.md.',
        tools: ['Read', 'Bash', 'Glob', 'LS'],
        maxTurns: 5,
        workstream: 'smoke-test',
        priority: 'P3',
    });

    console.log('\n====================================');
    console.log(`Status:   ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Turns:    ${result.numTurns}`);
    console.log(`Duration: ${result.durationMs}ms`);
    console.log('\n--- Result ---');
    console.log(result.result || result.error || '(no result captured)');
    console.log('\n--- Messages Summary ---');
    console.log(`Total messages: ${result.messages.length}`);
    const toolCalls = result.messages.filter((m) => m.type === 'tool_use');
    console.log(`Tool calls: ${toolCalls.length} (${toolCalls.map((m) => m.toolName).join(', ')})`);
}

smokeTest().catch((err) => {
    console.error('Smoke test failed:', err);
    process.exit(1);
});
