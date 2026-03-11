/**
 * @inception/sensor-mesh — InstrumentRouter
 *
 * Tier 4 — THE INSTRUMENT
 *
 * Configurable sensor → effect routing table.
 * Every incoming OSC channel from every source can be mapped,
 * normalized, transformed, and re-routed to any OSC target —
 * TouchDesigner, DAW, Resolume, anything that speaks OSC.
 *
 * Your body becomes an instrument.
 * Every gesture is a note. Every breath is a parameter.
 * The performance is recorded and can be replayed.
 */

import { EventEmitter } from 'events';
import dgram from 'dgram';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { InstrumentMapping, InstrumentMappingSchema, SensorFrame } from './types.js';
import { z } from 'zod';

// ─── Default Mappings ─────────────────────────────────────────────────────────

/**
 * Starter mapping set — connects body sensors to creative effects.
 * Load from JSON config to override: `InstrumentRouter.fromConfig('mappings.json')`
 */
export const DEFAULT_MAPPINGS: InstrumentMapping[] = [
  {
    name: 'jaw-open → filter-cutoff',
    sourceAddress: '/zigsim/arface/jawOpen',
    targetAddress: '/td/filter_cutoff',
    targetHost: '127.0.0.1',
    targetPort: 9000,
    inputMin: 0, inputMax: 1,
    outputMin: 200, outputMax: 8000, // Hz
    clamp: true,
  },
  {
    name: 'brow-up → reverb-wet',
    sourceAddress: '/zigsim/arface/browInnerUp',
    targetAddress: '/td/reverb_wet',
    targetHost: '127.0.0.1',
    targetPort: 9000,
    inputMin: 0, inputMax: 1,
    outputMin: 0, outputMax: 1,
    clamp: true,
  },
  {
    name: 'gyro-x → camera-pan',
    sourceAddress: '/zigsim/gyro/x',
    targetAddress: '/td/camera_pan',
    targetHost: '127.0.0.1',
    targetPort: 9000,
    inputMin: -3.14, inputMax: 3.14,
    outputMin: -180, outputMax: 180,
    clamp: true,
  },
  {
    name: 'eye-blink → strobe',
    sourceAddress: '/zigsim/arface/eyeBlinkLeft',
    targetAddress: '/td/strobe_intensity',
    targetHost: '127.0.0.1',
    targetPort: 9000,
    inputMin: 0, inputMax: 1,
    outputMin: 0, outputMax: 1,
    clamp: true,
  },
  {
    name: 'bpm → particle-density',
    sourceAddress: '/biometric/bpm',
    targetAddress: '/td/particle_density',
    targetHost: '127.0.0.1',
    targetPort: 9000,
    inputMin: 60, inputMax: 150,
    outputMin: 0.1, outputMax: 1.0,
    clamp: true,
  },
  {
    name: 'motion-intensity → distortion',
    sourceAddress: '/biometric/motion_intensity',
    targetAddress: '/td/distortion_wet',
    targetHost: '127.0.0.1',
    targetPort: 9000,
    inputMin: 0, inputMax: 1,
    outputMin: 0, outputMax: 0.8,
    clamp: true,
  },
  {
    name: 'room-energy → global-scale',
    sourceAddress: '/spatial/room_energy',
    targetAddress: '/td/global_scale',
    targetHost: '127.0.0.1',
    targetPort: 9000,
    inputMin: 0, inputMax: 1,
    outputMin: 0.5, outputMax: 2.0,
    clamp: true,
  },
];

// ─── InstrumentRouter ─────────────────────────────────────────────────────────

/**
 * InstrumentRouter — the sovereign instrument board.
 *
 * Routes incoming sensor OSC events through configurable mappings
 * to any number of effect targets. Includes a built-in recorder.
 *
 * @example
 * const router = new InstrumentRouter(DEFAULT_MAPPINGS);
 * router.start();
 *
 * // Route a ZigSim face channel
 * router.route('/zigsim/arface/jawOpen', 0.87);
 *
 * // Route a biometric value
 * router.route('/biometric/bpm', 72);
 *
 * // Start recording a performance
 * router.startRecording();
 * // ... perform ...
 * router.stopRecording('my-session.osc-timeline.json');
 */
export class InstrumentRouter extends EventEmitter {
  private mappings: InstrumentMapping[];
  private sender: dgram.Socket;
  private recording = false;
  private timeline: SensorFrame[] = [];

  constructor(mappings: InstrumentMapping[] = DEFAULT_MAPPINGS) {
    super();
    this.mappings = mappings;
    this.sender = dgram.createSocket('udp4');
  }

  start(): void {
    console.log(
      `[instrument-router] 🎹 ANTITRUST Instrument Board online — ${this.mappings.length} mappings active`
    );
    for (const m of this.mappings) {
      console.log(`  ${m.name}: ${m.sourceAddress} → ${m.targetAddress}`);
    }
  }

  stop(): void {
    this.sender.close();
    console.log('[instrument-router] ⏹️  Instrument Board offline');
  }

  /**
   * Route an incoming sensor value through all matching mappings.
   * Call this whenever any sensor emits a value.
   *
   * @param address - The OSC address of the sensor channel
   * @param value - The raw sensor value
   */
  route(address: string, value: number): void {
    const matchingMappings = this.mappings.filter((m) =>
      this.addressMatches(address, m.sourceAddress)
    );

    for (const mapping of matchingMappings) {
      const mapped = this.transform(value, mapping);
      this.send(mapping.targetAddress, mapped, mapping.targetHost, mapping.targetPort);

      if (this.recording) {
        this.timeline.push({
          timestamp: Date.now(),
          source: 'instrument',
          address: mapping.targetAddress,
          args: [mapped],
        });
      }

      this.emit('routed', {
        from: address,
        to: mapping.targetAddress,
        rawValue: value,
        mappedValue: mapped,
        mappingName: mapping.name,
      });
    }
  }

  // ─── Recording ────────────────────────────────────────────────────────────

  startRecording(): void {
    this.timeline = [];
    this.recording = true;
    console.log('[instrument-router] ⏺️  Recording started');
  }

  stopRecording(outputPath?: string): SensorFrame[] {
    this.recording = false;
    const timeline = [...this.timeline];
    console.log(`[instrument-router] ⏹️  Recording stopped — ${timeline.length} frames`);

    if (outputPath) {
      writeFileSync(outputPath, JSON.stringify(timeline, null, 2));
      console.log(`[instrument-router] 💾 Timeline saved to ${outputPath}`);
    }

    return timeline;
  }

  // ─── Playback ─────────────────────────────────────────────────────────────

  /**
   * Replay a recorded OSC timeline.
   * Each frame fires at its original relative timestamp.
   */
  async playback(timeline: SensorFrame[]): Promise<void> {
    if (timeline.length === 0) return;

    const startTime = timeline[0].timestamp;
    const playbackStart = Date.now();

    console.log(`[instrument-router] ▶️  Playing back ${timeline.length} frames`);

    for (const frame of timeline) {
      const delay = (frame.timestamp - startTime) - (Date.now() - playbackStart);
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));

      const value = typeof frame.args[0] === 'number' ? frame.args[0] : 0;
      // Find the target host/port from mappings (fallback to localhost:9000)
      const mapping = this.mappings.find((m) => m.targetAddress === frame.address);
      this.send(frame.address, value, mapping?.targetHost ?? '127.0.0.1', mapping?.targetPort ?? 9000);
    }

    console.log('[instrument-router] ✅ Playback complete');
  }

  /** Load timeline from a saved JSON file */
  loadTimeline(path: string): SensorFrame[] {
    if (!existsSync(path)) throw new Error(`Timeline file not found: ${path}`);
    return JSON.parse(readFileSync(path, 'utf-8')) as SensorFrame[];
  }

  // ─── Config Management ────────────────────────────────────────────────────

  static fromConfig(configPath: string): InstrumentRouter {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as unknown[];
    const mappings = z.array(InstrumentMappingSchema).parse(raw);
    return new InstrumentRouter(mappings);
  }

  saveConfig(outputPath: string): void {
    writeFileSync(outputPath, JSON.stringify(this.mappings, null, 2));
    console.log(`[instrument-router] 💾 Config saved to ${outputPath}`);
  }

  addMapping(mapping: InstrumentMapping): void {
    const parsed = InstrumentMappingSchema.parse(mapping);
    this.mappings.push(parsed);
    console.log(`[instrument-router] ➕ Added mapping: ${parsed.name}`);
  }

  removeMapping(name: string): void {
    const before = this.mappings.length;
    this.mappings = this.mappings.filter((m) => m.name !== name);
    if (this.mappings.length < before) {
      console.log(`[instrument-router] ➖ Removed mapping: ${name}`);
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /**
   * Normalize value from [inputMin, inputMax] to [outputMin, outputMax].
   */
  private transform(value: number, mapping: InstrumentMapping): number {
    const { inputMin, inputMax, outputMin, outputMax, clamp } = mapping;
    const normalized = (value - inputMin) / (inputMax - inputMin);
    const mapped = outputMin + normalized * (outputMax - outputMin);
    return clamp ? Math.min(outputMax, Math.max(outputMin, mapped)) : mapped;
  }

  /**
   * Send a single float32 OSC message over UDP.
   */
  private send(address: string, value: number, host: string, port: number): void {
    const addrBuf = Buffer.alloc(Math.ceil((address.length + 1) / 4) * 4, 0);
    addrBuf.write(address);

    const tagBuf = Buffer.alloc(4, 0);
    tagBuf.write(',f\0\0');

    const valBuf = Buffer.alloc(4);
    valBuf.writeFloatBE(value, 0);

    const msg = Buffer.concat([addrBuf, tagBuf, valBuf]);
    this.sender.send(msg, port, host);
  }

  /**
   * Simple OSC address matcher.
   * Supports exact match and wildcard (*) segments.
   */
  private addressMatches(incoming: string, pattern: string): boolean {
    if (incoming === pattern) return true;
    const parts = incoming.split('/');
    const patParts = pattern.split('/');
    if (parts.length !== patParts.length) return false;
    return patParts.every((p, i) => p === '*' || p === parts[i]);
  }
}
