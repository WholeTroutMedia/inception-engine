/**
 * @spatial/core — physics/index.ts
 * 
 * Rapier3D WASM physics layer for spatial web elements.
 * Initializes the engine once and exposes typed helpers for
 * gravity fields, rigid body attachment to DOM elements,
 * and collision event bubbling.
 * 
 * @example
 * import { SpatialPhysics } from '@spatial/core/physics';
 * const physics = await SpatialPhysics.init({ gravity: [0, -9.81, 0] });
 * const body = physics.addDOMBody(myElement, { mass: 1 });
 */

import type { World as RapierWorld, RigidBody, Collider } from '@dimforge/rapier3d-compat';

// ── Lazy Rapier import (WASM) ─────────────────────────────────────────────────

let _RAPIER: typeof import('@dimforge/rapier3d-compat') | null = null;

async function getRapier() {
  if (!_RAPIER) {
    _RAPIER = await import('@dimforge/rapier3d-compat');
    await _RAPIER.init();
  }
  return _RAPIER;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Vec3 { x: number; y: number; z: number; }

export interface DOMBodyOptions {
  mass?:         number;      // default: 1
  restitution?:  number;      // bounciness 0–1, default: 0.3
  friction?:     number;      // 0–1, default: 0.5
  /** 'box' uses element bounding rect; 'sphere' uses min dimension radius */
  shape?:        'box' | 'sphere'; // default: 'box'
  /** If true, body is fixed in space (immovable) */
  fixed?:        boolean;
}

export interface PhysicsBodyHandle {
  id:       number;
  update:   () => void;     // sync DOM element position from physics state
  applyForce:  (force: Vec3) => void;
  applyImpulse:(impulse: Vec3) => void;
  setPosition: (pos: Vec3)  => void;
  dispose:  () => void;
}

export interface SpatialPhysicsOptions {
  gravity?:       [number, number, number]; // default: [0, -9.81, 0]
  substeps?:      number;                   // default: 1
  /** Timestep in seconds (default: 1/60) */
  timestep?:      number;
}

// ── Main class ─────────────────────────────────────────────────────────────────

export class SpatialPhysics {
  private world:   RapierWorld;
  private RAPIER:  typeof import('@dimforge/rapier3d-compat');
  private bodies:  Map<number, { rigidBody: RigidBody; collider: Collider; el: HTMLElement; }> = new Map();
  private _frameId: number | null = null;
  private _lastTime: number = 0;
  private _timestep: number;

  private constructor(
    world:    RapierWorld,
    rapier:   typeof import('@dimforge/rapier3d-compat'),
    timestep: number
  ) {
    this.world     = world;
    this.RAPIER    = rapier;
    this._timestep = timestep;
  }

  /**
   * Initialize the physics engine. WASM is loaded on first call.
   */
  static async init(opts: SpatialPhysicsOptions = {}): Promise<SpatialPhysics> {
    const rapier   = await getRapier();
    const [gx, gy, gz] = opts.gravity ?? [0, -9.81, 0];
    const world    = new rapier.World({ x: gx, y: gy, z: gz });
    const timestep = opts.timestep ?? 1 / 60;
    return new SpatialPhysics(world, rapier, timestep);
  }

  /**
   * Attach a DOM element to the physics world as a rigid body.
   * Position is sourced from `getBoundingClientRect()`.
   */
  addDOMBody(el: HTMLElement, opts: DOMBodyOptions = {}): PhysicsBodyHandle {
    const rect   = el.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const RAPIER = this.RAPIER;

    // Rigid body
    const rbDesc = opts.fixed
      ? RAPIER.RigidBodyDesc.fixed()
      : RAPIER.RigidBodyDesc.dynamic();
    rbDesc.setTranslation(cx, cy, 0);
    const rigidBody = this.world.createRigidBody(rbDesc);

    // Collider shape
    let colDesc;
    if (opts.shape === 'sphere') {
      const r = Math.min(rect.width, rect.height) / 2;
      colDesc = RAPIER.ColliderDesc.ball(r);
    } else {
      colDesc = RAPIER.ColliderDesc.cuboid(rect.width / 2, rect.height / 2, 1);
    }
    colDesc.setMass(opts.mass ?? 1);
    colDesc.setRestitution(opts.restitution ?? 0.3);
    colDesc.setFriction(opts.friction ?? 0.5);

    const collider = this.world.createCollider(colDesc, rigidBody);
    const id       = rigidBody.handle;

    this.bodies.set(id, { rigidBody, collider, el });

    return {
      id,
      update: () => {
        const pos = rigidBody.translation();
        const w   = el.offsetWidth;
        const h   = el.offsetHeight;
        el.style.transform = `translate3d(${pos.x - w / 2}px, ${pos.y - h / 2}px, ${pos.z}px)`;
      },
      applyForce: (f) => rigidBody.addForce({ x: f.x, y: f.y, z: f.z }, true),
      applyImpulse: (i) => rigidBody.applyImpulse({ x: i.x, y: i.y, z: i.z }, true),
      setPosition: (p) => rigidBody.setTranslation({ x: p.x, y: p.y, z: p.z }, true),
      dispose: () => {
        this.world.removeRigidBody(rigidBody);
        this.bodies.delete(id);
      },
    };
  }

  /** Step the physics world by one fixed timestep */
  step(): void {
    this.world.step();
  }

  /** Start the automatic animation loop */
  startLoop(): void {
    if (this._frameId !== null) return;
    const loop = (now: number) => {
      if (this._lastTime) {
        const dt = (now - this._lastTime) / 1000;
        // Fixed timestep accumulator
        let acc = dt;
        while (acc >= this._timestep) {
          this.world.step();
          acc -= this._timestep;
        }
        // Sync DOM
        for (const { rigidBody, el } of this.bodies.values()) {
          const pos = rigidBody.translation();
          const w   = el.offsetWidth;
          const h   = el.offsetHeight;
          el.style.transform = `translate3d(${pos.x - w / 2}px, ${pos.y - h / 2}px, 0px)`;
        }
      }
      this._lastTime  = now;
      this._frameId   = requestAnimationFrame(loop);
    };
    this._frameId = requestAnimationFrame(loop);
  }

  /** Stop the animation loop */
  stopLoop(): void {
    if (this._frameId !== null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
  }

  /** Dispose all bodies and the world */
  dispose(): void {
    this.stopLoop();
    this.world.free();
    this.bodies.clear();
  }

  /** Gravity vector mutator — updates live world */
  setGravity(x: number, y: number, z: number): void {
    this.world.gravity = { x, y, z };
  }
}
