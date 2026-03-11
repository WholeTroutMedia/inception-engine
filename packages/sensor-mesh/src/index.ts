/**
 * @inception/sensor-mesh — ANTITRUST Living Sensor Mesh
 *
 * Sovereign biometric, vision, and motion data ingestion.
 * The Mirror — your face IS the brief.
 *
 * Pipeline:
 *   iPhone ZigSim Pro → UDP :5010 → ZigSimBridge → OSC :5005 → SomaticBridge → UE5
 *
 * @package @inception/sensor-mesh
 * @version 1.0.0
 */

// ─── Core Bridge ──────────────────────────────────────────────────────────────

export {
  ZigSimBridge,
  type ZigSimBridgeConfig,
  type ZigSimFrame,
  ZIGSIM_TO_ARKIT,
} from './ZigSimBridge';

// ─── Re-export ZIGSIM_TO_ARKIT if needed by consumers ────────────────────────

// Named map is exported from ZigSimBridge directly as a const.
// Consumers can do:  import { ZigSimBridge, ZIGSIM_TO_ARKIT } from '@inception/sensor-mesh'

// ─── Convenience factory ──────────────────────────────────────────────────────

import { ZigSimBridge, type ZigSimBridgeConfig } from './ZigSimBridge';

/**
 * Create and start a ZigSimBridge with default configuration.
 * The fastest path to a live MetaHuman mirror.
 *
 * @example
 * const bridge = createMirror({ verbose: true });
 * bridge.on('frame', (f) => console.log('jawOpen:', f.blendshapes.JawOpen));
 */
export function createMirror(config?: ZigSimBridgeConfig): ZigSimBridge {
  const bridge = new ZigSimBridge(config);
  bridge.start();
  return bridge;
}

// ─── Version ──────────────────────────────────────────────────────────────────

export const SENSOR_MESH_VERSION = '1.0.0';
export const SENSOR_MESH_PIPELINE = 'iPhone ZigSim Pro → UDP:5010 → ZigSimBridge → OSC:5005 → SomaticBridge → UE5';
