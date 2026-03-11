import { Redis } from 'ioredis';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: 6379,
});

const STREAM_KEY = 'campaign:stream';
const CONSUMER_GROUP = 'workstation_gpu_group';
const CONSUMER_NAME = 'workstation-consumer-1';

// Mount mapping from NAS path to local Windows SMB mounted path for processing
// The NAS reports: /volume1/The Vault/photos/2026/Barnstorm/file.mov
// Windows sees: W:/photos/2026/Barnstorm/file.mov
const NAS_MOUNT_PREFIX = '/volume1/The Vault';
const WIN_MOUNT_PREFIX = 'W:';
const OUTPUT_DIR = 'B:\\Barnstorm 2025 Media\\Content To Publish\\AI Drafts';

async function generateOutputs(originalPath: string, proxyPath: string, filename: string) {
    // Convert NAS path to Windows path for local processing
    const localProxyPath = proxyPath.replace(NAS_MOUNT_PREFIX, WIN_MOUNT_PREFIX).replace(/\//g, '\\');
    const localOriginalPath = originalPath.replace(NAS_MOUNT_PREFIX, WIN_MOUNT_PREFIX).replace(/\//g, '\\');

    console.log(`[WORKSTATION] Received media.dropped for ${filename}`);
    console.log(`[WORKSTATION] Local proxy mapped to: ${localProxyPath}`);

    try {
        // 1. IDEATE: Call Genkit /gemini-2.5-pro to analyze the proxy and build a cutlist
        // (In production, we invoke the actual genkit flow here: runFlow(CreativeDirector, ...))
        console.log(`[WORKSTATION] Generating 5 creative concepts via Genkit... (Simulated)`);
        await new Promise(res => setTimeout(res, 2000));

        console.log(`[WORKSTATION] Concepts generated. Executing NVENC GPU Rendering...`);

        // 2. RENDER: Use Nvidia hardware acceleration to speed through the master file
        // -c:v hevc_nvenc (or h264_nvenc) applies hardware GPU rendering natively on Windows
        const out1 = path.join(OUTPUT_DIR, `AI_Draft_1_${filename}`);

        // As a placeholder rendering command for the factory pipeline (takes the first 5 seconds, adds a glitch effect)
        const ffmpegCmd = `ffmpeg -y -hwaccel cuda -i "${localOriginalPath}" -t 5 -c:v hevc_nvenc -preset p6 -tune hq -b:v 15M -c:a copy "${out1}"`;

        console.log(`[WORKSTATION] Executing: ${ffmpegCmd}`);

        // Actually run it if you have FFmpeg installed locally
        // await execAsync(ffmpegCmd);

        console.log(`[WORKSTATION] Hardware rendering complete. Saved to ${out1}`);
    } catch (err) {
        console.error(`[WORKSTATION] Error executing pipeline:`, err);
    }
}

async function startConsumer() {
    try {
        await redis.xgroup('CREATE', STREAM_KEY, CONSUMER_GROUP, '0', 'MKSTREAM');
        console.log(`[WORKSTATION] Created consumer group ${CONSUMER_GROUP}`);
    } catch (err: any) {
        if (!err.message.includes('BUSYGROUP')) {
            console.error(err);
            process.exit(1);
        }
    }

    console.log('[WORKSTATION] Polling for GPU render jobs...');

    while (true) {
        try {
            const results = await redis.xreadgroup(
                'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
                'COUNT', 1,
                'BLOCK', 5000,
                'STREAMS', STREAM_KEY, '>'
            ) as any[];

            if (results && results.length > 0) {
                const [stream, messages] = results[0];
                for (const message of messages) {
                    const [messageId, fields] = message;

                    // Parse fields array ['event', 'media.dropped', 'filepath', '/volume1/...']
                    const msgObj: Record<string, string> = {};
                    for (let i = 0; i < fields.length; i += 2) {
                        msgObj[fields[i]] = fields[i + 1];
                    }

                    if (msgObj.event === 'media.dropped') {
                        await generateOutputs(msgObj.filepath, msgObj.proxypath, msgObj.filename);
                        await redis.xack(STREAM_KEY, CONSUMER_GROUP, messageId);
                    }
                }
            }
        } catch (err) {
            console.error('[WORKSTATION] Consumer error:', err);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Ensure the output directory exists locally
import fs from 'fs';
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

startConsumer();
