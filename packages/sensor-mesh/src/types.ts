/**
 * @inception/sensor-mesh — ANTITRUST Core Types
 *
 * Sovereign sensor mesh schemas for the Living Body OS.
 * Every device halo channel is typed here.
 */

import { z } from 'zod';

// ─── Biometric Brief (Tier 1 — THE ORACLE) ──────────────────────────────────

/**
 * Replaces PerformanceBrief when biometric data drives the performance.
 * The AI reads your body state and generates the content autonomously.
 */
export const BiometricBriefSchema = z.object({
  /** Heart rate in BPM (Apple Watch) */
  bpm: z.number().min(30).max(250).optional(),
  /** Heart rate variability in ms (Apple Watch — proxy for stress/calm) */
  hrv: z.number().min(0).max(200).optional(),
  /** 0.0 (still) – 1.0 (highly active) — from accelerometer */
  motionIntensity: z.number().min(0).max(1).optional(),
  /** Head orientation from AirPods CMHeadphoneMotionManager or ZigSim attitude */
  headOrientation: z
    .object({ yaw: z.number(), pitch: z.number(), roll: z.number() })
    .optional(),
  /** Left/right eye gaze from ZigSim or ARKit face tracking */
  gazeVector: z
    .object({ x: z.number(), y: z.number() })
    .optional(),
  /** Inferred mood from biometrics — computed by BiometricBridge */
  mood: z.enum(['calm', 'focused', 'energized', 'stressed', 'neutral']).optional(),
  /** Source device(s) that contributed to this brief */
  sources: z.array(z.string()).optional(),
  timestamp: z.number().optional(),
});

export type BiometricBrief = z.infer<typeof BiometricBriefSchema>;

// ─── Cinematic Context (Tier 2 — THE CINEMATOGRAPHER) ───────────────────────

/**
 * What the Sony A1 II (or any vision node) sees in the room.
 * Inferred by Gemini Vision from a captured frame.
 */
export const CinematicContextSchema = z.object({
  /** Dominant emotion detected in the primary subject */
  subjectEmotion: z
    .enum(['neutral', 'happy', 'focused', 'intense', 'relaxed', 'surprised', 'unknown'])
    .optional(),
  /** Approximate subject position: 0.0 (far left) – 1.0 (far right) */
  subjectPositionX: z.number().min(0).max(1).optional(),
  /** Approximate subject position: 0.0 (bottom) – 1.0 (top) */
  subjectPositionY: z.number().min(0).max(1).optional(),
  /** 0.0 (empty/static) – 1.0 (high energy/crowded) */
  sceneEnergy: z.number().min(0).max(1).optional(),
  /** Number of subjects detected in frame */
  subjectCount: z.number().int().min(0).optional(),
  /** Free-form compositional notes from Gemini Vision */
  compositionNotes: z.string().optional(),
  /** The camera that captured this context */
  sourceCamera: z.string().optional(),
  timestamp: z.number().optional(),
});

export type CinematicContext = z.infer<typeof CinematicContextSchema>;

// ─── Scene Graph (Tier 3 — THE CONSTELLATION) ───────────────────────────────

/**
 * A unified scene model from multiple cameras.
 * The SpatialDirector builds this from all RTSP/RTMP sources.
 */
export const PersonNodeSchema = z.object({
  /** Stable tracking ID across frames */
  id: z.string(),
  /** 0.0–1.0 normalized position in room (from fused camera views) */
  position: z.object({ x: z.number(), y: z.number() }),
  /** Detected emotion */
  emotion: z.string().optional(),
  /** Gaze direction vector */
  gazeDirection: z.object({ x: z.number(), y: z.number() }).optional(),
  /** Source camera IDs that contributed to this person node */
  cameras: z.array(z.string()),
});

export const SceneGraphSchema = z.object({
  /** All detected persons across all cameras */
  persons: z.array(PersonNodeSchema),
  /** 0.0 (empty) – 1.0 (maximum energy) — weighted fused room energy */
  roomEnergy: z.number().min(0).max(1),
  /** Per-camera context snapshots */
  cameraContexts: z.array(CinematicContextSchema),
  timestamp: z.number().optional(),
});

export type PersonNode = z.infer<typeof PersonNodeSchema>;
export type SceneGraph = z.infer<typeof SceneGraphSchema>;

// ─── Instrument Mapping (Tier 4 — THE INSTRUMENT) ───────────────────────────

/**
 * One configurable sensor → effect routing.
 * The InstrumentRouter loads an array of these from JSON config.
 */
export const InstrumentMappingSchema = z.object({
  /** Human-readable name */
  name: z.string(),
  /** OSC address of the incoming sensor channel (e.g. "/zigsim/gyro/x") */
  sourceAddress: z.string(),
  /** OSC address of the effect target (e.g. "/touchdesigner/reverb_wet") */
  targetAddress: z.string(),
  /** Target OSC host */
  targetHost: z.string().default('127.0.0.1'),
  /** Target OSC port */
  targetPort: z.number().int().default(9000),
  /** Normalize input from [inputMin, inputMax] to [outputMin, outputMax] */
  inputMin: z.number().default(0),
  inputMax: z.number().default(1),
  outputMin: z.number().default(0),
  outputMax: z.number().default(1),
  /** Clamp final value to output range */
  clamp: z.boolean().default(true),
});

export type InstrumentMapping = z.infer<typeof InstrumentMappingSchema>;

// ─── Unified Sensor Frame ────────────────────────────────────────────────────

/**
 * Timestamped wrapper for any sensor event.
 * Used by OscRecorder for timeline capture.
 */
export interface SensorFrame {
  timestamp: number;
  source: 'zigsim' | 'biometric' | 'vision' | 'spatial' | 'instrument';
  address: string;
  args: Array<number | string | boolean>;
}

// ─── Capture Sources ─────────────────────────────────────────────────────────

export interface RtmpSource {
  type: 'rtmp';
  url: string; // e.g. "rtmp://localhost:1935/live/a1"
  label: string;
}

export interface RtspSource {
  type: 'rtsp';
  url: string; // e.g. "rtsp://192.168.1.x:554/stream"
  label: string;
}

export interface WebcamSource {
  type: 'webcam';
  deviceIndex: number;
  label: string;
}

export type CaptureSource = RtmpSource | RtspSource | WebcamSource;
