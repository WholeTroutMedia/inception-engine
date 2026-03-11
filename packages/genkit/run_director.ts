import { HypeReelDirectorFlow } from './src/flows/hype-reel-director.js';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import 'dotenv/config';

async function main() {
    // Requires physical upload to Gemini due to raw local files exceeding context window stream size
    const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY as string);
    const rawFiles = [
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0001_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0002_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0003_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0004_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0005_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0006_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0007_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0008_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0009_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0010_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0011_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0012_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0013_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0014_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0015_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0016_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0017_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0018_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0019_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0020_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0021_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0022_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0023_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0024_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0025_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0026_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0027_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0028_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0029_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0030_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0031_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0032_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0033_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0034_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0035_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0036_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0037_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0038_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0039_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0040_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0041_proxy.mp4",
        "d:\\Google Creative Liberation Engine\\tmp_proxy\\SB2026_SF_V1-0042_proxy.mp4"
    ];

    const uploadedFiles: string[] = [];
    console.log("🎬 Initiating Cloud Upload: Transmitting RAW B-roll to ATHENA File Manager Enclave (~600MB payload)...");

    for (const file of rawFiles) {
        console.log(`[Upload] Sending: ${file.split("\\").pop()} ...`);
        const response = await fileManager.uploadFile(file, {
            mimeType: "video/mp4",
            displayName: file.split("\\").pop()
        });

        console.log(`[Enclave] File stored as ${response.file.name}. Blocking until video processing completes...`);
        let fileState = await fileManager.getFile(response.file.name);
        while (fileState.state === "PROCESSING") {
            process.stdout.write(".");
            await new Promise((resolve) => setTimeout(resolve, 5000));
            fileState = await fileManager.getFile(response.file.name);
        }
        if (fileState.state === "FAILED") {
            throw new Error(`Video processing failed on Google servers for ${file}`);
        }

        console.log(`\n✅ Ready: ${response.file.uri}`);
        uploadedFiles.push(response.file.uri);
    }

    console.log("🎬 File Enclave Upload Complete. Pushing payload to ATHENA Director Flow.");

    try {
        const edl = await HypeReelDirectorFlow({
            videoFiles: uploadedFiles,
            targetDuration: 20,
            mood: "15-20sec docu style focused around the band and the event they were playing at. Critically identify the band members and recognize who is playing in the 'reasoning' field so the editor knows."
        });

        console.log("\n====== ATHENA EDL COMPLETION ======");
        console.log(JSON.stringify(edl, null, 2));
        console.log("===================================");
    } catch (e) {
        console.error("Pipeline Error:", e);
    }
}

main().catch(console.error);
