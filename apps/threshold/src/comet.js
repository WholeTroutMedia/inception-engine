/**
 * comet.js — COMET particle constellation
 * Assembles from scattered stars into a humanoid presence.
 * Manages speech display and idle breathe animation.
 */

import * as THREE from 'three';

const PARTICLE_COUNT = 280;
const ASSEMBLED_POSITIONS = generateHumanoidCloud(PARTICLE_COUNT);
const SCATTER_RADIUS = 18;

export function createCOMET(scene) {
  // ─── Geometry ────────────────────────────────────────────────────────────
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors    = new Float32Array(PARTICLE_COUNT * 3);
  const sizes     = new Float32Array(PARTICLE_COUNT);
  const targets   = new Float32Array(PARTICLE_COUNT * 3); // assembled target

  // Scatter initial positions
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    positions[i3]     = (Math.random() - 0.5) * SCATTER_RADIUS;
    positions[i3 + 1] = Math.random() * SCATTER_RADIUS - 2;
    positions[i3 + 2] = (Math.random() - 0.5) * SCATTER_RADIUS - 5;

    targets[i3]     = ASSEMBLED_POSITIONS[i3];
    targets[i3 + 1] = ASSEMBLED_POSITIONS[i3 + 1];
    targets[i3 + 2] = ASSEMBLED_POSITIONS[i3 + 2];

    // Aquamarine-to-white spectrum
    const brightness = 0.6 + Math.random() * 0.4;
    colors[i3]     = brightness * 0.5;  // R
    colors[i3 + 1] = brightness;        // G
    colors[i3 + 2] = brightness * 0.83; // B

    sizes[i] = 0.04 + Math.random() * 0.06;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

  // ─── Material ────────────────────────────────────────────────────────────
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 0.9 }, // visible immediately
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uTime;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // Subtle flicker per particle
        float flicker = 0.85 + 0.15 * sin(uTime * 3.0 + position.x * 7.0 + position.y * 4.0);
        gl_PointSize = size * (320.0 / -mvPosition.z) * flicker;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform float uOpacity;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float r = dot(uv, uv);
        if (r > 0.25) discard;
        float alpha = (1.0 - r * 4.0) * uOpacity;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);
  points.position.set(0, 0, -2);
  scene.add(points);

  // ─── Connection lines (constellation edges) ───────────────────────────────
  const lineGeo  = new THREE.BufferGeometry();
  const lineVerts = buildConstellationEdges(ASSEMBLED_POSITIONS, 30);
  lineGeo.setAttribute('position', new THREE.BufferAttribute(lineVerts, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x7FFFD4,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.position.copy(points.position);
  scene.add(lines);

  // ─── State ───────────────────────────────────────────────────────────────
  let assembling    = false;
  let assembled     = false;
  let assembleT     = 0;
  let speaking      = false;
  let speechTimeout = null;

  const posAttr = geometry.attributes.position;
  const sizeAttr = geometry.attributes.size;
  const scatterPos = new Float32Array(positions); // copy scatter
  let _audioLevel = 0;
  let _bassLevel  = 0;
  let _faceTargetX = 0;
  let _faceTargetY = 0;

  // ─── Speech UI ───────────────────────────────────────────────────────────
  const speechEl = document.getElementById('comet-speech');
  const textEl   = document.getElementById('comet-text');

  function speak(message, duration = 6000) {
    textEl.textContent = message;
    speechEl.classList.add('visible');
    speaking = true;
    if (speechTimeout) clearTimeout(speechTimeout);

    // Text-to-speech if available
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utt  = new SpeechSynthesisUtterance(message);
      utt.rate   = 0.85;
      utt.pitch  = 0.95;
      utt.volume = 0.9;
      // Prefer a calm, clear voice
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes('Samantha') ||
        v.name.includes('Karen') ||
        v.name.includes('Google UK English Female') ||
        v.lang === 'en-GB'
      );
      if (preferred) utt.voice = preferred;
      speechSynthesis.speak(utt);
    }

    speechTimeout = setTimeout(() => {
      speechEl.classList.remove('visible');
      speaking = false;
    }, duration);
  }

  return {
    beginAssembly() {
      assembling = true;
      material.uniforms.uOpacity.value = 1;
      // Greeting arrives after particles settle
      setTimeout(() => {
        speak(buildGreeting());
        assembled = true;
        // Activate hive pip
        document.getElementById('pip-comet')?.classList.add('active');
      }, 2800);
    },

    speak,

    setAudioLevel(level, bass) {
      _audioLevel = level;
      _bassLevel  = bass;
    },

    setFaceTarget(x, y) {
      _faceTargetX = x;
      _faceTargetY = y;
    },

    update(elapsed, delta) {
      material.uniforms.uTime.value = elapsed;

      // Audio reactive — particle size pulses with mic amplitude
      const audioMult = 1 + _audioLevel * 2.5;
      const bassBoom  = _bassLevel * 1.5;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const base = 0.04 + Math.random() * 0.06;
        sizeAttr.array[i] = (base + bassBoom * 0.02) * audioMult;
      }
      sizeAttr.needsUpdate = true;
      material.uniforms.uOpacity.value = 0.85 + _audioLevel * 0.15;

      if (assembling && assembleT < 1) {
        assembleT = Math.min(assembleT + delta * 0.35, 1);
        const ease = easeInOutCubic(assembleT);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          posAttr.array[i3]     = THREE.MathUtils.lerp(scatterPos[i3],     targets[i3],     ease);
          posAttr.array[i3 + 1] = THREE.MathUtils.lerp(scatterPos[i3 + 1], targets[i3 + 1], ease);
          posAttr.array[i3 + 2] = THREE.MathUtils.lerp(scatterPos[i3 + 2], targets[i3 + 2], ease);
        }
        posAttr.needsUpdate = true;
        lineMat.opacity = ease * 0.25;
      }

      if (assembled) {
        // Face tracking: COMET shifts toward where you are
        const targetX = _faceTargetX * 0.5;
        const breathe = Math.sin(elapsed * 0.6) * 0.06;
        points.position.x = THREE.MathUtils.lerp(points.position.x, targetX, 0.02);
        points.position.y = THREE.MathUtils.lerp(points.position.y, breathe, 0.1);
        lines.position.x  = points.position.x;
        lines.position.y  = points.position.y;

        // Subtle particle drift
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const i3 = i * 3;
          const spread = 1 + _audioLevel * 0.4;
          posAttr.array[i3]     = targets[i3]     * spread + Math.sin(elapsed * 0.4 + i * 0.3) * 0.002;
          posAttr.array[i3 + 1] = targets[i3 + 1] + Math.sin(elapsed * 0.5 + i * 0.2) * 0.003;
        }
        posAttr.needsUpdate = true;
      }
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildGreeting() {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const lines = [
    `Good ${timeOfDay}. The engine is quiet. I'm COMET — I watch, and I find things. Where do you want to begin?`,
    `The crew is here. We've been waiting. Tell me what you need.`,
    `All forty present. The threshold is open. I'll be here whether you call me or not.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function generateHumanoidCloud(count) {
  const pos = new Float32Array(count * 3);
  const bodyParts = [
    { label: 'head',    center: [0, 3.2, 0],  rx: 0.35, ry: 0.4,  rz: 0.35, weight: 0.1 },
    { label: 'neck',    center: [0, 2.8, 0],  rx: 0.12, ry: 0.18, rz: 0.12, weight: 0.03 },
    { label: 'torso',   center: [0, 1.9, 0],  rx: 0.38, ry: 0.65, rz: 0.22, weight: 0.25 },
    { label: 'lshoulder',center: [-0.55, 2.5, 0], rx: 0.15, ry: 0.15, rz: 0.15, weight: 0.04 },
    { label: 'rshoulder',center: [0.55, 2.5, 0],  rx: 0.15, ry: 0.15, rz: 0.15, weight: 0.04 },
    { label: 'larm',    center: [-0.75, 1.9, 0], rx: 0.1,  ry: 0.55, rz: 0.1,  weight: 0.09 },
    { label: 'rarm',    center: [ 0.75, 1.9, 0], rx: 0.1,  ry: 0.55, rz: 0.1,  weight: 0.09 },
    { label: 'lhand',   center: [-0.75, 1.2, 0], rx: 0.12, ry: 0.12, rz: 0.12, weight: 0.04 },
    { label: 'rhand',   center: [ 0.75, 1.2, 0], rx: 0.12, ry: 0.12, rz: 0.12, weight: 0.04 },
    { label: 'hips',    center: [0, 1.1, 0],  rx: 0.32, ry: 0.28, rz: 0.18, weight: 0.1 },
    { label: 'lleg',    center: [-0.22, 0.4, 0], rx: 0.12, ry: 0.65, rz: 0.12, weight: 0.09 },
    { label: 'rleg',    center: [ 0.22, 0.4, 0], rx: 0.12, ry: 0.65, rz: 0.12, weight: 0.09 },
  ];

  // Normalize weights
  const totalW = bodyParts.reduce((s, p) => s + p.weight, 0);
  let idx = 0;
  for (const part of bodyParts) {
    const n = Math.round((part.weight / totalW) * count);
    for (let i = 0; i < n && idx < count; i++, idx++) {
      const i3 = idx * 3;
      pos[i3]     = part.center[0] + (Math.random() - 0.5) * 2 * part.rx;
      pos[i3 + 1] = part.center[1] + (Math.random() - 0.5) * 2 * part.ry;
      pos[i3 + 2] = part.center[2] + (Math.random() - 0.5) * 2 * part.rz;
    }
  }

  // Offset so feet are at y=0
  return pos;
}

function buildConstellationEdges(positions, edgeCount) {
  const verts = [];
  const usedPairs = new Set();

  // Connect nearby particles
  for (let e = 0; e < edgeCount * 3; e++) {
    const a = Math.floor(Math.random() * (positions.length / 3));
    const b = Math.floor(Math.random() * (positions.length / 3));
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (a === b || usedPairs.has(key)) continue;

    const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
    const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2];
    const dist = Math.sqrt((ax-bx)**2 + (ay-by)**2 + (az-bz)**2);
    if (dist > 0.9) continue;

    usedPairs.add(key);
    verts.push(ax, ay, az, bx, by, bz);
    if (verts.length / 6 >= edgeCount) break;
  }

  return new Float32Array(verts);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
