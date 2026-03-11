/**
 * Creative Liberation Engine v5 — Genkit Unified Provider Orchestration
 *
 * The single source of truth for all AI model interactions across
 * the Creative Liberation Engine ecosystem. Replaces hand-rolled provider
 * wrappers with production-ready Genkit plugins.
 *
 * Constitutional Compliance: Article II (Sovereignty), Article III (Human Supremacy)
 */

import 'dotenv/config';
import { memoryBus } from '@inception/memory';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { anthropic } from '@genkit-ai/anthropic';
import { openAI } from '@genkit-ai/compat-oai/openai';
import { deepSeek } from '@genkit-ai/compat-oai/deepseek';
import { xAI } from '@genkit-ai/compat-oai/xai';
import { ollama } from 'genkitx-ollama';
import { perplexity } from './plugins/perplexity.js';
import { vertexAI } from './plugins/vertex-ai.js';

// ---------------------------------------------------------------------------
// Provider Plugin Initialization
// ---------------------------------------------------------------------------

// Build plugin array dynamically based on available API keys
// NOTE: DeepSeek and xAI don't have official Genkit plugins yet.
// They can be added via @genkit-ai/compat-oai (OpenAI-compatible) when needed.
const plugins: any[] = [];

// Google AI (Gemini) — Primary provider
if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    plugins.push(
        googleAI({
            apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        })
    );
    console.log('[GENKIT] ✓ Google AI (Gemini) plugin loaded');
}

// Anthropic (Claude)
if (process.env.ANTHROPIC_API_KEY) {
    plugins.push(anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
    console.log('[GENKIT] ✓ Anthropic (Claude) plugin loaded');
}

// OpenAI (GPT-4o)
if (process.env.OPENAI_API_KEY) {
    plugins.push(openAI({ apiKey: process.env.OPENAI_API_KEY }));
    console.log('[GENKIT] ✓ OpenAI (GPT-4o) plugin loaded');
}

// Perplexity (Sonar models -- custom plugin)
if (process.env.PERPLEXITY_API_KEY) {
    plugins.push(perplexity({ apiKey: process.env.PERPLEXITY_API_KEY }));
    console.log('[GENKIT] ✓ Perplexity (Sonar) plugin loaded');
}

// Vertex AI -- Gemini on Vertex + Claude on Vertex + Nano Banana 2
// Uses VERTEX_API_KEY (AQ. token) for all Vertex model calls
if (process.env.VERTEX_API_KEY || process.env.GOOGLE_API_KEY) {
    plugins.push(vertexAI({
        apiKey: process.env.VERTEX_API_KEY || process.env.GOOGLE_API_KEY,
        project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID || 'creative-liberation-engine',
        location: process.env.VERTEX_LOCATION || 'us-central1',
    }));
    console.log('[GENKIT] ✓ Vertex AI plugin loaded (Gemini on Vertex + Claude on Vertex)');
    console.log('[GENKIT]   Models: gemini-3.1-flash-image, claude-opus-4, claude-sonnet-4 + more');
}

// DeepSeek
if (process.env.DEEPSEEK_API_KEY) {
    plugins.push(deepSeek({ apiKey: process.env.DEEPSEEK_API_KEY }));
    console.log('[GENKIT] ✓ DeepSeek plugin loaded');
}

// xAI (Grok)
if (process.env.XAI_API_KEY) {
    plugins.push(xAI({ apiKey: process.env.XAI_API_KEY }));
    console.log('[GENKIT] ✓ xAI (Grok) plugin loaded');
}

// Ollama (Local models — offline sovereignty layer)
// Models registered here MUST be pulled via `ollama pull <name>` first.
// - qwen2.5-coder:32b  → 19GB, coding agent (pulled ✅)
// - nomic-embed-text   → 274MB, embeddings for ChromaDB (pulled ✅)
// - gemma3:27b         → pulling...
// - llama3.3:70b-q4    → large, requires RAM offload
const ollamaHost = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';

// Models that are confirmed pulled — update this as you pull more
export const LOCAL_MODEL_IDS = {
    code: 'qwen2.5-coder:32b',   // primary coding agent
    fast: 'gemma3:27b',          // fast general (pulling)
    large: 'llama3.3:70b-instruct-q4_K_M', // huge, RAM-offload
    embed: 'nomic-embed-text',    // local embeddings
} as const;

plugins.push(
    ollama({
        models: [
            // Code + reasoning — primary local model
            { name: LOCAL_MODEL_IDS.code, type: 'generate' },
            // Fast general tasks
            { name: LOCAL_MODEL_IDS.fast, type: 'generate' },
            // Heavy tasks (will auto offload to 128GB RAM)
            { name: LOCAL_MODEL_IDS.large, type: 'generate' },
            // Embeddings — feeds ChromaDB memory bus
            { name: LOCAL_MODEL_IDS.embed, type: 'generate' as const },
        ],
        serverAddress: ollamaHost,
    })
);
console.log(`[GENKIT] ✓ Ollama plugin loaded → ${ollamaHost}`);
console.log(`[GENKIT]   Code: ${LOCAL_MODEL_IDS.code} | Embed: ${LOCAL_MODEL_IDS.embed}`);

// Log warning if no cloud providers configured
if (plugins.length <= 1) {
    console.warn(
        '[GENKIT] ⚠ Only Ollama configured. Set GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY for cloud providers.'
    );
}

// ---------------------------------------------------------------------------
// Genkit Instance
// ---------------------------------------------------------------------------

// Deduplicate and filter any undefined/null plugins to prevent Genkit registry errors
// (Can happen if custom plugins return undefined name, or if both googleAI + vertexAI
//  are conditionally added via the same GOOGLE_API_KEY env var)
const seenPluginNames = new Set<string>();
const validPlugins = plugins.filter((p: any) => {
    if (!p) return false;
    const name = p?.name ?? p?.info?.name;
    if (!name) {
        console.warn('[GENKIT] ⚠️  Filtered out a plugin with undefined name from registry');
        return false;
    }
    if (seenPluginNames.has(name)) {
        console.warn(`[GENKIT] ⚠️  Filtered duplicate plugin: ${name}`);
        return false;
    }
    seenPluginNames.add(name);
    return true;
});
console.log('[GENKIT] Plugins array types:', validPlugins.map((p: any) => typeof p));
export const ai = genkit({
    plugins: validPlugins,
});

console.log(`[GENKIT] 🚀 Creative Liberation Engine provider runtime initialized (${plugins.length} plugins)`);

// ── VERA: log boot event to inception-memory ──────────────────────────────
try {
    memoryBus.logBoot(
        'creative-liberation-engine-v5',
        '5.0.0',
        0, // Genkit initializes synchronously; boot time captured at import
        { plugins: plugins.length, ollamaHost },
    );
} catch (_e) {
    // Never block provider init
    console.warn('[GENKIT] MemoryBus boot log skipped:', _e);
}

// ---------------------------------------------------------------------------
// Re-exports for consumers
// ---------------------------------------------------------------------------

export { googleAI } from '@genkit-ai/google-genai';
export { anthropic } from '@genkit-ai/anthropic';
export { openAI } from '@genkit-ai/compat-oai/openai';
export { deepSeek } from '@genkit-ai/compat-oai/deepseek';
export { xAI } from '@genkit-ai/compat-oai/xai';
export { ollama } from 'genkitx-ollama';
export { z } from 'genkit';
export { generateWithFallback, FALLBACK_CHAINS } from './middleware/circuit-breaker.js';
export { generateWithCache } from './middleware/semantic-cache.js';
// Model registry — capability tiers, env-driven, no version strings in code
export { resolveModel, isLocalTier, logModelRegistry, MODEL_REGISTRY } from './config/model-registry.js';
export type { ModelTier, CloudTier, LocalTier } from './config/model-registry.js';
// Smart model router — classify → tier → model
export { smartRoute, logRouting } from './middleware/smart-router.js';
export type { RoutingDecision } from './middleware/smart-router.js';
// Local Ollama providers — sovereignty layer
export { localGenerate, localStream, checkOllamaHealth, LOCAL_MODELS } from './local-providers.js';
export type { LocalModelCapability } from './local-providers.js';
// Note: Flow imports are handled in server.ts only to avoid ESM circular dependencies.
// Do NOT re-export flows from this index as they import `ai` from this module.
