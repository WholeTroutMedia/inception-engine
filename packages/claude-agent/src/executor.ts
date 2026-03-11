/**
 * @inception/claude-agent â€” Smart Provider Executor v2
 *
 * Intelligent load balancing across ALL configured providers.
 * Tracks latency + error rates per provider, weights routing dynamically.
 *
 * Provider priority (highest tier plans on Perplexity + Google):
 *   CODING tasks:   Anthropic/Sonnet â†’ Gemini/Flash â†’ Perplexity/Sonar â†’ Ollama
 *   RESEARCH tasks: Perplexity/Sonar-Reasoning â†’ Gemini/Pro â†’ Anthropic/Sonnet â†’ Ollama
 *   FAST tasks:     Gemini/Flash â†’ Perplexity/Sonar â†’ Ollama
 *
 * Constitutional: Article I (Sovereignty), Article IX (Quality), Article XX (Automation)
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dot = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dot, '../../..', '.env') });

import type { AgentTask, AgentMessage, AgentResult, ClaudeTool } from './types.js';

const DISPATCH_URL = process.env['DISPATCH_SERVER'] ?? 'http://127.0.0.1:5050';
const REPO_ROOT = process.env['INCEPTION_REPO_ROOT']
    ?? 'D:\\Google Creative Liberation Engine\\Infusion Engine Brainchild\\brainchild-v5';
const DEFAULT_TOOLS: ClaudeTool[] = ['Read', 'Edit', 'Bash', 'Glob', 'LS'];

// â”€â”€â”€ Env helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Strip inline comments from .env values: "sk-xxx # comment" â†’ "sk-xxx" */
function envKey(name: string): string | undefined {
    const raw = process.env[name];
    if (!raw) return undefined;
    const stripped = raw.split('#')[0]?.trim();
    return stripped || undefined;
}

/** Normalize Ollama host: bare IPs â†’ http://ip:11434 */
function normalizeHost(raw: string): string {
    let h = raw.replace('0.0.0.0', '127.0.0.1');
    if (!h.startsWith('http')) h = `http://${h}`;
    try {
        const u = new URL(h);
        if (!u.port) h = `${h}:11434`;
    } catch { /* leave as-is */ }
    return h;
}

// â”€â”€â”€ Provider Key Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const KEYS = {
    anthropic: envKey('ANTHROPIC_API_KEY'),
    gemini: envKey('GEMINI_API_KEY') || envKey('GOOGLE_API_KEY'),
    perplexity: envKey('PERPLEXITY_API_KEY'),
    openai: envKey('OPENAI_API_KEY'),
};
const OLLAMA_HOST = normalizeHost(envKey('OLLAMA_HOST') ?? '127.0.0.1:11434');

// â”€â”€â”€ Rate Tracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Lightweight in-process tracker: rolling window of latency + error counts
// Used to dynamically de-prioritize misbehaving providers

interface ProviderStats {
    calls: number;
    errors: number;
    totalLatency: number;
    lastError: number; // timestamp
}

const STATS: Record<string, ProviderStats> = {};

function trackCall(provider: string, latency: number, error: boolean) {
    if (!STATS[provider]) {
        STATS[provider] = { calls: 0, errors: 0, totalLatency: 0, lastError: 0 };
    }
    const s = STATS[provider]!;
    s.calls++;
    s.totalLatency += latency;
    if (error) {
        s.errors++;
        s.lastError = Date.now();
    }
}

function providerHealthy(provider: string): boolean {
    const s = STATS[provider];
    if (!s) return true;
    const errorRate = s.calls > 0 ? s.errors / s.calls : 0;
    const recentError = Date.now() - s.lastError < 60_000; // backoff 60s after error
    return errorRate < 0.5 && !recentError;
}

function logStats() {
    const entries = Object.entries(STATS);
    if (entries.length === 0) return;
    console.log('[claude-agent] ðŸ“Š Provider stats:');
    for (const [name, s] of entries) {
        const avg = s.calls > 0 ? Math.round(s.totalLatency / s.calls) : 0;
        const rate = s.calls > 0 ? Math.round((s.errors / s.calls) * 100) : 0;
        console.log(`  ${name}: ${s.calls} calls | avg ${avg}ms | ${rate}% errors`);
    }
}

// â”€â”€â”€ Provider Implementations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ProviderResult = { text: string; model: string; provider: string };

async function callAnthropic(prompt: string, system: string): Promise<ProviderResult> {
    const model = 'claude-3-7-sonnet-20250219';
    const t0 = Date.now();
    try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': KEYS.anthropic!,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model,
                max_tokens: 8192,
                system,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!resp.ok) {
            const body = await resp.text();
            trackCall('anthropic', Date.now() - t0, true);
            throw new Error(`Anthropic ${resp.status}: ${body}`);
        }
        const data = await resp.json() as {
            content: Array<{ type: string; text?: string }>;
        };
        const text = data.content
            .filter((c) => c.type === 'text' && c.text)
            .map((c) => c.text as string)
            .join('');
        trackCall('anthropic', Date.now() - t0, false);
        return { text, model, provider: 'anthropic' };
    } catch (e) {
        trackCall('anthropic', Date.now() - t0, true);
        throw e;
    }
}

async function callGemini(prompt: string, system: string, modelOverride?: string): Promise<ProviderResult> {
    const model = modelOverride ?? 'gemini-2.0-flash';
    const apiKey = KEYS.gemini!;
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const t0 = Date.now();
    try {
        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                // v1 API: prepend system as part of user message
                contents: [
                    { role: 'user', parts: [{ text: `${system}\n\n---\n${prompt}` }] },
                ],
                generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
            }),
        });
        if (!resp.ok) {
            const body = await resp.text();
            trackCall('gemini', Date.now() - t0, true);
            throw new Error(`Gemini ${resp.status}: ${body}`);
        }
        const data = await resp.json() as {
            candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
        trackCall('gemini', Date.now() - t0, false);
        return { text, model, provider: 'googleai' };
    } catch (e) {
        trackCall('gemini', Date.now() - t0, true);
        throw e;
    }
}

async function callPerplexity(prompt: string, system: string, modelOverride?: string): Promise<ProviderResult> {
    // sonar-reasoning-pro: deep reasoning + live web search â€” best for research/planning
    // sonar-pro: fast, massive context â€” best for coding tasks with context
    const model = modelOverride ?? 'sonar-reasoning-pro';
    const t0 = Date.now();
    try {
        const resp = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KEYS.perplexity!}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 8192,
                temperature: 0.2,
            }),
        });
        if (!resp.ok) {
            const body = await resp.text();
            trackCall('perplexity', Date.now() - t0, true);
            throw new Error(`Perplexity ${resp.status}: ${body}`);
        }
        const data = await resp.json() as {
            choices: Array<{ message: { content: string } }>;
            citations?: string[];
        };
        let text = data.choices?.[0]?.message?.content ?? '';
        // Append citations if present (Perplexity unique feature)
        if (data.citations && data.citations.length > 0) {
            text += `\n\n**Sources:** ${data.citations.join(' | ')}`;
        }
        trackCall('perplexity', Date.now() - t0, false);
        return { text, model, provider: 'perplexity' };
    } catch (e) {
        trackCall('perplexity', Date.now() - t0, true);
        throw e;
    }
}

async function callOllama(prompt: string, system: string): Promise<ProviderResult> {
    const model = 'qwen2.5-coder:32b';
    const t0 = Date.now();
    try {
        const resp = await fetch(`${OLLAMA_HOST}/api/chat`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                model,
                stream: false,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: prompt },
                ],
            }),
        });
        if (!resp.ok) {
            const body = await resp.text();
            trackCall('ollama', Date.now() - t0, true);
            throw new Error(`Ollama ${resp.status}: ${body}`);
        }
        const data = await resp.json() as { message: { content: string } };
        trackCall('ollama', Date.now() - t0, false);
        return { text: data.message?.content ?? '', model, provider: 'ollama' };
    } catch (e) {
        trackCall('ollama', Date.now() - t0, true);
        throw e;
    }
}

// â”€â”€â”€ Task-Type â†’ Provider Chain Resolver â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Detects task type from keywords and routes to best provider chain

type TaskType = 'coding' | 'research' | 'fast' | 'legal' | 'general';

function detectTaskType(task: AgentTask): TaskType {
    const text = `${task.title} ${task.context ?? ''} ${task.workstream ?? ''}`.toLowerCase();
    if (/\b(fix|debug|implement|refactor|typescript|code|build|deploy|docker)\b/.test(text)) return 'coding';
    if (/\b(research|search|find|explore|discover|news|trend|current)\b/.test(text)) return 'research';
    if (/\b(legal|contract|compliance|tos|privacy|gdpr)\b/.test(text)) return 'legal';
    if (/\b(classify|tag|label|extract|parse|format)\b/.test(text)) return 'fast';
    return 'general';
}

type CallFn = (prompt: string, system: string) => Promise<ProviderResult>;

function buildProviderChain(taskType: TaskType): Array<{ name: string; fn: CallFn }> {
    type P = { name: string; fn: CallFn };
    const providers: Record<string, P> = {
        anthropic: { name: 'anthropic/claude-3-7-sonnet', fn: callAnthropic },
        gemini: { name: 'googleai/gemini-2.0-flash', fn: callGemini },
        geminiPro: { name: 'googleai/gemini-2.5-pro', fn: (p, s) => callGemini(p, s, 'gemini-2.5-pro-preview-03-25') },
        sonarPro: { name: 'perplexity/sonar-pro', fn: (p, s) => callPerplexity(p, s, 'sonar-pro') },
        sonarR: { name: 'perplexity/sonar-reasoning-pro', fn: callPerplexity },
        ollama: { name: 'ollama/qwen2.5-coder:32b', fn: callOllama },
    };

    // Build chains per task type â€” skip providers without keys
    const chains: Record<TaskType, Array<keyof typeof providers>> = {
        coding: ['anthropic', 'gemini', 'sonarPro', 'ollama'],
        research: ['sonarR', 'gemini', 'anthropic', 'ollama'],
        fast: ['gemini', 'sonarPro', 'anthropic', 'ollama'],
        legal: ['anthropic', 'sonarR', 'geminiPro', 'ollama'],
        general: ['gemini', 'sonarPro', 'anthropic', 'ollama'],
    };

    const hasKey: Record<string, boolean> = {
        anthropic: !!KEYS.anthropic,
        gemini: !!KEYS.gemini,
        geminiPro: !!KEYS.gemini,
        sonarPro: !!KEYS.perplexity,
        sonarR: !!KEYS.perplexity,
        ollama: true, // always available
    };

    return chains[taskType]
        // Only include providers with keys
        .filter((k) => hasKey[k])
        // Apply health check â€” skip recently errored providers
        .filter((k) => providerHealthy(k))
        .map((k) => providers[k]!);
}

// â”€â”€â”€ Smart Fallback Executor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function generateWithSmartFallback(
    prompt: string,
    system: string,
    taskType: TaskType,
): Promise<ProviderResult> {
    const chain = buildProviderChain(taskType);
    const errors: string[] = [];

    if (chain.length === 0) {
        // Fallback: always try Gemini if key present, then Ollama
        if (KEYS.gemini) {
            return callGemini(prompt, system);
        }
        return callOllama(prompt, system);
    }

    console.log(`[claude-agent] Chain (${taskType}): ${chain.map(p => p.name).join(' â†’ ')}`);

    for (const { name, fn } of chain) {
        try {
            console.log(`[claude-agent] â†’ Trying ${name}`);
            const result = await fn(prompt, system);
            logStats(); // emit telemetry after each successful call
            return result;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`${name}: ${msg}`);
            console.warn(`[claude-agent] âš  ${name} failed: ${msg.slice(0, 120)}`);
        }
    }

    logStats();
    throw new Error(
        `[claude-agent] All providers exhausted (${taskType}):\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`
    );
}

// â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function executeClaudeTask(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    const messages: AgentMessage[] = [];
    const taskType = detectTaskType(task);

    console.log(`[claude-agent] â–¶ Task ${task.id} [${taskType}]: "${task.title}"`);
    console.log(`[claude-agent] Keys: anthropic=${!!KEYS.anthropic} gemini=${!!KEYS.gemini} perplexity=${!!KEYS.perplexity}`);

    void fireHeartbeat(task).catch(() => { /* non-blocking */ });

    const system = buildSystemPrompt(task, taskType);
    const prompt = buildAgentPrompt(task);

    try {
        const result = await generateWithSmartFallback(prompt, system, taskType);

        messages.push({ type: 'text', content: result.text });
        messages.push({
            type: 'result',
            result: result.text,
            isError: false,
            numTurns: 1,
            durationMs: Date.now() - startTime,
            subtype: 'success',
        });

        console.log(`[claude-agent] âœ… ${task.id} â† ${result.provider}/${result.model} (${Date.now() - startTime}ms)`);

        return {
            taskId: task.id,
            success: true,
            result: result.text,
            numTurns: 1,
            durationMs: Date.now() - startTime,
            messages,
        };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`[claude-agent] âŒ ${task.id} failed: ${error}`);
        return {
            taskId: task.id,
            success: false,
            result: '',
            numTurns: 0,
            durationMs: Date.now() - startTime,
            messages,
            error,
        };
    }
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PERSONA: Record<TaskType, string> = {
    coding: 'You are IRIS â€” the Executor. You write complete, production TypeScript. Never truncate.',
    research: 'You are ATHENA â€” the Strategist. You synthesize information into actionable recommendations.',
    legal: 'You are VERA â€” the Analyst. You apply rigorous logical reasoning to legal and compliance tasks.',
    fast: 'You are IRIS. Extract structured data precisely. Respond in JSON only.',
    general: 'You are IRIS â€” the Executor of the AVERI collective within the Creative Liberation Engine v5 (GENESIS).',
};

function buildSystemPrompt(task: AgentTask, taskType: TaskType): string {
    return `${PERSONA[taskType]}

## Constitutional Laws
- Article I  (Sovereignty): Prefer local/private solutions over external dependencies.
- Article IV (Quality): TypeScript strict mode, no \`any\` types, complete implementations.
- Article IX (Completeness): Never ship an MVP. Ship complete or don't ship.
- Article XX (Automation): Eliminate manual steps wherever possible.

## Repo Context
Root: ${REPO_ROOT}
Stack: TypeScript, pnpm workspaces, Genkit, Redis, ChromaDB, Docker, Nginx
Dispatch: ${DISPATCH_URL}
Task Type: ${taskType}

## Output Format
1. **Analysis** â€” root cause / what you found
2. **Implementation** â€” complete code/config (no truncation)
3. **Verification** â€” how to confirm correctness
4. **Summary** â€” one-line status`;
}

function buildAgentPrompt(task: AgentTask): string {
    const lines = [
        `## Task: ${task.id}`,
        `**Workstream:** ${task.workstream ?? 'general'}`,
        `**Priority:** ${task.priority ?? 'P2'}`,
        '',
        '## Objective',
        task.title,
    ];
    if (task.context) lines.push('', '## Context', task.context);
    lines.push(
        '',
        '## Available Tools',
        (task.tools ?? DEFAULT_TOOLS).map(t => `- ${t}`).join('\n'),
    );
    return lines.join('\n');
}

async function fireHeartbeat(task: AgentTask): Promise<void> {
    const taskType = detectTaskType(task);
    await fetch(`${DISPATCH_URL}/api/agents/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            agent_id: 'claude-agent',
            workstream: task.workstream ?? 'free',
            current_task: `${task.id}: ${task.title}`,
            task_type: taskType,
            tool: 'smart-load-balancer',
            keys_active: Object.entries(KEYS)
                .filter(([, v]) => !!v)
                .map(([k]) => k),
        }),
    });
}
