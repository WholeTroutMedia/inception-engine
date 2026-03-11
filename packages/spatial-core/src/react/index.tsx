/**
 * @spatial/core — react/index.tsx
 *
 * React bindings for @spatial/core.
 *
 * - OracleProvider  Context provider for shared ORACLE signal
 * - useOracle()     ORACLE signal hook (time, weather, season, location, light)
 * - usePhysics()    SpatialPhysics engine lifecycle hook
 * - useDOMBody()    Attaches a ref'd element to the physics world
 */

'use client';

import {
  useEffect, useState, useRef, createContext, useContext,
  type RefObject, type ReactNode,
} from 'react';

import {
  createOracleSignal, watchOracle, applyOracleToDOM,
  type OracleSignal, type OracleOptions,
} from '../oracle/index.js';

import {
  SpatialPhysics,
  type SpatialPhysicsOptions, type DOMBodyOptions, type PhysicsBodyHandle,
} from '../physics/index.js';

// ── OracleContext ──────────────────────────────────────────────────────────────

const OracleContext = createContext<OracleSignal | null>(null);

export interface OracleProviderProps {
  children:  ReactNode;
  options?:  OracleOptions & { applyToDOM?: boolean };
}

/**
 * Provides shared ORACLE signal to all children.
 * Place high in the tree (e.g., in layout or root component).
 */
export function OracleProvider({ children, options = {} }: OracleProviderProps) {
  const [signal, setSignal] = useState<OracleSignal | null>(null);

  useEffect(() => {
    const watcher = watchOracle(
      (s) => setSignal(s),
      { applyToDOM: options.applyToDOM ?? true, ...options }
    );
    return () => watcher.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <OracleContext.Provider value={signal}>
      {children}
    </OracleContext.Provider>
  );
}

// ── useOracle ──────────────────────────────────────────────────────────────────

/**
 * Returns the current ORACLE context signal.
 * Uses OracleProvider context if available; otherwise creates its own.
 */
export function useOracle(opts: OracleOptions = {}): OracleSignal | null {
  const ctx = useContext(OracleContext);
  const [sig, setSig] = useState<OracleSignal | null>(ctx);

  useEffect(() => {
    if (ctx !== null) { setSig(ctx); return; }
    const watcher = watchOracle(setSig, { applyToDOM: false, ...opts });
    return () => watcher.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);

  return sig;
}

// ── usePhysics ─────────────────────────────────────────────────────────────────

/**
 * Initializes a SpatialPhysics engine and starts the loop.
 * Automatically disposes on unmount.
 */
export function usePhysics(opts: SpatialPhysicsOptions = {}): SpatialPhysics | null {
  const [engine, setEngine] = useState<SpatialPhysics | null>(null);

  useEffect(() => {
    let e: SpatialPhysics | null = null;
    SpatialPhysics.init(opts).then(instance => {
      e = instance;
      instance.startLoop();
      setEngine(instance);
    });
    return () => { e?.dispose(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return engine;
}

// ── useDOMBody ─────────────────────────────────────────────────────────────────

/**
 * Attaches an element ref to a SpatialPhysics world.
 * Returns the PhysicsBodyHandle for force/impulse control.
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * const body = useDOMBody(physics, ref, { mass: 2 });
 * body?.applyImpulse({ x: 100, y: 200, z: 0 });
 */
export function useDOMBody<T extends HTMLElement>(
  physics: SpatialPhysics | null,
  ref:     RefObject<T | null>,
  opts:    DOMBodyOptions = {}
): PhysicsBodyHandle | null {
  const bodyRef = useRef<PhysicsBodyHandle | null>(null);

  useEffect(() => {
    if (!physics || !ref.current) return;
    const handle = physics.addDOMBody(ref.current, opts);
    bodyRef.current = handle;
    return () => handle.dispose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [physics, ref.current]);

  return bodyRef.current;
}

// ── Re-export core types ───────────────────────────────────────────────────────

export type { OracleSignal, OracleOptions, TimePhase, WeatherLabel, Season } from '../oracle/index.js';
export type { SpatialPhysicsOptions, DOMBodyOptions, PhysicsBodyHandle, Vec3 } from '../physics/index.js';
export { createOracleSignal, applyOracleToDOM, watchOracle } from '../oracle/index.js';
export { SpatialPhysics } from '../physics/index.js';
