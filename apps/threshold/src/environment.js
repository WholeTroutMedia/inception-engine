/**
 * environment.js — The Threshold spatial atmosphere
 * Dark glass floor, ambient star field, drifting mist particles,
 * distant horizon glow.
 */

import * as THREE from 'three';

export function createEnvironment(scene) {
  // ─── Floor ────────────────────────────────────────────────────────────────
  const floorGeo = new THREE.PlaneGeometry(80, 80, 40, 40);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x050010,
    roughness: 0.05,
    metalness: 0.95,
    envMapIntensity: 0.5,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  scene.add(floor);

  // Floor grid overlay
  const gridHelper = new THREE.GridHelper(80, 60, 0x0A0028, 0x0A0028);
  gridHelper.position.y = 0.001;
  scene.add(gridHelper);

  // ─── Ambient star field ───────────────────────────────────────────────────
  const starCount = 800;
  const starGeo   = new THREE.BufferGeometry();
  const starPos   = new Float32Array(starCount * 3);
  const starSize  = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 60 + Math.random() * 30;
    starPos[i*3]     = r * Math.sin(phi) * Math.cos(theta);
    starPos[i*3 + 1] = Math.abs(r * Math.cos(phi));
    starPos[i*3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    starSize[i]       = 0.03 + Math.random() * 0.08;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('size',     new THREE.BufferAttribute(starSize, 1));

  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float size;
      uniform float uTime;
      void main() {
        vec4 mvp = modelViewMatrix * vec4(position, 1.0);
        float twinkle = 0.7 + 0.3 * sin(uTime * 1.5 + position.x * 3.7 + position.z * 2.1);
        gl_PointSize = size * (200.0 / -mvp.z) * twinkle;
        gl_Position  = projectionMatrix * mvp;
      }
    `,
    fragmentShader: `
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float r = dot(uv, uv);
        if (r > 0.25) discard;
        float a = (1.0 - r * 4.0) * 0.6;
        gl_FragColor = vec4(0.75, 0.85, 1.0, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // ─── Mist / volumetric particles ─────────────────────────────────────────
  const mistCount = 120;
  const mistGeo   = new THREE.BufferGeometry();
  const mistPos   = new Float32Array(mistCount * 3);
  const mistVel   = [];

  for (let i = 0; i < mistCount; i++) {
    mistPos[i*3]     = (Math.random() - 0.5) * 40;
    mistPos[i*3 + 1] = Math.random() * 4 + 0.2;
    mistPos[i*3 + 2] = (Math.random() - 0.5) * 40 - 5;
    mistVel.push((Math.random() - 0.5) * 0.004, (Math.random() - 0.5) * 0.001, (Math.random() - 0.5) * 0.004);
  }

  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));

  const mistMat = new THREE.PointsMaterial({
    color: 0x1A0A3A,
    size: 1.8,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const mist = new THREE.Points(mistGeo, mistMat);
  scene.add(mist);

  // ─── Horizon glow plane ───────────────────────────────────────────────────
  const horizonGeo = new THREE.PlaneGeometry(120, 8);
  const horizonMat = new THREE.MeshBasicMaterial({
    color: 0x090020,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const horizon = new THREE.Mesh(horizonGeo, horizonMat);
  horizon.position.set(0, 2, -40);
  scene.add(horizon);

  // Subtle teal line at base of horizon
  const horizonLineGeo = new THREE.PlaneGeometry(120, 0.04);
  const horizonLineMat = new THREE.MeshBasicMaterial({
    color: 0x001F2E,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const horizonLine = new THREE.Mesh(horizonLineGeo, horizonLineMat);
  horizonLine.position.set(0, 0.02, -40);
  scene.add(horizonLine);

  const mistPosAttr = mistGeo.attributes.position;

  return {
    update(elapsed) {
      starMat.uniforms.uTime.value = elapsed;
      stars.rotation.y = elapsed * 0.002;

      // Drift mist
      for (let i = 0; i < mistCount; i++) {
        mistPosAttr.array[i*3]     += mistVel[i*3];
        mistPosAttr.array[i*3 + 1] += mistVel[i*3 + 1];
        mistPosAttr.array[i*3 + 2] += mistVel[i*3 + 2];

        // Wrap bounds
        if (Math.abs(mistPosAttr.array[i*3])     > 20) mistVel[i*3]     *= -1;
        if (mistPosAttr.array[i*3 + 1] > 5 || mistPosAttr.array[i*3 + 1] < 0.1) mistVel[i*3 + 1] *= -1;
        if (Math.abs(mistPosAttr.array[i*3 + 2] + 5) > 22) mistVel[i*3 + 2] *= -1;
      }
      mistPosAttr.needsUpdate = true;
    },
  };
}
