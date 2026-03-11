/**
 * sensors.js — Two-way sensor immersion for The Threshold
 * Enumerates all devices, shows a picker, then streams mic + cam.
 */

// ─── Device picker UI ─────────────────────────────────────────────────────────
async function buildDevicePicker() {
  // First request blank permission so labels are revealed
  try {
    const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    tempStream.getTracks().forEach(t => t.stop());
  } catch {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      tempStream.getTracks().forEach(t => t.stop());
    } catch {}
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const mics  = devices.filter(d => d.kind === 'audioinput');
  const cams  = devices.filter(d => d.kind === 'videoinput');

  return { mics, cams };
}

function makePicker(mics, cams, onStart) {
  const el = document.createElement('div');
  el.id = 'sensor-picker';
  el.style.cssText = `
    position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
    background: rgba(5,0,20,0.92); border: 1px solid rgba(127,255,212,0.2);
    border-radius: 12px; padding: 20px 28px; z-index: 200;
    font-family: Inter, sans-serif; color: rgba(255,255,255,0.8);
    display: flex; flex-direction: column; gap: 14px; min-width: 320px;
    backdrop-filter: blur(12px);
  `;

  const label = (text) => {
    const l = document.createElement('div');
    l.style.cssText = 'font-size:10px;letter-spacing:.25em;color:rgba(127,255,212,0.6);margin-bottom:4px;';
    l.textContent = text;
    return l;
  };

  const select = (items, kind) => {
    const s = document.createElement('select');
    s.style.cssText = `
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
      color: #fff; padding: 7px 10px; border-radius: 6px; font-size: 12px;
      font-family: Inter, sans-serif; width: 100%; cursor: pointer;
    `;
    if (items.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = `No ${kind} found`;
      s.appendChild(opt);
      s.disabled = true;
    } else {
      items.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.deviceId;
        opt.textContent = d.label || `${kind} (${d.deviceId.slice(0,6)})`;
        s.appendChild(opt);
      });
    }
    return s;
  };

  const micWrap = document.createElement('div');
  micWrap.appendChild(label('MICROPHONE'));
  const micSel = select(mics, 'mic');
  micWrap.appendChild(micSel);

  const camWrap = document.createElement('div');
  camWrap.appendChild(label('CAMERA'));
  const camSel = select(cams, 'camera');
  camWrap.appendChild(camSel);

  const btn = document.createElement('button');
  btn.textContent = 'ACTIVATE SENSORS';
  btn.style.cssText = `
    border: 1px solid rgba(127,255,212,0.5); background: transparent;
    color: rgba(127,255,212,0.9); padding: 10px 0; border-radius: 6px;
    font-family: Inter, sans-serif; font-size: 11px; letter-spacing: .2em;
    cursor: pointer; transition: all .2s;
    margin-top: 4px;
  `;
  btn.onmouseenter = () => btn.style.background = 'rgba(127,255,212,0.1)';
  btn.onmouseleave = () => btn.style.background = 'transparent';

  const skipBtn = document.createElement('button');
  skipBtn.textContent = 'SKIP';
  skipBtn.style.cssText = `
    border: none; background: none; color: rgba(255,255,255,0.2);
    font-family: Inter, sans-serif; font-size: 10px; letter-spacing: .15em;
    cursor: pointer; padding: 4px 0;
  `;

  el.appendChild(micWrap);
  el.appendChild(camWrap);
  el.appendChild(btn);
  el.appendChild(skipBtn);
  document.body.appendChild(el);

  return new Promise(resolve => {
    btn.onclick = () => {
      el.remove();
      resolve({
        micId: micSel.disabled ? null : micSel.value,
        camId: camSel.disabled ? null : camSel.value,
      });
    };
    skipBtn.onclick = () => {
      el.remove();
      resolve({ micId: null, camId: null });
    };
  });
}

// ─── Core sensor init ─────────────────────────────────────────────────────────
export function initSensors({ onAudio, onPresence, onOrientation }) {
  const state = {
    audioLevel: 0,
    bassLevel:  0,
    faceX: 0, faceY: 0,
    facePresent: false,
    micActive: false,
    camActive: false,
    gyroActive: false,
  };

  // ─── Mic ────────────────────────────────────────────────────────────────
  async function startMic(deviceId) {
    try {
      const constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const ctx    = new (window.AudioContext || window.webkitAudioContext)();
      await ctx.resume();
      const source  = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      const bufLen  = analyser.frequencyBinCount;
      const dataArr = new Uint8Array(bufLen);
      state.micActive = true;
      console.log('[SENSORS] Mic active:', stream.getAudioTracks()[0]?.label);

      function tick() {
        analyser.getByteFrequencyData(dataArr);
        let sumSq = 0;
        for (let i = 0; i < bufLen; i++) sumSq += (dataArr[i] / 255) ** 2;
        state.audioLevel = Math.sqrt(sumSq / bufLen);

        const bassEnd = Math.floor(bufLen * 0.1);
        let bassSum = 0;
        for (let i = 0; i < bassEnd; i++) bassSum += dataArr[i] / 255;
        state.bassLevel = bassSum / bassEnd;

        onAudio?.({ level: state.audioLevel, bass: state.bassLevel });
        requestAnimationFrame(tick);
      }
      tick();
      updateBadges();
    } catch (e) {
      console.warn('[SENSORS] Mic failed:', e.message);
    }
  }

  // ─── Cam ────────────────────────────────────────────────────────────────
  async function startCam(deviceId) {
    try {
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 320 }, height: { ideal: 240 } }
          : { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const video  = document.createElement('video');
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = 160; canvas.height = 120;
      const ctx    = canvas.getContext('2d');
      let prevData = null;
      let smoothX  = 0, smoothY = 0;
      state.camActive = true;
      console.log('[SENSORS] Cam active:', stream.getVideoTracks()[0]?.label);

      function analyze() {
        ctx.drawImage(video, 0, 0, 160, 120);
        const frame = ctx.getImageData(0, 0, 160, 120);
        const curr  = frame.data;

        if (prevData) {
          let motionSum = 0, motionX = 0, motionY = 0;
          for (let y = 0; y < 120; y++) {
            for (let x = 0; x < 160; x++) {
              const i    = (y * 160 + x) * 4;
              const diff = Math.abs(curr[i]   - prevData[i]) +
                           Math.abs(curr[i+1] - prevData[i+1]) +
                           Math.abs(curr[i+2] - prevData[i+2]);
              if (diff > 20) {
                motionSum++;
                motionX += (160 - x) / 160;
                motionY += y / 120;
              }
            }
          }
          state.facePresent = motionSum > 160 * 120 * 0.01;
          if (state.facePresent && motionSum > 0) {
            smoothX = smoothX * 0.85 + (motionX / motionSum * 2 - 1) * 0.15;
            smoothY = smoothY * 0.85 + (motionY / motionSum * 2 - 1) * 0.15;
            state.faceX = smoothX;
            state.faceY = smoothY;
          }
          onPresence?.({ present: state.facePresent, x: state.faceX, y: state.faceY });
        }
        prevData = new Uint8Array(curr);
        setTimeout(analyze, 100);
      }
      analyze();
      updateBadges();
    } catch (e) {
      console.warn('[SENSORS] Cam failed:', e.message);
    }
  }

  // ─── Gyro ───────────────────────────────────────────────────────────────
  function startGyro() {
    if (!window.DeviceOrientationEvent) return;
    const requestPerm = DeviceOrientationEvent.requestPermission;
    if (typeof requestPerm === 'function') {
      requestPerm().then(p => { if (p === 'granted') listenGyro(); }).catch(() => {});
    } else {
      listenGyro();
    }
  }

  let _baseAlpha = null;
  function listenGyro() {
    window.addEventListener('deviceorientation', e => {
      if (e.alpha === null) return;
      if (_baseAlpha === null) _baseAlpha = e.alpha;
      state.gyroActive = true;
      onOrientation?.({
        alpha: e.alpha ?? 0,
        beta:  e.beta  ?? 0,
        gamma: e.gamma ?? 0,
        baseAlpha: _baseAlpha,
      });
    }, { passive: true });
    updateBadges();
  }

  // ─── Sensor badges ──────────────────────────────────────────────────────
  function updateBadges() {
    let el = document.getElementById('sensor-badges');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sensor-badges';
      el.style.cssText = `
        position: fixed; bottom: 32px; right: 32px;
        display: flex; flex-direction: column; gap: 6px;
        pointer-events: none; z-index: 55;
      `;
      document.body.appendChild(el);
    }
    el.innerHTML = [
      { key: 'micActive',  label: 'MIC',  color: '#7FFFD4' },
      { key: 'camActive',  label: 'CAM',  color: '#00E5FF' },
      { key: 'gyroActive', label: 'GYRO', color: '#C9A050' },
    ].filter(s => state[s.key]).map(s => `
      <div style="display:flex;align-items:center;gap:8px;
        font-family:Inter,sans-serif;font-size:9px;letter-spacing:.3em;
        text-transform:uppercase;color:rgba(255,255,255,0.35);">
        <div style="width:5px;height:5px;border-radius:50%;
          background:${s.color};box-shadow:0 0 6px ${s.color}"></div>${s.label}
      </div>
    `).join('');
  }

  // ─── Public API ─────────────────────────────────────────────────────────
  return {
    async start() {
      startGyro();
      const { mics, cams } = await buildDevicePicker();
      const { micId, camId } = await makePicker(mics, cams, () => {});
      if (micId !== null) await startMic(micId);
      if (camId !== null) await startCam(camId);
    },
    getState: () => state,
  };
}
