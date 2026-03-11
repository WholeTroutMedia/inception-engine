/**
 * @inception/live-animate — WebGL Shader Overlay (Option C)
 *
 * MediaPipe SelfieSegmentation cuts the subject from the background.
 * A WebGL fragment shader is applied to the foreground (you).
 * The background is replaced with a live particle system driven by
 * velocity data from PlayerTracker.
 *
 * Shaders available: neon | glitch | sketch | heat | void
 * All GPU — zero API calls, zero latency.
 */

import type { TrackedEntity } from '../tracker/player-tracker.js';

// ─── Shader source ────────────────────────────────────────────────────────────

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;
  }
`;

const SHADERS: Record<string, string> = {
  neon: `
    precision mediump float;
    uniform sampler2D u_video;
    uniform sampler2D u_mask;
    uniform float u_time;
    varying vec2 v_texCoord;
    void main() {
      vec4 frame = texture2D(u_video, v_texCoord);
      float mask = texture2D(u_mask, v_texCoord).r;
      // Edge detection via luminance neighbors
      float step = 0.003;
      float c = dot(frame.rgb, vec3(0.299, 0.587, 0.114));
      float l = dot(texture2D(u_video, v_texCoord - vec2(step,0.0)).rgb, vec3(0.299,0.587,0.114));
      float r = dot(texture2D(u_video, v_texCoord + vec2(step,0.0)).rgb, vec3(0.299,0.587,0.114));
      float u = dot(texture2D(u_video, v_texCoord - vec2(0.0,step)).rgb, vec3(0.299,0.587,0.114));
      float d = dot(texture2D(u_video, v_texCoord + vec2(0.0,step)).rgb, vec3(0.299,0.587,0.114));
      float edge = abs(c-l)+abs(c-r)+abs(c-u)+abs(c-d);
      vec3 neonColor = vec3(0.0, edge*8.0+0.2, edge*6.0+0.1) + frame.rgb * 0.3;
      float pulse = 0.85 + sin(u_time * 3.0) * 0.15;
      vec3 result = mix(vec3(0.02, 0.02, 0.08), neonColor * pulse, mask);
      gl_FragColor = vec4(result, 1.0);
    }
  `,
  glitch: `
    precision mediump float;
    uniform sampler2D u_video;
    uniform sampler2D u_mask;
    uniform float u_time;
    varying vec2 v_texCoord;
    float rand(float n){ return fract(sin(n)*43758.5453123); }
    void main() {
      float mask = texture2D(u_mask, v_texCoord).r;
      float glitchStrength = 0.008;
      float bands = step(0.97, rand(floor(v_texCoord.y * 80.0) + floor(u_time * 8.0)));
      vec2 shift = vec2(glitchStrength * rand(u_time) * bands, 0.0);
      vec4 r = texture2D(u_video, v_texCoord + shift * 1.5);
      vec4 g = texture2D(u_video, v_texCoord);
      vec4 b = texture2D(u_video, v_texCoord - shift * 1.5);
      vec3 glitched = vec3(r.r, g.g, b.b);
      // Scanlines
      float scan = 0.85 + 0.15 * sin(v_texCoord.y * 800.0 + u_time * 60.0);
      vec3 result = mix(vec3(0.0), glitched * scan, mask);
      gl_FragColor = vec4(result, 1.0);
    }
  `,
  sketch: `
    precision mediump float;
    uniform sampler2D u_video;
    uniform sampler2D u_mask;
    uniform float u_time;
    varying vec2 v_texCoord;
    void main() {
      float mask = texture2D(u_mask, v_texCoord).r;
      float step = 0.002;
      // Sobel X
      float sx = -1.0*dot(texture2D(u_video,v_texCoord+vec2(-step,-step)).rgb,vec3(0.3,0.59,0.11))
                 -2.0*dot(texture2D(u_video,v_texCoord+vec2(-step,0.0)).rgb,vec3(0.3,0.59,0.11))
                 -1.0*dot(texture2D(u_video,v_texCoord+vec2(-step,step)).rgb,vec3(0.3,0.59,0.11))
                 +1.0*dot(texture2D(u_video,v_texCoord+vec2(step,-step)).rgb,vec3(0.3,0.59,0.11))
                 +2.0*dot(texture2D(u_video,v_texCoord+vec2(step,0.0)).rgb,vec3(0.3,0.59,0.11))
                 +1.0*dot(texture2D(u_video,v_texCoord+vec2(step,step)).rgb,vec3(0.3,0.59,0.11));
      float edge = clamp(abs(sx) * 4.0, 0.0, 1.0);
      vec3 sketched = vec3(1.0 - edge) * 0.95;
      vec3 result = mix(vec3(0.95, 0.95, 0.88), sketched, mask);
      gl_FragColor = vec4(result, 1.0);
    }
  `,
  heat: `
    precision mediump float;
    uniform sampler2D u_video;
    uniform sampler2D u_mask;
    uniform float u_time;
    varying vec2 v_texCoord;
    vec3 heatmap(float t) {
      return mix(mix(vec3(0.0,0.0,0.5),vec3(0.0,1.0,0.0),clamp(t*2.0,0.0,1.0)),
                 mix(vec3(0.0,1.0,0.0),vec3(1.0,0.0,0.0),clamp(t*2.0-1.0,0.0,1.0)),
                 step(0.5, t));
    }
    void main() {
      float mask = texture2D(u_mask, v_texCoord).r;
      float lum = dot(texture2D(u_video, v_texCoord).rgb, vec3(0.299, 0.587, 0.114));
      vec3 heat = heatmap(lum);
      float wave = sin(v_texCoord.y * 40.0 - u_time * 4.0) * 0.03 * mask;
      vec3 result = mix(vec3(0.0), heat, mask + wave);
      gl_FragColor = vec4(result, 1.0);
    }
  `,
  void_: `
    precision mediump float;
    uniform sampler2D u_video;
    uniform sampler2D u_mask;
    uniform float u_time;
    varying vec2 v_texCoord;
    void main() {
      float mask = texture2D(u_mask, v_texCoord).r;
      vec4 frame = texture2D(u_video, v_texCoord);
      float lum = dot(frame.rgb, vec3(0.299, 0.587, 0.114));
      float inv = 1.0 - lum;
      // Vignette
      vec2 uv = v_texCoord * 2.0 - 1.0;
      float vignette = 1.0 - dot(uv, uv) * 0.5;
      vec3 ghosted = vec3(inv) * vignette;
      vec3 result = mix(vec3(0.0), ghosted, mask);
      gl_FragColor = vec4(result, 1.0);
    }
  `,
};

export type ShaderStyle = 'neon' | 'glitch' | 'sketch' | 'heat' | 'void';

// ─── Particle system (background, driven by pose velocity) ───────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  hue: number;
}

// ─── ShaderOverlay ────────────────────────────────────────────────────────────

export class ShaderOverlay {
  private readonly gl: WebGLRenderingContext;
  private readonly bgCtx: CanvasRenderingContext2D;  // 2D canvas for particles
  private program: WebGLProgram | null = null;
  private videoTexture: WebGLTexture | null = null;
  private maskTexture: WebGLTexture | null = null;
  private maskCanvas: HTMLCanvasElement;
  private maskCtx: CanvasRenderingContext2D;
  private currentStyle: ShaderStyle = 'neon';
  private running = false;
  private rafHandle: number | null = null;
  private startTime = Date.now();
  private entitySnapshot: TrackedEntity[] = [];
  private particles: Particle[] = [];

  constructor(
    private readonly glCanvas: HTMLCanvasElement,
    private readonly bgCanvas: HTMLCanvasElement,
    private readonly video: HTMLVideoElement,
  ) {
    const gl = glCanvas.getContext('webgl');
    if (!gl) throw new Error('[shader-overlay] WebGL not supported');
    this.gl = gl;

    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) throw new Error('[shader-overlay] Cannot get 2D context for particles');
    this.bgCtx = bgCtx;

    // Mask canvas (receives MediaPipe segmentation mask)
    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = glCanvas.width;
    this.maskCanvas.height = glCanvas.height;
    this.maskCtx = this.maskCanvas.getContext('2d')!;

    this.compileShader(this.currentStyle);
    this.setupGeometry();
    this.createTextures();
  }

  // ─── Shader Compilation ─────────────────────────────────────────────────

  setStyle(style: ShaderStyle): void {
    this.currentStyle = style;
    this.compileShader(style);
  }

  private compileShader(style: ShaderStyle): void {
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);

    const fragSrc = SHADERS[style === 'void' ? 'void_' : style];
    const vert = this.compileStage(gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = this.compileStage(gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    this.program = prog;
  }

  private compileStage(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`[shader-overlay] Shader compile error: ${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  private setupGeometry(): void {
    const gl = this.gl;
    const positions = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    const texCoords = new Float32Array([0,1, 1,1, 0,0, 1,0]);
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const texBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  }

  private createTextures(): void {
    const gl = this.gl;
    this.videoTexture = gl.createTexture();
    this.maskTexture = gl.createTexture();
    for (const tex of [this.videoTexture, this.maskTexture]) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
  }

  /** Called by MediaPipe SelfieSegmentation onResults */
  updateMask(segmentationMask: HTMLCanvasElement | ImageData): void {
    this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    if (segmentationMask instanceof HTMLCanvasElement) {
      this.maskCtx.drawImage(segmentationMask, 0, 0, this.maskCanvas.width, this.maskCanvas.height);
    } else {
      this.maskCtx.putImageData(segmentationMask, 0, 0);
    }
  }

  updateEntities(entities: TrackedEntity[]): void {
    this.entitySnapshot = entities;
  }

  // ─── Render Loop ─────────────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle);
  }

  private loop(): void {
    if (!this.running) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.renderParticles();
      this.renderShader();
      this.loop();
    });
  }

  private renderShader(): void {
    const gl = this.gl;
    const prog = this.program;
    if (!prog || this.video.readyState < 2) return;

    gl.useProgram(prog);
    gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);

    // Upload video frame → texture 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_video'), 0);

    // Upload segmentation mask → texture 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.maskCanvas);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_mask'), 1);

    // Time uniform
    gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), (Date.now() - this.startTime) / 1000);

    // Geometry (full screen quad)
    const positions = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texPositions = new Float32Array([0,1, 1,1, 0,0, 1,0]);
    const texBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
    gl.bufferData(gl.ARRAY_BUFFER, texPositions, gl.STATIC_DRAW);
    const texLoc = gl.getAttribLocation(prog, 'a_texCoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private renderParticles(): void {
    const ctx = this.bgCtx;
    const w = this.bgCanvas.width;
    const h = this.bgCanvas.height;

    // Fade background
    ctx.fillStyle = 'rgba(4, 4, 12, 0.18)';
    ctx.fillRect(0, 0, w, h);

    // Spawn new particles from fast-moving entities
    for (const entity of this.entitySnapshot) {
      if (entity.stale) continue;
      const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
      if (speed > 0.01 && Math.random() < speed * 8) {
        const hue = entity.groupId === 'face' ? 180
                  : entity.groupId === 'arms' ? 30
                  : entity.groupId === 'legs' ? 280
                  : 200;
        this.particles.push({
          x: entity.position.x * w,
          y: entity.position.y * h,
          vx: (Math.random() - 0.5) * 2 + entity.velocity.x * w * 0.5,
          vy: (Math.random() - 0.5) * 2 + entity.velocity.y * h * 0.5,
          life: 1.0,
          maxLife: 0.6 + Math.random() * 0.8,
          hue,
        });
      }
    }

    // Keep particle count bounded
    if (this.particles.length > 400) this.particles.splice(0, 100);

    // Update + draw particles
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.vy += 0.08; // gravity
      p.life -= 0.016 / p.maxLife;
      const alpha = Math.max(0, p.life);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${alpha * 0.8})`;
      ctx.shadowColor = `hsl(${p.hue}, 100%, 70%)`;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}
