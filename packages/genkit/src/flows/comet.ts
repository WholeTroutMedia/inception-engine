/**
 * COMET — Backend Automator, API Engineer, Database Ops
 * Hive: kuid | Role: Automator | Access: Studio
 *
 * COMET handles the backend layer: APIs, databases, microservices,
 * CI/CD, Docker, and system integrations.
 * Pairs with kbuildd for full-stack delivery.
 *
 * Tool grants: 7
 *   HTTP (get/post), Shell (execute), File (read/write),
 *   Git (commit), Docker (compose up/down), NPM (run)
 *
 * Constitutional: Article IX (Error Recovery), Article X (Resource Stewardship),
 *                 Article XIII (Version Control), Article XVI (Security)
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { memoryBus, type MemoryEntry } from '@cle/memory';
import { execSync, exec } from 'child_process';
import fs from 'fs';
import https from 'https';

// ─────────────────────────────────────────────────────────────────────────────
// TOOLS
// ─────────────────────────────────────────────────────────────────────────────

const shellTool = ai.defineTool(
    {
        name: 'comet_shell', description: 'Execute a shell command (read-only safe ops)',
        inputSchema: z.object({ command: z.string(), cwd: z.string().optional() }),
        outputSchema: z.string(),
    },
    async ({ command, cwd }) => {
        try { return execSync(command, { encoding: 'utf8', cwd, timeout: 60000 }); }
        catch (e: any) { return `Exit ${e.status}: ${e.stderr || e.message}`; }
    }
);

const httpGetTool = ai.defineTool(
    {
        name: 'comet_httpGet', description: 'Make an HTTP GET request',
        inputSchema: z.object({ url: z.string(), headers: z.record(z.string()).optional() }),
        outputSchema: z.string(),
    },
    async ({ url, headers }) => {
        return new Promise((resolve) => {
            const req = https.get(url, { headers }, (res) => {
                let data = '';
                res.on('data', (c) => data += c);
                res.on('end', () => resolve(data.slice(0, 2000)));
            });
            req.on('error', (e) => resolve(`Error: ${e.message}`));
        });
    }
);

const fileReadTool = ai.defineTool(
    { name: 'comet_fileRead', description: 'Read a file', inputSchema: z.object({ path: z.string() }), outputSchema: z.string() },
    async ({ path: p }) => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return `${e}`; } }
);

const fileWriteTool = ai.defineTool(
    { name: 'comet_fileWrite', description: 'Write a file', inputSchema: z.object({ path: z.string(), content: z.string() }), outputSchema: z.string() },
    async ({ path: p, content }) => {
        fs.mkdirSync(require('path').dirname(p), { recursive: true });
        fs.writeFileSync(p, content);
        return `Written: ${p}`;
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const CometInputSchema = z.object({
    task: z.string().describe('Backend task — API endpoint, DB migration, Docker config, CI/CD setup, etc.'),
    repoPath: z.string().default(`d:\\Google Creative Liberation Engine\\Infusion Engine Brainchild\\brainchild-v5`),
    techStack: z.array(z.string()).default(['python', 'fastapi', 'prisma', 'firebase', 'docker']),
    context: z.string().optional(),
    sessionId: z.string().optional(),
});

const CometOutputSchema = z.object({
    artifacts: z.array(z.object({ path: z.string(), type: z.string() })).describe('Files/configs produced'),
    endpoints: z.array(z.string()).default([]).describe('API endpoints created or modified'),
    summary: z.string(),
    migrations: z.array(z.string()).default([]).describe('DB migrations generated'),
    cometSignature: z.literal('kwebd').default('kwebd'),
});

export type CometInput = z.infer<typeof CometInputSchema>;
export type CometOutput = z.infer<typeof CometOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// kwebd FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const kwebdFlow = ai.defineFlow(
    {
        name: 'kwebd',
        inputSchema: CometInputSchema,
        outputSchema: CometOutputSchema,
    },
    async (input): Promise<CometOutput> => {
        const sessionId = input.sessionId ?? `kwebd_${Date.now()}`;
        console.log(`[kwebd] 🌠 Activating — Backend task: ${input.task.slice(0, 80)}`);

        return memoryBus.withMemory('kwebd', input.task, ['kuid-hive', 'automator', 'backend'], async (context: MemoryEntry[]) => {
            const memCtx = context.length > 0
                ? `\nPast relevant tasks:\n${context.map(e => `- ${e.task}: ${e.pattern || e.outcome}`).join('\n')}`
                : '';

            const { output } = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                system: `You are kwebd — backend automator and API engineer for the Creative Liberation Engine.

Tech stack: ${input.techStack.join(', ')}.
You write production-grade backend code: FastAPI routes, Prisma schemas, Firebase rules, Docker configs, GitHub Actions.
Principles:
- No hardcoded secrets (Article XVI)
- Graceful error handling with recovery paths (Article IX)  
- Efficient resource use (Article X)
- All endpoints documented via docstrings${memCtx}`,
                prompt: `Backend task: ${input.task}${input.context ? `\n\nContext:\n${input.context}` : ''}`,
                tools: [shellTool, httpGetTool, fileReadTool, fileWriteTool],
                output: { schema: CometOutputSchema },
                config: { temperature: 0.15 },
            });

            return {
                ...(output ?? { artifacts: [], endpoints: [], summary: 'kwebd output unavailable', migrations: [] }),
                cometSignature: 'kwebd',
            };
        });
    }
);

