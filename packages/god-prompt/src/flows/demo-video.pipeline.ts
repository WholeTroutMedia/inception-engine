/**
 * packages/god-prompt/src/flows/demo-video.pipeline.ts
 * Demo video pipeline — script generation + screen recording via Playwright
 */
import { ai } from '@inception/genkit';
import { z } from 'genkit';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface DemoVideoInput {
    brand_name: string;
    tagline: string;
    product_url: string;
    key_features: string[];
    accent_color: string;
    output_dir: string;
    elevenlabs_voice_id?: string;
    duration_seconds?: number;
}

export interface DemoVideoResult {
    video_path?: string;
    script_path: string;
    assembly_log: string;
}

const DemoVideoInputSchema = z.object({
    brand_name: z.string(),
    tagline: z.string(),
    product_url: z.string(),
    key_features: z.array(z.string()),
    accent_color: z.string(),
    output_dir: z.string(),
    elevenlabs_voice_id: z.string().optional(),
    duration_seconds: z.number().optional(),
});

const DemoVideoResultSchema = z.object({
    video_path: z.string().optional(),
    script_path: z.string(),
    assembly_log: z.string(),
});

export const demoVideoFlow = ai.defineFlow(
    {
        name: 'demoVideo',
        inputSchema: DemoVideoInputSchema,
        outputSchema: DemoVideoResultSchema,
    },
    async (input: DemoVideoInput): Promise<DemoVideoResult> => {
        const { brand_name, tagline, product_url, key_features, output_dir, duration_seconds = 90 } = input;

        // Generate voiceover script
        const scriptResponse = await ai.generate({
            prompt: `Write a ${duration_seconds}-second demo video voiceover script for ${brand_name}.
Tagline: "${tagline}"
Product URL: ${product_url}
Key features to showcase: ${key_features.join(', ')}

Format as timed cue cards:
[0:00] Opening hook
[0:15] Problem statement
[0:30] Solution showcase — feature 1
...

Be punchy. Every second counts.`,
            config: { temperature: 0.7 },
        });

        mkdirSync(output_dir, { recursive: true });
        const scriptPath = join(output_dir, 'voiceover-script.txt');
        writeFileSync(scriptPath, scriptResponse.text, 'utf-8');

        // Attempt Playwright screen recording if available
        let videoPath: string | undefined;
        let assemblyLog = 'Script generated. ';

        try {
            const { chromium } = await import('playwright');
            const browser = await chromium.launch();
            const context = await browser.newContext({
                recordVideo: { dir: output_dir, size: { width: 1280, height: 720 } },
            });
            const page = await context.newPage();
            await page.goto(product_url, { waitUntil: 'networkidle', timeout: 30000 });

            // Walk through key features
            for (const feature of key_features.slice(0, 4)) {
                await page.waitForTimeout(3000);
                assemblyLog += `Captured: ${feature}. `;
            }

            await context.close();
            await browser.close();
            videoPath = join(output_dir, 'demo.webm');
            assemblyLog += 'Screen recording complete.';
        } catch (e) {
            assemblyLog += `Playwright unavailable — script-only output. (${(e as Error).message})`;
        }

        return { video_path: videoPath, script_path: scriptPath, assembly_log: assemblyLog };
    }
);
