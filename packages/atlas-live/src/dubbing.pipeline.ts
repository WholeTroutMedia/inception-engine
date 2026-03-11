import axios from 'axios';
import { z } from 'zod';

// ─── ATLAS LIVE — Live Dubbing Pipeline ──────────────────────────────────────
// Real-time transcription + voice synthesis for live broadcast production.
// Pipeline: Live audio → Deepgram STT → Translation (optional) → ElevenLabs TTS
// Use cases: Live commentary dubbing, multilingual broadcast, accessibility SDH

const DEEPGRAM_BASE = 'https://api.deepgram.com/v1';
const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

const ENV_DUB = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };

function deepgramHeaders() {
    const key = ENV_DUB.process?.env?.['DEEPGRAM_API_KEY'];
    if (!key) throw new Error('DEEPGRAM_API_KEY not configured');
    return { 'Authorization': `Token ${key}`, 'Content-Type': 'application/json' };
}

function elevenHeaders() {
    const key = ENV_DUB.process?.env?.['ELEVENLABS_API_KEY'];
    if (!key) throw new Error('ELEVENLABS_API_KEY not configured');
    return { 'xi-api-key': key, 'Content-Type': 'application/json' };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const TranscribeAudioSchema = z.object({
    audio_url: z.string().url().describe('URL of audio file to transcribe (MP3, WAV, MP4, WebM)'),
    language: z.string().default('en').describe('BCP-47 language code (e.g. en, es, fr, de, ja)'),
    model: z.enum(['nova-3', 'nova-2', 'enhanced', 'base']).default('nova-3').describe('Deepgram model'),
    punctuate: z.boolean().default(true),
    diarize: z.boolean().default(false).describe('Speaker diarization (who said what)'),
    profanity_filter: z.boolean().default(false),
    filler_words: z.boolean().default(false).describe('Include um/uh filler words'),
    smart_format: z.boolean().default(true).describe('Format numbers, dates, currencies automatically'),
    utterances: z.boolean().default(true).describe('Return timestamped utterance segments'),
});

export const DubAudioSchema = z.object({
    audio_url: z.string().url().describe('URL of source audio to dub'),
    source_language: z.string().default('en').describe('Source BCP-47 language'),
    target_voice_id: z.string().describe('ElevenLabs voice ID for the dub'),
    voice_stability: z.number().min(0).max(1).default(0.5),
    voice_similarity_boost: z.number().min(0).max(1).default(0.75),
    preserve_timing: z.boolean().default(true).describe('Attempt to match original speech timing'),
    transcription_model: z.enum(['nova-3', 'nova-2']).default('nova-3'),
});

export const GenerateCaptionsSchema = z.object({
    audio_url: z.string().url(),
    language: z.string().default('en'),
    format: z.enum(['srt', 'vtt', 'json']).default('srt'),
    max_chars_per_line: z.number().default(42),
    model: z.enum(['nova-3', 'nova-2']).default('nova-3'),
});

export const RealtimeDubSessionSchema = z.object({
    voice_id: z.string().describe('ElevenLabs voice ID for live dubbing'),
    sample_rate: z.number().default(16000),
    language: z.string().default('en'),
    latency_mode: z.enum(['ultra-low', 'balanced', 'quality']).default('balanced'),
    stability: z.number().default(0.5),
    similarity_boost: z.number().default(0.75),
});

// ─── Transcription ────────────────────────────────────────────────────────────

export interface TranscriptionResult {
    transcript: string;
    confidence: number;
    duration: number;
    utterances?: Array<{
        speaker?: number;
        start: number;
        end: number;
        text: string;
        confidence: number;
    }>;
    words: Array<{ word: string; start: number; end: number; confidence: number }>;
    language: string;
}

export async function transcribeAudio(input: z.infer<typeof TranscribeAudioSchema>): Promise<TranscriptionResult> {
    const v = TranscribeAudioSchema.parse(input);
    console.log(`[ATLAS/DUB] 🎤 Transcribing: ${v.audio_url.slice(0, 60)}...`);

    const response = await axios.post(
        `${DEEPGRAM_BASE}/listen`,
        { url: v.audio_url },
        {
            headers: deepgramHeaders(),
            params: {
                model: v.model,
                language: v.language,
                punctuate: v.punctuate,
                diarize: v.diarize,
                profanity_filter: v.profanity_filter,
                filler_words: v.filler_words,
                smart_format: v.smart_format,
                utterances: v.utterances,
            },
        }
    );

    const results = response.data as {
        results: {
            channels: Array<{
                alternatives: Array<{
                    transcript: string;
                    confidence: number;
                    words: Array<{ word: string; start: number; end: number; confidence: number }>;
                }>;
                utterances?: Array<{ speaker: number; start: number; end: number; transcript: string; confidence: number }>;
            }>;
        };
        metadata: { duration: number };
    };

    const channel = results.results.channels[0];
    const alt = channel.alternatives[0];

    return {
        transcript: alt.transcript,
        confidence: alt.confidence,
        duration: results.metadata.duration,
        words: alt.words,
        utterances: channel.utterances?.map(u => ({
            speaker: u.speaker,
            start: u.start,
            end: u.end,
            text: u.transcript,
            confidence: u.confidence,
        })),
        language: v.language,
    };
}

// ─── Caption Generation ───────────────────────────────────────────────────────

function msToTimecode(seconds: number, format: 'srt' | 'vtt'): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    const sep = format === 'srt' ? ',' : '.';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms).padStart(3, '0')}`;
}

export async function generateCaptions(input: z.infer<typeof GenerateCaptionsSchema>) {
    const v = GenerateCaptionsSchema.parse(input);
    console.log(`[ATLAS/DUB] 📝 Generating ${v.format.toUpperCase()} captions...`);

    const transcription = await transcribeAudio({
        audio_url: v.audio_url,
        language: v.language,
        model: v.model,
        utterances: true,
        smart_format: true,
        punctuate: true,
        diarize: false,
        profanity_filter: false,
        filler_words: false,
    });

    if (!transcription.utterances?.length) {
        throw new Error('No utterances returned — cannot generate captions');
    }

    if (v.format === 'json') {
        return { captions: transcription.utterances, format: 'json', count: transcription.utterances.length };
    }

    const lines: string[] = v.format === 'vtt' ? ['WEBVTT', ''] : [];
    transcription.utterances.forEach((utterance, i) => {
        const fmt = v.format as 'srt' | 'vtt';
        if (fmt === 'srt') lines.push(String(i + 1));
        lines.push(`${msToTimecode(utterance.start, fmt)} --> ${msToTimecode(utterance.end, fmt)}`);

        // Word-wrap at max_chars_per_line
        const words = utterance.text.split(' ');
        let line = '';
        for (const word of words) {
            if ((line + ' ' + word).trim().length > v.max_chars_per_line && line.length > 0) {
                lines.push(line.trim());
                line = word;
            } else {
                line = (line + ' ' + word).trim();
            }
        }
        if (line) lines.push(line);
        lines.push('');
    });

    return {
        captions: lines.join('\n'),
        format: v.format,
        count: transcription.utterances.length,
        duration: transcription.duration,
    };
}

// ─── Audio Dubbing (Transcribe → Synth) ──────────────────────────────────────

export async function dubAudio(input: z.infer<typeof DubAudioSchema>) {
    const v = DubAudioSchema.parse(input);
    console.log(`[ATLAS/DUB] 🔄 Dubbing: ${v.audio_url.slice(0, 50)} → voice ${v.target_voice_id}`);

    // Step 1: Transcribe source audio
    const transcription = await transcribeAudio({
        audio_url: v.audio_url,
        language: v.source_language,
        model: v.transcription_model,
        utterances: v.preserve_timing,
        smart_format: true,
        punctuate: true,
        diarize: false,
        profanity_filter: false,
        filler_words: false,
    });

    // Step 2: Generate dubbed speech with ElevenLabs
    const ttsResponse = await axios.post(
        `${ELEVEN_BASE}/text-to-speech/${v.target_voice_id}`,
        {
            text: transcription.transcript,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
                stability: v.voice_stability,
                similarity_boost: v.voice_similarity_boost,
            },
        },
        { headers: elevenHeaders(), responseType: 'arraybuffer' }
    );

    const audioData = new Uint8Array(ttsResponse.data as ArrayBuffer);
    const binary = Array.from(audioData).map(b => String.fromCharCode(b)).join('');
    const audio_base64 = btoa(binary);

    return {
        source_transcript: transcription.transcript,
        confidence: transcription.confidence,
        duration: transcription.duration,
        dubbed_audio_base64: audio_base64,
        dubbed_voice_id: v.target_voice_id,
        utterances: transcription.utterances,
    };
}

// ─── Realtime Session Config ──────────────────────────────────────────────────

export function buildRealtimeDubSession(input: z.infer<typeof RealtimeDubSessionSchema>) {
    const v = RealtimeDubSessionSchema.parse(input);
    const deepgramWsUrl = `wss://api.deepgram.com/v1/listen?model=nova-3&language=${v.language}&interim_results=true&utterance_end_ms=1000&vad_events=true`;
    const elevenWsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${v.voice_id}/stream-input?model_id=eleven_turbo_v2_5&output_format=mp3_44100_128`;

    return {
        deepgram_ws_url: deepgramWsUrl,
        deepgram_api_key: ENV_DUB.process?.env?.['DEEPGRAM_API_KEY'] ?? 'NOT_SET',
        elevenlabs_ws_url: elevenWsUrl,
        elevenlabs_api_key: ENV_DUB.process?.env?.['ELEVENLABS_API_KEY'] ?? 'NOT_SET',
        voice_settings: {
            stability: v.stability,
            similarity_boost: v.similarity_boost,
        },
        latency_mode: v.latency_mode,
        pipeline: 'Deepgram Nova-3 STT → ElevenLabs Turbo v2.5 TTS',
        expected_latency_ms: v.latency_mode === 'ultra-low' ? '< 500ms' : v.latency_mode === 'balanced' ? '500–1200ms' : '1200–2500ms',
    };
}

// ─── MCP Tool Registration ────────────────────────────────────────────────────

export const ATLAS_DUBBING_TOOLS = [
    {
        name: 'atlas_transcribe',
        description: 'Transcribe audio to text using Deepgram Nova-3. Returns transcript, confidence, timestamped words and utterances.',
        inputSchema: TranscribeAudioSchema,
        handler: transcribeAudio,
        agentPermissions: ['ATLAS', 'RELAY', 'ORACLE'],
        estimatedCost: '$0.0043/min (Nova-3)',
    },
    {
        name: 'atlas_generate_captions',
        description: 'Generate SRT, VTT, or JSON captions from audio. Auto word-wraps at configurable line length.',
        inputSchema: GenerateCaptionsSchema,
        handler: generateCaptions,
        agentPermissions: ['ATLAS', 'RELAY'],
        estimatedCost: '$0.0043/min + processing',
    },
    {
        name: 'atlas_dub_audio',
        description: 'Dub audio content with a new voice: transcribes source audio then re-synthesizes with ElevenLabs TTS.',
        inputSchema: DubAudioSchema,
        handler: dubAudio,
        agentPermissions: ['ATLAS'],
        estimatedCost: '$0.0043/min + $0.0003/char',
    },
    {
        name: 'atlas_realtime_session',
        description: 'Get WebSocket connection configs for real-time live dubbing pipeline (Deepgram → ElevenLabs streaming).',
        inputSchema: RealtimeDubSessionSchema,
        handler: buildRealtimeDubSession,
        agentPermissions: ['ATLAS'],
        estimatedCost: 'Streaming rates apply',
    },
];
