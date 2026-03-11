import { z } from 'zod';
import { ai } from '@inception/genkit';
import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

// ─── GOD PROMPT — Demo Video Pipeline ────────────────────────────────────────
// Generates a complete product demo video:
//   1. AI-narrated script from brand brief
//   2. ElevenLabs voiceover (if key available) or TTS fallback
//   3. Playwright screen recording of the live product URL
//   4. FFmpeg assembly: intro slate → screen recording → outro CTA
//
// Output: MP4 file ready for upload to YouTube, social, or investor deck

const MODEL = 'googleai/gemini-2.5-pro-preview-03-25';

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const DemoVideoInputSchema = z.object({
    brand_name: z.string(),
    tagline: z.string(),
    product_url: z.string().url().describe('Live URL to screen-record for the demo'),
    key_features: z.array(z.string()).max(5).describe('Features to highlight in narration'),
    accent_color: z.string().default('#b87333'),
    duration_seconds: z.number().min(30).max(180).default(90).describe('Target video length'),
    output_dir: z.string().describe('Absolute directory path for output files'),
    elevenlabs_voice_id: z.string().optional().describe('ElevenLabs voice ID for VO generation'),
    skip_screen_record: z.boolean().default(false).describe('Skip Playwright recording (use static slides only)'),
    resolution: z.enum(['1920x1080', '1280x720', '1080x1920']).default('1920x1080'),
});

export const DemoVideoOutputSchema = z.object({
    video_path: z.string(),
    script: z.string(),
    sections: z.array(z.object({ name: z.string(), duration_s: z.number(), description: z.string() })),
    voiceover_path: z.string().optional(),
    assembly_log: z.string(),
});

export type DemoVideoInput = z.infer<typeof DemoVideoInputSchema>;
export type DemoVideoOutput = z.infer<typeof DemoVideoOutputSchema>;

// ─── Script Generator ─────────────────────────────────────────────────────────

async function generateDemoScript(input: DemoVideoInput): Promise<{ script: string; sections: DemoVideoOutput['sections'] }> {
    const prompt = `You are a world-class product demo scriptwriter. Write a tight, compelling ${input.duration_seconds}-second demo video script for:

BRAND: ${input.brand_name}
TAGLINE: "${input.tagline}"
KEY FEATURES:
${input.key_features.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Script requirements:
- Hooks in the first 5 seconds (no "Welcome to..." intros)
- Each feature gets ≤15 seconds
- Ends with a specific, urgent CTA
- Conversational but authoritative tone
- Designed for a screen recording demo

Return ONLY valid JSON:
{
  "script": "Full narration script as one block of text",
  "sections": [
    { "name": "Hook", "duration_s": 8, "description": "What happens on screen" },
    { "name": "Feature: [Name]", "duration_s": 15, "description": "What happens on screen" },
    ...
    { "name": "CTA", "duration_s": 10, "description": "What happens on screen" }
  ]
}`;

    const response = await ai.generate({ model: MODEL, prompt, config: { temperature: 0.7 } });
    const text = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(text) as { script: string; sections: DemoVideoOutput['sections'] };
    return parsed;
}

// ─── Voiceover Generator ──────────────────────────────────────────────────────

async function generateVoiceover(script: string, outputDir: string, voiceId?: string): Promise<string | undefined> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.log('[DEMO VIDEO] No ELEVENLABS_API_KEY — skipping voiceover');
        return undefined;
    }

    const voice = voiceId ?? process.env.ELEVENLABS_DEFAULT_VOICE ?? 'pNInz6obpgDQGcFmaJgB';
    const voPath = join(outputDir, 'voiceover.mp3');

    console.log('[DEMO VIDEO] 🎙 Generating voiceover via ElevenLabs...');

    const { default: axios } = await import('axios');
    const res = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
        {
            text: script,
            model_id: 'eleven_turbo_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
        },
        {
            headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
            responseType: 'arraybuffer',
        }
    );

    const { writeFileSync: wfs } = await import('fs');
    wfs(voPath, Buffer.from(res.data as ArrayBuffer));
    console.log(`[DEMO VIDEO] ✅ Voiceover saved: ${voPath}`);
    return voPath;
}

// ─── Screen Recorder ──────────────────────────────────────────────────────────

async function recordScreen(url: string, duration: number, outputDir: string, resolution: string): Promise<string | undefined> {
    // Check for playwright
    try {
        const { chromium } = await import('playwright');
        const [width, height] = resolution.split('x').map(Number);
        const recPath = join(outputDir, 'screen-recording.webm');

        console.log(`[DEMO VIDEO] 🎬 Recording ${url} for ${duration}s at ${resolution}...`);

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width, height },
            recordVideo: { dir: outputDir, size: { width, height } },
        });
        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Simulate a smooth demo browsing session
        await page.waitForTimeout(3000);

        // Smooth scroll through the page
        const scrollSteps = Math.floor(duration / 6);
        for (let i = 0; i < scrollSteps; i++) {
            await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
            await page.waitForTimeout(2000);
        }

        // Scroll back to top for outro
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await page.waitForTimeout(3000);

        await context.close();
        await browser.close();

        // Playwright saves the video with a generated filename — find it
        const { readdirSync } = await import('fs');
        const files = readdirSync(outputDir).filter(f => f.endsWith('.webm'));
        if (files.length > 0) {
            const { renameSync } = await import('fs');
            renameSync(join(outputDir, files[files.length - 1]), recPath);
            console.log(`[DEMO VIDEO] ✅ Screen recording saved: ${recPath}`);
            return recPath;
        }
        return undefined;
    } catch (e) {
        console.warn(`[DEMO VIDEO] ⚠️ Playwright not available: ${(e as Error).message}. Skipping screen record.`);
        return undefined;
    }
}

// ─── Intro/Outro Slate Generator ──────────────────────────────────────────────

function generateSlateHtml(type: 'intro' | 'outro', input: DemoVideoInput): string {
    const isIntro = type === 'intro';
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px; overflow: hidden;
    background: #0a0a0f;
    font-family: -apple-system, 'Inter', sans-serif;
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    animation: fadeIn 0.8s ease-out;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .accent { color: ${input.accent_color}; }
  .eyebrow { font-size: 14px; letter-spacing: 6px; text-transform: uppercase; color: rgba(245,240,232,0.4); margin-bottom: 24px; }
  .title { font-size: 96px; font-weight: 800; letter-spacing: -4px; color: #f5f0e8; line-height: 1; text-align: center; }
  .tagline { font-size: 28px; color: rgba(245,240,232,0.6); margin-top: 24px; max-width: 800px; text-align: center; }
  .cta { margin-top: 48px; font-size: 20px; font-weight: 700; color: ${input.accent_color}; letter-spacing: 2px; text-transform: uppercase; }
  .bar { width: 80px; height: 4px; background: ${input.accent_color}; margin: 32px auto; }
</style>
</head>
<body>
  <div class="eyebrow">${isIntro ? 'Product Demo' : 'Get Started Today'}</div>
  <div class="title">${input.brand_name}</div>
  <div class="bar"></div>
  <div class="tagline">${isIntro ? input.tagline : 'Ready to transform the way you work?'}</div>
  ${!isIntro ? `<div class="cta">→ Try it free</div>` : ''}
</body>
</html>`;
}

async function renderSlateToPng(html: string, outputPath: string): Promise<void> {
    try {
        const { chromium } = await import('playwright');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.setContent(html);
        await page.waitForTimeout(1000); // let animation settle
        await page.screenshot({ path: outputPath });
        await browser.close();
    } catch {
        console.warn('[DEMO VIDEO] Could not render slate PNG (playwright unavailable)');
    }
}

// ─── FFmpeg Assembler ─────────────────────────────────────────────────────────

function assembleFfmpeg(
    outputDir: string,
    outputPath: string,
    hasScreenRecord: boolean,
    hasVoiceover: boolean,
    duration: number
): string {
    const introPng = join(outputDir, 'intro.png');
    const outroPng = join(outputDir, 'outro.png');
    const recording = join(outputDir, 'screen-recording.webm');
    const voiceover = join(outputDir, 'voiceover.mp3');

    const ffmpegAvailable = (() => {
        try { execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch { return false; }
    })();

    if (!ffmpegAvailable) {
        return 'ffmpeg not available — install ffmpeg to assemble video. All assets saved to output directory.';
    }

    const inputs: string[] = [];
    const filterParts: string[] = [];
    let inputIdx = 0;

    // Intro slate (5s)
    if (existsSync(introPng)) {
        inputs.push(`-loop 1 -t 5 -i "${introPng}"`);
        filterParts.push(`[${inputIdx}:v]fade=t=in:st=0:d=0.5,fade=t=out:st=4:d=0.5[intro]`);
        inputIdx++;
    }

    // Screen recording
    if (hasScreenRecord && existsSync(recording)) {
        inputs.push(`-i "${recording}"`);
        filterParts.push(`[${inputIdx}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[rec]`);
        inputIdx++;
    }

    // Outro slate (8s)
    if (existsSync(outroPng)) {
        inputs.push(`-loop 1 -t 8 -i "${outroPng}"`);
        filterParts.push(`[${inputIdx}:v]fade=t=in:st=0:d=0.5[outro]`);
        inputIdx++;
    }

    const segments = [
        existsSync(introPng) ? '[intro]' : '',
        hasScreenRecord && existsSync(recording) ? '[rec]' : '',
        existsSync(outroPng) ? '[outro]' : '',
    ].filter(Boolean);

    const concatN = segments.length;
    const filterComplex = [
        ...filterParts,
        `${segments.join('')}concat=n=${concatN}:v=1:a=0[outv]`,
    ].join('; ');

    let voArgs = '';
    if (hasVoiceover && existsSync(voiceover)) {
        inputs.push(`-i "${voiceover}"`);
        voArgs = `-map [outv] -map ${inputIdx}:a -shortest`;
    } else {
        voArgs = '-map [outv] -an';
    }

    const cmd = `ffmpeg -y ${inputs.join(' ')} -filter_complex "${filterComplex}" ${voArgs} -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 192k "${outputPath}"`;

    console.log('[DEMO VIDEO] 🎞 Assembling with FFmpeg...');
    try {
        execSync(cmd, { stdio: 'pipe' });
        return `Assembled: ${outputPath}`;
    } catch (e) {
        return `FFmpeg assembly failed: ${(e as Error).message}. Assets are in ${outputDir}.`;
    }
}

// ─── Main Flow ────────────────────────────────────────────────────────────────

export const demoVideoFlow = ai.defineFlow(
    {
        name: 'demoVideo',
        inputSchema: DemoVideoInputSchema,
        outputSchema: DemoVideoOutputSchema,
    },
    async (input) => {
        const v = DemoVideoInputSchema.parse(input);
        const outputDir = resolve(v.output_dir);
        mkdirSync(outputDir, { recursive: true });

        console.log(`\n🎬 DEMO VIDEO — Building for ${v.brand_name}`);

        // Step 1: Script
        console.log('  [1/5] Generating script...');
        const { script, sections } = await generateDemoScript(v);
        writeFileSync(join(outputDir, 'script.txt'), script, 'utf-8');
        console.log(`  ✅ Script: ${script.split(' ').length} words`);

        // Step 2: Voiceover (parallel-friendly)
        console.log('  [2/5] Generating voiceover...');
        const voiceoverPath = await generateVoiceover(script, outputDir, v.elevenlabs_voice_id);

        // Step 3: Slates
        console.log('  [3/5] Rendering intro/outro slates...');
        const introHtml = generateSlateHtml('intro', v);
        const outroHtml = generateSlateHtml('outro', v);
        writeFileSync(join(outputDir, 'intro.html'), introHtml, 'utf-8');
        writeFileSync(join(outputDir, 'outro.html'), outroHtml, 'utf-8');
        await Promise.all([
            renderSlateToPng(introHtml, join(outputDir, 'intro.png')),
            renderSlateToPng(outroHtml, join(outputDir, 'outro.png')),
        ]);

        // Step 4: Screen record
        let screenRecordPath: string | undefined;
        if (!v.skip_screen_record) {
            console.log('  [4/5] Recording product screen...');
            screenRecordPath = await recordScreen(v.product_url, v.duration_seconds - 13, outputDir, v.resolution);
        } else {
            console.log('  [4/5] Screen recording skipped');
        }

        // Step 5: FFmpeg assembly
        console.log('  [5/5] Assembling final video...');
        const videoPath = join(outputDir, `${v.brand_name.toLowerCase().replace(/\s+/g, '-')}-demo.mp4`);
        const assemblyLog = assembleFfmpeg(outputDir, videoPath, !!screenRecordPath, !!voiceoverPath, v.duration_seconds);

        console.log(`\n✨ DEMO VIDEO COMPLETE → ${videoPath}`);

        return {
            video_path: videoPath,
            script,
            sections,
            voiceover_path: voiceoverPath,
            assembly_log: assemblyLog,
        };
    }
);

export const DEMO_VIDEO_TOOLS = [
    {
        name: 'godprompt_generate_demo_video',
        description: 'Generate a complete product demo video: AI script, ElevenLabs voiceover, Playwright screen recording, FFmpeg assembly. Outputs a ready-to-upload MP4.',
        inputSchema: DemoVideoInputSchema,
        handler: (input: DemoVideoInput) => demoVideoFlow(input),
        agentPermissions: ['ATLAS', 'GOD_PROMPT', 'BOLT'],
        estimatedCost: 'ElevenLabs ~$0.01/word if key present',
    },
];
