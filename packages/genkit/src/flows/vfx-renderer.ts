/**
 * VFX Renderer — Tier 2: TouchDesigner OSC Bridge
 *
 * Sends OSC (Open Sound Control) commands via UDP to a running TouchDesigner
 * instance. TD renders an audio-reactive VFX overlay to a local file path,
 * which the OmniTimelineAssembler then places on Video Track 3.
 *
 * OSC address schema:
 *   /omnimedia/trigger   → initiates the render
 *   /omnimedia/status    → TD responds with render progress
 *   /omnimedia/complete  → TD sends final output path when done
 *
 * If TouchDesigner is not running (port closed), this flow returns null and
 * the orchestrator skips Track 3 gracefully.
 *
 * See tools/touchdesigner/TD_SETUP.md for full TD network configuration.
 */

import { z } from 'genkit';
import { ai } from '../index.js';
import dgram from 'dgram';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// OSC CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const TD_OSC_HOST = process.env.TD_OSC_HOST || '127.0.0.1';
const TD_OSC_PORT = parseInt(process.env.TD_OSC_PORT || '7000', 10);
const TD_OSC_LISTEN_PORT = parseInt(process.env.TD_OSC_LISTEN_PORT || '7001', 10);
const TD_RENDER_OUTPUT_DIR = `d:\\Google Creative Liberation Engine\\tmp_genai\\td_renders`;
const TD_PING_TIMEOUT_MS = 2000;
const TD_RENDER_TIMEOUT_MS = 60_000; // 60s max wait for TD render

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const VfxRendererInputSchema = z.object({
    bpm: z.number().describe('Audio BPM for audio-reactive sync'),
    style: z.string().describe("Visual style: 'neon-glitch', 'plasma', 'chromatic', 'dark-matter'"),
    durationSeconds: z.number().describe('Target duration of the VFX overlay in seconds'),
    format: z.enum(['vertical', 'landscape', 'square']),
    sessionId: z.string(),
});

export const VfxRendererOutputSchema = z.object({
    overlayPath: z.string().nullable().describe('Local path to rendered .mp4 overlay, or null if TD offline'),
    status: z.enum(['success', 'offline', 'timeout', 'error']),
    message: z.string(),
});

export type VfxRendererInput = z.infer<typeof VfxRendererInputSchema>;
export type VfxRendererOutput = z.infer<typeof VfxRendererOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// OSC PACKET BUILDER (minimal OSC 1.0 implementation)
// ─────────────────────────────────────────────────────────────────────────────

function padToMultipleOf4(buffer: Buffer): Buffer {
    const remainder = buffer.length % 4;
    if (remainder === 0) return buffer;
    return Buffer.concat([buffer, Buffer.alloc(4 - remainder)]);
}

function encodeOscString(str: string): Buffer {
    const buf = Buffer.from(str + '\0', 'utf-8');
    return padToMultipleOf4(buf);
}

function encodeOscFloat(val: number): Buffer {
    const buf = Buffer.allocUnsafe(4);
    buf.writeFloatBE(val, 0);
    return buf;
}

function encodeOscInt(val: number): Buffer {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(val, 0);
    return buf;
}

/**
 * Build an OSC packet with the given address and args.
 * Args: { type: 'f'|'i'|'s', value: number|string }[]
 */
function buildOscPacket(address: string, args: { type: 'f' | 'i' | 's'; value: number | string }[]): Buffer {
    const addrBuf = encodeOscString(address);
    const typeTags = ',' + args.map(a => a.type).join('');
    const typeTagBuf = encodeOscString(typeTags);
    const argBufs = args.map(({ type, value }) => {
        if (type === 'f') return encodeOscFloat(value as number);
        if (type === 'i') return encodeOscInt(value as number);
        return encodeOscString(value as string);
    });
    return Buffer.concat([addrBuf, typeTagBuf, ...argBufs]);
}

// ─────────────────────────────────────────────────────────────────────────────
// TOUCH DESIGNER BRIDGE
// ─────────────────────────────────────────────────────────────────────────────

async function pingTouchDesigner(): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = dgram.createSocket('udp4');
        const packet = buildOscPacket('/omnimedia/ping', []);
        const timer = setTimeout(() => {
            socket.close();
            resolve(false);
        }, TD_PING_TIMEOUT_MS);

        socket.on('error', () => { clearTimeout(timer); socket.close(); resolve(false); });
        socket.on('message', () => { clearTimeout(timer); socket.close(); resolve(true); });

        socket.send(packet, TD_OSC_PORT, TD_OSC_HOST, (err) => {
            if (err) { clearTimeout(timer); socket.close(); resolve(false); }
        });
    });
}

async function triggerTdRender(
    bpm: number, style: string, durationSeconds: number,
    format: string, outputPath: string
): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const client = dgram.createSocket('udp4');
        const listener = dgram.createSocket('udp4');

        const renderTimeout = setTimeout(() => {
            cleanup();
            reject(new Error('TouchDesigner render timed out'));
        }, TD_RENDER_TIMEOUT_MS);

        const cleanup = () => {
            clearTimeout(renderTimeout);
            try { client.close(); } catch { }
            try { listener.close(); } catch { }
        };

        // Listen for TD completion message on our response port
        listener.on('message', (msg) => {
            const str = msg.toString('utf-8').replace(/\0/g, '');
            if (str.includes('/omnimedia/complete') || str.includes('done')) {
                console.log('[VFX] TouchDesigner render complete signal received');
                cleanup();
                resolve(true);
            } else if (str.includes('/omnimedia/error')) {
                cleanup();
                reject(new Error('TouchDesigner reported render error'));
            }
        });

        listener.on('error', (e) => { cleanup(); reject(e); });

        listener.bind(TD_OSC_LISTEN_PORT, '127.0.0.1', () => {
            // Send trigger packet to TD
            const packet = buildOscPacket('/omnimedia/trigger', [
                { type: 'f', value: bpm },
                { type: 's', value: style },
                { type: 'f', value: durationSeconds },
                { type: 's', value: format },
                { type: 's', value: outputPath },
                { type: 'i', value: TD_OSC_LISTEN_PORT }, // tell TD where to reply
            ]);

            console.log(`[VFX] Sending /omnimedia/trigger → TD at ${TD_OSC_HOST}:${TD_OSC_PORT}`);
            console.log(`[VFX]   bpm=${bpm} style=${style} duration=${durationSeconds}s format=${format}`);

            client.send(packet, TD_OSC_PORT, TD_OSC_HOST, (err) => {
                if (err) { cleanup(); reject(err); }
            });
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// GENKIT FLOW
// ─────────────────────────────────────────────────────────────────────────────

export const VfxRendererFlow = ai.defineFlow(
    {
        name: 'VfxRenderer',
        inputSchema: VfxRendererInputSchema,
        outputSchema: VfxRendererOutputSchema,
    },
    async (input: VfxRendererInput): Promise<VfxRendererOutput> => {
        const { bpm, style, durationSeconds, format, sessionId } = input;

        console.log(`[VFX] Branch 3 — TouchDesigner VFX Renderer`);
        console.log(`[VFX]   BPM: ${bpm} | Style: ${style} | Duration: ${durationSeconds}s | Format: ${format}`);

        // Step 1: Check if TD is running
        const tdOnline = await pingTouchDesigner();
        if (!tdOnline) {
            console.log(`[VFX] ⚠️  TouchDesigner not detected on UDP ${TD_OSC_HOST}:${TD_OSC_PORT}. Skipping VFX overlay.`);
            return {
                overlayPath: null,
                status: 'offline',
                message: `TouchDesigner not running on ${TD_OSC_HOST}:${TD_OSC_PORT}. Start TD with the omnimedia_network.toe project and ensure OSC In CHOP is listening on port ${TD_OSC_PORT}.`,
            };
        }

        console.log(`[VFX] ✅ TouchDesigner online. Triggering render...`);

        // Step 2: Set up output path
        const outputFilename = `td_${style}_${bpm}bpm_${sessionId}.mp4`;
        const outputPath = path.join(TD_RENDER_OUTPUT_DIR, outputFilename);

        // Step 3: Trigger render, await completion
        try {
            await triggerTdRender(bpm, style, durationSeconds, format, outputPath);
            console.log(`[VFX] ✅ TD render complete: ${outputPath}`);
            return {
                overlayPath: outputPath,
                status: 'success',
                message: `VFX overlay rendered at ${bpm} BPM, ${style} style`,
            };
        } catch (e) {
            const msg = `TouchDesigner render failed: ${e}`;
            console.error(`[VFX] ❌ ${msg}`);
            return {
                overlayPath: null,
                status: (e as Error).message.includes('timed out') ? 'timeout' : 'error',
                message: msg,
            };
        }
    }
);
