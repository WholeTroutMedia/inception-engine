/**
 * @spatial/core — main barrel
 * 
 * Imports from sub-packages work directly:
 *   import { createOracleSignal } from '@spatial/core/oracle'
 *   import { SpatialPhysics }    from '@spatial/core/physics'
 *   import { useOracle }         from '@spatial/core/react'
 * 
 * Or use the root export for framework-agnostic utilities.
 */

// Oracle (framework-agnostic — works in any JS environment, SSR, edge)
export {
  createOracleSignal,
  applyOracleToDOM,
  watchOracle,
  getTimePhase,
  getSeason,
  wmoToLabel,
  estimateLux,
} from './oracle/index.js';

export type {
  OracleSignal,
  OracleOptions,
  OracleWatcher,
  TimePhase,
  WeatherLabel,
  Season,
} from './oracle/index.js';

// Physics (browser-only; Rapier WASM lazy-loaded)
export { SpatialPhysics } from './physics/index.js';

export type {
  SpatialPhysicsOptions,
  DOMBodyOptions,
  PhysicsBodyHandle,
  Vec3,
} from './physics/index.js';

// Version
export const SPATIAL_CORE_VERSION = '0.1.0';
