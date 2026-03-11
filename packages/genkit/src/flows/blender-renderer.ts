/**
 * Blender Renderer — Tier 2: Headless 3D Title Card Generator
 *
 * Spawns Blender in headless --background mode to render a 3D title card
 * from a pre-built .blend template. The render script modifies only the
 * text object and output path, leaving all lighting/shading intact.
 *
 * Prerequisites:
 *   - Blender 4.x installed at the path set in BLENDER_EXEC env var
 *   - Template file at tools/blender/templates/title_card.blend (create once)
 *
 * If Blender is not installed or the template is missing, returns null and
 * the orchestrator falls back to the GenkitFusionBridge MotionVFX title.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const BLENDER_EXEC = process.env.BLENDER_EXEC
    || 'C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe';

const TEMPLATE_BLEND = path.resolve(
    'tools', 'blender', 'templates', 'title_card.blend'
);

const RENDER_SCRIPT = path.resolve(
    'tools', 'blender', 'render_title.py'
);

const RENDER_OUTPUT_DIR = `d:\\Google Creative Liberation Engine\\tmp_genai\\blender_renders`;

const BLENDER_TIMEOUT_MS = 120_000; // 2 min max for a title card render

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const BlenderRendererInputSchema = z.object({
    titleText: z.string().describe('Text to render as 3D title card'),
    style: z.string().describe("Visual style: 'cyberpunk', 'golden-neon', 'minimal', 'chrome'"),
    format: z.enum(['vertical', 'landscape', 'square']),
    sessionId: z.string(),
    durationSeconds: z.number().default(3).describe('Duration of title card in seconds (for video export)'),
});

export const BlenderRendererOutputSchema = z.object({
    titleCardPath: z.string().nullable().describe('Local path to rendered .png/.exr, or null if Blender unavailable'),
    status: z.enum(['success', 'no_blender', 'no_template', 'render_error']),
    message: z.string(),
});

export type BlenderRendererInput = z.infer<typeof BlenderRendererInputSchema>;
export type BlenderRendererOutput = z.infer<typeof BlenderRendererOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// BLENDER SPAWN
// ─────────────────────────────────────────────────────────────────────────────

async function spawnBlenderRender(
    titleText: string, style: string, format: string,
    outputPath: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(BLENDER_EXEC)) {
            reject(new Error(`Blender not found at: ${BLENDER_EXEC}`));
            return;
        }
        if (!fs.existsSync(TEMPLATE_BLEND)) {
            reject(new Error(`Blender template not found at: ${TEMPLATE_BLEND}\nCreate this file manually in Blender first.`));
            return;
        }
        if (!fs.existsSync(RENDER_SCRIPT)) {
            reject(new Error(`Render script not found at: ${RENDER_SCRIPT}`));
            return;
        }

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        const [renderWidth, renderHeight] = format === 'vertical' ? [1080, 1920]
            : format === 'square' ? [1080, 1080] : [1920, 1080];

        const args = [
            '--background',
            TEMPLATE_BLEND,
            '--python', RENDER_SCRIPT,
            '--',                           // separator — everything after goes to Python
            '--title', titleText,
            '--style', style,
            '--output', outputPath,
            '--width', String(renderWidth),
            '--height', String(renderHeight),
        ];

        console.log(`[BLENDER] Spawning headless render...`);
        console.log(`[BLENDER]   Title: "${titleText}" | Style: ${style} | ${renderWidth}x${renderHeight}`);

        const proc = spawn(BLENDER_EXEC, args, { stdio: ['ignore', 'pipe', 'pipe'] });

        const timeout = setTimeout(() => {
            proc.kill('SIGKILL');
            reject(new Error(`Blender render timed out after ${BLENDER_TIMEOUT_MS / 1000}s`));
        }, BLENDER_TIMEOUT_MS);

        let stdoutBuf = '';
        let stderrBuf = '';

        proc.stdout?.on('data', (d: Buffer) => {
            const line = d.toString();
            stdoutBuf += line;
            // Log key Blender progress lines (suppress verbose noise)
            if (line.includes('Rendering') || line.includes('Saved') || line.includes('Error')) {
                process.stdout.write(`[BLENDER] ${line}`);
            }
        });
        proc.stderr?.on('data', (d: Buffer) => { stderrBuf += d.toString(); });

        proc.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
                console.log(`[BLENDER] ✅ Render complete: ${outputPath}`);
                resolve();
            } else {
                reject(new Error(`Blender exited with code ${code}:\n${stderrBuf.slice(-500)}`));
            }
        });

        proc.on('error', (e) => { clearTimeout(timeout); reject(e); });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// GENKIT FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const BlenderRendererFlow = ai.defineFlow(
    {
        name: 'BlenderRenderer',
        inputSchema: BlenderRendererInputSchema,
        outputSchema: BlenderRendererOutputSchema,
    },
    async (input: BlenderRendererInput): Promise<BlenderRendererOutput> => {
        const { titleText, style, format, sessionId } = input;

        console.log(`[BLENDER] Branch 4 — Headless 3D Title Renderer`);
        console.log(`[BLENDER]   Text: "${titleText}" | Style: ${style} | Format: ${format}`);

        // Pre-flight checks
        if (!fs.existsSync(BLENDER_EXEC)) {
            console.log(`[BLENDER] ⚠️  Blender not found at: ${BLENDER_EXEC}. Skipping 3D title.`);
            return {
                titleCardPath: null,
                status: 'no_blender',
                message: `Blender not installed at ${BLENDER_EXEC}. Set BLENDER_EXEC env var or install Blender 4.x. Falling back to MotionVFX title.`,
            };
        }

        if (!fs.existsSync(TEMPLATE_BLEND)) {
            console.log(`[BLENDER] ⚠️  Template not found: ${TEMPLATE_BLEND}`);
            return {
                titleCardPath: null,
                status: 'no_template',
                message: `Blender template missing at ${TEMPLATE_BLEND}. Create title_card.blend once in Blender and commit to tools/blender/templates/. Falling back to MotionVFX title.`,
            };
        }

        const outputFilename = `title_${sessionId}.png`;
        const outputPath = path.join(RENDER_OUTPUT_DIR, outputFilename);

        try {
            await spawnBlenderRender(titleText, style, format, outputPath);
            return {
                titleCardPath: outputPath,
                status: 'success',
                message: `3D title card rendered: "${titleText}" in ${style} style`,
            };
        } catch (e) {
            console.error(`[BLENDER] ❌ Render failed: ${e}`);
            return {
                titleCardPath: null,
                status: 'render_error',
                message: `Blender render failed: ${e}. Falling back to MotionVFX title.`,
            };
        }
    }
);
