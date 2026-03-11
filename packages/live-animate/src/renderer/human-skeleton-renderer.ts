/**
 * @inception/live-animate — HumanSkeletonRenderer
 *
 * Extends AnimationRenderer with a 'skeleton' style purpose-built for
 * WebcamPoseAdapter output. Renders the MediaPipe 33-point skeleton with:
 *   - Group-colored joints (face=cyan, torso=white, arms=orange, legs=purple)
 *   - Connection lines between landmark pairs (POSE_CONNECTIONS)
 *   - Confidence-weighted alpha per joint
 *   - Velocity motion trails from PlayerTracker
 *   - Optional webcam compositing (draw video feed behind skeleton)
 *
 * Designed to run as the primary canvas in Option D of the studio.
 */

import type { TrackedEntity } from '../tracker/player-tracker.js';
import { POSE_CONNECTIONS } from '../feeds/webcam-pose.js';

// ─── Group color palette ──────────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  face:  '#00f5ff',   // electric cyan
  torso: '#ffffff',   // white
  arms:  '#ff6b00',   // orange
  legs:  '#bf00ff',   // purple
  body:  '#00d4ff',   // fallback blue
};

// ─── HumanSkeletonRenderer ────────────────────────────────────────────────────

export interface SkeletonRenderConfig {
  canvas: HTMLCanvasElement;
  /** Overlay webcam video behind the skeleton */
  videoElement?: HTMLVideoElement | null;
  /** Joint dot radius in pixels */
  jointRadius?: number;
  /** Trail length (frames) */
  trailLength?: number;
  /** Show velocity vectors */
  showVectors?: boolean;
  /** Dark background blur over video */
  videoAlpha?: number;
}

export class HumanSkeletonRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly config: Required<SkeletonRenderConfig>;
  private entitySnapshot: TrackedEntity[] = [];
  private running = false;
  private rafHandle: number | null = null;
  private frameCount = 0;
  private readonly width: number;
  private readonly height: number;

  constructor(config: SkeletonRenderConfig) {
    const ctx = config.canvas.getContext('2d');
    if (!ctx) throw new Error('[skeleton-renderer] Cannot get 2D canvas context');
    this.ctx = ctx;
    this.width = config.canvas.width;
    this.height = config.canvas.height;
    this.config = {
      canvas: config.canvas,
      videoElement: config.videoElement ?? null,
      jointRadius: config.jointRadius ?? 6,
      trailLength: config.trailLength ?? 20,
      showVectors: config.showVectors ?? true,
      videoAlpha: config.videoAlpha ?? 0.25,
    };
  }

  public updateEntities(entities: TrackedEntity[]): void {
    this.entitySnapshot = entities;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  public stop(): void {
    this.running = false;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  // ─── Render Loop ────────────────────────────────────────────────────────────

  private loop(): void {
    if (!this.running) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.render();
      this.frameCount++;
      this.loop();
    });
  }

  private render(): void {
    const { ctx, width: w, height: h } = this;
    const entities = this.entitySnapshot;

    // 1. Background — dark with optional video composite
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, w, h);

    if (this.config.videoElement && this.config.videoElement.readyState >= 2) {
      ctx.globalAlpha = this.config.videoAlpha;
      ctx.drawImage(this.config.videoElement, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // 2. Scanline texture
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 3. Build lookup: entityId suffix → entity (e.g. "nose" → entity)
    const byName = new Map<string, TrackedEntity>();
    for (const e of entities) {
      if (e.stale) continue;
      const suffix = e.id.split(':').pop() ?? e.id;
      byName.set(suffix, e);
    }

    // 4. Draw skeleton connection lines
    for (const [idxA, idxB] of POSE_CONNECTIONS) {
      const nameA = this.landmarkName(idxA);
      const nameB = this.landmarkName(idxB);
      const a = byName.get(nameA);
      const b = byName.get(nameB);
      if (!a || !b) continue;

      const ax = a.position.x * w;
      const ay = a.position.y * h;
      const bx = b.position.x * w;
      const by = b.position.y * h;

      const groupColor = GROUP_COLORS[a.groupId] ?? GROUP_COLORS.body;
      const conf = (a.meta['rawLandmark'] as { visibility?: number })?.visibility ?? 1;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = groupColor + Math.floor(conf * 160).toString(16).padStart(2, '0');
      ctx.lineWidth = 2;
      ctx.shadowColor = groupColor;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 5. Draw motion trails
    for (const entity of entities) {
      if (entity.stale || entity.trail.length < 2) continue;
      const color = GROUP_COLORS[entity.groupId] ?? GROUP_COLORS.body;
      ctx.beginPath();
      ctx.moveTo(entity.trail[0].x * w, entity.trail[0].y * h);
      for (let i = 1; i < entity.trail.length; i++) {
        const alpha = (i / entity.trail.length) * 0.4;
        ctx.strokeStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 1;
        ctx.lineTo(entity.trail[i].x * w, entity.trail[i].y * h);
      }
      ctx.stroke();
    }

    // 6. Draw joints
    for (const entity of entities) {
      if (entity.stale) continue;
      const sx = entity.position.x * w;
      const sy = entity.position.y * h;
      const color = GROUP_COLORS[entity.groupId] ?? GROUP_COLORS.body;
      const conf = (entity.meta['rawLandmark'] as { visibility?: number })?.visibility ?? 1;
      const r = this.config.jointRadius * (0.5 + conf * 0.5);

      // Outer glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color + Math.floor(conf * 200).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();

      // White core
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,255,255,${conf * 0.9})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Velocity vector
      if (this.config.showVectors) {
        const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
        if (speed > 0.005) {
          const vx = sx + entity.velocity.x * 40;
          const vy = sy + entity.velocity.y * 40;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(vx, vy);
          ctx.strokeStyle = color + '55';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // 7. HUD overlay
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 245, 255, 0.5)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`OMNIBUS ● HUMAN ● ${entities.filter(e => !e.stale).length} landmarks ● f${this.frameCount}`, 10, h - 10);
  }

  private landmarkName(idx: number): string {
    const names: Record<number, string> = {
      0:'nose',1:'left_eye_inner',2:'left_eye',3:'left_eye_outer',4:'right_eye_inner',
      5:'right_eye',6:'right_eye_outer',7:'left_ear',8:'right_ear',9:'mouth_left',
      10:'mouth_right',11:'left_shoulder',12:'right_shoulder',13:'left_elbow',
      14:'right_elbow',15:'left_wrist',16:'right_wrist',17:'left_pinky',18:'right_pinky',
      19:'left_index',20:'right_index',21:'left_thumb',22:'right_thumb',
      23:'left_hip',24:'right_hip',25:'left_knee',26:'right_knee',
      27:'left_ankle',28:'right_ankle',29:'left_heel',30:'right_heel',
      31:'left_foot_index',32:'right_foot_index',
    };
    return names[idx] ?? `landmark_${idx}`;
  }

  public getFrameCount(): number { return this.frameCount; }
}
