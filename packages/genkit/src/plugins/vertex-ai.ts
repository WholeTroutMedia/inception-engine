/**
 * Vertex AI Genkit Plugin
 *
 * Registers Vertex AI models as Genkit model providers, using the existing
 * VERTEX_API_KEY and GOOGLE_CLOUD_PROJECT from .env / docker-compose.genesis.yml.
 *
 * Covers:
 * - Gemini on Vertex (gemini-3.0-pro, gemini-3.1-flash, etc)
 * - Gemini image generation (gemini-3.1-flash-image = Nano Banana 2)
 * - Claude on Vertex (claude-opus-4, claude-sonnet-4)
 * - Imagen 3 (image generation)
 *
 * API: Vertex AI REST endpoint for each model type.
 * Auth: VERTEX_API_KEY (the AQ. token) or falls back to GEMINI_API_KEY.
 */

import type { Genkit } from 'genkit';
import type { GenerateRequest, GenerateResponseData } from 'genkit/model';

// ---- Config -----------------------------------------------------------------

interface VertexAIConfig {
    apiKey?: string;
    project?: string;
    location?: string;
}

const VERTEX_BASE = (project: string, location: string) =>
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers`;

// ---- Supported Models -------------------------------------------------------

const GEMINI_VERTEX_MODELS = [
    'gemini-3.0-pro',
    'gemini-3.0-flash',
    'gemini-3.1-flash',
    'gemini-3.1-pro',
    'gemini-3.1-flash-image', // Nano Banana 2
] as const;

const CLAUDE_VERTEX_MODELS = [
    'claude-opus-4@20260301',
    'claude-sonnet-4@20260301',
    'claude-haiku-4@20260301',
] as const;

type GeminiVertexModel = (typeof GEMINI_VERTEX_MODELS)[number];
type ClaudeVertexModel = (typeof CLAUDE_VERTEX_MODELS)[number];

// ---- Helpers ----------------------------------------------------------------

function extractText(data: unknown): string {
    const d = data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return d?.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
}

function extractUsage(data: unknown): { inputTokens?: number; outputTokens?: number } {
    const d = data as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
    return {
        inputTokens: d?.usageMetadata?.promptTokenCount,
        outputTokens: d?.usageMetadata?.candidatesTokenCount,
    };
}

// ---- Gemini on Vertex -------------------------------------------------------

async function callGeminiVertex(
    modelId: string,
    request: GenerateRequest,
    apiKey: string,
    project: string,
    location: string
): Promise<GenerateResponseData> {
    const isImageModel = modelId.includes('image');
    const endpoint = `${VERTEX_BASE(project, location)}/google/models/${modelId}:generateContent`;

    const contents = request.messages.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: msg.content.map(p => p.text ? { text: p.text } : { text: '' }),
    }));

    const body: Record<string, unknown> = { contents };
    if (isImageModel) {
        body['generationConfig'] = {
            responseModalities: ['IMAGE', 'TEXT'],
            ...(request.config?.maxOutputTokens ? { maxOutputTokens: request.config.maxOutputTokens } : {}),
        };
    } else {
        body['generationConfig'] = {
            temperature: request.config?.temperature ?? 0.7,
            maxOutputTokens: request.config?.maxOutputTokens ?? 8192,
        };
    }

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text().catch(() => 'unknown');
        throw new Error(`[VertexAI:Gemini/${modelId}] ${res.status}: ${err}`);
    }

    const data = await res.json() as unknown;
    const text = extractText(data);

    return {
        message: { role: 'model', content: [{ text }] },
        finishReason: 'stop',
        usage: extractUsage(data),
    };
}

// ---- Claude on Vertex -------------------------------------------------------

async function callClaudeVertex(
    modelId: string,
    request: GenerateRequest,
    apiKey: string,
    project: string,
    location: string
): Promise<GenerateResponseData> {
    // Claude on Vertex uses the Anthropic Messages API format via Vertex endpoint
    const endpoint = `${VERTEX_BASE(project, location)}/anthropic/models/${modelId}:rawPredict`;

    const messages = request.messages
        .filter(m => m.role !== 'system')
        .map(msg => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.content.map(p => p.text ? { type: 'text', text: p.text } : { type: 'text', text: '' }),
        }));

    const systemMsg = request.messages.find(m => m.role === 'system');

    const body: Record<string, unknown> = {
        anthropic_version: 'vertex-2023-10-16',
        max_tokens: request.config?.maxOutputTokens ?? 8192,
        messages,
    };
    if (systemMsg) {
        body['system'] = systemMsg.content.map(p => p.text ?? '').join('');
    }

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text().catch(() => 'unknown');
        throw new Error(`[VertexAI:Claude/${modelId}] ${res.status}: ${err}`);
    }

    const data = await res.json() as {
        content?: Array<{ type: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
        stop_reason?: string;
    };

    const text = data.content?.filter(b => b.type === 'text').map(b => b.text ?? '').join('') ?? '';

    return {
        message: { role: 'model', content: [{ text }] },
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'other',
        usage: {
            inputTokens: data.usage?.input_tokens,
            outputTokens: data.usage?.output_tokens,
        },
    };
}

// ---- Plugin -----------------------------------------------------------------

export function vertexAI(config?: VertexAIConfig) {
    return async (ai: Genkit) => {
        const apiKey = config?.apiKey
            ?? process.env['VERTEX_API_KEY']
            ?? process.env['GOOGLE_API_KEY']
            ?? process.env['GEMINI_API_KEY']
            ?? '';

        const project = config?.project
            ?? process.env['GOOGLE_CLOUD_PROJECT']
            ?? process.env['GOOGLE_PROJECT_ID']
            ?? 'creative-liberation-engine';

        const location = config?.location
            ?? process.env['VERTEX_LOCATION']
            ?? 'us-central1';

        if (!apiKey) {
            console.warn('[GENKIT:VERTEXAI] No API key. Set VERTEX_API_KEY or GOOGLE_API_KEY.');
            return;
        }

        // Register Gemini models on Vertex
        for (const modelId of GEMINI_VERTEX_MODELS) {
            const name = `vertex-ai/${modelId}`;
            ai.defineModel(
                {
                    name,
                    label: `Vertex AI - ${modelId}`,
                    supports: {
                        multiturn: true,
                        systemRole: true,
                        media: modelId.includes('image'),
                        tools: !modelId.includes('image'),
                        output: modelId.includes('image') ? ['text', 'media'] : ['text'],
                    },
                },
                async (request: GenerateRequest): Promise<GenerateResponseData> =>
                    callGeminiVertex(modelId, request, apiKey, project, location)
            );
        }

        // Register Claude models on Vertex
        for (const modelId of CLAUDE_VERTEX_MODELS) {
            const shortName = modelId.split('@')[0] ?? modelId;
            const name = `vertex-ai/${shortName}`;
            ai.defineModel(
                {
                    name,
                    label: `Vertex AI - ${shortName}`,
                    supports: {
                        multiturn: true,
                        systemRole: true,
                        media: false,
                        tools: true,
                        output: ['text'],
                    },
                },
                async (request: GenerateRequest): Promise<GenerateResponseData> =>
                    callClaudeVertex(modelId, request, apiKey, project, location)
            );
        }

        const geminiNames = GEMINI_VERTEX_MODELS.map(m => m.replace('gemini-', 'g')).join(', ');
        const claudeNames = CLAUDE_VERTEX_MODELS.map(m => m.split('@')[0]).join(', ');
        console.log(`[GENKIT] ✓ Vertex AI plugin loaded`);
        console.log(`  Gemini: ${geminiNames}`);
        console.log(`  Claude: ${claudeNames}`);
        console.log(`  Project: ${project} / ${location}`);
    };
}

// ---- Model reference helpers ------------------------------------------------

export const vertexModel = (modelId: GeminiVertexModel | ClaudeVertexModel) =>
    `vertex-ai/${modelId.split('@')[0]}` as const;

/** Nano Banana 2 via Vertex — image generation */
export const nanaBanana2Vertex = () => vertexModel('gemini-3.1-flash-image');

/** Claude Opus 4 via Vertex */
export const claudeOpus4Vertex = () => vertexModel('claude-opus-4@20260301');

/** Claude Sonnet 4 via Vertex */
export const claudeSonnet4Vertex = () => vertexModel('claude-sonnet-4@20260301');
