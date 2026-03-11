import { z } from 'zod';

// ─── ATLAS LIVE — MIDI Clock Sync & BPM Engine ───────────────────────────────

export const BpmConfigSchema = z.object({
    bpm: z.number().min(20).max(300).default(120),
    beats_per_bar: z.number().min(2).max(8).default(4),
    subdivision: z.enum(['beat', 'half-bar', 'bar', '2-bars', '4-bars']).default('bar'),
    phase_offset_ms: z.number().default(0),
    sync_source: z.enum(['internal', 'tap', 'ableton-link', 'midi']).default('internal'),
});

export const TapTempoSchema = z.object({
    tap_timestamps_ms: z.array(z.number()).min(2).max(16),
});

export const BeatActionSchema = z.object({
    action: z.enum(['play', 'stop', 'update', 'take', 'clear']),
    trigger_on: z.enum(['beat', 'half-bar', 'bar', 'every-n-bars']).default('bar'),
    every_n_bars: z.number().min(1).default(4),
    template_name: z.string().optional(),
    template_data: z.record(z.string()).optional(),
    caspar_layer: z.number().default(20),
});

export function bpmToMs(bpm: number): number { return 60_000 / bpm; }
export function barToMs(bpm: number, bpb: number): number { return bpmToMs(bpm) * bpb; }

export function subdivisionToMs(bpm: number, bpb: number, sub: string): number {
    const beat = bpmToMs(bpm);
    const bar = beat * bpb;
    const table: Record<string, number> = { beat, 'half-bar': bar / 2, bar, '2-bars': bar * 2, '4-bars': bar * 4 };
    return table[sub] ?? bar;
}

export function tapTempo(input: z.infer<typeof TapTempoSchema>): { bpm: number; beat_interval_ms: number } {
    const taps = input.tap_timestamps_ms;
    const intervals = taps.slice(1).map((t, i) => t - taps[i]);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round((60_000 / avg) * 10) / 10;
    return { bpm, beat_interval_ms: Math.round(avg) };
}

export function generateTransitionTimingTable(bpm: number, bpb = 4) {
    const q = bpmToMs(bpm);
    return [
        { label: 'Eighth note', ms: q / 2 },
        { label: 'Quarter note', ms: q },
        { label: 'Half note', ms: q * 2 },
        { label: 'Half bar', ms: q * bpb / 2 },
        { label: '1 bar', ms: q * bpb },
        { label: '2 bars', ms: q * bpb * 2 },
        { label: '4 bars', ms: q * bpb * 4 },
        { label: '8 bars', ms: q * bpb * 8 },
    ].map(t => ({ ...t, ms: Math.round(t.ms), frames_25fps: Math.round(t.ms / 40), frames_30fps: Math.round(t.ms / 33.33) }));
}

type ActionCallback = (action: z.infer<typeof BeatActionSchema>, beat: number, bar: number) => void;

class MidiClockEngine {
    private config: z.infer<typeof BpmConfigSchema>;
    private beat = 0;
    private bar = 0;
    private timer: ReturnType<typeof setInterval> | null = null;
    private playing = false;
    private actions: z.infer<typeof BeatActionSchema>[] = [];
    private onBeat: ActionCallback | null = null;

    constructor(cfg: z.infer<typeof BpmConfigSchema>) { this.config = cfg; }

    setActions(a: z.infer<typeof BeatActionSchema>[]): void { this.actions = a; }
    onBeatTick(cb: ActionCallback): void { this.onBeat = cb; }

    start(): void {
        if (this.playing) return;
        this.playing = true; this.beat = 0; this.bar = 0;
        const ms = bpmToMs(this.config.bpm) + this.config.phase_offset_ms;
        this.timer = setInterval(() => {
            this.beat++;
            if (this.beat % this.config.beats_per_bar === 1) this.bar++;
            for (const action of this.actions) {
                if (this.shouldTrigger(action)) this.onBeat?.(action, this.beat, this.bar);
            }
        }, ms);
    }

    stop(): void {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        this.playing = false;
    }

    updateBpm(bpm: number): void {
        this.config = { ...this.config, bpm };
        if (this.playing) { this.stop(); this.start(); }
    }

    getState() { return { bpm: this.config.bpm, current_beat: this.beat, current_bar: this.bar, playing: this.playing }; }

    private shouldTrigger(a: z.infer<typeof BeatActionSchema>): boolean {
        const bpb = this.config.beats_per_bar;
        if (a.trigger_on === 'beat') return true;
        if (a.trigger_on === 'half-bar') return this.beat % Math.ceil(bpb / 2) === 1;
        if (a.trigger_on === 'bar') return this.beat % bpb === 1;
        if (a.trigger_on === 'every-n-bars') return this.bar % a.every_n_bars === 0 && this.beat % bpb === 1;
        return false;
    }
}

const _sessions = new Map<string, MidiClockEngine>();

export function createClockSession(cfg: z.infer<typeof BpmConfigSchema>, id: string, cb: ActionCallback): MidiClockEngine {
    _sessions.get(id)?.stop();
    const e = new MidiClockEngine(cfg);
    e.onBeatTick(cb);
    _sessions.set(id, e);
    return e;
}
export function stopClockSession(id: string): boolean { const e = _sessions.get(id); if (!e) return false; e.stop(); _sessions.delete(id); return true; }
export function updateSessionBpm(id: string, bpm: number): boolean { const e = _sessions.get(id); if (!e) return false; e.updateBpm(bpm); return true; }
export function listClockSessions(): string[] { return [..._sessions.keys()]; }

export const MIDI_CLOCK_TOOLS = [
    { name: 'atlas_tap_tempo', description: 'Calculate BPM from tap timestamps.', inputSchema: TapTempoSchema, handler: tapTempo, agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_get_timing_table', description: 'Get a BPM timing reference table (ms + frames at 25/30fps).', inputSchema: z.object({ bpm: z.number(), beats_per_bar: z.number().default(4) }), handler: ({ bpm, beats_per_bar }: { bpm: number; beats_per_bar: number }) => ({ bpm, timing: generateTransitionTimingTable(bpm, beats_per_bar) }), agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_update_bpm', description: 'Update the BPM of a running clock session.', inputSchema: z.object({ session_id: z.string(), bpm: z.number().min(20).max(300) }), handler: ({ session_id, bpm }: { session_id: string; bpm: number }) => ({ updated: updateSessionBpm(session_id, bpm), session_id, new_bpm: bpm }), agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_stop_clock_session', description: 'Stop a running MIDI clock session.', inputSchema: z.object({ session_id: z.string() }), handler: ({ session_id }: { session_id: string }) => ({ stopped: stopClockSession(session_id), session_id }), agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_list_clock_sessions', description: 'List active MIDI clock sessions.', inputSchema: z.object({}), handler: () => ({ sessions: listClockSessions() }), agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
];
