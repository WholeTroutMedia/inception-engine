// Somatic Bridge — Maps MetaHumanDNA personality to real-time expression
// @package @brainchild/somatic-bridge v5.0.0
// Latency budget: <50ms (LLM <30ms + inference <15ms + UE5 <1ms + Pixel Streaming <1ms)

import type { MetaHumanDNA, PersonalityParams, EmotionState, EmotionType, SomaticBridgeConfig } from '../genesis/src/types';

export interface ExpressionWeights {
  browInnerUp: number; browDown: number; browOuterUp: number;
  eyeSquint: number; eyeWide: number; eyeLookUp: number; eyeLookDown: number;
  jawOpen: number; jawForward: number;
  mouthSmile: number; mouthFrown: number; mouthPucker: number; mouthPress: number;
  cheekPuff: number; cheekSquint: number;
  noseSneer: number;
  tongueOut: number;
}

export interface Audio2FacePayload { blendShapes: Record<string, number>; headRotation: { pitch: number; yaw: number; roll: number }; eyeGaze: { x: number; y: number }; timestamp: number; }

export interface SomaticOutput { weights: ExpressionWeights; audio2face: Audio2FacePayload; gesture?: string; breathPhase: number; }

const EMOTION_EXPRESSION_MAP: Record<EmotionType, Partial<ExpressionWeights>> = {
  neutral: { mouthSmile: 0.05, eyeSquint: 0 },
  happy: { mouthSmile: 0.8, cheekSquint: 0.4, eyeSquint: 0.3 },
  sad: { mouthFrown: 0.6, browInnerUp: 0.5, eyeSquint: 0.2 },
  angry: { browDown: 0.7, jawForward: 0.3, mouthPress: 0.4, noseSneer: 0.3 },
  surprised: { eyeWide: 0.8, browOuterUp: 0.7, jawOpen: 0.5 },
  disgusted: { noseSneer: 0.6, mouthFrown: 0.4, browDown: 0.3 },
  fearful: { eyeWide: 0.7, browInnerUp: 0.6, jawOpen: 0.3 },
  contemptuous: { mouthSmile: 0.2, noseSneer: 0.3, browDown: 0.2 },
  excited: { mouthSmile: 0.9, eyeWide: 0.4, browOuterUp: 0.5 },
  thoughtful: { eyeSquint: 0.3, browInnerUp: 0.2, eyeLookUp: 0.4 },
  concerned: { browInnerUp: 0.5, mouthFrown: 0.3, eyeSquint: 0.2 },
  amused: { mouthSmile: 0.6, cheekSquint: 0.3, eyeSquint: 0.4 },
};

export class SomaticBridge {
  private config: SomaticBridgeConfig;
  private breathCycle: number = 0;
  private lastUpdate: number = 0;

  constructor(config: SomaticBridgeConfig) { this.config = config; }

  update(emotion: EmotionState, deltaTime: number): SomaticOutput {
    this.breathCycle = (this.breathCycle + deltaTime * 0.3) % (Math.PI * 2);
    const personality = this.config.overrides ? { ...this.config.dna.personality, ...this.config.overrides } : this.config.dna.personality;
    const baseWeights = this.computeBaseWeights(personality);
    const emotionWeights = this.applyEmotion(baseWeights, emotion);
    const finalWeights = this.applyMicroExpressions(emotionWeights, this.config.dna.motion.microExpressions);
    const audio2face = this.toAudio2Face(finalWeights, emotion);
    const gesture = this.selectGesture(emotion, personality);
    this.lastUpdate = Date.now();
    return { weights: finalWeights, audio2face, gesture, breathPhase: Math.sin(this.breathCycle) * this.config.dna.motion.breathingAmplitude };
  }

  private computeBaseWeights(p: PersonalityParams): ExpressionWeights {
    return { browInnerUp: 0, browDown: 0, browOuterUp: 0, eyeSquint: 0, eyeWide: 0, eyeLookUp: 0, eyeLookDown: 0, jawOpen: 0, jawForward: 0, mouthSmile: p.smileBias, mouthFrown: 0, mouthPucker: 0, mouthPress: 0, cheekPuff: 0, cheekSquint: p.smileBias * 0.3, noseSneer: 0, tongueOut: 0 };
  }

  private applyEmotion(base: ExpressionWeights, emotion: EmotionState): ExpressionWeights {
    const primary = EMOTION_EXPRESSION_MAP[emotion.primary] || {};
    const result = { ...base };
    for (const [key, value] of Object.entries(primary)) { (result as any)[key] = base[key as keyof ExpressionWeights] + (value as number) * emotion.intensity * this.config.dna.personality.expressiveness; }
    if (emotion.secondary) { const secondary = EMOTION_EXPRESSION_MAP[emotion.secondary] || {}; for (const [key, value] of Object.entries(secondary)) { (result as any)[key] += (value as number) * (emotion.secondaryIntensity || 0.3) * 0.5; } }
    return result;
  }

  private applyMicroExpressions(weights: ExpressionWeights, enabled: boolean): ExpressionWeights {
    if (!enabled) return weights;
    const result = { ...weights };
    const jitter = () => (Math.random() - 0.5) * 0.02;
    result.browInnerUp += jitter(); result.eyeSquint += jitter(); result.mouthSmile += jitter();
    return result;
  }

  private toAudio2Face(weights: ExpressionWeights, emotion: EmotionState): Audio2FacePayload {
    const blendShapes: Record<string, number> = {};
    for (const [key, value] of Object.entries(weights)) { blendShapes[`face_${key}`] = Math.max(0, Math.min(1, value)); }
    return { blendShapes, headRotation: { pitch: emotion.valence * 5, yaw: 0, roll: 0 }, eyeGaze: { x: 0, y: this.config.dna.personality.eyeContactStrength * 0.8 }, timestamp: Date.now() };
  }

  private selectGesture(emotion: EmotionState, personality: PersonalityParams): string | undefined {
    if (Math.random() > personality.gestureFrequency) return undefined;
    const gestures: Record<string, string[]> = { happy: ['nod', 'open_palms'], sad: ['head_down'], angry: ['fist'], surprised: ['hands_up'], thoughtful: ['chin_touch', 'head_tilt'], excited: ['wave', 'clap'] };
    const options = gestures[emotion.primary] || ['idle_shift'];
    return options[Math.floor(Math.random() * options.length)];
  }
}

export function createBridge(dna: MetaHumanDNA, initialEmotion?: EmotionState): SomaticBridge {
  const emotion = initialEmotion || { primary: 'neutral', intensity: 0.5, valence: 0, arousal: 0.3 };
  return new SomaticBridge({ dna, emotionState: emotion });
}