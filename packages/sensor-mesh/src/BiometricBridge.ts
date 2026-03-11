/**
 * @inception/sensor-mesh — BiometricBridge
 *
 * Tier 1 — THE ORACLE
 *
 * Fuses data from Apple Watch, AirPods, and ZigSim motion channels
 * into a single BiometricBrief that can replace a PerformanceBrief.
 *
 * YOu speak to the engine through your body.
 * Your HRV sets the tone. Your BPM sets the tempo. Your head sets the gaze.
 *
 * Sources:
 *   - Apple Watch → "Health Auto Export" app REST bridge (localhost:8765)
 *   - AirPods     → ZigSim device attitude (`/zigsim/<device>/atti`)
 *   - ZigSim      → Accelerometer for motion intensity (`/zigsim/<device>/accel`)
 */

import { EventEmitter } from 'events';
import { z } from 'zod';
import { BiometricBrief, BiometricBriefSchema } from './types.js';

// ─── Source Interfaces ───────────────────────────────────────────────────────

export interface BiometricSource {
  readonly name: string;
  start(): Promise<void>;
  stop(): void;
  getLatest(): Partial<BiometricBrief>;
}

// ─── Watch Source (Health Auto Export) ──────────────────────────────────────

/**
 * Reads Apple Watch biometrics via REST from the "Health Auto Export" iOS app.
 *
 * Setup:
 * 1. Install "Health Auto Export" on iPhone
 * 2. Enable "REST API" mode → set URL to http://{NAS-IP}:8765
 *    (or run a local receiver — see WatchDataReceiver below)
 * 3. Configure export: Heart Rate, HRV (SDNN)
 * 4. The watch sends data every ~5 minutes OR on demand via automation
 *
 * For real-time (<1s) data: pair with a Watch app using WatchConnectivity framework.
 * This source is optimized for ambient/generative use cases (not <100ms reactive).
 */
export class WatchSource implements BiometricSource {
  readonly name = 'apple-watch';
  private readonly pollingIntervalMs: number;
  private readonly receiverUrl: string;
  private intervalRef: ReturnType<typeof setInterval> | null = null;
  private latest: Partial<BiometricBrief> = {};

  constructor(
    options: {
      receiverUrl?: string;
      pollingIntervalMs?: number;
    } = {}
  ) {
    this.receiverUrl = options.receiverUrl ?? 'http://localhost:8765/latest';
    this.pollingIntervalMs = options.pollingIntervalMs ?? 5000;
  }

  async start(): Promise<void> {
    await this.poll(); // Immediate fetch
    this.intervalRef = setInterval(() => this.poll(), this.pollingIntervalMs);
    console.log(`[biometric] ⌚ Watch source active — polling ${this.receiverUrl}`);
  }

  stop(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  getLatest(): Partial<BiometricBrief> {
    return this.latest;
  }

  private async poll(): Promise<void> {
    try {
      const res = await fetch(this.receiverUrl, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return;

      const raw = (await res.json()) as Record<string, unknown>;

      // Parse Health Auto Export payload format
      const bpm =
        typeof raw['heart_rate'] === 'number' ? raw['heart_rate'] : undefined;
      const hrv =
        typeof raw['heart_rate_variability_sdnn'] === 'number'
          ? raw['heart_rate_variability_sdnn']
          : undefined;

      this.latest = { bpm, hrv, sources: ['apple-watch'] };
    } catch {
      // Keep stale data — network hiccups are expected
    }
  }
}

// ─── AirPods Source (via ZigSim attitude) ────────────────────────────────────

/**
 * Extracts head orientation from ZigSim device attitude channel.
 * ZigSim on iPhone in pocket → gyro reflects body movement.
 * ZigSim on iPad stand → attitude is effectively head orientation proxy.
 *
 * For true AirPods CMHeadphoneMotionManager data:
 * Build a small iOS companion app that reads CMHeadphoneMotionManager
 * and sends pitch/yaw/roll over UDP → OSC to this bridge port.
 */
export class AirPodsSource implements BiometricSource {
  readonly name = 'airpods';
  private latest: Partial<BiometricBrief> = {};

  // Called externally by ZigSimBridge when it receives attitude data
  updateAttitude(pitch: number, yaw: number, roll: number): void {
    this.latest = {
      headOrientation: { pitch, yaw, roll },
      sources: ['airpods'],
    };
  }

  async start(): Promise<void> {
    console.log(`[biometric] 🎧 AirPods source active — waiting for attitude data via ZigSim`);
  }

  stop(): void {}

  getLatest(): Partial<BiometricBrief> {
    return this.latest;
  }
}

// ─── Motion Source (ZigSim accelerometer) ────────────────────────────────────

export class MotionSource implements BiometricSource {
  readonly name = 'motion';
  private motionBuf: number[] = [];
  private latest: Partial<BiometricBrief> = {};

  // Called by ZigSimBridge when it receives accelerometer data
  updateAccel(x: number, y: number, z: number): void {
    // Compute motion intensity = magnitude of acceleration vector
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    // Keep rolling buffer of last 30 samples (~0.5s at 60fps)
    this.motionBuf.push(magnitude);
    if (this.motionBuf.length > 30) this.motionBuf.shift();

    const avg = this.motionBuf.reduce((a, b) => a + b, 0) / this.motionBuf.length;
    // Normalize: gravity = 1.0, resting = ~1.0, active jumping = ~3.0
    const intensity = Math.min(1.0, Math.max(0.0, (avg - 0.9) / 2.0));

    this.latest = {
      motionIntensity: intensity,
      sources: ['motion'],
    };
  }

  async start(): Promise<void> {
    console.log(`[biometric] 🏃 Motion source active — waiting for ZigSim accelerometer`);
  }

  stop(): void {}

  getLatest(): Partial<BiometricBrief> {
    return this.latest;
  }
}

// ─── BiometricBridge ─────────────────────────────────────────────────────────

/**
 * Fuses all biometric sources into a single BiometricBrief.
 * Emits 'brief' events at configured interval.
 *
 * @example
 * const bridge = new BiometricBridge();
 * bridge.on('brief', (b: BiometricBrief) => {
 *   console.log('Mood:', b.mood, 'BPM:', b.bpm);
 *   director.perform(b); // OmnimediaDirector accepts BiometricBrief
 * });
 * await bridge.start();
 */
export class BiometricBridge extends EventEmitter {
  private readonly sources: BiometricSource[] = [];
  private readonly emitIntervalMs: number;
  private intervalRef: ReturnType<typeof setInterval> | null = null;

  // Built-in sources exposed for external update (from ZigSimBridge)
  public readonly airpods = new AirPodsSource();
  public readonly motion = new MotionSource();
  public readonly watch: WatchSource;

  constructor(
    options: {
      watchReceiverUrl?: string;
      emitIntervalMs?: number;
    } = {}
  ) {
    super();
    this.emitIntervalMs = options.emitIntervalMs ?? 1000;
    this.watch = new WatchSource({ receiverUrl: options.watchReceiverUrl });
    this.sources = [this.watch, this.airpods, this.motion];
  }

  async start(): Promise<void> {
    for (const source of this.sources) {
      await source.start();
    }
    this.intervalRef = setInterval(() => this.emit('brief', this.getLatestBrief()), this.emitIntervalMs);
    console.log(`[biometric] 🔬 BiometricBridge online — emitting at ${this.emitIntervalMs}ms interval`);
  }

  stop(): void {
    for (const source of this.sources) source.stop();
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  /**
   * Merge all source data into a single validated BiometricBrief.
   * Infers mood from bpm + hrv + motionIntensity.
   */
  public getLatestBrief(): BiometricBrief {
    const merged: Partial<BiometricBrief> = {};
    const allSources: string[] = [];

    for (const source of this.sources) {
      const latest = source.getLatest();
      Object.assign(merged, latest);
      if (latest.sources) allSources.push(...latest.sources);
    }

    merged.sources = [...new Set(allSources)];
    merged.timestamp = Date.now();
    merged.mood = this.inferMood(merged);

    return BiometricBriefSchema.parse(merged);
  }

  /**
   * Heuristic mood inference from biometric signals.
   * Used by OmnimediaDirector to generate appropriate content tone.
   */
  private inferMood(
    brief: Partial<BiometricBrief>
  ): BiometricBrief['mood'] {
    const { bpm, hrv, motionIntensity } = brief;

    if (motionIntensity !== undefined && motionIntensity > 0.6) return 'energized';
    if (bpm !== undefined && bpm > 100) return 'energized';
    if (hrv !== undefined && bpm !== undefined) {
      if (hrv > 50 && bpm < 70) return 'calm';
      if (hrv < 20 && bpm > 85) return 'stressed';
      if (hrv > 30 && bpm >= 70 && bpm <= 90) return 'focused';
    }
    if (bpm !== undefined && bpm < 65) return 'calm';
    return 'neutral';
  }
}

/**
 * Minimal receiver server for Health Auto Export webhook data.
 * Run this on the machine that BiometricBridge polls.
 *
 * Health Auto Export → REST API → POST to http://{thisIP}:8765
 */
export class WatchDataReceiver {
  private readonly port: number;
  private latestPayload: Record<string, unknown> = {};

  constructor(port = 8765) {
    this.port = port;
  }

  async start(): Promise<void> {
    const { createServer } = await import('http');
    const server = createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (c: Buffer) => (body += c.toString()));
        req.on('end', () => {
          try {
            this.latestPayload = JSON.parse(body) as Record<string, unknown>;
            console.log('[watch-receiver] 📲 Received Watch data:', Object.keys(this.latestPayload));
          } catch {
            // Ignore parse errors
          }
          res.writeHead(200);
          res.end('ok');
        });
      } else if (req.method === 'GET' && req.url === '/latest') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.latestPayload));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(this.port, () => {
      console.log(`[watch-receiver] ⌚ Listening for Health Auto Export on :${this.port}`);
    });
  }
}
