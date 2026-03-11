/**
 * @inception/live-animate — AnimationRenderer
 *
 * Canvas-based renderer that reads TrackedEntity[] snapshots
 * and draws them as animated entities on a 2D canvas.
 *
 * Designed for both browser (Canvas2D) and server-side (node-canvas).
 * Style engine: tactical | cartoon | heat | wireframe
 *
 * The renderer runs its own rAF loop in the browser,
 * or a setInterval loop in Node (for video output / demo CLI).
 */

import type { TrackedEntity } from '../tracker/player-tracker.js';

// ─── Visual Styles ────────────────────────────────────────────────────────────

export type RenderStyle = 'tactical' | 'cartoon' | 'heat' | 'wireframe' | 'neon';

export interface RenderConfig {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  style?: RenderStyle;
  /** Background color */
  bgColor?: string;
  /** Entity dot radius (px) */
  entityRadius?: number;
  /** Show velocity vectors */
  showVectors?: boolean;
  /** Show trail */
  showTrail?: boolean;
  /** Show entity labels */
  showLabels?: boolean;
  /** FPS target */
  fps?: number;
  /** Color palette by groupId (team colors, etc.) */
  groupColors?: Record<string, string>;
}

// ─── Style Presets ────────────────────────────────────────────────────────────

const STYLE_PRESETS: Record<RenderStyle, Partial<RenderConfig>> = {
  tactical: {
    bgColor: '#0a1628',
    entityRadius: 8,
    showVectors: true,
    showTrail: true,
    showLabels: true,
  },
  cartoon: {
    bgColor: '#1a472a',
    entityRadius: 12,
    showVectors: false,
    showTrail: true,
    showLabels: true,
  },
  heat: {
    bgColor: '#0a0a0a',
    entityRadius: 20,
    showVectors: false,
    showTrail: true,
    showLabels: false,
  },
  wireframe: {
    bgColor: '#000000',
    entityRadius: 6,
    showVectors: true,
    showTrail: false,
    showLabels: false,
  },
  neon: {
    bgColor: '#0d0d1a',
    entityRadius: 10,
    showVectors: true,
    showTrail: true,
    showLabels: true,
  },
};

// Default team/group colors
const DEFAULT_COLORS = [
  '#00d4ff', '#ff4d6d', '#06d6a0', '#ffd60a',
  '#f77f00', '#9b5de5', '#00b4d8', '#ef233c',
];

// ─── AnimationRenderer ────────────────────────────────────────────────────────

export class AnimationRenderer {
  private readonly ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private readonly config: Required<RenderConfig>;
  private readonly groupColorCache = new Map<string, string>();
  private colorIndex = 0;
  private running = false;
  private rafHandle: number | null = null;
  private frameCount = 0;
  private lastFrameTime = 0;
  private entitySnapshot: TrackedEntity[] = [];
  private readonly width: number;
  private readonly height: number;

  constructor(config: RenderConfig) {
    const preset = STYLE_PRESETS[config.style ?? 'tactical'];
    this.config = {
      style: 'tactical',
      bgColor: '#0a1628',
      entityRadius: 8,
      showVectors: true,
      showTrail: true,
      showLabels: true,
      fps: 60,
      groupColors: {},
      ...preset,
      ...config,
    };

    const ctx = (config.canvas as HTMLCanvasElement).getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context from canvas');
    this.ctx = ctx;
    this.width = config.canvas.width;
    this.height = config.canvas.height;
  }

  /** Update the entity snapshot — call this from tracker 'update' events */
  public updateEntities(entities: TrackedEntity[]): void {
    this.entitySnapshot = entities;
  }

  /** Start the render loop */
  public start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleFrame();
  }

  /** Stop the render loop */
  public stop(): void {
    this.running = false;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  // ─── Render Loop ───────────────────────────────────────────────────────────

  private scheduleFrame(): void {
    if (!this.running) return;
    this.rafHandle = requestAnimationFrame((ts) => {
      const targetInterval = 1000 / this.config.fps;
      if (!this.lastFrameTime || ts - this.lastFrameTime >= targetInterval) {
        this.render();
        this.lastFrameTime = ts;
        this.frameCount++;
      }
      this.scheduleFrame();
    });
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const entities = this.entitySnapshot;

    // Background
    ctx.fillStyle = this.config.bgColor;
    ctx.fillRect(0, 0, w, h);

    // Apply style-specific background treatment
    this.renderBackground(ctx, w, h);

    // Render each entity
    for (const entity of entities) {
      if (entity.stale) continue;
      const screenX = entity.position.x * w;
      const screenY = entity.position.y * h;
      const color = this.getEntityColor(entity);

      if (this.config.showTrail && entity.trail.length > 1) {
        this.renderTrail(ctx, entity, color, w, h);
      }
      if (this.config.showVectors) {
        this.renderVelocityVector(ctx, entity, screenX, screenY, color);
      }
      this.renderEntity(ctx, entity, screenX, screenY, color);
      if (this.config.showLabels) {
        this.renderLabel(ctx, entity, screenX, screenY, color);
      }
    }

    // Frame counter overlay
    if (this.config.style === 'tactical') {
      ctx.fillStyle = 'rgba(0, 212, 255, 0.4)';
      ctx.font = '10px monospace';
      ctx.fillText(`LIVE ● ${entities.length} entities`, 8, h - 8);
    }
  }

  private renderBackground(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    w: number,
    h: number
  ): void {
    if (this.config.style === 'tactical') {
      // Grid overlay
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.06)';
      ctx.lineWidth = 0.5;
      const gridSize = 50;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else if (this.config.style === 'neon') {
      // Subtle vignette
      const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private renderTrail(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    entity: TrackedEntity,
    color: string,
    w: number,
    h: number
  ): void {
    ctx.beginPath();
    const trail = entity.trail;
    ctx.moveTo(trail[0].x * w, trail[0].y * h);
    for (let i = 1; i < trail.length; i++) {
      const alpha = i / trail.length;
      ctx.strokeStyle = color + Math.floor(alpha * 128).toString(16).padStart(2, '0');
      ctx.lineWidth = alpha * 2;
      ctx.lineTo(trail[i].x * w, trail[i].y * h);
    }
    ctx.stroke();
  }

  private renderVelocityVector(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    entity: TrackedEntity,
    screenX: number,
    screenY: number,
    color: string
  ): void {
    const scale = 60; // pixels per velocity unit
    const endX = screenX + entity.velocity.x * scale;
    const endY = screenY + entity.velocity.y * scale;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = color + '66';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private renderEntity(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    entity: TrackedEntity,
    screenX: number,
    screenY: number,
    color: string
  ): void {
    const r = this.config.entityRadius;

    if (this.config.style === 'heat') {
      // Radial glow
      const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, r * 2);
      gradient.addColorStop(0, color + 'cc');
      gradient.addColorStop(1, color + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, r * 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.config.style === 'neon') {
      // Glowing dot
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Default dot with white core
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(screenX, screenY, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderLabel(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    entity: TrackedEntity,
    screenX: number,
    screenY: number,
    color: string
  ): void {
    const r = this.config.entityRadius;
    const label = entity.name.split(' ').pop() ?? entity.name; // Last name only
    ctx.fillStyle = color;
    ctx.font = `bold ${r}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, screenX, screenY - r - 3);
  }

  private getEntityColor(entity: TrackedEntity): string {
    // Check user-provided group colors
    if (this.config.groupColors[entity.groupId]) {
      return this.config.groupColors[entity.groupId];
    }
    // Auto-assign from palette
    if (!this.groupColorCache.has(entity.groupId)) {
      const color = DEFAULT_COLORS[this.colorIndex % DEFAULT_COLORS.length];
      this.groupColorCache.set(entity.groupId, color);
      this.colorIndex++;
    }
    return this.groupColorCache.get(entity.groupId)!;
  }

  public getFrameCount(): number { return this.frameCount; }
}
