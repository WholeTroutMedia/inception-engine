/**
 * @inception/live-animate — WebcamPoseAdapter
 *
 * Treats your webcam as a first-class OMNIBUS data source.
 *
 * MediaPipe Pose runs in the browser at up to 30fps, extracts 33 body
 * landmarks, normalizes each to an InceptionEvent with vertical: 'custom',
 * and feeds them directly into LiveAnimateEngine → PlayerTracker →
 * AnimationRenderer — the exact same pipeline as NBA players and F1 cars.
 *
 * Usage (browser only):
 *   const adapter = new WebcamPoseAdapter({ maxFps: 30 });
 *   const engine = new LiveAnimateEngine({ adapter, canvas, style: 'neon' });
 *   await engine.start();
 *
 * The adapter expects MediaPipe Pose to be loaded via CDN in the browser:
 *   <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"></script>
 *   <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
 */

import { OmnibusAdapter } from '../omnibus/adapter.js';
import { makeEvent } from '../types/inception-event.js';
import type { InceptionEvent } from '../types/inception-event.js';

// ─── MediaPipe type shims (loaded via CDN, not npm) ──────────────────────────

export interface MPLandmark {
  x: number;      // 0-1 normalized to frame width
  y: number;      // 0-1 normalized to frame height
  z: number;      // depth (relative to hip)
  visibility?: number;  // 0-1 confidence
}

export interface MPPoseResults {
  poseLandmarks: MPLandmark[] | null;
  worldLandmarks?: MPLandmark[] | null;
  image?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
}

// MediaPipe 33 landmark names — index matches the array position
export const POSE_LANDMARK_NAMES: Record<number, string> = {
  0: 'nose', 1: 'left_eye_inner', 2: 'left_eye', 3: 'left_eye_outer',
  4: 'right_eye_inner', 5: 'right_eye', 6: 'right_eye_outer',
  7: 'left_ear', 8: 'right_ear', 9: 'mouth_left', 10: 'mouth_right',
  11: 'left_shoulder', 12: 'right_shoulder', 13: 'left_elbow', 14: 'right_elbow',
  15: 'left_wrist', 16: 'right_wrist', 17: 'left_pinky', 18: 'right_pinky',
  19: 'left_index', 20: 'right_index', 21: 'left_thumb', 22: 'right_thumb',
  23: 'left_hip', 24: 'right_hip', 25: 'left_knee', 26: 'right_knee',
  27: 'left_ankle', 28: 'right_ankle', 29: 'left_heel', 30: 'right_heel',
  31: 'left_foot_index', 32: 'right_foot_index',
};

// Group landmarks by body region → drives color in SkeletonRenderer
export const LANDMARK_GROUP: Record<number, string> = {
  0: 'face', 1: 'face', 2: 'face', 3: 'face', 4: 'face', 5: 'face',
  6: 'face', 7: 'face', 8: 'face', 9: 'face', 10: 'face',
  11: 'torso', 12: 'torso', 23: 'torso', 24: 'torso',
  13: 'arms', 14: 'arms', 15: 'arms', 16: 'arms',
  17: 'arms', 18: 'arms', 19: 'arms', 20: 'arms', 21: 'arms', 22: 'arms',
  25: 'legs', 26: 'legs', 27: 'legs', 28: 'legs',
  29: 'legs', 30: 'legs', 31: 'legs', 32: 'legs',
};

// MediaPipe Pose connections (pairs of landmark indices to draw skeleton lines)
export const POSE_CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],
  [9,10],[11,12],[11,13],[13,15],[15,17],[15,19],[15,21],
  [12,14],[14,16],[16,18],[16,20],[16,22],
  [11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28],
  [27,29],[28,30],[29,31],[30,32],
];

// ─── Adapter Config ───────────────────────────────────────────────────────────

export interface WebcamPoseAdapterConfig {
  /** Webcam device ID — omit for default camera */
  deviceId?: string;
  /** Max pose detection FPS (default: 30) */
  maxFps?: number;
  /** Min landmark visibility to emit (0-1, default: 0.3) */
  minVisibility?: number;
  /** Session identifier — shows in payload for multi-user tracking */
  sessionId?: string;
  /** Verbose logging */
  verbose?: boolean;
}

// ─── WebcamPoseAdapter ────────────────────────────────────────────────────────

export class WebcamPoseAdapter extends OmnibusAdapter {
  private readonly camConfig: Required<WebcamPoseAdapterConfig>;
  private videoEl: HTMLVideoElement | null = null;
  private mpCamera: unknown = null;  // MediaPipe Camera (CDN-loaded)
  private frameId = 0;
  private stream: MediaStream | null = null;

  constructor(config: WebcamPoseAdapterConfig = {}) {
    super({
      vertical: 'custom',
      maxFps: config.maxFps ?? 30,
      autoReconnect: true,
      verbose: config.verbose ?? false,
    });
    this.camConfig = {
      deviceId: config.deviceId ?? '',
      maxFps: config.maxFps ?? 30,
      minVisibility: config.minVisibility ?? 0.3,
      sessionId: config.sessionId ?? `session-${Date.now()}`,
      verbose: config.verbose ?? false,
    };
  }

  // ─── OmnibusAdapter Interface ───────────────────────────────────────────────

  protected async connect(): Promise<void> {
    // Validate we're in a browser
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      throw new Error('[webcam-pose] WebcamPoseAdapter requires a browser environment');
    }

    // Check MediaPipe is loaded via CDN
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!win.Pose) {
      throw new Error(
        '[webcam-pose] MediaPipe Pose not found. ' +
        'Load it via: <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"></script>'
      );
    }
    if (!win.Camera) {
      throw new Error(
        '[webcam-pose] MediaPipe Camera not found. ' +
        'Load via: <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>'
      );
    }

    // Create video element
    this.videoEl = document.createElement('video');
    this.videoEl.style.display = 'none';
    this.videoEl.setAttribute('playsinline', 'true');
    document.body.appendChild(this.videoEl);

    // Open webcam
    const constraints: MediaStreamConstraints = {
      video: this.camConfig.deviceId
        ? { deviceId: { exact: this.camConfig.deviceId }, width: 1280, height: 720 }
        : { width: 1280, height: 720, facingMode: 'user' },
    };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.videoEl.srcObject = this.stream;
    await this.videoEl.play();

    // Init MediaPipe Pose
    const pose = new win.Pose({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({
      modelComplexity: 1,         // 0=lite, 1=full, 2=heavy
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    pose.onResults((results: MPPoseResults) => this.onPoseResults(results));

    // Start camera loop
    this.mpCamera = new win.Camera(this.videoEl, {
      onFrame: async () => {
        if (this.running) await pose.send({ image: this.videoEl });
      },
      width: 1280,
      height: 720,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.mpCamera as any).start();
    console.log('[webcam-pose] ✅ Webcam live — MediaPipe Pose active');
  }

  protected async disconnect(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.mpCamera as any)?.stop?.();
    this.mpCamera = null;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.videoEl?.remove();
    this.videoEl = null;
    console.log('[webcam-pose] ⏹️  Webcam stopped');
  }

  // ─── Pose → InceptionEvent ─────────────────────────────────────────────────

  /**
   * Called by MediaPipe on each frame.
   * Emits one InceptionEvent per visible landmark, at the adapter's rate limit.
   */
  public onPoseResults(results: MPPoseResults): void {
    if (!results.poseLandmarks || !this.running) return;

    this.frameId++;
    const now = new Date().toISOString();

    for (let i = 0; i < results.poseLandmarks.length; i++) {
      const lm = results.poseLandmarks[i];
      const visibility = lm.visibility ?? 1;

      // Drop low-confidence landmarks
      if (visibility < this.camConfig.minVisibility) continue;

      const name = POSE_LANDMARK_NAMES[i] ?? `landmark_${i}`;
      const group = LANDMARK_GROUP[i] ?? 'body';

      const event: InceptionEvent = makeEvent({
        vertical: 'custom',
        type: 'webcam.pose',
        source: 'webcam-pose-adapter',
        eventTime: now,
        entityId: `${this.camConfig.sessionId}:${name}`,
        entityName: name.replace(/_/g, ' '),
        groupId: group,
        normalizedPosition: {
          x: Math.max(0, Math.min(1, lm.x)),
          y: Math.max(0, Math.min(1, lm.y)),
          z: lm.z,
        },
        confidence: visibility,
        payload: {
          poseType: 'mediapipe-33',
          landmarkIndex: i,
          landmarkName: name,
          frameId: this.frameId,
          sessionId: this.camConfig.sessionId,
          rawLandmark: { x: lm.x, y: lm.y, z: lm.z, visibility },
        },
      });

      this.emitEvent(event);
    }
  }

  /** Returns the live video element (for compositing in the studio) */
  public getVideoElement(): HTMLVideoElement | null {
    return this.videoEl;
  }
}
