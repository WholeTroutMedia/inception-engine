/**
 * ARCH — Pattern Extractor + Code Archaeologist
 * CODEX — Documentation Generator
 * Hive: kstated | Roles: Patterns / Docs
 *
 * ARCH digs through codebases and sessions to extract reusable patterns —
 * the "Code Archaeologist" who surfaces what works and what doesn't.
 *
 * CODEX takes any code artifact and generates comprehensive documentation:
 * README, API docs, code comments, architecture diagrams (Mermaid).
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { memoryBus, type MemoryEntry } from '@cle/memory';
import fs from 'fs';

// ─── ARCH ────────────────────────────────────────────────────────────────────

const ArchInputSchema = z.object({
    target: z.enum(['codebase', 'session', 'decision_log']),
    content: z.string().describe('Code, session transcript, or decision log to analyze'),
    focus: z.string().describe('What type of patterns to look for'),
    sessionId: z.string().optional(),
});

const ArchOutputSchema = z.object({
    patterns: z.array(z.object({
        name: z.string(),
        description: z.string(),
        example: z.string(),
        reusability: z.enum(['high', 'medium', 'low']),
    })).describe('Extracted reusable patterns'),
    antiPatterns: z.array(z.string()).default([]).describe('Detected anti-patterns to avoid'),
    summary: z.string(),
    archSignature: z.literal('karchd').default('karchd'),
});

export const karchdFlow = ai.defineFlow(
    { name: 'karchd', inputSchema: ArchInputSchema, outputSchema: ArchOutputSchema },
    async (input): Promise<z.infer<typeof ArchOutputSchema>> => {
        console.log(`[karchd] 🏺 Excavating patterns — Target: ${input.target}`);

        return memoryBus.withMemory('karchd', `pattern extraction: ${input.focus}`, ['kstated-hive', 'patterns'], async (_ctx: MemoryEntry[]) => {
            const { output } = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                system: `You are ARCH — the Code Archaeologist. You excavate reusable patterns from code, sessions, and decisions.
Output patterns with high generalizability. Name each pattern precisely (e.g., "MemoryBus Preflight Pattern", "Constitutional Guard Wrapper").
Also flag anti-patterns: things that should never be repeated.`,
                prompt: `Extract patterns from this ${input.target}. Focus on: ${input.focus}\n\n${input.content.slice(0, 4000)}`,
                output: { schema: ArchOutputSchema },
                config: { temperature: 0.2 },
            });
            return { ...(output ?? { patterns: [], antiPatterns: [], summary: 'karchd unavailable' }), archSignature: 'karchd' };
        });
    }
);

// ─── CODEX ───────────────────────────────────────────────────────────────────

const CodexInputSchema = z.object({
    docType: z.enum(['readme', 'api_docs', 'inline_comments', 'architecture_diagram', 'full_package']),
    code: z.string().describe('Code or module to document'),
    moduleName: z.string().describe('Name of the module/package'),
    outputPath: z.string().optional().describe('Where to write the documentation file'),
    sessionId: z.string().optional(),
});

const CodexOutputSchema = z.object({
    documentation: z.string().describe('Generated documentation content'),
    format: z.enum(['markdown', 'mermaid', 'jsdoc', 'python_docstring']),
    savedTo: z.string().optional(),
    codexSignature: z.literal('kcodexd').default('kcodexd'),
});

export const kcodexdFlow = ai.defineFlow(
    { name: 'kcodexd', inputSchema: CodexInputSchema, outputSchema: CodexOutputSchema },
    async (input): Promise<z.infer<typeof CodexOutputSchema>> => {
        console.log(`[kcodexd] 📖 Generating ${input.docType} for: ${input.moduleName}`);

        const docPrompts = {
            readme: `Generate a complete README.md with: overview, features, installation, usage examples, API reference, and constitutional compliance notes.`,
            api_docs: `Generate comprehensive API documentation in markdown. For every exported function/class: signature, description, params, return type, example, constitutional article compliance.`,
            inline_comments: `Add comprehensive JSDoc/docstring comments to every function, class, and export. Never leave an undocumented public interface (Article XV).`,
            architecture_diagram: `Generate a Mermaid diagram showing the module architecture, data flow, and agent interactions.`,
            full_package: `Generate package.json description, README, and API docs combined.`,
        };

        return memoryBus.withMemory('kcodexd', `doc: ${input.moduleName}`, ['kstated-hive', 'docs'], async () => {
            const { output } = await ai.generate({
                model: 'googleai/gemini-2.5-flash',
                system: `You are kcodexd — the Documentation deity. You enforce Constitutional Article XV: all public interfaces must be documented.
You write documentation that is genuinely useful, not boilerplate. Include real examples. Be specific about constitutional compliance.`,
                prompt: `${docPrompts[input.docType]}\n\nModule: ${input.moduleName}\n\nCode:\n${input.code.slice(0, 5000)}`,
                output: { schema: CodexOutputSchema },
                config: { temperature: 0.2 },
            });

            const result: z.infer<typeof CodexOutputSchema> = { ...(output ?? { documentation: '', format: 'markdown' as const }), codexSignature: 'kcodexd' as const };

            // Write to disk if output path provided
            if (input.outputPath && result.documentation) {
                fs.mkdirSync(require('path').dirname(input.outputPath), { recursive: true });
                fs.writeFileSync(input.outputPath, result.documentation, 'utf8');
                result.savedTo = input.outputPath;
                console.log(`[kcodexd] ✅ Documentation saved: ${input.outputPath}`);
            }

            return result;
        });
    }
);

