/**
 * Nano Banana 2 Provider — Scroll Animation Pipeline
 *
 * Nano Banana 2 = Gemini 3.1 Flash Image (gemini-3.1-flash-image)
 * Released February 2026 by Google DeepMind.
 * Docs: https://ai.google.dev/gemini-api/docs/image-generation
 *
 * Role in the pipeline:
 *   Prompt -> [Nano Banana 2] -> reference images at each scroll position
 *          -> [Kling 3.0]     -> video segments per position
 *          -> [FFMPEG]        -> assembled WEBP scroll manifest
 *
 * Auth: GEMINI_API_KEY (already in .env and docker-compose.genesis.yml)
 */

const GEMINI_API_KEY = process.env['GEMINI_API_KEY'] ?? '';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const NB_MODEL = 'gemini-3.1-flash-image'; // Nano Banana 2

// ---- Types ------------------------------------------------------------------

export interface ScrollFrame {
    /** Index in the scroll sequence (0 = top, n = bottom) */
    index: number;
    /** Normalized scroll position 0.0 to 1.0 */
    scrollPosition: number;
    /** Base64-encoded image data from Nano Banana 2 */
    imageBase64: string;
    /** MIME type returned by Gemini (image/png) */
    mimeType: string;
    /** Human-readable description from the model */
    description: string;
}

export interface NanaBananaGenerateOptions {
    /** Main creative prompt -- describes the subject/scene */
    prompt: string;
    /** Number of distinct scroll positions to generate (default: 6) */
    frameCount?: number;
    /** Overall animation style */
    style?: 'cinematic' | 'geometric' | 'organic' | 'tech';
    /** Target aspect ratio for generated images */
    aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
}

// ---- Gemini API response shapes ---------------------------------------------

interface GeminiImagePart {
    inlineData: { mimeType: string; data: string };
}

interface GeminiTextPart {
    text: string;
}

interface GeminiResponse {
    candidates: Array<{
        content: { parts: (GeminiImagePart | GeminiTextPart)[] };
    }>;
}

// ---- Mock fallback ----------------------------------------------------------

function generateMockFrame(index: number, total: number, prompt: string): ScrollFrame {
    const scrollPosition = index / Math.max(total - 1, 1);
    const hue = Math.round(scrollPosition * 360);
    const label = `[MOCK] Frame ${index + 1}/${total} - ${prompt.slice(0, 40)}`;
    const svg = [
        "<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'>",
        `<rect width='100%' height='100%' fill='hsl(${hue},40%,12%)'/>`,
        `<text x='50%' y='50%' fill='hsl(${hue},80%,70%)' font-size='28'`,
        ` text-anchor='middle' font-family='monospace'>${label}</text>`,
        '</svg>',
    ].join('');
    return {
        index,
        scrollPosition,
        imageBase64: Buffer.from(svg).toString('base64'),
        mimeType: 'image/svg+xml',
        description: `[MOCK] Scroll frame ${index + 1} at ${Math.round(scrollPosition * 100)}%`,
    };
}

// ---- NanaBananaProvider -----------------------------------------------------

export class NanaBananaProvider {
    private readonly isLive: boolean;

    constructor() {
        this.isLive = Boolean(GEMINI_API_KEY);
        if (!this.isLive) {
            console.warn(
                '[NanaBanana2] GEMINI_API_KEY not set -- using mock frame generator.'
            );
        } else {
            console.log(`[NanaBanana2] Live mode -- model: ${NB_MODEL}`);
        }
    }

    /**
     * Generate a sequence of reference images across the scroll journey.
     * Each frame represents a distinct visual state at a scroll position.
     * These images are then passed to KlingProvider for video generation.
     */
    async generateScrollFrames(opts: NanaBananaGenerateOptions): Promise<ScrollFrame[]> {
        const frameCount = opts.frameCount ?? 6;
        const style = opts.style ?? 'cinematic';
        const aspect = opts.aspectRatio ?? '16:9';

        if (!this.isLive) {
            await new Promise<void>(r => setTimeout(r, 300));
            return Array.from({ length: frameCount }, (_, i) =>
                generateMockFrame(i, frameCount, opts.prompt)
            );
        }

        const frames: ScrollFrame[] = [];

        for (let i = 0; i < frameCount; i++) {
            const scrollPosition = i / Math.max(frameCount - 1, 1);

            const framePrompt = [
                opts.prompt,
                `Style: ${style}.`,
                `Frame ${i + 1} of ${frameCount} in a scroll animation.`,
                `Scroll position: ${Math.round(scrollPosition * 100)}%.`,
                this.describeScrollState(scrollPosition),
                `Aspect ratio: ${aspect}. Production-ready. No text overlays.`,
            ].join(' ');

            const frame = await this.callGemini(framePrompt, i, scrollPosition);
            frames.push(frame);

            // Respect Google AI Studio preview rate limit (~2 req/s)
            if (i < frameCount - 1) {
                await new Promise<void>(r => setTimeout(r, 600));
            }
        }

        return frames;
    }

    private describeScrollState(pos: number): string {
        if (pos === 0) return 'Opening reveal, establishing shot.';
        if (pos >= 0.9) return 'Finale, climactic final composition.';
        if (pos < 0.33) return 'Early sequence, elements entering frame.';
        if (pos < 0.66) return 'Mid-sequence, peak complexity.';
        return 'Late sequence, resolving composition.';
    }

    private async callGemini(
        prompt: string,
        index: number,
        scrollPosition: number
    ): Promise<ScrollFrame> {
        const url = `${GEMINI_API_BASE}/${NB_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
            }),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => 'unknown');
            throw new Error(`[NanaBanana2] Gemini API ${res.status}: ${body}`);
        }

        const data = (await res.json()) as GeminiResponse;
        const parts = data.candidates[0]?.content?.parts ?? [];

        const imagePart = parts.find((p): p is GeminiImagePart => 'inlineData' in p);
        const textPart = parts.find((p): p is GeminiTextPart => 'text' in p);

        if (!imagePart) {
            throw new Error(`[NanaBanana2] No image in response for frame ${index}`);
        }

        return {
            index,
            scrollPosition,
            imageBase64: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
            description: textPart?.text ?? `Frame at ${Math.round(scrollPosition * 100)}%`,
        };
    }
}

export const nanaBananaProvider = new NanaBananaProvider();
