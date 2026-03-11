/**
 * BOLT — Primary Coder, Frontend Builder
 * Hive: AURORA | Role: Builder | Access: Studio
 *
 * BOLT is the primary code generation engine. 14 tool grants:
 *   Filesystem (read/write/list), Git (commit/push/status/diff),
 *   NPM (run/install/build), Web (search), Media (generate_image)
 *
 * BOLT operates in SHIP mode by default. Receives architectural specs
 * from AURORA and implements them. Pairs with COMET for backend tasks.
 *
 * Constitutional: Article VI (Quality Gates), Article XIII (Version Control),
 *                 Article XIV (Testing Mandate), Article XVI (Security)
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { memoryBus, type MemoryEntry } from '@inception/memory';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ─────────────────────────────────────────────────────────────────────────────
// TOOL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const fileReadTool = ai.defineTool(
    { name: 'bolt_fileRead', description: 'Read a file from the filesystem', inputSchema: z.object({ path: z.string() }), outputSchema: z.string() },
    async ({ path: p }) => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return `Error: ${e}`; } }
);

const fileWriteTool = ai.defineTool(
    { name: 'bolt_fileWrite', description: 'Write content to a file', inputSchema: z.object({ path: z.string(), content: z.string() }), outputSchema: z.string() },
    async ({ path: p, content }) => {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, content, 'utf8');
        return `Written: ${p}`;
    }
);

const fileListTool = ai.defineTool(
    { name: 'bolt_fileList', description: 'List files in a directory', inputSchema: z.object({ dir: z.string() }), outputSchema: z.array(z.string()) },
    async ({ dir }) => { try { return fs.readdirSync(dir); } catch { return []; } }
);

const gitStatusTool = ai.defineTool(
    { name: 'bolt_gitStatus', description: 'Get git status of the repo', inputSchema: z.object({ cwd: z.string() }), outputSchema: z.string() },
    async ({ cwd }) => { try { return execSync('git status --short', { cwd, encoding: 'utf8' }); } catch (e) { return `${e}`; } }
);

const gitCommitTool = ai.defineTool(
    { name: 'bolt_gitCommit', description: 'Stage all and commit', inputSchema: z.object({ message: z.string(), cwd: z.string() }), outputSchema: z.string() },
    async ({ message, cwd }) => { try { execSync('git add -A', { cwd }); return execSync(`git commit -m "${message.replace(/"/g, "'")}"`, { cwd, encoding: 'utf8' }); } catch (e) { return `${e}`; } }
);

const npmRunTool = ai.defineTool(
    { name: 'bolt_npmRun', description: 'Run an npm script', inputSchema: z.object({ script: z.string(), cwd: z.string() }), outputSchema: z.string() },
    async ({ script, cwd }) => { try { return execSync(`npm run ${script}`, { cwd, encoding: 'utf8', timeout: 120000 }); } catch (e) { return `${e}`; } }
);

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const BoltInputSchema = z.object({
    task: z.string().describe('Implementation task — be specific about what to build'),
    repoPath: z.string().default(`d:\\Google Creative Liberation Engine\\Infusion Engine Brainchild\\brainchild-v5`),
    targetFile: z.string().optional().describe('Primary file to create/modify'),
    context: z.string().optional().describe('Architecture spec, design system, existing code context'),
    runTests: z.boolean().default(false),
    commitOnComplete: z.boolean().default(true),
    sessionId: z.string().optional(),
});

const BoltOutputSchema = z.object({
    filesModified: z.array(z.string()).describe('List of files created or modified'),
    code: z.string().describe('Primary code artifact produced'),
    summary: z.string().describe('What was built'),
    testsPass: z.boolean().optional(),
    commitHash: z.string().optional(),
    boltSignature: z.literal('BOLT').default('BOLT'),
});

export type BoltInput = z.infer<typeof BoltInputSchema>;
export type BoltOutput = z.infer<typeof BoltOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// BOLT FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const BOLTFlow = ai.defineFlow(
    {
        name: 'BOLT',
        inputSchema: BoltInputSchema,
        outputSchema: BoltOutputSchema,
    },
    async (input): Promise<BoltOutput> => {
        const sessionId = input.sessionId ?? `bolt_${Date.now()}`;
        console.log(`[BOLT] ⚡ Activating — Task: ${input.task.slice(0, 80)}`);

        return memoryBus.withMemory('BOLT', input.task, ['aurora-hive', 'builder', 'code'], async (context: MemoryEntry[]) => {
            const memoryContext = context.length > 0
                ? `\n\nBOLT's relevant past implementations:\n${context.map(e => `- ${e.task}: ${e.outcome}`).join('\n')}`
                : '';

            const systemPrompt = `You are BOLT — the primary code generation engine of the Creative Liberation Engine.

You are a senior full-stack engineer who writes production-grade TypeScript, Python, React, and CSS.
You have access to tools: bolt_fileRead, bolt_fileWrite, bolt_fileList, bolt_gitStatus, bolt_gitCommit, bolt_npmRun.

Standards:
- Write complete, working code — no stubs, no placeholders, no TODOs
- Create unique design tokens tailored to the specific context of the feature being built.
- TypeScript: strict types, Zod schemas, no 'any'
- React: functional components, hooks, no class components
- Constitutional Article XIV: every shipped file should have an associated test
- Constitutional Article XVI: no secrets in code, no hardcoded credentials

After implementing, return the primary code artifact and list of modified files.${memoryContext}`;

            const { output } = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                system: systemPrompt,
                prompt: `Task: ${input.task}${input.context ? `\n\nContext:\n${input.context}` : ''}${input.targetFile ? `\n\nTarget file: ${input.targetFile}` : ''}`,
                tools: [fileReadTool, fileWriteTool, fileListTool, gitStatusTool, gitCommitTool, npmRunTool],
                output: { schema: BoltOutputSchema },
                config: { temperature: 0.2 },
            });

            // Auto-commit if requested
            let commitHash: string | undefined;
            if (input.commitOnComplete && output?.filesModified?.length) {
                try {
                    const msg = `feat(bolt): ${input.task.slice(0, 72)}`;
                    execSync('git add -A', { cwd: input.repoPath });
                    const commit = execSync(`git commit -m "${msg.replace(/"/g, "'")}"`, { cwd: input.repoPath, encoding: 'utf8' });
                    commitHash = commit.match(/\[main ([a-f0-9]+)\]/)?.[1];
                    console.log(`[BOLT] ✅ Committed: ${commitHash}`);
                } catch (e) {
                    console.warn(`[BOLT] Commit failed: ${e}`);
                }
            }

            return {
                ...(output ?? { filesModified: [], code: '', summary: 'BOLT output unavailable' }),
                commitHash,
                boltSignature: 'BOLT',
            };
        });
    }
);

