/**
 * @inception/live-animate — Gemini Vision Layer
 *
 * The AI backbone for LIVE ANIMATE.
 * Takes a broadcast frame (base64 image or Blob) → Gemini Flash vision →
 * extracts player positions, bounding boxes, jersey numbers → emits InceptionEvents.
 *
 * This is the Gemini → sensor-mesh → somatic bridge.
 *
 * Usage (Node/server-side):
 *
 *   const vision = new GeminiVisionLayer({ apiKey: process.env.GEMINI_API_KEY! });
 *   const events = await vision.analyzeFrame(frameBase64, 'nba');
 *   events.forEach(event => engine.tracker.ingest(event));
 *
 * Usage (browser-side with webcam):
 *
 *   vision.startWebcamLoop(videoElement, 'nba', (events) => {
 *     events.forEach(e => tracker.ingest(e));
 *   });
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { makeEvent, type InceptionEvent } from '../types/inception-event.js';
import { EventEmitter } from 'events';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VisionFeedType = 'nba' | 'nfl' | 'soccer' | 'f1' | 'generic';

export interface VisionLoopConfig {
    intervalMs?: number;    // default 500ms (2fps — Gemini rate limit safe)
    sport?: VisionFeedType;
    debug?: boolean;
}

export interface GeminiVisionConfig {
    apiKey: string;
    model?: string;         // default: gemini-2.0-flash
}

interface DetectedPlayer {
    id: string;
    jersey?: string;
    team?: string;
    x: number;             // normalized 0-1
    y: number;             // normalized 0-1
    confidence: number;    // 0-1
    action?: string;       // 'running' | 'passing' | 'shooting' | etc.
}

interface DetectedScene {
    sport: string;
    players: DetectedPlayer[];
    ball?: { x: number; y: number };
    fieldZone?: string;
    timestamp: number;
}

// ─── Prompt templates by sport ────────────────────────────────────────────────

const SPORT_PROMPTS: Record<VisionFeedType, string> = {
    nba: `Analyze this NBA broadcast frame. Extract ALL visible players.
For each player return: jersey number, team (home/away), approximate normalized x,y position (0=left/top, 1=right/bottom), and current action (running/dribbling/shooting/defending/standing).
Also detect: ball position (x,y), current field zone (paint/mid-range/3pt/halfcourt).
RESPOND ONLY WITH VALID JSON matching this schema:
{"sport":"nba","players":[{"id":"p1","jersey":"23","team":"home","x":0.45,"y":0.6,"confidence":0.9,"action":"dribbling"}],"ball":{"x":0.46,"y":0.58},"fieldZone":"paint"}`,

    nfl: `Analyze this NFL broadcast frame. Extract ALL visible players.
Return jersey number, team, normalized x/y position, and action (running/blocking/passing/catching/tackling).
RESPOND ONLY WITH VALID JSON:
{"sport":"nfl","players":[{"id":"p1","jersey":"12","team":"home","x":0.3,"y":0.5,"confidence":0.85,"action":"passing"}],"ball":{"x":0.31,"y":0.49},"fieldZone":"redzone"}`,

    soccer: `Analyze this soccer/football broadcast frame. Extract ALL visible players.
Return jersey number, team, normalized x/y position, and action (running/passing/shooting/defending/keeper).
RESPOND ONLY WITH VALID JSON:
{"sport":"soccer","players":[{"id":"p1","jersey":"9","team":"home","x":0.7,"y":0.4,"confidence":0.88,"action":"running"}],"ball":{"x":0.68,"y":0.4},"fieldZone":"attacking-third"}`,

    f1: `Analyze this F1 broadcast frame. Identify visible cars.
Return car number, team, normalized track x/y position, estimated speed tier (1=slow, 3=fast).
RESPOND ONLY WITH VALID JSON:
{"sport":"f1","players":[{"id":"car44","jersey":"44","team":"Mercedes","x":0.5,"y":0.5,"confidence":0.9,"action":"racing"}],"fieldZone":"straight"}`,

    generic: `Analyze this broadcast/video frame. Identify moving entities (people, vehicles, objects).
Return normalized x/y positions and any identifying label.
RESPOND ONLY WITH VALID JSON:
{"sport":"generic","players":[{"id":"entity1","jersey":"","team":"","x":0.5,"y":0.5,"confidence":0.7,"action":"moving"}],"fieldZone":"unknown"}`,
};

// ─── GeminiVisionLayer ────────────────────────────────────────────────────────

export class GeminiVisionLayer extends EventEmitter {
    private readonly model: GenerativeModel;
    private readonly config: GeminiVisionConfig;
    private loopTimer: ReturnType<typeof setInterval> | null = null;
    private frameCount = 0;
    private errorCount = 0;

    constructor(config: GeminiVisionConfig) {
        super();
        this.config = config;
        const genai = new GoogleGenerativeAI(config.apiKey);
        this.model = genai.getGenerativeModel({
            model: config.model ?? 'gemini-2.0-flash',
        });
    }

    /**
     * Analyze a single frame (base64 JPEG/PNG) and return InceptionEvents.
     */
    public async analyzeFrame(
        imageBase64: string,
        sport: VisionFeedType = 'nba',
        mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
    ): Promise<InceptionEvent[]> {
        this.frameCount++;

        const prompt = SPORT_PROMPTS[sport] ?? SPORT_PROMPTS.generic;

        try {
            const result = await this.model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType,
                    },
                },
            ]);

            const text = result.response.text().trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 100)}`);

            const scene = JSON.parse(jsonMatch[0]) as DetectedScene;
            scene.timestamp = Date.now();

            const events = this.sceneToEvents(scene);
            this.emit('events', events);
            this.emit('scene', scene);
            return events;
        } catch (err) {
            this.errorCount++;
            this.emit('error', err as Error);
            return [];
        }
    }

    /**
     * Convert a detected scene into InceptionEvents for the tracker.
     */
    private sceneToEvents(scene: DetectedScene): InceptionEvent[] {
        return scene.players.map(player =>
            makeEvent({
                vertical: 'sports',
                type: `${scene.sport}.vision`,
                source: 'gemini-vision',
                eventTime: new Date(scene.timestamp).toISOString(),
                entityId: player.id,
                entityName: player.jersey ? `#${player.jersey}` : player.id,
                groupId: player.team ?? 'unknown',
                normalizedPosition: { x: player.x, y: player.y },
                confidence: player.confidence,
                payload: {
                    action: player.action,
                    jersey: player.jersey,
                    sport: scene.sport,
                    fieldZone: scene.fieldZone,
                    source: 'gemini-vision',
                },
            })
        );
    }

    /**
     * Start a webcam frame capture loop in the browser.
     * Call this with a <video> element displaying the webcam/broadcast feed.
     */
    public startWebcamLoop(
        video: HTMLVideoElement,
        sport: VisionFeedType = 'nba',
        onEvents: (events: InceptionEvent[]) => void,
        config: VisionLoopConfig = {}
    ): void {
        if (this.loopTimer) this.stopWebcamLoop();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const intervalMs = config.intervalMs ?? 500;

        this.loopTimer = setInterval(async () => {
            if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

            const events = await this.analyzeFrame(base64, sport);
            onEvents(events);
        }, intervalMs);

        console.log(`[vision] 📡 Webcam loop started — ${sport} @ ${intervalMs}ms`);
    }

    public stopWebcamLoop(): void {
        if (this.loopTimer) {
            clearInterval(this.loopTimer);
            this.loopTimer = null;
            console.log('[vision] ⏹️  Webcam loop stopped');
        }
    }

    public getStats() {
        return {
            frames: this.frameCount,
            errors: this.errorCount,
            errorRate: this.frameCount > 0 ? this.errorCount / this.frameCount : 0,
        };
    }
}
