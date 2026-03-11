/**
 * Scroll Animation Pipeline — W2 Nano Banana 2
 *
 * Orchestrates: Prompt -> Nano Banana 2 (gemini-3.1-flash-image)
 *                      -> Reference images at each scroll position
 *                      -> Kling 3.0 (image-to-video per section)
 *                      -> FFMPEG frame extraction -> WEBP manifest
 *
 * Degrades gracefully to mock data when API keys are absent.
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { NanaBananaProvider, type ScrollFrame } from '../providers/nano-banana.js';
import { KlingProvider } from '../providers/kling.js';

// ---- Types ------------------------------------------------------------------

export interface ScrollAnimationConfig {
    prompt: string;
    sectionCount: number;  // number of scroll-driven sections (default: 6)
    fps: number;           // for FFMPEG frame extraction (default: 24)
    duration: number;      // seconds per section for Kling (default: 5)
    outputDir: string;
    style?: 'cinematic' | 'geometric' | 'organic' | 'tech';
    aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
}

export interface ScrollSection {
    index: number;
    scrollPosition: number;           // 0.0 to 1.0
    referenceImagePath?: string;      // saved Nano Banana 2 output
    referenceImageDescription: string;
    framesDir: string;                // path to extracted WEBP frames
    frameCount: number;
    manifestPath: string;
    klingJobId?: string;
    videoUrl?: string;
}

export interface ScrollAnimationManifest {
    id: string;
    prompt: string;
    mode: 'live' | 'mock';
    sections: ScrollSection[];
    totalFrames: number;
    cssVars: Record<string, string>;
    createdAt: string;
}

// ---- ScrollAnimationPipeline ------------------------------------------------

export class ScrollAnimationPipeline {
    private readonly nb: NanaBananaProvider;
    private readonly kling: KlingProvider;

    constructor() {
        this.nb = new NanaBananaProvider();
        this.kling = new KlingProvider();
    }

    /**
     * Run the full pipeline and return a manifest JSON.
     *
     * Step 1: Nano Banana 2 generates a reference image for each scroll position.
     * Step 2: Each reference image is sent to Kling 3.0 as img2vid input.
     * Step 3: FFMPEG extracts WEBP frames from each video for scroll playback.
     */
    async run(config: ScrollAnimationConfig): Promise<ScrollAnimationManifest> {
        const {
            prompt,
            sectionCount = 6,
            fps = 24,
            duration = 5,
            outputDir,
            style = 'cinematic',
            aspectRatio = '16:9',
        } = config;

        const id = `scroll-${Date.now()}`;
        const isMock = !process.env['GEMINI_API_KEY'] || !process.env['KLING_API_KEY'];
        const mode: 'live' | 'mock' = isMock ? 'mock' : 'live';

        await fs.mkdir(outputDir, { recursive: true });

        // Step 1: Generate all reference images via Nano Banana 2
        console.log(`[ScrollPipeline] Generating ${sectionCount} reference images via Nano Banana 2...`);
        const scrollFrames: ScrollFrame[] = await this.nb.generateScrollFrames({
            prompt,
            frameCount: sectionCount,
            style,
            aspectRatio,
        });

        const sections: ScrollSection[] = [];
        let totalFrames = 0;

        for (const scrollFrame of scrollFrames) {
            const sectionDir = path.join(outputDir, `section-${scrollFrame.index}`);
            await fs.mkdir(sectionDir, { recursive: true });

            // Save reference image to disk
            let referenceImagePath: string | undefined;
            if (scrollFrame.mimeType !== 'image/svg+xml') {
                const ext = scrollFrame.mimeType === 'image/png' ? 'png' : 'jpg';
                referenceImagePath = path.join(sectionDir, `reference.${ext}`);
                await fs.writeFile(
                    referenceImagePath,
                    Buffer.from(scrollFrame.imageBase64, 'base64')
                );
            }

            // Step 2: Send reference image to Kling/Wan for image-to-video
            let klingJobId: string | undefined;
            let videoUrl: string | undefined;

            const videoModel = (process.env['VIDEO_PROD_MODEL'] as 'kling-3.0' | 'kling-2.0' | 'wan-2.1') || 'kling-3.0';

            const klingSpec = {
                prompt: `${prompt} -- scroll position ${Math.round(scrollFrame.scrollPosition * 100)}%`,
                image_url: referenceImagePath
                    ? `file://${referenceImagePath}`
                    : undefined,
                duration,
                model: videoModel,
                mode: 'img2vid' as const,
            };

            try {
                const job = await this.kling.generateVideo(klingSpec);
                const result = await this.kling.pollJob(job.jobId);
                klingJobId = result.jobId;
                videoUrl = result.videoUrl;
            } catch (err) {
                console.warn(`[ScrollPipeline] Video generation failed for section ${scrollFrame.index}:`, err);
                // Video failure is non-fatal — section gets no videoUrl (still has reference image)
            }

            // Step 3: Frame count is computed — actual FFMPEG extraction runs in the GenMedia service
            const frameCount = Math.floor(duration * fps);
            totalFrames += frameCount;

            const manifestPath = path.join(sectionDir, 'section.json');
            const section: ScrollSection = {
                index: scrollFrame.index,
                scrollPosition: scrollFrame.scrollPosition,
                referenceImagePath,
                referenceImageDescription: scrollFrame.description,
                framesDir: sectionDir,
                frameCount,
                manifestPath,
                klingJobId,
                videoUrl,
            };

            await fs.writeFile(
                manifestPath,
                JSON.stringify(section, null, 2),
                'utf-8'
            );

            sections.push(section);
        }

        // CSS custom properties for the scroll animation system
        const cssVars: Record<string, string> = {
            '--scroll-sections': String(sectionCount),
            '--scroll-fps': String(fps),
            '--scroll-total-frames': String(totalFrames),
            '--scroll-section-height': `${Math.floor(100 / sectionCount)}vh`,
        };

        const manifest: ScrollAnimationManifest = {
            id,
            prompt,
            mode,
            sections,
            totalFrames,
            cssVars,
            createdAt: new Date().toISOString(),
        };

        await fs.writeFile(
            path.join(outputDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2),
            'utf-8'
        );

        console.log(`[ScrollPipeline] Done. ${sections.length} sections, ${totalFrames} frames. Mode: ${mode}`);
        return manifest;
    }
}

export const scrollAnimationPipeline = new ScrollAnimationPipeline();
