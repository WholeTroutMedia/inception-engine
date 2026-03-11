/**
 * @inception/sensor-mesh — VisionNode
 *
 * Tier 2 — THE CINEMATOGRAPHER
 *
 * Captures frames from any video source (Sony A1 II RTMP, RTSP cameras,
 * webcam) and sends them to Gemini Vision for scene understanding.
 * Emits CinematicContext events that can drive the performance pipeline.
 *
 * Sony A1 II Setup:
 *   Camera Menu → [Network] → [Streaming] → [RTMP]
 *   Set URL: rtmp://{thisIP}:1935/live/a1
 *   Start VisionNode with source: { type: 'rtmp', url: 'rtmp://localhost:1935/live/a1' }
 *
 * The camera sees the room. The system reacts.
 */

import { execFile } from 'child_process';
import { EventEmitter } from 'events';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { z } from 'zod';
import { CaptureSource, CinematicContext, CinematicContextSchema } from './types.js';

// ─── Gemini Vision Response Schema ───────────────────────────────────────────

const GeminiVisionResponseSchema = z.object({
  emotion: z
    .enum(['neutral', 'happy', 'focused', 'intense', 'relaxed', 'surprised', 'unknown'])
    .optional()
    .default('unknown'),
  attention_level: z.number().min(0).max(1).optional(),
  energy: z.number().min(0).max(1).optional(),
  subject_count: z.number().int().min(0).optional(),
  composition: z.string().optional(),
  subject_x: z.number().min(0).max(1).optional(),
  subject_y: z.number().min(0).max(1).optional(),
});

const VISION_PROMPT = `Analyze this camera frame from a performance/studio space. 
Return ONLY valid JSON (no markdown, no explanation) with these fields:
{
  "emotion": "neutral|happy|focused|intense|relaxed|surprised|unknown",
  "attention_level": 0.0-1.0,
  "energy": 0.0-1.0,
  "subject_count": integer,
  "composition": "one sentence describing the composition",
  "subject_x": 0.0-1.0 (horizontal position of primary subject, 0=left, 1=right),
  "subject_y": 0.0-1.0 (vertical position, 0=bottom, 1=top)
}`;

// ─── VisionNode ───────────────────────────────────────────────────────────────

/**
 * VisionNode — the room's intelligence layer.
 *
 * Captures a JPEG frame from any video source every N seconds,
 * sends it to Gemini Vision API, and emits a CinematicContext.
 *
 * @example
 * const node = new VisionNode(
 *   { type: 'rtmp', url: 'rtmp://localhost:1935/live/a1', label: 'sony-a1' },
 *   { geminiApiKey: process.env.GEMINI_API_KEY!, captureIntervalMs: 2000 }
 * );
 * node.on('context', (ctx: CinematicContext) => console.log(ctx));
 * await node.start();
 */
export class VisionNode extends EventEmitter {
  private readonly source: CaptureSource;
  private readonly geminiApiKey: string;
  private readonly captureIntervalMs: number;
  private readonly label: string;
  private intervalRef: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private latestContext: CinematicContext | null = null;
  private captureCount = 0;

  constructor(
    source: CaptureSource,
    options: {
      geminiApiKey: string;
      captureIntervalMs?: number;
    }
  ) {
    super();
    this.source = source;
    this.geminiApiKey = options.geminiApiKey;
    this.captureIntervalMs = options.captureIntervalMs ?? 2000;
    this.label = source.label;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    console.log(`[vision-node:${this.label}] 🎥 Starting — capturing every ${this.captureIntervalMs}ms`);

    // Initial capture immediately
    await this.captureAndAnalyze().catch((err: unknown) => {
      console.warn(`[vision-node:${this.label}] Initial capture failed:`, err);
    });

    this.intervalRef = setInterval(async () => {
      try {
        await this.captureAndAnalyze();
      } catch (err) {
        console.warn(`[vision-node:${this.label}] Capture error:`, err);
      }
    }, this.captureIntervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
    console.log(`[vision-node:${this.label}] ⏹️  Stopped after ${this.captureCount} captures`);
  }

  getLatestContext(): CinematicContext | null {
    return this.latestContext;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async captureAndAnalyze(): Promise<void> {
    const frameFile = join(tmpdir(), `vision-frame-${this.label}-${Date.now()}.jpg`);

    try {
      // Step 1: Extract a single JPEG frame from the video source
      await this.captureFrame(frameFile);

      // Step 2: Read the JPEG and encode as base64
      const { readFileSync } = await import('fs');
      const imageBytes = readFileSync(frameFile).toString('base64');

      // Step 3: Send to Gemini Vision API
      const context = await this.analyzeWithGemini(imageBytes);
      this.latestContext = context;
      this.captureCount++;

      console.log(
        `[vision-node:${this.label}] 👁️  Frame #${this.captureCount} — emotion:${context.subjectEmotion} energy:${(context.sceneEnergy ?? 0).toFixed(2)} subjects:${context.subjectCount ?? 0}`
      );

      this.emit('context', context);
    } finally {
      if (existsSync(frameFile)) unlinkSync(frameFile);
    }
  }

  /**
   * Uses ffmpeg to capture a single frame from the video source.
   * ffmpeg must be installed on the system (available via PATH).
   */
  private async captureFrame(outputPath: string): Promise<void> {
    const sourceUrl = this.getSourceUrl();

    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-i', sourceUrl,
        '-vframes', '1',
        '-q:v', '2',
        '-f', 'image2',
        outputPath,
      ];

      // For RTMP/RTSP, add timeout flags
      if (this.source.type !== 'webcam') {
        args.splice(0, 0, '-timeout', '5000000'); // 5s timeout in microseconds
      }

      execFile('ffmpeg', args, { timeout: 8000 }, (err) => {
        if (err) {
          reject(new Error(`ffmpeg failed: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  private getSourceUrl(): string {
    switch (this.source.type) {
      case 'rtmp':
        return this.source.url;
      case 'rtsp':
        return this.source.url;
      case 'webcam':
        // On Linux/Mac: /dev/video0, on Windows: use DirectShow
        return process.platform === 'win32'
          ? `video=${this.source.deviceIndex}`
          : `/dev/video${this.source.deviceIndex}`;
    }
  }

  /**
   * Send a JPEG frame to Gemini 2.0 Flash Vision and parse the response.
   */
  private async analyzeWithGemini(base64Image: string): Promise<CinematicContext> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`;

    const body = {
      contents: [
        {
          parts: [
            { text: VISION_PROMPT },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Low temp for consistent structured output
        maxOutputTokens: 256,
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Gemini Vision error ${res.status}: ${await res.text()}`);
    }

    interface GeminiApiResponse {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    }
    const data = (await res.json()) as GeminiApiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    // Strip any markdown code fences Gemini might add
    const jsonStr = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = GeminiVisionResponseSchema.safeParse(JSON.parse(jsonStr));

    if (!parsed.success) {
      console.warn(`[vision-node:${this.label}] Vision parse failed, using defaults`);
      return { sourceCamera: this.label, timestamp: Date.now() };
    }

    const d = parsed.data;
    return CinematicContextSchema.parse({
      subjectEmotion: d.emotion,
      subjectPositionX: d.subject_x,
      subjectPositionY: d.subject_y,
      sceneEnergy: d.energy,
      subjectCount: d.subject_count,
      compositionNotes: d.composition,
      sourceCamera: this.label,
      timestamp: Date.now(),
    });
  }
}
