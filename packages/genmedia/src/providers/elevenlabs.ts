/**
 * packages/genmedia/src/providers/elevenlabs.ts
 * ElevenLabs VO synthesis provider
 * Supports: text-to-speech with voice persona direction from AUDIO LoRA
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

export interface ElevenLabsRequest {
    script: string;
    voice_id?: string;               // default: multilingual v2 neutral
    voice_persona?: {
        age?: 'young' | 'middle_aged' | 'old';
        gender?: 'male' | 'female' | 'neutral';
        accent?: string;
        tone?: 'warm' | 'authoritative' | 'energetic' | 'calm' | 'narrative';
    };
    model?: 'eleven_multilingual_v2' | 'eleven_turbo_v2_5' | 'eleven_flash_v2_5';
    stability?: number;              // 0-1, default 0.5
    similarity_boost?: number;       // 0-1, default 0.75
    style?: number;                  // 0-1, exaggeration
    output_dir: string;
    session_id?: string;
}

export interface ElevenLabsResult {
    local_path: string;
    voice_id: string;
    duration_ms: number;
    character_count: number;
}

// Curated voice map — overrideable by voice_id
const VOICE_MAP: Record<string, string> = {
    young_female_warm: '21m00Tcm4TlvDq8ikWAM',      // Rachel
    young_male_energetic: 'TxGEqnHWrfWFTfGW9XjX',   // Josh
    middle_aged_male_authoritative: 'VR6AewLTigWG4xSOukaG', // Arnold
    middle_aged_female_calm: 'EXAVITQu4vr4xnSDxMaL', // Bella
    narrative_neutral: 'pNInz6obpgDQGcFmaJgB',       // Adam
};

function selectVoice(req: ElevenLabsRequest): string {
    if (req.voice_id) return req.voice_id;
    if (!req.voice_persona) return VOICE_MAP['narrative_neutral'];

    const { age = 'middle_aged', gender = 'neutral', tone = 'warm' } = req.voice_persona;
    const key = `${age}_${gender}_${tone}`;
    return VOICE_MAP[key] ?? VOICE_MAP['narrative_neutral'];
}

export async function elevenLabsProvider(req: ElevenLabsRequest): Promise<ElevenLabsResult> {
    const API_KEY = process.env.ELEVENLABS_API_KEY;
    if (!API_KEY) throw new Error('ELEVENLABS_API_KEY not set');

    const startMs = Date.now();
    const model = req.model ?? 'eleven_multilingual_v2';
    const voiceId = selectVoice(req);
    const sessionId = req.session_id ?? `elevenlabs_${Date.now()}`;

    console.log(`[ELEVENLABS] 🎙️ VO synthesis | voice:${voiceId} | model:${model} | ${req.script.length} chars`);

    const payload = JSON.stringify({
        text: req.script,
        model_id: model,
        voice_settings: {
            stability: req.stability ?? 0.5,
            similarity_boost: req.similarity_boost ?? 0.75,
            style: req.style ?? 0,
            use_speaker_boost: true,
        },
    });

    const audioBuffer: Buffer = await new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const apiReq = https.request({
            hostname: 'api.elevenlabs.io',
            path: `/v1/text-to-speech/${voiceId}`,
            method: 'POST',
            headers: {
                'xi-api-key': API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'Accept': 'audio/mpeg',
            },
        }, (res) => {
            if (res.statusCode !== 200) {
                let errBody = '';
                res.on('data', c => errBody += c);
                res.on('end', () => reject(new Error(`ElevenLabs ${res.statusCode}: ${errBody.slice(0, 200)}`)));
                return;
            }
            res.on('data', c => chunks.push(Buffer.from(c)));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        apiReq.on('error', reject);
        apiReq.write(payload);
        apiReq.end();
    });

    fs.mkdirSync(req.output_dir, { recursive: true });
    const localPath = path.join(req.output_dir, `${sessionId}_vo_${voiceId}.mp3`);
    fs.writeFileSync(localPath, audioBuffer);

    console.log(`[ELEVENLABS] ✅ ${localPath} (${Date.now() - startMs}ms)`);
    return {
        local_path: localPath,
        voice_id: voiceId,
        duration_ms: Date.now() - startMs,
        character_count: req.script.length,
    };
}
