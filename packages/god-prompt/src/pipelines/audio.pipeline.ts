import axios from 'axios';
import { z } from 'zod';

// ─── GOD PROMPT — Unified Brand Audio Pipeline ────────────────────────────────
// Orchestrates audio generation across:
//   - Google Lyria (Vertex AI) — music generation
//   - Google Chirp 3 HD (Vertex AI) — neural TTS
//   - ElevenLabs — voice cloning, multilingual TTS
// Use cases: brand music, podcast intros, ad narration, explainer voiceovers.

const VERTEX_BASE = 'https://us-central1-aiplatform.googleapis.com/v1';
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

const ENV_AUD = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
const getEnv = (k: string) => ENV_AUD.process?.env?.[k];

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const MusicGenerationSchema = z.object({
    prompt: z.string().describe('Music description: mood, genre, tempo, instruments. Be detailed.'),
    negative_prompt: z.string().default('vocals, lyrics, speech, distortion, noise'),
    duration_seconds: z.number().min(5).max(120).default(30),
    temperature: z.number().min(0).max(1).default(0.7).describe('Creativity (0=conservative, 1=experimental)'),
    quality_tier: z.enum(['standard', 'premium']).default('standard'),
    brand_name: z.string().optional(),
    mood: z.enum(['epic', 'calm', 'upbeat', 'dramatic', 'playful', 'ambient', 'corporate', 'cinematic']).optional(),
});

export const VoiceoverSchema = z.object({
    text: z.string().max(5000).describe('Text to convert to speech'),
    voice_id: z.string().default('21m00Tcm4TlvDq8ikWAM').describe('ElevenLabs voice ID (default: Rachel)'),
    provider: z.enum(['elevenlabs', 'chirp']).default('elevenlabs'),
    language: z.string().default('en').describe('BCP-47 language code (e.g. "en", "es", "fr")'),
    speed: z.number().min(0.5).max(2.0).default(1.0),
    stability: z.number().min(0).max(1).default(0.5).describe('Voice stability (ElevenLabs)'),
    similarity_boost: z.number().min(0).max(1).default(0.75).describe('Voice similarity boost (ElevenLabs)'),
    style: z.number().min(0).max(1).default(0).describe('Speaking style exaggeration (ElevenLabs)'),
    output_format: z.enum(['mp3_44100_128', 'mp3_44100_192', 'pcm_24000']).default('mp3_44100_128'),
});

export const BrandAudioKitSchema = z.object({
    brand_name: z.string(),
    brand_description: z.string().describe('Brand personality and values in 1-2 sentences'),
    music_mood: z.enum(['epic', 'calm', 'upbeat', 'dramatic', 'playful', 'ambient', 'corporate', 'cinematic']).default('corporate'),
    voice_id: z.string().default('21m00Tcm4TlvDq8ikWAM'),
    tagline: z.string().optional().describe('Brand tagline for voiceover generation'),
    quality_tier: z.enum(['standard', 'premium']).default('standard'),
});

export const PodcastIntroSchema = z.object({
    show_name: z.string(),
    host_name: z.string().optional(),
    tagline: z.string().optional(),
    voice_id: z.string().default('21m00Tcm4TlvDq8ikWAM'),
    music_mood: z.enum(['epic', 'calm', 'upbeat', 'dramatic', 'playful', 'ambient', 'corporate', 'cinematic']).default('upbeat'),
    duration_seconds: z.number().min(5).max(60).default(30),
});

// ─── Music style prompts ───────────────────────────────────────────────────────

const MOOD_PROMPTS: Record<string, string> = {
    epic: 'epic orchestral, soaring strings, powerful brass, cinematic percussion, heroic, triumphant build',
    calm: 'soft ambient, gentle piano, warm pads, peaceful, meditative, minimal percussion',
    upbeat: 'bright upbeat pop, energetic synths, punchy drums, positive, fun, modern commercial',
    dramatic: 'dark cinematic, tense strings, deep bass, suspenseful, intense, dynamic swells',
    playful: 'whimsical, light pizzicato, marimba, cheerful xylophone, fun and bouncy',
    ambient: 'deep atmospheric, evolving textures, drone pads, slow evolving, soundscape',
    corporate: 'clean corporate, acoustic guitar, light percussion, professional, inspiring, optimistic',
    cinematic: 'full cinematic orchestra, sweeping strings, choir, epic build, motion picture quality',
};

function buildMusicPrompt(prompt: string, mood?: string, brand?: string): string {
    const parts = [prompt];
    if (mood && MOOD_PROMPTS[mood]) parts.push(MOOD_PROMPTS[mood]);
    if (brand) parts.push(`signature sound for ${brand}`);
    return parts.join('. ');
}

// ─── Google Lyria (music gen via Vertex AI) ───────────────────────────────────

async function generateWithLyria(params: {
    prompt: string;
    negative_prompt: string;
    duration_seconds: number;
    temperature: number;
}): Promise<string> {
    const projectId = getEnv('GCP_PROJECT_ID');
    const location = getEnv('VERTEX_LOCATION') ?? 'us-central1';
    const accessToken = getEnv('GOOGLE_ACCESS_TOKEN');
    if (!projectId || !accessToken) throw new Error('GCP_PROJECT_ID and GOOGLE_ACCESS_TOKEN required for Lyria');

    const endpoint = `${VERTEX_BASE}/projects/${projectId}/locations/${location}/publishers/google/models/lyria-002:predict`;

    const res = await axios.post<{ predictions: Array<{ bytesBase64Encoded?: string; gcsUri?: string }> }>(
        endpoint,
        {
            instances: [{
                prompt: params.prompt,
                negativePrompt: params.negative_prompt,
                sampleDurationSeconds: params.duration_seconds,
                temperature: params.temperature,
            }],
            parameters: { sampleCount: 1 },
        },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    const prediction = res.data.predictions?.[0];
    if (prediction?.gcsUri) return prediction.gcsUri;
    if (prediction?.bytesBase64Encoded) {
        return `data:audio/wav;base64,${prediction.bytesBase64Encoded}`;
    }
    throw new Error('Lyria returned no audio data');
}

// ─── Google Chirp 3 HD (TTS via Vertex AI) ────────────────────────────────────

async function generateWithChirp(params: { text: string; language: string }): Promise<string> {
    const projectId = getEnv('GCP_PROJECT_ID');
    const location = getEnv('VERTEX_LOCATION') ?? 'us-central1';
    const accessToken = getEnv('GOOGLE_ACCESS_TOKEN');
    if (!projectId || !accessToken) throw new Error('GCP_PROJECT_ID and GOOGLE_ACCESS_TOKEN required for Chirp');

    const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize`;

    const res = await axios.post<{ audioContent: string }>(
        endpoint,
        {
            input: { text: params.text },
            voice: {
                languageCode: params.language,
                name: `${params.language}-Chirp3-HD-Aoede`,
            },
            audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
        },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    return `data:audio/mp3;base64,${res.data.audioContent}`;
}

// ─── ElevenLabs TTS ───────────────────────────────────────────────────────────

async function generateWithElevenLabs(input: z.infer<typeof VoiceoverSchema>): Promise<string> {
    const apiKey = getEnv('ELEVENLABS_API_KEY');
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured');

    const res = await axios.post<ArrayBuffer>(
        `${ELEVENLABS_BASE}/text-to-speech/${input.voice_id}`,
        {
            text: input.text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                stability: input.stability,
                similarity_boost: input.similarity_boost,
                style: input.style,
                use_speaker_boost: true,
            },
        },
        {
            headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
            responseType: 'arraybuffer',
        }
    );

    const bytes = new Uint8Array(res.data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:audio/mpeg;base64,${btoa(binary)}`;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function generateMusic(input: z.infer<typeof MusicGenerationSchema>) {
    const v = MusicGenerationSchema.parse(input);
    const prompt = buildMusicPrompt(v.prompt, v.mood, v.brand_name);
    console.log(`[GOD PROMPT/AUDIO] 🎵 [${v.quality_tier}] Music: "${prompt.slice(0, 60)}..."`);

    try {
        const audio_url = await generateWithLyria({
            prompt,
            negative_prompt: v.negative_prompt,
            duration_seconds: v.duration_seconds,
            temperature: v.temperature,
        });
        return { audio_url, provider: 'Google Lyria (Vertex AI)', prompt_used: prompt, duration: v.duration_seconds };
    } catch (err) {
        console.warn('[GOD PROMPT/AUDIO] Lyria unavailable:', (err as Error).message);
        throw new Error('Music generation requires Google Lyria (Vertex AI). Ensure GCP_PROJECT_ID and GOOGLE_ACCESS_TOKEN are set.');
    }
}

export async function generateVoiceover(input: z.infer<typeof VoiceoverSchema>) {
    const v = VoiceoverSchema.parse(input);
    console.log(`[GOD PROMPT/AUDIO] 🎙️ Voiceover [${v.provider}] — ${v.text.length} chars`);

    if (v.provider === 'chirp') {
        const audio_url = await generateWithChirp({ text: v.text, language: v.language });
        return { audio_url, provider: 'Google Chirp 3 HD', char_count: v.text.length };
    }

    const audio_url = await generateWithElevenLabs(v);
    return { audio_url, provider: 'ElevenLabs', voice_id: v.voice_id, char_count: v.text.length };
}

export async function generateBrandAudioKit(input: z.infer<typeof BrandAudioKitSchema>) {
    const v = BrandAudioKitSchema.parse(input);
    console.log(`[GOD PROMPT/AUDIO] 🎵🎙️ Brand Audio Kit for "${v.brand_name}"`);

    const [musicResult, taglineVoiceover, stingerResult] = await Promise.allSettled([
        // Full brand music track
        generateMusic({
            prompt: `${v.brand_description}. Signature brand theme.`,
            mood: v.music_mood,
            brand_name: v.brand_name,
            duration_seconds: 30,
            quality_tier: v.quality_tier,
            negative_prompt: 'vocals, lyrics, speech, distortion, noise',
            temperature: 0.7,
        }),
        // Tagline voiceover (if provided)
        v.tagline ? generateVoiceover({
            text: `${v.tagline}`,
            voice_id: v.voice_id,
            provider: 'elevenlabs',
            language: 'en',
            speed: 1.0,
            stability: 0.55,
            similarity_boost: 0.75,
            style: 0.1,
            output_format: 'mp3_44100_128',
        }) : Promise.resolve(null),
        // Short stinger (5s)
        generateMusic({
            prompt: `Short 5-second brand stinger. ${v.brand_description}`,
            mood: v.music_mood,
            brand_name: v.brand_name,
            duration_seconds: 5,
            quality_tier: 'standard',
            negative_prompt: 'vocals, lyrics, speech',
            temperature: 0.6,
        }),
    ]);

    return {
        brand: v.brand_name,
        music_track: musicResult.status === 'fulfilled' ? musicResult.value : null,
        tagline_voiceover: taglineVoiceover.status === 'fulfilled' ? taglineVoiceover.value : null,
        stinger: stingerResult.status === 'fulfilled' ? stingerResult.value : null,
        generated_at: new Date().toISOString(),
    };
}

export async function generatePodcastIntro(input: z.infer<typeof PodcastIntroSchema>) {
    const v = PodcastIntroSchema.parse(input);
    console.log(`[GOD PROMPT/AUDIO] 🎙️ Podcast intro for "${v.show_name}"`);

    const introText = v.host_name
        ? `${v.show_name}. ${v.tagline ? v.tagline + '.' : ''} With your host, ${v.host_name}.`
        : `${v.show_name}. ${v.tagline ?? ''}`.trim();

    const [music, voiceover] = await Promise.all([
        generateMusic({
            prompt: `Podcast intro music for "${v.show_name}". Energetic opening, professional.`,
            mood: v.music_mood,
            duration_seconds: v.duration_seconds,
            quality_tier: 'standard',
            negative_prompt: 'vocals, lyrics, speech',
            temperature: 0.65,
        }),
        generateVoiceover({
            text: introText,
            voice_id: v.voice_id,
            provider: 'elevenlabs',
            language: 'en',
            speed: 1.0,
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.05,
            output_format: 'mp3_44100_128',
        }),
    ]);

    return {
        show_name: v.show_name,
        intro_text: introText,
        music_bed: music,
        voiceover,
        note: 'Mix music bed at -20dB and voiceover at 0dB for broadcast-ready intro.',
    };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const AUDIO_PIPELINE_TOOLS = [
    {
        name: 'godprompt_generate_music',
        description: 'Generate original music using Google Lyria. Supports mood presets, brand themes, and custom prompts.',
        inputSchema: MusicGenerationSchema,
        handler: generateMusic,
        agentPermissions: ['GOD_PROMPT', 'NOVA'],
        estimatedCost: '~$0.01–0.10/clip',
    },
    {
        name: 'godprompt_generate_voiceover',
        description: 'Generate voiceover audio using ElevenLabs (multilingual, voice cloning) or Google Chirp 3 HD.',
        inputSchema: VoiceoverSchema,
        handler: generateVoiceover,
        agentPermissions: ['GOD_PROMPT', 'NOVA', 'ZERO_DAY'],
        estimatedCost: '$0.001/char (ElevenLabs) | Free (Chirp)',
    },
    {
        name: 'godprompt_brand_audio_kit',
        description: 'Generate a complete brand audio kit: 30s music track + voiceover tagline + 5s stinger, in parallel.',
        inputSchema: BrandAudioKitSchema,
        handler: generateBrandAudioKit,
        agentPermissions: ['GOD_PROMPT', 'NOVA'],
        estimatedCost: '$0.05–0.30 per kit',
    },
    {
        name: 'godprompt_podcast_intro',
        description: 'Generate a professional podcast intro: background music bed + host voiceover, ready to mix.',
        inputSchema: PodcastIntroSchema,
        handler: generatePodcastIntro,
        agentPermissions: ['GOD_PROMPT', 'NOVA'],
        estimatedCost: '$0.02–0.10',
    },
];
