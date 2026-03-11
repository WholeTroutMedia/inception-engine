import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BeatGrid {
  bpm: number;
  /** Beat timestamps in seconds */
  beats: number[];
  /** Downbeat timestamps in seconds (first beat of each bar) */
  downbeats: number[];
  timeSignature: [number, number];
  confidence: number;
}

export interface BeatDetectorOptions {
  /** Beats per bar for downbeat estimation. Defaults to 4 */
  beatsPerBar?: number;
  /** aubio executable path. Defaults to `aubiotrack` */
  aubioBin?: string;
  /** Python binary for librosa fallback. Defaults to `python3` */
  pythonBin?: string;
  /** Onset detection mode: 'default' | 'specflux' | 'hfc'. Defaults to 'specflux' */
  onsetMode?: 'default' | 'specflux' | 'hfc' | 'phase';
}

// ─── BeatDetector ───────────────────────────────────────────────────────────

export class BeatDetector {
  private beatsPerBar: number;
  private aubioBin: string;
  private pythonBin: string;
  private onsetMode: string;

  constructor(options: BeatDetectorOptions = {}) {
    this.beatsPerBar = options.beatsPerBar ?? 4;
    this.aubioBin = options.aubioBin ?? 'aubiotrack';
    this.pythonBin = options.pythonBin ?? 'python3';
    this.onsetMode = options.onsetMode ?? 'specflux';
  }

  /**
   * Analyzes an audio file and returns a structured BeatGrid.
   * Primary: aubiotrack CLI. Fallback: librosa Python runner.
   */
  async analyze(audioPath: string): Promise<BeatGrid> {
    if (!fs.existsSync(audioPath)) {
      throw new Error(`[FoleyEngine] Source file not found: ${audioPath}`);
    }

    try {
      return await this._runAubio(audioPath);
    } catch (err) {
      console.warn(`[FoleyEngine] aubio failed (${(err as Error).message}), falling back to librosa`);
      return await this._runLibrosa(audioPath);
    }
  }

  // ── aubio primary ──────────────────────────────────────────────────────────

  private _runAubio(audioPath: string): Promise<BeatGrid> {
    return new Promise((resolve, reject) => {
      const args = [audioPath, '-O', this.onsetMode];
      const proc = spawn(this.aubioBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

      let stdout = '';
      proc.stdout.setEncoding('utf8');
      proc.stdout.on('data', (d: string) => { stdout += d; });

      proc.on('error', (err) => {
        reject(new Error(`aubio not found: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`aubiotrack exited ${code}`));
          return;
        }

        const beats = stdout
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean)
          .map(Number)
          .filter(n => !isNaN(n) && n >= 0);

        if (beats.length < 2) {
          reject(new Error('Too few beats detected'));
          return;
        }

        resolve(this._buildGrid(beats));
      });
    });
  }

  // ── librosa fallback ───────────────────────────────────────────────────────

  private _runLibrosa(audioPath: string): Promise<BeatGrid> {
    const script = `
import sys, json
import librosa
import numpy as np

y, sr = librosa.load(sys.argv[1], mono=True)
tempo, frames = librosa.beat.beat_track(y=y, sr=sr, units='time')
beats = frames.tolist()
print(json.dumps({'bpm': float(tempo), 'beats': beats}))
`;

    const tmpScript = path.join(os.tmpdir(), 'foley_beat_detect.py');
    fs.writeFileSync(tmpScript, script, 'utf8');

    return new Promise((resolve, reject) => {
      const proc = spawn(this.pythonBin, [tmpScript, audioPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      proc.stdout.setEncoding('utf8');
      proc.stdout.on('data', (d: string) => { stdout += d; });

      let stderr = '';
      proc.stderr.setEncoding('utf8');
      proc.stderr.on('data', (d: string) => { stderr += d; });

      proc.on('error', (err) => {
        reject(new Error(`librosa runner failed: ${err.message}. pip install librosa`));
      });

      proc.on('close', (code) => {
        fs.unlinkSync(tmpScript);
        if (code !== 0) {
          reject(new Error(`librosa script exited ${code}: ${stderr.slice(0, 200)}`));
          return;
        }
        try {
          const parsed = JSON.parse(stdout.trim()) as { bpm: number; beats: number[] };
          const grid = this._buildGrid(parsed.beats, parsed.bpm);
          resolve(grid);
        } catch {
          reject(new Error(`Could not parse librosa output: ${stdout.slice(0, 100)}`));
        }
      });
    });
  }

  // ── Shared grid builder ────────────────────────────────────────────────────

  private _buildGrid(beats: number[], bpmOverride?: number): BeatGrid {
    // Compute BPM from inter-beat intervals
    const intervals = beats.slice(1).map((b, i) => b - beats[i]);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = bpmOverride ?? (60 / avgInterval);

    // Estimate downbeats: every Nth beat where N = beatsPerBar
    const downbeats = beats.filter((_, i) => i % this.beatsPerBar === 0);

    // Confidence: stability of inter-beat intervals (lower std deviation = higher confidence)
    const mean = avgInterval;
    const variance = intervals.map(i => (i - mean) ** 2).reduce((a, b) => a + b, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(1, 1 - stdDev / mean));

    return {
      bpm: Math.round(bpm * 10) / 10,
      beats,
      downbeats,
      timeSignature: [this.beatsPerBar, 4],
      confidence: Math.round(confidence * 100) / 100,
    };
  }
}
