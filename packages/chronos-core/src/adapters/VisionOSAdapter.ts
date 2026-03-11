import { TimeSeriesManager } from '../store/TimeSeriesManager.js';

// ─── Chronos: VisionOS Spatial Event Adapter ──────────────────────────────────
// Receives Apple VisionOS spatial events (gaze, pinch, environment, hand pose)
// via UDP datagrams and indexes them into the universal Chronos timeline.
// Article IX: Complete implementation.

export interface VisionOSSpatialFrame {
    /** Microsecond-precise host timestamp from visionOS (host clock synced) */
    host_us: number;
    /** Gaze direction vector [x, y, z] in world space */
    gaze_direction?: [number, number, number];
    /** Eye convergence distance (meters) */
    convergence_distance?: number;
    /** Active hand poses */
    hands?: {
        left?: VisionOSHandPose;
        right?: VisionOSHandPose;
    };
    /** Scene understanding — detected anchors */
    anchors?: VisionOSAnchor[];
    /** Passthrough environment luminance (0–1) */
    luminance?: number;
}

export interface VisionOSHandPose {
    /** Pinch strength per finger (0–1): [thumb, index, middle, ring, pinky] */
    pinch_strengths: [number, number, number, number, number];
    /** Wrist position in world space */
    wrist_position: [number, number, number];
    /** Wrist orientation quaternion [x, y, z, w] */
    wrist_orientation: [number, number, number, number];
    /** Confidence: high | medium | low */
    confidence: 'high' | 'medium' | 'low';
}

export interface VisionOSAnchor {
    id: string;
    type: 'plane' | 'image' | 'object' | 'hand' | 'face';
    position: [number, number, number];
    extent?: [number, number]; // width × height for planes (meters)
    classification?: string;   // "floor", "wall", "ceiling", "seat", "table"
}

export interface VisionOSTimelineEntry {
    source: 'visionos';
    frame: VisionOSSpatialFrame;
    processed_at: string;
    semantic_tags: string[];
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class VisionOSAdapter {
    private readonly tsManager: TimeSeriesManager;
    private readonly udpPort: number;
    private dgram: typeof import('dgram') | null = null;
    private server: import('dgram').Socket | null = null;
    private _running = false;

    constructor(tsManager: TimeSeriesManager, udpPort = 7401) {
        this.tsManager = tsManager;
        this.udpPort = udpPort;
    }

    async start(): Promise<void> {
        if (this._running) return;

        this.dgram = await import('dgram');
        this.server = this.dgram.createSocket('udp4');

        this.server.on('message', (msg: Buffer) => {
            try {
                const frame = JSON.parse(msg.toString()) as VisionOSSpatialFrame;
                this.ingest(frame);
            } catch {
                // malformed frame — skip
            }
        });

        await new Promise<void>((resolve, reject) => {
            this.server!.bind(this.udpPort, () => {
                console.log(`[ChronosVisionOS] Listening on UDP :${this.udpPort}`);
                resolve();
            });
            this.server!.once('error', reject);
        });

        this._running = true;
    }

    async stop(): Promise<void> {
        if (!this._running || !this.server) return;
        await new Promise<void>(resolve => this.server!.close(() => resolve()));
        this._running = false;
        console.log(`[ChronosVisionOS] Stopped.`);
    }

    /** Force-ingest a spatial frame (useful for testing / HTTP bridge). */
    ingest(frame: VisionOSSpatialFrame): VisionOSTimelineEntry {
        const tags = this.extractSemanticTags(frame);
        const entry: VisionOSTimelineEntry = {
            source: 'visionos',
            frame,
            processed_at: new Date().toISOString(),
            semantic_tags: tags,
        };

        // Index into time-series store — use luminance (or 1.0) as the numeric score
        const timestampMs = frame.host_us
            ? Math.round(frame.host_us / 1000)
            : Date.now();
        const score = frame.luminance ?? 1.0;

        this.tsManager.indexEvent(
            timestampMs,
            {
                modality: 'biometric',
                source: 'visionos',
                latencyMs: 0,
                features: entry as unknown as Record<string, unknown>,
            },
            score
        ).catch((err: Error) =>
            console.warn('[ChronosVisionOS] indexEvent failed (non-fatal):', err.message)
        );

        return entry;
    }

    private extractSemanticTags(frame: VisionOSSpatialFrame): string[] {
        const tags: string[] = ['spatial'];

        if (frame.gaze_direction) tags.push('gaze');
        if (frame.convergence_distance !== undefined) {
            tags.push(frame.convergence_distance < 0.5 ? 'near-focus' : 'far-focus');
        }

        const left = frame.hands?.left;
        const right = frame.hands?.right;

        if ((left?.pinch_strengths[1] ?? 0) > 0.7) tags.push('left-pinch');
        if ((right?.pinch_strengths[1] ?? 0) > 0.7) tags.push('right-pinch');
        if (left?.confidence === 'high' || right?.confidence === 'high') tags.push('hand-tracked');

        if (frame.anchors?.some(a => a.type === 'plane')) tags.push('plane-detected');
        if (frame.anchors?.some(a => a.classification === 'table')) tags.push('surface-table');

        return tags;
    }
}
