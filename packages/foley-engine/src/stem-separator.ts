import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StemResult {
  drums: string;
  bass: string;
  other: string;
  vocals: string;
  /** piano stem — only populated when model='htdemucs_6s' */
  piano?: string;
  /** guitar stem — only populated when model='htdemucs_6s' */
  guitar?: string;
}

export interface StemSeparatorOptions {
  /** Output directory root. Defaults to `/tmp/foley-stems` */
  outputDir?: string;
  /** Demucs model to use. Defaults to `htdemucs` */
  model?: 'htdemucs' | 'htdemucs_ft' | 'htdemucs_6s' | 'mdx_extra';
  /** Number of CPU workers. Defaults to 2 */
  jobs?: number;
  /** Path to python binary. Defaults to `python3` */
  pythonBin?: string;
  /** If true, emit progress events to stdout */
  verbose?: boolean;
}

// ─── StemSeparator ──────────────────────────────────────────────────────────

export class StemSeparator {
  private outputDir: string;
  private model: string;
  private jobs: number;
  private pythonBin: string;
  private verbose: boolean;

  constructor(options: StemSeparatorOptions = {}) {
    this.outputDir = options.outputDir ?? '/tmp/foley-stems';
    this.model = options.model ?? 'htdemucs';
    this.jobs = options.jobs ?? 2;
    this.pythonBin = options.pythonBin ?? 'python3';
    this.verbose = options.verbose ?? false;
  }

  /**
   * Separates a mixed audio file into stems using HTDemucs.
   * Returns immediately-resolvable paths when the process completes.
   *
   * @param audioPath - Absolute path to the source audio file
   * @param onProgress - Optional callback receiving progress lines from stderr
   */
  async separate(
    audioPath: string,
    onProgress?: (line: string) => void,
  ): Promise<StemResult> {
    if (!fs.existsSync(audioPath)) {
      throw new Error(`[FoleyEngine] Source file not found: ${audioPath}`);
    }

    fs.mkdirSync(this.outputDir, { recursive: true });

    const basename = path.basename(audioPath, path.extname(audioPath));

    await this._runDemucs(audioPath, onProgress);

    // Demucs outputs to: <outputDir>/<model>/<basename>/<stem>.wav
    const stemDir = path.join(this.outputDir, this.model, basename);

    const result: StemResult = {
      drums: path.join(stemDir, 'drums.wav'),
      bass: path.join(stemDir, 'bass.wav'),
      other: path.join(stemDir, 'other.wav'),
      vocals: path.join(stemDir, 'vocals.wav'),
    };

    if (this.model === 'htdemucs_6s') {
      result.piano = path.join(stemDir, 'piano.wav');
      result.guitar = path.join(stemDir, 'guitar.wav');
    }

    // Validate outputs exist
    const required = [result.drums, result.bass, result.other, result.vocals];
    for (const p of required) {
      if (!fs.existsSync(p)) {
        throw new Error(`[FoleyEngine] Expected stem not found: ${p}`);
      }
    }

    return result;
  }

  private _runDemucs(audioPath: string, onProgress?: (line: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-m', 'demucs',
        '--name', this.model,
        '--out', this.outputDir,
        '--jobs', String(this.jobs),
        '--mp3',           // accept mp3 input
        audioPath,
      ];

      if (this.verbose) {
        console.log(`[FoleyEngine] Running: ${this.pythonBin} ${args.join(' ')}`);
      }

      const proc = spawn(this.pythonBin, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      proc.stderr.setEncoding('utf8');
      proc.stderr.on('data', (chunk: string) => {
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
          if (this.verbose) process.stderr.write(`[HTDemucs] ${line}\n`);
          onProgress?.(line);
        }
      });

      proc.stdout.setEncoding('utf8');
      proc.stdout.on('data', (chunk: string) => {
        if (this.verbose) process.stdout.write(chunk);
      });

      proc.on('error', (err) => {
        reject(new Error(`[FoleyEngine] Failed to start demucs: ${err.message}. Is demucs installed? pip install demucs`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`[FoleyEngine] demucs exited with code ${code}`));
        }
      });
    });
  }
}
