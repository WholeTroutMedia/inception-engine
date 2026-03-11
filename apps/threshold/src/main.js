/**
 * main.js — The Threshold · Entry point
 * Three.js WebXR scene: COMET, pillars, environment, voice, NEXUS bridge
 * + OrbitControls (desktop mouse/touch) + sensor immersion (mic/cam/gyro)
 */

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCOMET } from './comet.js';
import { createPillars } from './pillars.js';
import { createEnvironment } from './environment.js';
import { initVoice } from './voice.js';
import { initNexus } from './nexus.js';
import { initDashboard } from './dashboard.js';
import { initSensors } from './sensors.js';

// ─── Renderer ────────────────────────────────────────────────────────────────
const canvas = document.getElementById('threshold-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x09001A, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x09001A, 0.018);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.6, 8);
camera.lookAt(0, 1.6, 0);

function syncSize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
syncSize();
window.addEventListener('resize', syncSize);

// ─── WebXR VR Button ─────────────────────────────────────────────────────────
const vrButton = VRButton.createButton(renderer);
vrButton.style.display = 'none';
document.body.appendChild(vrButton);

if (navigator.xr) {
  navigator.xr.isSessionSupported('immersive-vr').then(supported => {
    if (supported) {
      const ourBtn = document.getElementById('vr-btn');
      ourBtn?.classList.add('available');
      ourBtn?.addEventListener('click', () => vrButton.click());
    }
  });
}

// ─── OrbitControls (desktop mouse / touch drag) ───────────────────────────────
const controls = new OrbitControls(camera, canvas);
controls.enableDamping   = true;
controls.dampingFactor   = 0.06;
controls.rotateSpeed     = 0.4;
controls.zoomSpeed       = 0.6;
controls.panSpeed        = 0.3;
controls.minDistance     = 2;
controls.maxDistance     = 22;
controls.maxPolarAngle   = Math.PI * 0.72; // don't go below floor
controls.target.set(0, 1.6, 0);
controls.enabled         = false; // enable after entry

// ─── Lighting ────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x0A0020, 3);
scene.add(ambientLight);

const athenaLight = new THREE.PointLight(0xC9A050, 2, 30);
athenaLight.position.set(-8, 4, -12);
scene.add(athenaLight);

const veraLight = new THREE.PointLight(0x00E5FF, 2, 30);
veraLight.position.set(8, 4, -12);
scene.add(veraLight);

const irisLight = new THREE.PointLight(0x9B59B6, 2, 30);
irisLight.position.set(0, 4, -20);
scene.add(irisLight);

const centerGlow = new THREE.PointLight(0x7FFFD4, 2, 20);
centerGlow.position.set(0, 2, 0);
scene.add(centerGlow);

// ─── Build the world ─────────────────────────────────────────────────────────
const env     = createEnvironment(scene);
const comet   = createCOMET(scene);
const pillars = createPillars(scene);

// ─── State ───────────────────────────────────────────────────────────────────
let entered  = false;
const clock  = new THREE.Clock();

// ─── Sensor state ────────────────────────────────────────────────────────────
let audioLevel  = 0;  // 0-1 mic amplitude
let bassLevel   = 0;
let faceX       = 0;  // -1 to 1
let faceY       = 0;
let facePresent = false;
let gyroYaw     = 0;  // device yaw offset
let gyroPitch   = 0;
let gyroActive  = false;
let baseAlpha   = null; // gyro calibration

const sensors = initSensors({
  onAudio({ level, bass }) {
    audioLevel = level;
    bassLevel  = bass;
  },
  onPresence({ present, x, y }) {
    facePresent = present;
    faceX = x;
    faceY = y;
  },
  onOrientation({ alpha, beta, gamma }) {
    if (baseAlpha === null) baseAlpha = alpha;
    gyroYaw   = ((alpha - baseAlpha + 360) % 360) * (Math.PI / 180);
    gyroPitch = beta * (Math.PI / 180);
    gyroActive = true;
  },
});

// ─── Services ────────────────────────────────────────────────────────────────
const nexus = initNexus();
const dash  = initDashboard(nexus);
initVoice({ comet, dash, nexus });

// ─── Entry ───────────────────────────────────────────────────────────────────
document.getElementById('loading').classList.add('done');

const enterBtn       = document.getElementById('enter-btn');
const arrivalOverlay = document.getElementById('arrival-overlay');
const hud            = document.getElementById('hud');

enterBtn.addEventListener('click', () => {
  entered = true;
  syncSize();
  arrivalOverlay.classList.add('hidden');
  controls.enabled = true;
  sensors.start(); // must be called directly in click handler (user gesture) for AudioContext

  setTimeout(() => {
    hud.classList.add('active');
    comet.beginAssembly();
  }, 1000);
});

// ─── Raycaster ───────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();
let lastHovered = null;

window.addEventListener('pointermove', e => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('click', () => {
  if (!entered || controls.enabled) return; // let orbit handle drag-click
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pillars.getInteractables(), true);
  if (hits.length > 0) {
    const agent = hits[0].object.userData.agent;
    if (agent) {
      comet.speak(`You're approaching ${agent}. ${getAgentBrief(agent)}`);
      pillars.activatePillar(agent);
    }
  }
});

function getAgentBrief(agent) {
  const briefs = {
    ATHENA: 'She holds the strategy. Speak a plan and she will map it.',
    VERA:   'She keeps the truth. Memory, facts, and what was said before.',
    IRIS:   'She acts. Give her a direction and the thing gets built.',
  };
  return briefs[agent] || '';
}

// ─── Render loop ─────────────────────────────────────────────────────────────
let frameCount = 0;

renderer.setAnimationLoop(() => {
  const delta   = clock.getDelta();
  const elapsed = clock.elapsedTime;
  frameCount++;

  if (!entered) {
    renderer.render(scene, camera);
    return;
  }

  // ── Orbit controls update ──
  if (!renderer.xr.isPresenting) {
    controls.update();
  }

  // ── Gyroscope camera override (when active) ──
  if (gyroActive && !renderer.xr.isPresenting) {
    // Blend gyro with orbit: gentle lerp so it doesn't fight controls
    const targetY = -gyroYaw * 0.4;
    const targetX = (gyroPitch - Math.PI / 4) * 0.3;
    controls.target.x = THREE.MathUtils.lerp(controls.target.x, targetY, 0.05);
    controls.target.y = THREE.MathUtils.lerp(controls.target.y, 1.6 + targetX, 0.05);
  }

  // ── Face tracking: COMET watches you ──
  if (facePresent) {
    // Softly offset COMET's position toward where your face is
    comet.setFaceTarget(faceX * 0.6, -faceY * 0.4);
  }

  // ── Audio reactive: particles + pillars pulse with sound ──
  const audioPulse = 1 + audioLevel * 2.5;  // scale factor
  const bassPulse  = bassLevel * 3.0;
  comet.setAudioLevel(audioLevel, bassLevel);
  pillars.setAudioLevel(audioLevel, bassLevel);
  centerGlow.intensity = 2 + bassPulse + Math.sin(elapsed * 0.7) * 0.2;

  // ── Hover detection ──
  if (frameCount % 3 === 0) {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pillars.getInteractables(), true);
    const nowHovered = hits.length > 0 ? hits[0].object.userData.agent : null;
    if (nowHovered !== lastHovered) {
      if (lastHovered) pillars.unhoverPillar(lastHovered);
      if (nowHovered)  pillars.hoverPillar(nowHovered);
      lastHovered = nowHovered;
    }
  }

  env.update(elapsed, audioLevel);
  comet.update(elapsed, delta);
  pillars.update(elapsed);

  renderer.render(scene, camera);
});
