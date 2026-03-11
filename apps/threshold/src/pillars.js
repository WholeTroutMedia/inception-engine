/**
 * pillars.js — ATHENA, VERA, IRIS agent pillars
 * Three luminous columns at cardinal positions.
 * Each pulses with its agent's color and reacts to hover/click.
 */

import * as THREE from 'three';

const AGENTS = [
  { name: 'ATHENA', color: 0xC9A050, emissive: 0x3D2400, position: [-8, 0, -14], pipId: 'pip-athena' },
  { name: 'VERA',   color: 0x00E5FF, emissive: 0x002E33, position: [ 8, 0, -14], pipId: 'pip-vera'   },
  { name: 'IRIS',   color: 0x9B59B6, emissive: 0x1A0A24, position: [ 0, 0, -20], pipId: 'pip-iris'   },
];

const PILLAR_HEIGHT = 14;
const PILLAR_RADIUS = 0.12;

export function createPillars(scene) {
  const pillarsData = AGENTS.map(agent => buildPillar(scene, agent));

  return {
    getInteractables() {
      return pillarsData.flatMap(p => p.interactables);
    },

    activatePillar(agentName) {
      const p = pillarsData.find(p => p.name === agentName);
      if (p) {
        p.activate();
        document.getElementById(p.pipId)?.classList.add('active');
      }
    },

    hoverPillar(agentName) {
      const p = pillarsData.find(p => p.name === agentName);
      if (p) p.hover(true);
    },

    unhoverPillar(agentName) {
      const p = pillarsData.find(p => p.name === agentName);
      if (p) p.hover(false);
    },

    setAudioLevel(level, bass) {
      pillarsData.forEach(p => p.setAudio(level, bass));
    },

    update(elapsed) {
      pillarsData.forEach(p => p.update(elapsed));
    },
  };
}

function buildPillar(scene, agent) {
  const group = new THREE.Group();
  group.position.set(...agent.position);

  // ─── Main pillar shaft ────────────────────────────────────────────────────
  const shaftGeo = new THREE.CylinderGeometry(PILLAR_RADIUS, PILLAR_RADIUS * 1.4, PILLAR_HEIGHT, 8);
  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: agent.emissive,
    emissiveIntensity: 1,
    roughness: 0.9,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7,
  });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.position.y = PILLAR_HEIGHT / 2;
  shaft.userData.agent = agent.name;
  group.add(shaft);

  // ─── Glow core (inner bright column) ─────────────────────────────────────
  const coreGeo = new THREE.CylinderGeometry(0.04, 0.04, PILLAR_HEIGHT * 0.9, 6);
  const coreMat = new THREE.MeshBasicMaterial({
    color: agent.color,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = PILLAR_HEIGHT / 2;
  group.add(core);

  // ─── Top orb ─────────────────────────────────────────────────────────────
  const orbGeo = new THREE.SphereGeometry(0.22, 16, 16);
  const orbMat = new THREE.MeshBasicMaterial({
    color: agent.color,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.position.y = PILLAR_HEIGHT + 0.22;
  orb.userData.agent = agent.name;
  group.add(orb);

  // ─── Pulse ring stack at base ─────────────────────────────────────────────
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.RingGeometry(0.3 + i * 0.25, 0.34 + i * 0.25, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: agent.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    group.add(ring);
    rings.push({ mesh: ring, phase: i * 0.6 });
  }

  // ─── Name label (floating text as sprite) ────────────────────────────────
  const label = makeTextSprite(agent.name, agent.color);
  label.position.set(0, PILLAR_HEIGHT + 1.1, 0);
  group.add(label);

  scene.add(group);

  // ─── Point light at orb ───────────────────────────────────────────────────
  const light = new THREE.PointLight(agent.color, 1.5, 18);
  light.position.set(...agent.position);
  light.position.y = PILLAR_HEIGHT;
  scene.add(light);

  // ─── State ────────────────────────────────────────────────────────────────
  let hovering   = false;
  let activated  = false;
  let activateT  = 0;
  let _audio     = 0;
  let _bass      = 0;

  return {
    name: agent.name,
    pipId: agent.pipId,
    interactables: [shaft, orb],

    hover(on) { hovering = on; },
    activate() { activated = true; activateT = 0; },
    setAudio(level, bass) { _audio = level; _bass = bass; },

    update(elapsed) {
      // Orb breathe — amplified by bass
      const bassBoom  = 1 + _bass * 1.5;
      const breathe   = 1 + (Math.sin(elapsed * 0.8 + agent.position[0]) * 0.08 + _audio * 0.25) * bassBoom;
      orb.scale.setScalar(breathe);
      orbMat.opacity = 0.45 + Math.sin(elapsed * 0.8 + agent.position[0]) * 0.2 + _audio * 0.3;

      // Core shimmer
      coreMat.opacity = 0.1 + Math.sin(elapsed * 0.5 + agent.position[2]) * 0.06 + _audio * 0.1;

      // Pulse rings — speed up with audio
      const ringSpeed = 0.5 + _audio * 1.5;
      rings.forEach((r) => {
        const t = ((elapsed * ringSpeed + r.phase) % 1);
        r.mesh.material.opacity = (1 - t) * (0.15 + _bass * 0.25);
        r.mesh.scale.setScalar(1 + t * (2 + _bass * 1.5));
      });

      // Hover / audio light boost
      const targetLight = hovering ? 3.5 + _audio * 2 : (activated ? 2.5 : 1.5 + _audio * 1.5);
      light.intensity = THREE.MathUtils.lerp(light.intensity, targetLight, 0.05);

      // Activation flash
      if (activated && activateT < 1) {
        activateT += 0.03;
        orbMat.opacity = Math.min(1, orbMat.opacity + Math.sin(activateT * Math.PI) * 0.5);
        if (activateT >= 1) activated = false;
      }
    },
  };
}

// ─── Text sprite ──────────────────────────────────────────────────────────────
function makeTextSprite(text, hexColor) {
  const canvas = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 64);
  ctx.font = '400 22px Inter, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Hex to rgb for canvas
  const r = ((hexColor >> 16) & 255);
  const g = ((hexColor >> 8)  & 255);
  const b = ( hexColor        & 255);
  ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2, 0.5, 1);
  return sprite;
}
