/**
 * @inception/sensor-mesh — ZigSimBridge
 *
 * Tier 0 — THE MIRROR
 *
 * Receives ZigSim Pro OSC data from iPhone/iPad and relays it to the
 * SomaticBridge in the correct ARKit blendshape format — at 60fps.
 *
 * This is the fastest path to a live MetaHuman mirror.
 * No Audio2Face required. Your face IS the brief.
 *
 * Pipeline:
 *   iPhone ZigSim Pro → UDP :5010 → ZigSimBridge → OSC :5005 → SomaticBridge → UE5
 *
 * Setup:
 *   1. Install ZigSim Pro on iPhone
 *   2. Set destination IP to this machine's LAN IP
 *   3. Set port to 5010
 *   4. Enable: Face Tracking, Gyroscope, Accelerometer, Device Attitude
 *   5. Run this bridge, open UE5 — your face mirrors the MetaHuman
 */

import { EventEmitter } from 'events';
import dgram from 'dgram';

// ─── ZigSim ARKit Channel Map ────────────────────────────────────────────────

/**
 * ZigSim Pro sends face tracking data on these OSC addresses.
 * Format: /zigsim/{deviceId}/arface/{blendshapeName}
 * We normalize the device ID to a wildcard match.
 */
export const ZIGSIM_TO_ARKIT: Record<string, string> = {
  // Eyes
  eyeBlinkLeft: 'EyeBlinkLeft',
  eyeBlinkRight: 'EyeBlinkRight',
  eyeSquintLeft: 'EyeSquintLeft',
  eyeSquintRight: 'EyeSquintRight',
  eyeWideLeft: 'EyeWideLeft',
  eyeWideRight: 'EyeWideRight',
  eyeLookDownLeft: 'EyeLookDownLeft',
  eyeLookDownRight: 'EyeLookDownRight',
  eyeLookInLeft: 'EyeLookInLeft',
  eyeLookInRight: 'EyeLookInRight',
  eyeLookOutLeft: 'EyeLookOutLeft',
  eyeLookOutRight: 'EyeLookOutRight',
  eyeLookUpLeft: 'EyeLookUpLeft',
  eyeLookUpRight: 'EyeLookUpRight',
  // Jaw
  jawForward: 'JawForward',
  jawLeft: 'JawLeft',
  jawRight: 'JawRight',
  jawOpen: 'JawOpen',
  // Mouth
  mouthClose: 'MouthClose',
  mouthFunnel: 'MouthFunnel',
  mouthPucker: 'MouthPucker',
  mouthLeft: 'MouthLeft',
  mouthRight: 'MouthRight',
  mouthSmileLeft: 'MouthSmileLeft',
  mouthSmileRight: 'MouthSmileRight',
  mouthFrownLeft: 'MouthFrownLeft',
  mouthFrownRight: 'MouthFrownRight',
  mouthDimpleLeft: 'MouthDimpleLeft',
  mouthDimpleRight: 'MouthDimpleRight',
  mouthStretchLeft: 'MouthStretchLeft',
  mouthStretchRight: 'MouthStretchRight',
  mouthRollLower: 'MouthRollLower',
  mouthRollUpper: 'MouthRollUpper',
  mouthShrugLower: 'MouthShrugLower',
  mouthShrugUpper: 'MouthShrugUpper',
  mouthPressLeft: 'MouthPressLeft',
  mouthPressRight: 'MouthPressRight',
  mouthLowerDownLeft: 'MouthLowerDownLeft',
  mouthLowerDownRight: 'MouthLowerDownRight',
  mouthUpperUpLeft: 'MouthUpperUpLeft',
  mouthUpperUpRight: 'MouthUpperUpRight',
  // Brows
  browDownLeft: 'BrowDownLeft',
  browDownRight: 'BrowDownRight',
  browInnerUp: 'BrowInnerUp',
  browOuterUpLeft: 'BrowOuterUpLeft',
  browOuterUpRight: 'BrowOuterUpRight',
  // Cheeks
  cheekPuff: 'CheekPuff',
  cheekSquintLeft: 'CheekSquintLeft',
  cheekSquintRight: 'CheekSquintRight',
  // Nose
  noseSneerLeft: 'NoseSneerLeft',
  noseSneerRight: 'NoseSneerRight',
  // Tongue
  tongueOut: 'TongueOut',
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ZigSimBridgeConfig {
  /** Port to receive ZigSim OSC data on (default: 5010) */
  listenPort?: number;
  /** SomaticBridge host (default: 127.0.0.1) */
  somaticHost?: string;
  /** SomaticBridge OSC UDP port (default: 5005) */
  somaticPort?: number;
  /** Target FPS for relay (default: 60) */
  targetFps?: number;
  /** Whether to log received channels (default: false) */
  verbose?: boolean;
}

export interface ZigSimFrame {
  deviceId: string;
  blendshapes: Record<string, number>;
  headRotation?: { pitch: number; yaw: number; roll: number };
  timestamp: number;
}

// ─── ZigSimBridge ────────────────────────────────────────────────────────────

/**
 * ZigSimBridge — the fastest path to a live MetaHuman mirror.
 *
 * Receives raw OSC from ZigSim Pro, normalizes to ARKit convention,
 * and relays to SomaticBridge. No Audio2Face. No cloud. Sub-16ms latency.
 *
 * @example
 * const bridge = new ZigSimBridge({ listenPort: 5010, somaticPort: 5005 });
 * bridge.on('frame', (f) => console.log('Face frame:', f.blendshapes.JawOpen));
 * bridge.start();
 */
export class ZigSimBridge extends EventEmitter {
  private readonly config: Required<ZigSimBridgeConfig>;
  private receiver: dgram.Socket | null = null;
  private sender: dgram.Socket | null = null;
  private running = false;
  private frameCount = 0;
  private lastFrameTime = 0;

  // Rolling accumulator: most recent value per blendshape channel
  private currentFrame: Record<string, number> = {};
  private currentHeadRotation: { pitch: number; yaw: number; roll: number } = {
    pitch: 0,
    yaw: 0,
    roll: 0,
  };
  private currentDeviceId = 'unknown';

  // Rate limiter: only emit at targetFps
  private relayInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: ZigSimBridgeConfig = {}) {
    super();
    this.config = {
      listenPort: config.listenPort ?? 5010,
      somaticHost: config.somaticHost ?? '127.0.0.1',
      somaticPort: config.somaticPort ?? 5005,
      targetFps: config.targetFps ?? 60,
      verbose: config.verbose ?? false,
    };
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  public start(): void {
    if (this.running) return;
    this.running = true;

    // UDP receiver for incoming ZigSim data
    this.receiver = dgram.createSocket('udp4');
    this.receiver.on('message', (msg) => this.handleRawOsc(msg));
    this.receiver.bind(this.config.listenPort, () => {
      console.log(`[zigsim-bridge] 👂 Listening for ZigSim on UDP :${this.config.listenPort}`);
    });

    // UDP sender for outbound SomaticBridge relay
    this.sender = dgram.createSocket('udp4');

    // Start relay loop at targetFps
    const intervalMs = Math.round(1000 / this.config.targetFps);
    this.relayInterval = setInterval(() => this.relayFrame(), intervalMs);

    console.log(
      `[zigsim-bridge] ✅ ANTITRUST Mirror active — relaying to ${this.config.somaticHost}:${this.config.somaticPort} at ${this.config.targetFps}fps`
    );
  }

  public stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.relayInterval) {
      clearInterval(this.relayInterval);
      this.relayInterval = null;
    }
    this.receiver?.close();
    this.sender?.close();
    this.receiver = null;
    this.sender = null;

    console.log(`[zigsim-bridge] ⏹️  Stopped — ${this.frameCount} frames relayed total`);
  }

  // ─── OSC Parsing ───────────────────────────────────────────────────────────

  /**
   * Minimal OSC byte parser — handles simple float32 messages.
   * ZigSim sends standard OSC 1.0 bundles.
   */
  private handleRawOsc(buf: Buffer): void {
    try {
      const { address, args } = this.parseOscMessage(buf);
      if (!address || args.length === 0) return;

      // Parse ZigSim address: /zigsim/{deviceId}/{channel}
      const parts = address.split('/').filter(Boolean);
      if (parts.length < 3 || parts[0] !== 'zigsim') return;

      const [, deviceId, ...channelParts] = parts;
      const channel = channelParts.join('/');
      this.currentDeviceId = deviceId;

      // Face tracking: /zigsim/{id}/arface/{blendshapeName}
      if (channel.startsWith('arface/')) {
        const shapeName = channel.replace('arface/', '');
        const mapped = ZIGSIM_TO_ARKIT[shapeName];
        if (mapped !== undefined && typeof args[0] === 'number') {
          this.currentFrame[mapped] = args[0];
          if (this.config.verbose) {
            console.log(`[zigsim-bridge] ${mapped} = ${args[0].toFixed(4)}`);
          }
        }
        return;
      }

      // Device attitude: /zigsim/{id}/atti → head rotation (pitch, yaw, roll)
      if (channel === 'atti' && args.length >= 3) {
        this.currentHeadRotation = {
          pitch: (args[0] as number) ?? 0,
          yaw: (args[1] as number) ?? 0,
          roll: (args[2] as number) ?? 0,
        };
      }
    } catch {
      // Ignore malformed packets
    }
  }

  /**
   * Parse a raw OSC message buffer into address + args.
   * Handles int32, float32, and string types.
   */
  private parseOscMessage(buf: Buffer): { address: string; args: Array<number | string> } {
    let offset = 0;

    // Read null-terminated address string, padded to 4-byte boundary
    const addrEnd = buf.indexOf(0, offset);
    const address = buf.toString('utf8', offset, addrEnd);
    offset = Math.ceil((addrEnd + 1) / 4) * 4;

    const args: Array<number | string> = [];

    if (offset >= buf.length) return { address, args };

    // Type tag string starts with ','
    if (buf[offset] !== 0x2c) return { address, args };
    const tagEnd = buf.indexOf(0, offset);
    const typeTags = buf.toString('utf8', offset + 1, tagEnd);
    offset = Math.ceil((tagEnd + 1) / 4) * 4;

    for (const tag of typeTags) {
      if (offset >= buf.length) break;
      if (tag === 'f') {
        args.push(buf.readFloatBE(offset));
        offset += 4;
      } else if (tag === 'i') {
        args.push(buf.readInt32BE(offset));
        offset += 4;
      } else if (tag === 's') {
        const end = buf.indexOf(0, offset);
        args.push(buf.toString('utf8', offset, end));
        offset = Math.ceil((end + 1) / 4) * 4;
      }
    }

    return { address, args };
  }

  // ─── Relay ─────────────────────────────────────────────────────────────────

  /**
   * Emit the current blendshape accumulator to SomaticBridge.
   * Called at targetFps by the relay interval.
   * Encodes a minimal OSC bundle with one message per blendshape.
   */
  private relayFrame(): void {
    if (!this.sender || Object.keys(this.currentFrame).length === 0) return;

    const now = Date.now();
    const frame: ZigSimFrame = {
      deviceId: this.currentDeviceId,
      blendshapes: { ...this.currentFrame },
      headRotation: { ...this.currentHeadRotation },
      timestamp: now,
    };

    // Emit one OSC message per blendshape to SomaticBridge
    for (const [name, value] of Object.entries(this.currentFrame)) {
      const msg = this.encodeOscFloat(`/sl/rig_param/${name}`, value);
      this.sender.send(msg, this.config.somaticPort, this.config.somaticHost);
    }

    // Also send head rotation as a bundle
    if (this.currentHeadRotation) {
      const rot = this.currentHeadRotation;
      for (const [axis, value] of Object.entries(rot)) {
        const msg = this.encodeOscFloat(`/sl/rig_param/head_${axis}`, value as number);
        this.sender.send(msg, this.config.somaticPort, this.config.somaticHost);
      }
    }

    this.frameCount++;
    this.lastFrameTime = now;
    this.emit('frame', frame);
  }

  /**
   * Encode a single float32 OSC message: address + float arg.
   */
  private encodeOscFloat(address: string, value: number): Buffer {
    // Pad address to 4-byte boundary with nulls
    const addrBuf = Buffer.alloc(Math.ceil((address.length + 1) / 4) * 4, 0);
    addrBuf.write(address);

    const typeTag = ',f\0\0';
    const tagBuf = Buffer.alloc(4, 0);
    tagBuf.write(typeTag);

    const valueBuf = Buffer.alloc(4);
    valueBuf.writeFloatBE(value, 0);

    return Buffer.concat([addrBuf, tagBuf, valueBuf]);
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  public getStats(): {
    running: boolean;
    frameCount: number;
    lastFrameTime: number;
    activeChannels: number;
  } {
    return {
      running: this.running,
      frameCount: this.frameCount,
      lastFrameTime: this.lastFrameTime,
      activeChannels: Object.keys(this.currentFrame).length,
    };
  }
}

// ─── CLI Entrypoint ───────────────────────────────────────────────────────────

// Run directly: npx tsx packages/sensor-mesh/src/ZigSimBridge.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  const bridge = new ZigSimBridge({
    listenPort: parseInt(process.env.ZIGSIM_PORT ?? '5010'),
    somaticHost: process.env.SOMATIC_HOST ?? '127.0.0.1',
    somaticPort: parseInt(process.env.SOMATIC_PORT ?? '5005'),
    targetFps: parseInt(process.env.TARGET_FPS ?? '60'),
    verbose: process.env.VERBOSE === 'true',
  });

  bridge.on('frame', (f: ZigSimFrame) => {
    const activeCount = Object.keys(f.blendshapes).length;
    if (activeCount > 0) {
      process.stdout.write(
        `\r[zigsim-bridge] 🎭 Frame #${bridge.getStats().frameCount} — ${activeCount} channels — jawOpen: ${(f.blendshapes['JawOpen'] ?? 0).toFixed(3)}   `
      );
    }
  });

  bridge.start();

  process.on('SIGINT', () => {
    console.log('\n[zigsim-bridge] 🛑 Shutting down...');
    bridge.stop();
    process.exit(0);
  });
}
