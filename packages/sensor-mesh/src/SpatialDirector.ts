/**
 * @inception/sensor-mesh — SpatialDirector
 *
 * Tier 3 — THE CONSTELLATION
 *
 * Runs parallel VisionNode instances across all networked cameras
 * (RTSP streams, Sony A1 II, Ray-Ban Meta POV) and fuses them
 * into a unified SceneGraph — the system's spatial awareness.
 *
 * The MetaHuman is not just mirroring one person.
 * It's conducting the room.
 */

import { EventEmitter } from 'events';
import { CaptureSource, CinematicContext, PersonNode, SceneGraph } from './types.js';
import { VisionNode } from './VisionNode.js';

// ─── SpatialDirector ─────────────────────────────────────────────────────────

/**
 * SpatialDirector — the room's unified spatial awareness.
 *
 * Runs one VisionNode per camera and fuses all CinematicContext
 * outputs into a single SceneGraph every N seconds.
 *
 * @example
 * const director = new SpatialDirector([
 *   { type: 'rtmp', url: 'rtmp://localhost:1935/live/a1', label: 'sony-a1' },
 *   { type: 'rtsp', url: 'rtsp://localhost/stream', label: 'room-cam-1' },
 * ], { geminiApiKey: process.env.GEMINI_API_KEY! });
 *
 * director.on('scene', (graph: SceneGraph) => {
 *   console.log(`Room energy: ${graph.roomEnergy}, Persons: ${graph.persons.length}`);
 * });
 * await director.start();
 */
export class SpatialDirector extends EventEmitter {
  private readonly nodes: Map<string, VisionNode> = new Map();
  private readonly latestContexts: Map<string, CinematicContext> = new Map();
  private readonly fuseIntervalMs: number;
  private fuseRef: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private sceneVersion = 0;

  constructor(
    sources: CaptureSource[],
    options: {
      geminiApiKey: string;
      captureIntervalMs?: number;
      fuseIntervalMs?: number;
    }
  ) {
    super();
    this.fuseIntervalMs = options.fuseIntervalMs ?? 2000;

    // Create one VisionNode per source
    for (const source of sources) {
      const node = new VisionNode(source, {
        geminiApiKey: options.geminiApiKey,
        captureIntervalMs: options.captureIntervalMs ?? 2000,
      });

      node.on('context', (ctx: CinematicContext) => {
        this.latestContexts.set(source.label, ctx);
      });

      this.nodes.set(source.label, node);
    }
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Start all vision nodes in parallel
    const startPromises = [...this.nodes.values()].map((n) =>
      n.start().catch((err: unknown) => console.warn('[spatial-director] Node start failed:', err))
    );
    await Promise.allSettled(startPromises);

    // Fuse loop
    this.fuseRef = setInterval(() => this.fuse(), this.fuseIntervalMs);

    console.log(
      `[spatial-director] 🌐 Constellation online — ${this.nodes.size} camera(s), fusing every ${this.fuseIntervalMs}ms`
    );
  }

  stop(): void {
    this.running = false;
    if (this.fuseRef) {
      clearInterval(this.fuseRef);
      this.fuseRef = null;
    }
    for (const node of this.nodes.values()) node.stop();
    console.log('[spatial-director] ⏹️  Constellation offline');
  }

  getSceneGraph(): SceneGraph | null {
    if (this.latestContexts.size === 0) return null;
    return this.buildSceneGraph();
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private fuse(): void {
    if (this.latestContexts.size === 0) return;
    const scene = this.buildSceneGraph();
    this.sceneVersion++;
    this.emit('scene', scene);
  }

  /**
   * Merge all per-camera CinematicContext into a SceneGraph.
   *
   * Person deduplication: we group by approximate position
   * (persons within 0.2 normalized units are considered the same person).
   * This is a simple heuristic — a production system would use re-ID embeddings.
   */
  private buildSceneGraph(): SceneGraph {
    const contexts = [...this.latestContexts.values()];

    // Fuse room energy: weighted average (hero camera has 2x weight if labeled 'sony-a1')
    let totalWeight = 0;
    let weightedEnergy = 0;
    for (const ctx of contexts) {
      const weight = ctx.sourceCamera === 'sony-a1' ? 2.0 : 1.0;
      weightedEnergy += (ctx.sceneEnergy ?? 0.5) * weight;
      totalWeight += weight;
    }
    const roomEnergy = totalWeight > 0 ? weightedEnergy / totalWeight : 0.5;

    // Build person nodes from all camera detections
    const rawPersons: PersonNode[] = [];
    let personIdCounter = 0;

    for (const ctx of contexts) {
      if ((ctx.subjectCount ?? 0) === 0) continue;

      const posX = ctx.subjectPositionX ?? 0.5;
      const posY = ctx.subjectPositionY ?? 0.5;

      // Check if this person is already in rawPersons (dedup by proximity)
      const existing = rawPersons.find(
        (p) => Math.abs(p.position.x - posX) < 0.2 && Math.abs(p.position.y - posY) < 0.2
      );

      if (existing) {
        // Merge: add camera source
        existing.cameras.push(ctx.sourceCamera ?? 'unknown');
        // Prefer hero camera emotion
        if (ctx.sourceCamera === 'sony-a1' && ctx.subjectEmotion) {
          existing.emotion = ctx.subjectEmotion;
        }
      } else {
        rawPersons.push({
          id: `person-${++personIdCounter}`,
          position: { x: posX, y: posY },
          emotion: ctx.subjectEmotion,
          cameras: [ctx.sourceCamera ?? 'unknown'],
        });
      }
    }

    return {
      persons: rawPersons,
      roomEnergy,
      cameraContexts: contexts,
      timestamp: Date.now(),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Add a camera source at runtime (hot-plug) */
  async addSource(source: CaptureSource, geminiApiKey: string): Promise<void> {
    if (this.nodes.has(source.label)) {
      console.warn(`[spatial-director] Source ${source.label} already exists`);
      return;
    }

    const node = new VisionNode(source, { geminiApiKey });
    node.on('context', (ctx: CinematicContext) => {
      this.latestContexts.set(source.label, ctx);
    });

    this.nodes.set(source.label, node);

    if (this.running) {
      await node.start();
      console.log(`[spatial-director] ➕ Hot-added camera: ${source.label}`);
    }
  }

  removeSource(label: string): void {
    const node = this.nodes.get(label);
    if (node) {
      node.stop();
      this.nodes.delete(label);
      this.latestContexts.delete(label);
      console.log(`[spatial-director] ➖ Removed camera: ${label}`);
    }
  }

  get cameraCount(): number {
    return this.nodes.size;
  }
}
