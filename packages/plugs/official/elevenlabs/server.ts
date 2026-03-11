import axios from 'axios';
import { z } from 'zod';

// ─── THE PLUG — ElevenLabs MCP Adapter ───────────────────────────────────────
// Exposes ElevenLabs TTS, voice cloning, and sound effects to Inception agents.
// Agents: RELAY (narration), GOD_PROMPT (brand audio), ATLAS (live dubbing)

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

const TTSInputSchema = z.object({
    text: z.string().max(5000).describe('Text to synthesize'),
    voice_id: z.string().default('21m00Tcm4TlvDq8ikWAM').describe('ElevenLabs voice ID (default: Rachel)'),
    model_id: z.enum(['eleven_turbo_v2_5', 'eleven_multilingual_v2', 'eleven_monolingual_v1'])
        .default('eleven_turbo_v2_5'),
    stability: z.number().min(0).max(1).default(0.5),
    similarity_boost: z.number().min(0).max(1).default(0.75),
    style: z.number().min(0).max(1).default(0),
    use_speaker_boost: z.boolean().default(true),
    output_format: z.enum(['mp3_44100_128', 'mp3_22050_32', 'pcm_44100']).default('mp3_44100_128'),
});

const VoiceListSchema = z.object({
    filter: z.string().optional().describe('Filter voices by name'),
    category: z.enum(['premade', 'cloned', 'generated', 'all']).default('all'),
});

const SoundEffectSchema = z.object({
    text: z.string().describe('Sound effect description (e.g. "thunderstorm with rain", "crowd cheering")'),
    duration_seconds: z.number().min(0.5).max(22).default(3),
    prompt_influence: z.number().min(0).max(1).default(0.3),
});

const VoiceCloneSchema = z.object({
    name: z.string().describe('Name for the cloned voice'),
    description: z.string().optional(),
    audio_urls: z.array(z.string().url()).min(1).max(25).describe('Audio sample URLs (min 1, max 25)'),
    labels: z.record(z.string()).optional(),
});

const ENV_11 = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };

function getHeaders() {
    const key = ENV_11.process?.env?.['ELEVENLABS_API_KEY'];
    if (!key) throw new Error('ELEVENLABS_API_KEY not configured');
    return { 'xi-api-key': key, 'Content-Type': 'application/json' };
}

// ─── Tool Handlers ────────────────────────────────────────────────────────────

export async function textToSpeech(input: z.infer<typeof TTSInputSchema>): Promise<{ audio_base64: string; format: string; character_cost: number }> {
    const v = TTSInputSchema.parse(input);
    console.log(`[PLUG/11LABS] 🎙️ TTS: "${v.text.slice(0, 60)}..." voice=${v.voice_id}`);

    const response = await axios.post(
        `${ELEVEN_BASE}/text-to-speech/${v.voice_id}`,
        {
            text: v.text,
            model_id: v.model_id,
            voice_settings: {
                stability: v.stability,
                similarity_boost: v.similarity_boost,
                style: v.style,
                use_speaker_boost: v.use_speaker_boost,
            },
            output_format: v.output_format,
        },
        { headers: getHeaders(), responseType: 'arraybuffer' }
    );

    const audioData = new Uint8Array(response.data as ArrayBuffer);
    const binary = Array.from(audioData).map(b => String.fromCharCode(b)).join('');
    return {
        audio_base64: btoa(binary),
        format: v.output_format,
        character_cost: v.text.length,
    };
}

export async function listVoices(input: z.infer<typeof VoiceListSchema>) {
    const v = VoiceListSchema.parse(input);
    const response = await axios.get(`${ELEVEN_BASE}/voices`, { headers: getHeaders() });

    interface ElevenVoice {
        voice_id: string;
        name: string;
        category: string;
        labels: Record<string, string>;
        preview_url: string;
    }

    let voices: ElevenVoice[] = (response.data as { voices: ElevenVoice[] }).voices;
    if (v.category !== 'all') voices = voices.filter((voice: ElevenVoice) => voice.category === v.category);
    if (v.filter) voices = voices.filter((voice: ElevenVoice) => voice.name.toLowerCase().includes(v.filter!.toLowerCase()));

    return {
        voices: voices.map((voice: ElevenVoice) => ({
            id: voice.voice_id,
            name: voice.name,
            category: voice.category,
            labels: voice.labels,
            preview_url: voice.preview_url,
        })),
        total: voices.length,
    };
}

export async function generateSoundEffect(input: z.infer<typeof SoundEffectSchema>) {
    const v = SoundEffectSchema.parse(input);
    console.log(`[PLUG/11LABS] 🔊 Sound FX: "${v.text}"`);

    const response = await axios.post(
        `${ELEVEN_BASE}/sound-generation`,
        { text: v.text, duration_seconds: v.duration_seconds, prompt_influence: v.prompt_influence },
        { headers: getHeaders(), responseType: 'arraybuffer' }
    );

    const sfData = new Uint8Array(response.data as ArrayBuffer);
    const sfBinary = Array.from(sfData).map(b => String.fromCharCode(b)).join('');
    return {
        audio_base64: btoa(sfBinary),
        format: 'mp3_44100_128',
        duration: v.duration_seconds,
    };
}

export async function cloneVoice(input: z.infer<typeof VoiceCloneSchema>) {
    const v = VoiceCloneSchema.parse(input);
    console.log(`[PLUG/11LABS] 🧬 Cloning voice: ${v.name}`);

    // Download and attach audio samples
    const formData = new FormData();
    formData.append('name', v.name);
    if (v.description) formData.append('description', v.description);

    for (const url of v.audio_urls) {
        const resp = await axios.get(url, { responseType: 'arraybuffer' });
        const blob = new Blob([resp.data as BlobPart], { type: 'audio/mpeg' });
        formData.append('files', blob, `sample-${v.audio_urls.indexOf(url)}.mp3`);
    }

    const response = await axios.post(`${ELEVEN_BASE}/voices/add`, formData, {
        headers: { 'xi-api-key': getHeaders()['xi-api-key'] },
    });

    return { voice_id: (response.data as { voice_id: string }).voice_id, name: v.name };
}

export async function getUsage() {
    const response = await axios.get(`${ELEVEN_BASE}/user/subscription`, { headers: getHeaders() });
    const sub = response.data as {
        character_count: number;
        character_limit: number;
        voice_limit: number;
        status: string;
    };
    return {
        characters_used: sub.character_count,
        character_limit: sub.character_limit,
        characters_remaining: sub.character_limit - sub.character_count,
        voice_slots_used: sub.voice_limit,
        status: sub.status,
    };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const ELEVENLABS_MCP_TOOLS = [
    {
        name: 'elevenlabs_tts',
        description: 'Convert text to speech using ElevenLabs. Returns base64 audio. Perfect for narration, voiceovers, and client-facing audio.',
        inputSchema: TTSInputSchema,
        handler: textToSpeech,
        agentPermissions: ['RELAY', 'GOD_PROMPT', 'ATLAS', 'NOVA'],
        estimatedCost: '$0.0003/char (Turbo)',
    },
    {
        name: 'elevenlabs_list_voices',
        description: 'List all available ElevenLabs voices, with optional filtering by name or category.',
        inputSchema: VoiceListSchema,
        handler: listVoices,
        agentPermissions: ['RELAY', 'GOD_PROMPT', 'ATLAS'],
        estimatedCost: 'Free',
    },
    {
        name: 'elevenlabs_sound_effect',
        description: 'Generate sound effects from a text description (e.g. "rain on a tin roof", "crowd cheering").',
        inputSchema: SoundEffectSchema,
        handler: generateSoundEffect,
        agentPermissions: ['GOD_PROMPT', 'ATLAS'],
        estimatedCost: '$0.002/second',
    },
    {
        name: 'elevenlabs_clone_voice',
        description: 'Clone a voice from audio samples. Provide 1–25 audio sample URLs. Returns a voice ID for use in TTS.',
        inputSchema: VoiceCloneSchema,
        handler: cloneVoice,
        agentPermissions: ['RELAY', 'GOD_PROMPT'],
        estimatedCost: '$0 (uses voice slot quota)',
    },
    {
        name: 'elevenlabs_get_usage',
        description: 'Get current ElevenLabs subscription usage — characters used, remaining, and voice slot count.',
        inputSchema: z.object({}),
        handler: getUsage,
        agentPermissions: ['ORACLE', 'RELAY'],
        estimatedCost: 'Free',
    },
];
