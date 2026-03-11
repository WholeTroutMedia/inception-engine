/**
 * VisionModel — Screenshot → Gemini Flash vision analysis pipeline.
 * Primary: POST to Genkit server at :4100/vision
 * Fallback: direct @google/generative-ai SDK if Genkit offline.
 */

const GENKIT_URL = process.env.GENKIT_URL ?? "http://localhost:4100";
const GENKIT_VISION_URL = `${GENKIT_URL}/vision`;

export interface VisionResult {
    description: string;
    model: string;
    tokens?: number;
}

export class VisionModel {
    async analyze(base64Image: string, prompt: string): Promise<string> {
        const genkitResult = await this.tryGenkitVision(GENKIT_VISION_URL, base64Image, prompt);
        if (genkitResult) return genkitResult.description;

        // Fallback: try Google AI directly via env key
        const apiKey = process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
        if (apiKey) {
            return this.analyzeViaGeminiDirect(base64Image, prompt, apiKey);
        }

        return "[Vision unavailable: Genkit offline and no GOOGLE_AI_API_KEY set. Set env var or run /start-engine]";
    }

    private async tryGenkitVision(url: string, base64Image: string, prompt: string): Promise<VisionResult | null> {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: base64Image, prompt, mimeType: "image/png" }),
                signal: AbortSignal.timeout(15000),
            });
            if (!res.ok) return null;
            const data = await res.json() as { description?: string; text?: string; model?: string };
            return {
                description: data.description ?? data.text ?? "",
                model: data.model ?? "gemini-flash",
            };
        } catch {
            return null;
        }
    }

    private async analyzeViaGeminiDirect(base64Image: string, prompt: string, apiKey: string): Promise<string> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const body = {
            contents: [{
                parts: [
                    { inlineData: { mimeType: "image/png", data: base64Image } },
                    { text: prompt },
                ],
            }],
        };

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) {
            throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
        }

        const data = await res.json() as {
            candidates?: Array<{ content: { parts: Array<{ text?: string }> } }>;
        };
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[No response from Gemini]";
    }
}
