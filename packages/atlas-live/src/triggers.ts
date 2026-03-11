import { EventEmitter } from 'events';
import { AtlasGraphicsEngine, createAtlasEngine, GraphicLayer } from './engine.js';

// ─── ATLAS LIVE — Event Trigger System ───────────────────────────────────────
// Connects live data sources to graphics actions.
// CONTROL_ROOM monitors. SHOWRUNNER decides. ATLAS executes.

export type TriggerEventType =
    | 'score_change'
    | 'possession_change'
    | 'timeout'
    | 'commercial_break'
    | 'commercial_return'
    | 'social_mention'
    | 'weather_alert'
    | 'manual'
    | 'time_based'
    | 'data_threshold'
    | 'segment_start'
    | 'segment_end';

export interface GraphicsTrigger {
    id: string;
    name: string;
    event_type: TriggerEventType;
    graphic_template: string;
    data_mapping: Record<string, string>; // eventData key → template field
    layer: GraphicLayer;
    duration_ms: number;
    priority: 1 | 2 | 3; // 1 = highest, overrides lower priority graphics
    active: boolean;
}

export interface TriggerEvent {
    type: TriggerEventType;
    data: Record<string, unknown>;
    source: string;
    timestamp: string;
}

// ─── Built-in Trigger Presets ─────────────────────────────────────────────────

export const SPORTS_TRIGGERS: GraphicsTrigger[] = [
    {
        id: 'score-update',
        name: 'Score Bug Update',
        event_type: 'score_change',
        graphic_template: 'inception/scoreboard',
        data_mapping: {
            home_team: 'homeTeam',
            home_score: 'homeScore',
            away_team: 'awayTeam',
            away_score: 'awayScore',
            period: 'period',
        },
        layer: { channel: 1, layer: 5 },
        duration_ms: 0, // stays until replaced
        priority: 2,
        active: true,
    },
    {
        id: 'score-change-alert',
        name: 'Score Change Celebratory Graphic',
        event_type: 'score_change',
        graphic_template: 'inception/score-alert',
        data_mapping: {
            team_name: 'scoringTeam',
            player_name: 'scoringPlayer',
            new_score: 'newScore',
        },
        layer: { channel: 1, layer: 20 },
        duration_ms: 6000,
        priority: 1,
        active: true,
    },
    {
        id: 'timeout',
        name: 'Timeout Slate',
        event_type: 'timeout',
        graphic_template: 'inception/timeout',
        data_mapping: { team: 'teamName', timeouts_remaining: 'timeoutsRemaining' },
        layer: { channel: 1, layer: 15 },
        duration_ms: 0,
        priority: 2,
        active: true,
    },
];

export const BROADCAST_TRIGGERS: GraphicsTrigger[] = [
    {
        id: 'commercial-break',
        name: 'Commercial Break — Clear Graphics',
        event_type: 'commercial_break',
        graphic_template: 'inception/clear-all',
        data_mapping: {},
        layer: { channel: 1, layer: 99 },
        duration_ms: 0,
        priority: 1,
        active: true,
    },
    {
        id: 'segment-start',
        name: 'Segment Open',
        event_type: 'segment_start',
        graphic_template: 'inception/segment-open',
        data_mapping: { title: 'segmentTitle', presenter: 'presenterName' },
        layer: { channel: 1, layer: 10 },
        duration_ms: 5000,
        priority: 2,
        active: true,
    },
];

// ─── Trigger Engine ───────────────────────────────────────────────────────────

export class AtlasTriggerEngine extends EventEmitter {
    private graphics: AtlasGraphicsEngine;
    private triggers: Map<string, GraphicsTrigger> = new Map();
    private activeLayers: Map<string, number> = new Map(); // layer key → priority
    private runlog: Array<{ ts: string; event: TriggerEventType; trigger: string }> = [];

    constructor(graphics?: AtlasGraphicsEngine) {
        super();
        this.graphics = graphics ?? createAtlasEngine();
    }

    async init(): Promise<void> {
        await this.graphics.connect();
        console.log('[ATLAS TRIGGER] Engine initialized');
    }

    registerTrigger(trigger: GraphicsTrigger): void {
        this.triggers.set(trigger.id, trigger);
        console.log(`[ATLAS TRIGGER] Registered: ${trigger.name} → on ${trigger.event_type}`);
    }

    registerPreset(preset: 'sports' | 'broadcast'): void {
        const triggers = preset === 'sports' ? SPORTS_TRIGGERS : BROADCAST_TRIGGERS;
        triggers.forEach((t) => this.registerTrigger(t));
        console.log(`[ATLAS TRIGGER] Loaded ${triggers.length} ${preset} triggers`);
    }

    async fireEvent(event: TriggerEvent): Promise<void> {
        const matchingTriggers = Array.from(this.triggers.values())
            .filter((t) => t.active && t.event_type === event.type)
            .sort((a, b) => a.priority - b.priority); // lowest number = highest priority

        for (const trigger of matchingTriggers) {
            await this.executeTrigger(trigger, event.data);
        }

        this.emit('event_fired', { event, triggers_executed: matchingTriggers.length });
    }

    private async executeTrigger(
        trigger: GraphicsTrigger,
        eventData: Record<string, unknown>
    ): Promise<void> {
        // Check if a higher-priority graphic is on this layer
        const layerKey = `${trigger.layer.channel}-${trigger.layer.layer}`;
        const currentPriority = this.activeLayers.get(layerKey);
        if (currentPriority !== undefined && currentPriority < trigger.priority) {
            console.log(`[ATLAS TRIGGER] Skipping ${trigger.name} — higher priority graphic on layer ${layerKey}`);
            return;
        }

        // Map event data to template data
        const templateData: Record<string, unknown> = {};
        for (const [eventKey, templateKey] of Object.entries(trigger.data_mapping)) {
            templateData[templateKey] = eventData[eventKey];
        }

        // Special handling for clear-all
        if (trigger.graphic_template === 'inception/clear-all') {
            await this.graphics.connect();
            // Clear all layers on all channels
            for (const layer of [5, 8, 10, 15, 20]) {
                await this.graphics.clearLayer({ channel: 1, layer });
            }
            this.activeLayers.clear();
            return;
        }

        // Play the graphic
        await this.graphics.playTemplate(trigger.layer, trigger.graphic_template, templateData as Record<string, unknown>);
        this.activeLayers.set(layerKey, trigger.priority);

        console.log(`[ATLAS TRIGGER] 🎬 ${trigger.name} → ${trigger.graphic_template}`);
        this.runlog.push({ ts: new Date().toISOString(), event: trigger.event_type, trigger: trigger.name });

        // Auto-stop after duration
        if (trigger.duration_ms > 0) {
            setTimeout(async () => {
                await this.graphics.stopTemplate(trigger.layer);
                this.activeLayers.delete(layerKey);
            }, trigger.duration_ms);
        }
    }

    // ── Convenience Fire Methods ─────────────────────────────────────────────

    async scoreChange(homeTeam: string, homeScore: number, awayTeam: string, awayScore: number, period: string, scoringTeam?: string): Promise<void> {
        await this.fireEvent({
            type: 'score_change',
            data: { home_team: homeTeam, home_score: homeScore, away_team: awayTeam, away_score: awayScore, period, scoring_team: scoringTeam },
            source: 'sports_data_api',
            timestamp: new Date().toISOString(),
        });
    }

    async segmentStart(segmentTitle: string, presenterName?: string): Promise<void> {
        await this.fireEvent({
            type: 'segment_start',
            data: { segment_title: segmentTitle, presenter_name: presenterName ?? '' },
            source: 'showrunner',
            timestamp: new Date().toISOString(),
        });
    }

    async commercialBreak(): Promise<void> {
        await this.fireEvent({ type: 'commercial_break', data: {}, source: 'showrunner', timestamp: new Date().toISOString() });
    }

    setTriggerActive(triggerId: string, active: boolean): void {
        const t = this.triggers.get(triggerId);
        if (t) {
            t.active = active;
            console.log(`[ATLAS TRIGGER] ${triggerId} → ${active ? 'ACTIVE' : 'INACTIVE'}`);
        }
    }

    getRunlog() { return this.runlog; }
}
