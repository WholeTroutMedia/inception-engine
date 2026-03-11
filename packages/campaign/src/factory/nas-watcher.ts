import chokidar from 'chokidar';
import { Redis } from 'ioredis';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Connection to the NAS Redis (runs via docker-compose locally)
// We use REDIS_URL if provided (preferred for auth), fallback to host config
const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL)
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: 6379,
        password: process.env.REDIS_PASSWORD || undefined,
    });

// The base vault path can be overridden for local Windows testing (e.g. W:\)
const vaultBase = process.env.VAULT_PATH || '/vault';

// Watch anything that contains 2026 and 'barnstorm' (case insensitive)
const WATCH_DIRS = [
    `${vaultBase}/**/2026/**/*[Bb]arnstorm*/**`
];

console.log(`[NAS-WATCHER] Starting watcher on directories:`, WATCH_DIRS);

// Watch all directories
const watcher = chokidar.watch(WATCH_DIRS, {
    ignored: /(^|[\/\\])\..|.*\.proxies.*/, // ignore dotfiles and the proxies folder
    persistent: true,
    depth: 2, // watch subdirectories up to 2 levels deep
    usePolling: true, // required for some docker volume mounts
    interval: 1000,
    awaitWriteFinish: {
        stabilityThreshold: 2000, // Wait for file to finish copying
        pollInterval: 100
    }
});

watcher.on('add', async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.mov' || ext === '.mp4') {
        console.log(`\n[NAS-WATCHER] New media detected: ${filePath}`);

        // Create the proxy directory sibling to the file's parent directory
        const parentDir = path.dirname(filePath);
        const proxyDir = path.join(parentDir, '.proxies');

        if (!fs.existsSync(proxyDir)) {
            fs.mkdirSync(proxyDir, { recursive: true });
        }

        const filename = path.basename(filePath);
        const proxyPath = path.join(proxyDir, `proxy_${filename}.mp4`);

        try {
            // Generate a fast, low-res proxy using hardware/software encoding
            // 720p, fast preset, crf 28 is small and fast enough for AI vision
            console.log(`[NAS-WATCHER] Generating proxy: ${proxyPath}...`);

            const ffmpegCmd = `ffmpeg -y -i "${filePath}" -vf scale=-2:720 -c:v libx264 -preset veryfast -crf 28 -c:a aac -b:a 128k "${proxyPath}"`;
            await execAsync(ffmpegCmd);
            console.log(`[NAS-WATCHER] Proxy generated successfully.`);

            // Publish event to Redis Stream
            const eventId = await redis.xadd(
                'campaign:stream',
                '*',
                'event', 'media.dropped',
                'filepath', filePath,
                'proxypath', proxyPath,
                'filename', filename
            );

            console.log(`[NAS-WATCHER] Published media.dropped event to Redis Stream (ID: ${eventId})`);
        } catch (err) {
            console.error(`[NAS-WATCHER] Error processing file ${filePath}:`, err);
        }
    }
});

watcher.on('error', error => console.error(`[NAS-WATCHER] Watcher error: ${error}`));
