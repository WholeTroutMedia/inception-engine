import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  /** Speaker label, if diarization is enabled */
  speaker?: string;
}

export interface TranscriberOptions {
  /**
   * Whisper model to use. Defaults to 'base.en'.
   * Available: tiny, tiny.en, base, base.en, small, small.en, medium, large-v3
   */
  model?: string;
  /** Path to whisper.cpp main binary. Defaults to `whisper-cpp` */
  whisperBin?: string;
  /** Path to whisper models directory. Defaults to `/models/whisper` */
  modelsDir?: string;
  /** Language code (e.g. 'en', 'es'). Defaults to 'en' */
  language?: string;
  /** Set to true to include word-level timestamps */
  wordTimestamps?: boolean;
  /** Number of threads for whisper. Defaults to 4 */
  threads?: number;
}

// ─── Transcriber ────────────────────────────────────────────────────────────

export class Transcriber {
  private model: string;
  private whisperBin: string;
  private modelsDir: string;
  private language: string;
  private wordTimestamps: boolean;
  private threads: number;

  constructor(options: TranscriberOptions = {}) {
    this.model = options.model ?? 'base.en';
    this.whisperBin = options.whisperBin ?? 'whisper-cpp';
    this.modelsDir = options.modelsDir ?? '/models/whisper';
    this.language = options.language ?? 'en';
    this.wordTimestamps = options.wordTimestamps ?? false;
    this.threads = options.threads ?? 4;
  }

  /**
   * Transcribes an audio file using whisper.cpp.
   * Returns an array of timed transcript segments.
   */
  async transcribe(audioPath: string): Promise<TranscriptSegment[]> {
    if (!fs.existsSync(audioPath)) {
      throw new Error(`[FoleyEngine] Source file not found: ${audioPath}`);
    }

    const modelPath = path.join(this.modelsDir, `ggml-${this.model}.bin`);
    if (!fs.existsSync(modelPath)) {
      throw new Error(
        `[FoleyEngine] Whisper model not found: ${modelPath}. ` +
        `Download with: bash models/download-ggml-model.sh ${this.model}`
      );
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foley-transcribe-'));
    const outputBase = path.join(tmpDir, 'transcript');

    try {
      await this._runWhisper(audioPath, modelPath, outputBase);
      const srtPath = `${outputBase}.srt`;

      if (!fs.existsSync(srtPath)) {
        throw new Error(`[FoleyEngine] Whisper did not produce SRT output at ${srtPath}`);
      }

      const srtContent = fs.readFileSync(srtPath, 'utf8');
      return this._parseSRT(srtContent);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ── whisper.cpp runner ─────────────────────────────────────────────────────

  private _runWhisper(audioPath: string, modelPath: string, outputBase: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args: string[] = [
        '-m', modelPath,
        '-f', audioPath,
        '-l', this.language,
        '-t', String(this.threads),
        '-osrt',                 // output SRT
        '-of', outputBase,       // output file base
      ];

      if (this.wordTimestamps) {
        args.push('-ml', '1');   // max segment length = 1 word
      }

      const proc = spawn(this.whisperBin, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';
      proc.stderr.setEncoding('utf8');
      proc.stderr.on('data', (d: string) => { stderr += d; });

      proc.on('error', (err) => {
        reject(new Error(
          `[FoleyEngine] whisper-cpp not found: ${err.message}. ` +
          `Build from source: https://github.com/ggerganov/whisper.cpp`
        ));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`whisper-cpp exited with code ${code}: ${stderr.slice(0, 300)}`));
        }
      });
    });
  }

  // ── SRT parser ────────────────────────────────────────────────────────────

  private _parseSRT(srt: string): TranscriptSegment[] {
    const blocks = srt.trim().split(/\n\n+/);
    const segments: TranscriptSegment[] = [];

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 3) continue;

      // Line 0: sequence number (skip)
      // Line 1: timestamp  "00:00:01,000 --> 00:00:03,500"
      const timestampLine = lines[1];
      const match = timestampLine.match(
        /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
      );
      if (!match) continue;

      const [, h1, m1, s1, ms1, h2, m2, s2, ms2] = match;
      const start = this._toSeconds(h1, m1, s1, ms1);
      const end = this._toSeconds(h2, m2, s2, ms2);

      // Lines 2+: text content
      const text = lines.slice(2).join(' ').trim();
      if (!text) continue;

      segments.push({ start, end, text });
    }

    return segments;
  }

  private _toSeconds(h: string, m: string, s: string, ms: string): number {
    return (
      parseInt(h) * 3600 +
      parseInt(m) * 60 +
      parseInt(s) +
      parseInt(ms) / 1000
    );
  }
}
