/**
 * beat-detector.test.ts — Unit tests for Foley Engine BeatDetector
 * @inception/foley-engine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// Create a mocked spawn implementation using vi.hoisted
const { mockSpawn } = vi.hoisted(() => {
  return { mockSpawn: vi.fn() };
});

vi.mock('child_process', () => ({
  spawn: mockSpawn
}));

import * as fs from 'fs';
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

import { BeatDetector } from '../beat-detector.js';

describe('BeatDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fs.existsSync as any).mockReturnValue(true);
  });

  it('should throw if audio file does not exist', async () => {
    (fs.existsSync as any).mockReturnValue(false);
    const detector = new BeatDetector();
    await expect(detector.analyze('/invalid/path.wav')).rejects.toThrow('Source file not found');
  });

  it('should successfully parse aubiotrack output', async () => {
    // Setup mock spawn to simulate aubio outputting beat timestamps
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stdout.setEncoding = vi.fn();
    mockProc.stderr = new EventEmitter();
    
    mockSpawn.mockReturnValueOnce(mockProc);

    const detector = new BeatDetector({ beatsPerBar: 4 });
    const analyzePromise = detector.analyze('/valid/path.wav');

    // Simulate stdout data (timestamps in seconds)
    // 120 BPM = 0.5s intervals. Let's do 4 beats.
    mockProc.stdout.emit('data', '0.5\n1.0\n1.5\n2.0\n');
    mockProc.emit('close', 0); // Exit code 0

    const grid = await analyzePromise;

    expect(mockSpawn).toHaveBeenCalledWith(
      'aubiotrack',
      ['/valid/path.wav', '-O', 'specflux'],
      expect.any(Object)
    );

    expect(grid.beats).toEqual([0.5, 1.0, 1.5, 2.0]);
    expect(grid.downbeats).toEqual([0.5]); // Index 0 (0.5s) is downbeat
    expect(grid.bpm).toBeCloseTo(120, 0); // (2.0 - 0.5) / 3 = 0.5s interval -> 120bpm
    expect(grid.timeSignature).toEqual([4, 4]);
    expect(grid.confidence).toBeGreaterThan(0.9); // Intervals are perfectly stable
  });

  it('should fallback to librosa if aubio fails (exit code native error)', async () => {
    const aubioProc = new EventEmitter() as any;
    aubioProc.stdout = new EventEmitter();
    aubioProc.stdout.setEncoding = vi.fn();
    aubioProc.stderr = new EventEmitter();
    
    const pythonProc = new EventEmitter() as any;
    pythonProc.stdout = new EventEmitter();
    pythonProc.stdout.setEncoding = vi.fn();
    pythonProc.stderr = new EventEmitter();
    pythonProc.stderr.setEncoding = vi.fn();

    // First call is aubio, second call is python
    mockSpawn.mockReturnValueOnce(aubioProc).mockReturnValueOnce(pythonProc);

    const detector = new BeatDetector();
    const analyzePromise = detector.analyze('/valid/path.wav');

    // Fail aubio
    aubioProc.emit('close', 1);

    // Yield to let the catch block spawn librosa and attach listeners
    await Promise.resolve();

    // Simulate python librosa output
    pythonProc.stdout.emit('data', JSON.stringify({
      bpm: 140.5,
      beats: [0.4, 0.82, 1.25, 1.68]
    }));
    pythonProc.emit('close', 0);

    const grid = await analyzePromise;

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    expect(mockSpawn).toHaveBeenNthCalledWith(2, 'python3', expect.any(Array), expect.any(Object));
    expect(fs.writeFileSync).toHaveBeenCalled(); // Should have written python script
    expect(fs.unlinkSync).toHaveBeenCalled(); // Should have deleted python script

    expect(grid.beats).toHaveLength(4);
    expect(grid.bpm).toBeCloseTo(140.5, 0); // BPM from intervals vs parsed override
  });

  it('should throw if both aubio and librosa fail', async () => {
    const proc1 = new EventEmitter() as any;
    proc1.stdout = new EventEmitter(); proc1.stdout.setEncoding = vi.fn();
    
    const proc2 = new EventEmitter() as any;
    proc2.stdout = new EventEmitter(); proc2.stdout.setEncoding = vi.fn();
    proc2.stderr = new EventEmitter(); proc2.stderr.setEncoding = vi.fn();

    mockSpawn.mockReturnValueOnce(proc1).mockReturnValueOnce(proc2);

    const detector = new BeatDetector();
    const analyzePromise = detector.analyze('/valid/path.wav');

    proc1.emit('close', 127); // aubio missing
    
    // Yield for catch block
    await Promise.resolve();

    proc2.emit('error', new Error('python not found')); // python missing

    await expect(analyzePromise).rejects.toThrow('librosa runner failed');
  });
});
