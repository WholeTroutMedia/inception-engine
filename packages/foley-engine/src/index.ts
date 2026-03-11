/**
 * HELIX E: Foley Engine — AI-Driven Audio Composition Pipeline
 * Issue: #50 | Package: foley-engine
 *
 * Sovereign audio pipeline: CampaignBrief -> MIDI generation -> REAPER render
 * Uses REAPER + reapy for headless audio rendering, Demucs for stem separation,
 * Whisper.cpp for transcription, and beat detection for video-audio sync.
 */

// Import sub-module classes + types into this file's scope
// (re-exports alone don't bring names into scope for use within the same file)
import { ReaperBridge } from './reaper-bridge.js';
import { StemSeparator, type StemResult } from './stem-separator.js';
import { BeatDetector, type BeatGrid } from './beat-detector.js';
import { Transcriber, type TranscriptSegment } from './transcriber.js';

// Re-export everything for consumers
export { ReaperBridge, type ReaperConfig } from './reaper-bridge.js';
export { StemSeparator, type StemResult } from './stem-separator.js';
export { BeatDetector, type BeatGrid } from './beat-detector.js';
export { Transcriber, type TranscriptSegment } from './transcriber.js';
export {
  generateMidiPattern,
  runFoleyPipeline,
  CampaignBriefSchema,
  FoleyRequestSchema,
  FoleyResponseSchema,
  type FoleyRequest,
  type FoleyResponse,
} from './genkit-foley-flow.js';


// --- Core Types ---

export interface CampaignBrief {
  title: string;
  mood: 'energetic' | 'calm' | 'dramatic' | 'ambient' | 'upbeat';
  genre: string;
  bpm?: number;
  durationSec: number;
  instruments?: string[];
  referenceTrack?: string;
}

export interface AudioAsset {
  path: string;
  format: 'wav' | 'mp3' | 'flac' | 'ogg' | 'aac';
  sampleRate: number;
  channels: number;
  durationSec: number;
  bpm?: number;
}

export interface FoleyPipelineResult {
  master: AudioAsset;
  stems: StemResult | null;
  transcript: TranscriptSegment[] | null;
  beatGrid: BeatGrid | null;
  metadata: {
    generatedAt: string;
    brief: CampaignBrief;
    renderTimeMs: number;
  };
}

// --- Pipeline Orchestrator ---

export class FoleyEngine {
  private reaper: ReaperBridge;
  private stemSeparator: StemSeparator;
  private beatDetector: BeatDetector;
  private transcriber: Transcriber;

  constructor(config?: { reaperPath?: string; modelsDir?: string }) {
    this.reaper = new ReaperBridge(config?.reaperPath ? { reaperBinaryPath: config.reaperPath } : undefined);
    this.stemSeparator = new StemSeparator(config?.modelsDir ? { outputDir: config.modelsDir } : undefined);
    this.beatDetector = new BeatDetector();
    this.transcriber = new Transcriber();
  }

  async generate(brief: CampaignBrief): Promise<FoleyPipelineResult> {
    const start = performance.now();

    // Step 1: Generate MIDI pattern via AI (placeholder for Gemini/Genkit flow)
    const midiPattern = await this.generateMidiPattern(brief);

    // Step 2: Inject into REAPER and render
    const rendered = await this.reaper.render({
      projectPath: midiPattern.projectPath,
      outputFormat: 'wav',
    });

    // Step 3: Analyze output
    const [beatGrid, stems] = await Promise.all([
      this.beatDetector.analyze(rendered.outputPath),
      this.stemSeparator.separate(rendered.outputPath),
    ]);

    return {
      master: {
        path: rendered.outputPath,
        format: 'wav',
        sampleRate: 48000,
        channels: 2,
        durationSec: brief.durationSec,
        bpm: beatGrid.bpm,
      },
      stems,
      transcript: null, // No vocals to transcribe in generated music
      beatGrid,
      metadata: {
        generatedAt: new Date().toISOString(),
        brief,
        renderTimeMs: performance.now() - start,
      },
    };
  }

  private async generateMidiPattern(brief: CampaignBrief): Promise<{ projectPath: string }> {
    // TODO: Wire to Genkit flow with Gemini API for MIDI generation
    // For now, return placeholder
    return { projectPath: `/tmp/foley-${Date.now()}.rpp` };
  }
}
