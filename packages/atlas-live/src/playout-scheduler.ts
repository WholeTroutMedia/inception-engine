import { z } from 'zod';

// ─── ATLAS LIVE — Automated Playout Scheduler (Show Runner) ──────────────────

export const RundownItemSchema = z.object({
    id: z.string(),
    label: z.string(),
    planned_at: z.string().describe('ISO 8601 datetime'),
    duration_seconds: z.number().min(1).default(10),
    auto_play: z.boolean().default(true),
    action: z.enum(['play', 'stop', 'update', 'take', 'clear', 'cue']),
    template_name: z.string().optional(),
    template_data: z.record(z.string()).optional(),
    channel: z.number().default(1),
    layer: z.number().default(20),
    notes: z.string().optional(),
    on_complete: z.enum(['stop', 'next', 'loop', 'hold']).default('stop'),
});

export const RundownSchema = z.object({
    rundown_id: z.string(),
    show_name: z.string(),
    date: z.string(),
    items: z.array(RundownItemSchema).min(1),
    timezone: z.string().default('America/New_York'),
});

export type RundownItemStatus = 'pending' | 'cued' | 'playing' | 'completed' | 'skipped' | 'error';

export interface RundownItemState { item: z.infer<typeof RundownItemSchema>; status: RundownItemStatus; started_at?: string; completed_at?: string; error?: string }
export interface RundownState { rundown_id: string; show_name: string; date: string; items: RundownItemState[]; current_item_id?: string; started_at?: string; completed_at?: string; is_running: boolean }

type ActionExecutor = (item: z.infer<typeof RundownItemSchema>) => Promise<void>;
type StateCallback = (state: RundownState) => void;

class RundownManager {
    private state: RundownState;
    private timers = new Map<string, ReturnType<typeof setTimeout>>();
    private executor: ActionExecutor;
    private cb: StateCallback | null = null;

    constructor(r: z.infer<typeof RundownSchema>, exec: ActionExecutor) {
        this.executor = exec;
        this.state = { rundown_id: r.rundown_id, show_name: r.show_name, date: r.date, items: r.items.map(item => ({ item, status: 'pending' })), is_running: false };
    }

    onUpdate(cb: StateCallback): void { this.cb = cb; }

    start(): RundownState {
        if (this.state.is_running) return this.state;
        this.state.is_running = true;
        this.state.started_at = new Date().toISOString();
        const now = Date.now();
        for (const entry of this.state.items) {
            if (!entry.item.auto_play) { entry.status = 'cued'; continue; }
            const delay = Math.max(0, new Date(entry.item.planned_at).getTime() - now);
            this.timers.set(entry.item.id, setTimeout(() => this.execute(entry), delay));
        }
        this.emit();
        return this.state;
    }

    stop(): void {
        this.timers.forEach(t => clearTimeout(t));
        this.timers.clear();
        this.state.is_running = false;
        this.state.completed_at = new Date().toISOString();
        this.emit();
    }

    skip(id: string): boolean {
        const e = this.state.items.find(i => i.item.id === id);
        if (!e || e.status !== 'pending') return false;
        e.status = 'skipped';
        const t = this.timers.get(id);
        if (t) { clearTimeout(t); this.timers.delete(id); }
        this.emit();
        return true;
    }

    trigger(id: string): boolean {
        const e = this.state.items.find(i => i.item.id === id);
        if (!e) return false;
        this.execute(e);
        return true;
    }

    getState(): RundownState { return { ...this.state, items: [...this.state.items] }; }

    private async execute(entry: RundownItemState): Promise<void> {
        entry.status = 'playing';
        entry.started_at = new Date().toISOString();
        this.state.current_item_id = entry.item.id;
        this.emit();
        try {
            await this.executor(entry.item);
            if (entry.item.on_complete === 'next') {
                const idx = this.state.items.findIndex(e => e.item.id === entry.item.id);
                const next = this.state.items[idx + 1];
                if (next) setTimeout(() => this.execute(next), entry.item.duration_seconds * 1000);
            } else if (entry.item.on_complete === 'loop') {
                setTimeout(() => this.execute(entry), entry.item.duration_seconds * 1000);
                return;
            }
            entry.status = 'completed';
        } catch (e: unknown) { entry.status = 'error'; entry.error = (e as Error).message; }
        entry.completed_at = new Date().toISOString();
        if (this.state.items.every(e => ['completed', 'skipped', 'error'].includes(e.status))) {
            this.state.is_running = false;
            this.state.completed_at = new Date().toISOString();
        }
        this.emit();
    }

    private emit(): void { this.cb?.(this.getState()); }
}

const _rundowns = new Map<string, RundownManager>();
export function createRundown(r: z.infer<typeof RundownSchema>, exec: ActionExecutor, cb?: StateCallback): RundownManager {
    const m = new RundownManager(r, exec);
    if (cb) m.onUpdate(cb);
    _rundowns.set(r.rundown_id, m);
    return m;
}
export function getRundownState(id: string): RundownState | null { return _rundowns.get(id)?.getState() ?? null; }
export function stopRundown(id: string): boolean { const m = _rundowns.get(id); if (!m) return false; m.stop(); return true; }
export function listRundowns(): string[] { return [..._rundowns.keys()]; }

export function generateRundownHtml(rundown: z.infer<typeof RundownSchema>): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Rundown — ${rundown.show_name}</title>
<style>body{font-family:-apple-system,sans-serif;background:#0a0a0f;color:#f5f0e8;padding:40px;margin:0}h1{font-size:28px;font-weight:800;margin:0 0 4px}.meta{color:rgba(245,240,232,0.5);font-size:13px;margin-bottom:32px}.item{display:grid;grid-template-columns:100px 1fr 80px 80px;gap:16px;padding:16px 20px;background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:8px;border-left:3px solid ${rundown.items[0]?.auto_play ? '#b87333' : '#6c757d'}}.time{font-family:monospace;font-size:13px;opacity:.7}.label{font-weight:600}.sub{font-size:12px;opacity:.5;margin-top:2px}.dur{text-align:right;font-size:13px;opacity:.6}.badge{padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;text-transform:uppercase}</style></head>
<body><h1>${rundown.show_name}</h1><div class="meta">${rundown.date} &bull; ${rundown.items.length} items</div>
${rundown.items.map(item => `<div class="item"><div class="time">${new Date(item.planned_at).toLocaleTimeString()}</div><div><div class="label">${item.label}</div><div class="sub">${item.action.toUpperCase()}${item.template_name ? ' · ' + item.template_name : ''}</div></div><div class="dur">${item.duration_seconds}s</div><div><span class="badge" style="background:${item.auto_play ? 'rgba(184,115,51,.2)' : 'rgba(108,117,125,.2)'};color:${item.auto_play ? '#b87333' : '#adb5bd'}">${item.auto_play ? 'AUTO' : 'CUE'}</span></div></div>`).join('')}
</body></html>`;
}

export const PLAYOUT_TOOLS = [
    { name: 'atlas_get_rundown_state', description: 'Get state of a rundown by ID.', inputSchema: z.object({ rundown_id: z.string() }), handler: ({ rundown_id }: { rundown_id: string }) => getRundownState(rundown_id) ?? { error: 'Not found' }, agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_stop_rundown', description: 'Stop a running rundown.', inputSchema: z.object({ rundown_id: z.string() }), handler: ({ rundown_id }: { rundown_id: string }) => ({ stopped: stopRundown(rundown_id) }), agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_list_rundowns', description: 'List active rundown IDs.', inputSchema: z.object({}), handler: () => ({ rundowns: listRundowns() }), agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
    { name: 'atlas_generate_rundown_html', description: 'Generate an HTML rundown sheet for a show.', inputSchema: RundownSchema, handler: generateRundownHtml, agentPermissions: ['ATLAS'], estimatedCost: 'Free' },
];
