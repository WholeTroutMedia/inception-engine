/**
 * @inception/live-animate — AvatarRenderer (Option A)
 *
 * Three.js 3D avatar engine that reads TrackedEntity[] from LiveAnimateEngine
 * and drives a humanoid skeleton in real-time. Same data, different output.
 *
 * Three.js is already a dep in package.json. Avatar geometry is built
 * programmatically — no GLTF file dependency for v1.
 *
 * Architecture:
 *   LiveAnimateEngine.getSnapshot() → AvatarRenderer.updateEntities() →
 *   Three.js bone transforms → requestAnimationFrame render
 *
 * Browser only.
 */

import * as THREE from 'three';
import type { TrackedEntity } from '../tracker/player-tracker.js';

// ─── Bone map: entity name suffix → limb group ────────────────────────────────

const TORSO_JOINTS  = new Set(['left_shoulder','right_shoulder','left_hip','right_hip']);
const ARM_JOINTS    = new Set(['left_elbow','right_elbow','left_wrist','right_wrist']);
const LEG_JOINTS    = new Set(['left_knee','right_knee','left_ankle','right_ankle']);
const FACE_JOINTS   = new Set(['nose','left_eye','right_eye','mouth_left','mouth_right']);

// ─── AvatarRenderer ──────────────────────────────────────────────────────────

export interface AvatarRendererConfig {
  canvas: HTMLCanvasElement;
  /** Background transparency (renders over video in studio) */
  transparent?: boolean;
}

export class AvatarRenderer {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private skeletonGroup!: THREE.Group;
  private jointMeshes = new Map<string, THREE.Mesh>();
  private boneMeshes = new Map<string, THREE.Mesh>();
  private running = false;
  private rafHandle: number | null = null;
  private entitySnapshot: TrackedEntity[] = [];
  private frameCount = 0;
  private readonly canvas: HTMLCanvasElement;

  constructor(config: AvatarRendererConfig) {
    this.canvas = config.canvas;
    this.initScene(config.transparent ?? true);
    this.buildAvatarSkeleton();
  }

  // ─── Scene Setup ─────────────────────────────────────────────────────────

  private initScene(transparent: boolean): void {
    // Scene
    this.scene = new THREE.Scene();
    if (!transparent) {
      this.scene.background = new THREE.Color(0x080810);
    }

    // Camera — orthographic-ish perspective, centered on body
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.canvas.width / this.canvas.height,
      0.1,
      100,
    );
    this.camera.position.set(0, 0, 3);

    // Ambient + directional light
    this.scene.add(new THREE.AmbientLight(0x334466, 1.5));
    const dir = new THREE.DirectionalLight(0x00f5ff, 2);
    dir.position.set(1, 2, 3);
    this.scene.add(dir);

    // Subtle grid floor
    const grid = new THREE.GridHelper(4, 20, 0x1a1a3a, 0x111128);
    grid.position.y = -1.2;
    this.scene.add(grid);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: transparent,
    });
    this.renderer.setSize(this.canvas.width, this.canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // Skeleton container
    this.skeletonGroup = new THREE.Group();
    this.scene.add(this.skeletonGroup);
  }

  // ─── Skeleton Geometry ────────────────────────────────────────────────────

  private buildAvatarSkeleton(): void {
    // Pre-create sphere meshes for every expected MediaPipe landmark
    const jointNames = [
      'nose','left_eye','right_eye','mouth_left','mouth_right',
      'left_shoulder','right_shoulder','left_elbow','right_elbow',
      'left_wrist','right_wrist','left_hip','right_hip',
      'left_knee','right_knee','left_ankle','right_ankle',
    ];

    const jointGeos: Record<string, THREE.SphereGeometry> = {
      face:  new THREE.SphereGeometry(0.04, 8, 8),
      torso: new THREE.SphereGeometry(0.07, 10, 10),
      arms:  new THREE.SphereGeometry(0.05, 8, 8),
      legs:  new THREE.SphereGeometry(0.06, 8, 8),
    };
    const jointMats: Record<string, THREE.MeshStandardMaterial> = {
      face:  new THREE.MeshStandardMaterial({ color: 0x00f5ff, emissive: 0x007788, roughness: 0.2 }),
      torso: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x334455, roughness: 0.3 }),
      arms:  new THREE.MeshStandardMaterial({ color: 0xff6b00, emissive: 0x442200, roughness: 0.2 }),
      legs:  new THREE.MeshStandardMaterial({ color: 0xbf00ff, emissive: 0x330044, roughness: 0.2 }),
    };

    for (const name of jointNames) {
      const group = FACE_JOINTS.has(name) ? 'face'
                  : TORSO_JOINTS.has(name) ? 'torso'
                  : ARM_JOINTS.has(name)   ? 'arms'
                  : LEG_JOINTS.has(name)   ? 'legs'
                  : 'torso';
      const mesh = new THREE.Mesh(jointGeos[group], jointMats[group]);
      mesh.position.set(0, 0, -10); // start offscreen until we get data
      this.skeletonGroup.add(mesh);
      this.jointMeshes.set(name, mesh);
    }

    // Bone cylinders (connections)
    const connectionPairs: [string, string][] = [
      ['left_shoulder','right_shoulder'],
      ['left_shoulder','left_elbow'],['left_elbow','left_wrist'],
      ['right_shoulder','right_elbow'],['right_elbow','right_wrist'],
      ['left_shoulder','left_hip'],['right_shoulder','right_hip'],
      ['left_hip','right_hip'],
      ['left_hip','left_knee'],['left_knee','left_ankle'],
      ['right_hip','right_knee'],['right_knee','right_ankle'],
    ];

    const boneMat = new THREE.MeshStandardMaterial({
      color: 0x00d4ff, emissive: 0x003344, roughness: 0.4, transparent: true, opacity: 0.7,
    });
    for (const [a, b] of connectionPairs) {
      const geo = new THREE.CylinderGeometry(0.018, 0.018, 1, 6);
      const mesh = new THREE.Mesh(geo, boneMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.boneMeshes.set(`${a}__${b}`, mesh);
    }
  }

  // ─── Data Update ─────────────────────────────────────────────────────────

  public updateEntities(entities: TrackedEntity[]): void {
    this.entitySnapshot = entities;
  }

  // ─── Render Loop ─────────────────────────────────────────────────────────

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  public stop(): void {
    this.running = false;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
    }
  }

  private loop(): void {
    if (!this.running) return;
    this.rafHandle = requestAnimationFrame(() => {
      this.update();
      this.renderer.render(this.scene, this.camera);
      this.frameCount++;
      this.loop();
    });
  }

  private update(): void {
    const entities = this.entitySnapshot;

    // Build name → entity map
    const byName = new Map<string, TrackedEntity>();
    for (const e of entities) {
      if (e.stale) continue;
      const suffix = e.id.split(':').pop() ?? e.id;
      byName.set(suffix, e);
    }

    // Update joint positions
    // MediaPipe coords: x=0-1 left-to-right, y=0-1 top-to-bottom
    // Three.js: x=-1..1, y=1..-1, z via depth
    for (const [name, mesh] of this.jointMeshes) {
      const entity = byName.get(name);
      if (!entity) { mesh.position.z = -10; continue; }
      const tx = (entity.position.x - 0.5) * 2;        // -1..1
      const ty = -(entity.position.y - 0.5) * 2.5;     // flip Y
      const tz = (entity.position.z ?? 0) * -0.5;      // depth
      // Lerp for smoothness
      mesh.position.lerp(new THREE.Vector3(tx, ty, tz), 0.35);
    }

    // Update bone cylinders (stretch between joint pairs)
    for (const [key, mesh] of this.boneMeshes) {
      const [nameA, nameB] = key.split('__');
      const jointA = this.jointMeshes.get(nameA);
      const jointB = this.jointMeshes.get(nameB);
      if (!jointA || !jointB || jointA.position.z < -5 || jointB.position.z < -5) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const mid = jointA.position.clone().add(jointB.position).multiplyScalar(0.5);
      mesh.position.copy(mid);
      const dir = jointB.position.clone().sub(jointA.position);
      const length = dir.length();
      mesh.scale.y = length;
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }

    // Slight camera bob
    this.camera.position.y = Math.sin(Date.now() * 0.0003) * 0.02;
  }

  public getFrameCount(): number { return this.frameCount; }

  public dispose(): void {
    this.stop();
    this.renderer.dispose();
  }
}
