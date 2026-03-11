/**
 * Provider Plugin Initialization Tests
 *
 * Verifies that each Genkit plugin initializes without errors.
 * These tests run without API keys — they verify plugin loading, not API calls.
 */

import { describe, it, expect } from 'vitest';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { anthropic } from '@genkit-ai/anthropic';
import { openAI } from '@genkit-ai/compat-oai/openai';
import { deepSeek } from '@genkit-ai/compat-oai/deepseek';
import { xAI } from '@genkit-ai/compat-oai/xai';
import { ollama } from 'genkitx-ollama';

describe('Provider Plugin Initialization', () => {
    it('should initialize Genkit with Google AI plugin', () => {
        const ai = genkit({
            plugins: [
                googleAI({ apiKey: 'test-key' }),
            ],
        });
        expect(ai).toBeDefined();
        expect(ai.generate).toBeTypeOf('function');
    });

    it('should initialize Genkit with Anthropic plugin', () => {
        const ai = genkit({
            plugins: [
                anthropic({ apiKey: 'test-key' }),
            ],
        });
        expect(ai).toBeDefined();
    });

    it('should initialize Genkit with OpenAI plugin', () => {
        const ai = genkit({
            plugins: [
                openAI({ apiKey: 'test-key' }),
            ],
        });
        expect(ai).toBeDefined();
    });

    it('should initialize Genkit with DeepSeek plugin', () => {
        const ai = genkit({
            plugins: [
                deepSeek({ apiKey: 'test-key' }),
            ],
        });
        expect(ai).toBeDefined();
    });

    it('should initialize Genkit with xAI plugin', () => {
        const ai = genkit({
            plugins: [
                xAI({ apiKey: 'test-key' }),
            ],
        });
        expect(ai).toBeDefined();
    });

    it('should initialize Genkit with Ollama plugin', () => {
        const ai = genkit({
            plugins: [
                ollama({
                    models: [{ name: 'llama3.2', type: 'generate' }],
                    serverAddress: 'http://127.0.0.1:11434',
                }),
            ],
        });
        expect(ai).toBeDefined();
    });

    it('should initialize Genkit with all plugins simultaneously', () => {
        const ai = genkit({
            plugins: [
                googleAI({ apiKey: 'test-key' }),
                anthropic({ apiKey: 'test-key' }),
                openAI({ apiKey: 'test-key' }),
                deepSeek({ apiKey: 'test-key' }),
                xAI({ apiKey: 'test-key' }),
                ollama({
                    models: [
                        { name: 'llama3.2', type: 'generate' },
                        { name: 'gemma3', type: 'generate' },
                    ],
                    serverAddress: 'http://127.0.0.1:11434',
                }),
            ],
        });
        expect(ai).toBeDefined();
        expect(ai.generate).toBeTypeOf('function');
        expect(ai.defineFlow).toBeTypeOf('function');
        expect(ai.defineTool).toBeTypeOf('function');
    });
});
