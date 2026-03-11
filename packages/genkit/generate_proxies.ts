import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PROXY_DIR = String.raw`d:\Google Creative Liberation Engine\tmp_proxy`;
if (!fs.existsSync(PROXY_DIR)) {
    fs.mkdirSync(PROXY_DIR, { recursive: true });
}

const MEDIA_DIR = String.raw`B:\Barnstorm 2026 Media\Content_to_Publish\Event_Originals\REALSLX_RAOS_SB2026`;
const rawFiles = fs.readdirSync(MEDIA_DIR)
    .filter(file => file.toLowerCase().endsWith('.mov'))
    .map(file => path.join(MEDIA_DIR, file));

async function generateProxy(inputFile: string): Promise<string> {
    const filename = path.basename(inputFile, path.extname(inputFile));
    const outputFile = path.join(PROXY_DIR, `${filename}_proxy.mp4`);

    if (fs.existsSync(outputFile)) {
        console.log(`[Cache] Proxy already exists: ${outputFile}`);
        return outputFile;
    }

    console.log(`🎬 Local Workstation Processing: Transcoding ${filename} -> 720p Proxy...`);

    return new Promise((resolve, reject) => {
        // Use extremely fast hardware or software encoding for instant proxy gen
        const ffmpeg = spawn('ffmpeg', [
            '-i', inputFile,
            '-vf', 'scale=-2:720',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '32', // Highly compressed since ATHENA just needs to see the action
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y',
            outputFile
        ]);

        ffmpeg.stdout.on('data', () => { });
        ffmpeg.stderr.on('data', (d) => process.stdout.write('.'));

        ffmpeg.on('close', (code) => {
            console.log(`\n✅ Proxy generated: ${outputFile}`);
            if (code === 0) resolve(outputFile);
            else reject(new Error(`FFmpeg exited with code ${code}`));
        });

        ffmpeg.on('error', reject);
    });
}

async function main() {
    console.log("🚀 Pivoting constraint: Generating lightweight proxies locally to save bandwidth...");
    const proxyFiles = [];
    for (const file of rawFiles) {
        try {
            const proxy = await generateProxy(file);
            proxyFiles.push(proxy);
        } catch (e) {
            console.error("Failed to proxy", file, e);
        }
    }

    console.log("\n=================");
    console.log("PROXIES READY for ATHENA (Genkit Payload):");
    console.log(JSON.stringify(proxyFiles, null, 2));

    // Auto-update the director script to use these!
    const runScriptPath = path.join(process.cwd(), 'run_director.ts');
    let runScript = fs.readFileSync(runScriptPath, 'utf8');

    const rawFilesMatch = runScript.match(/const rawFiles = \[([\s\S]*?)\];/);
    if (rawFilesMatch) {
        const replacement = `const rawFiles = [\n${proxyFiles.map(f => `        ${JSON.stringify(f)}`).join(',\n')}\n    ];`;
        runScript = runScript.replace(/const rawFiles = \[([\s\S]*?)\];/, replacement);
        // Replace the "mimeType: 'video/quicktime'" with 'video/mp4' since it's mp4 now
        runScript = runScript.replace(/mimeType: "video\/quicktime"/g, 'mimeType: "video/mp4"');
        fs.writeFileSync(runScriptPath, runScript);
        console.log("✅ Rewrote run_director.ts to target the new Proxy Payload files.");
    }
}

main().catch(console.error);
