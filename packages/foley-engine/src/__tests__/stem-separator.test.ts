/**
 * stem-separator.test.ts — Unit tests for Foley Engine StemSeparator
 * @inception/foley-engine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import * as path from 'path';

// Create mocked fs and spawn using vi.hoisted
const { mockSpawn, mockExistsSync, mockMkdirSync } = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
  mockExistsSync: vi.fn(),
  mockMkdirSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  spawn: mockSpawn
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
  };
});

import { StemSeparator } from '../stem-separator.js';

describe('StemSeparator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw if audio file does not exist', async () => {
    mockExistsSync.mockReturnValue(false);
    const separator = new StemSeparator();
    await expect(separator.separate('/invalid/vocals.wav')).rejects.toThrow('Source file not found');
  });

  it('should run demucs and return standard 4-stem result', async () => {
    // 1st: true (audio exists)
    // 2-5: true (drums, bass, other, vocals exist)
    mockExistsSync.mockReturnValue(true);

    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter(); mockProc.stdout.setEncoding = vi.fn();
    mockProc.stderr = new EventEmitter(); mockProc.stderr.setEncoding = vi.fn();
    
    mockSpawn.mockReturnValue(mockProc);

    const separator = new StemSeparator({ outputDir: '/test/tmp' });
    const analyzePromise = separator.separate('/valid/song.wav');

    // Simulate exit 0
    mockProc.emit('close', 0);

    const result = await analyzePromise;

    expect(mockSpawn).toHaveBeenCalledWith('python3', [
      '-m', 'demucs', '--name', 'htdemucs', '--out', '/test/tmp', '--jobs', '2', '--mp3', '/valid/song.wav'
    ], expect.any(Object));

    expect(mockMkdirSync).toHaveBeenCalledWith('/test/tmp', { recursive: true });

    // Validate standard stems
    expect(result.drums).toBe(path.join('/test/tmp', 'htdemucs', 'song', 'drums.wav'));
    expect(result.bass).toBe(path.join('/test/tmp', 'htdemucs', 'song', 'bass.wav'));
    expect(result.other).toBe(path.join('/test/tmp', 'htdemucs', 'song', 'other.wav'));
    expect(result.vocals).toBe(path.join('/test/tmp', 'htdemucs', 'song', 'vocals.wav'));
    expect(result.piano).toBeUndefined();
    expect(result.guitar).toBeUndefined();
  });

  it('should run htdemucs_6s and return 6-stem result', async () => {
    mockExistsSync.mockReturnValue(true);
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter(); mockProc.stdout.setEncoding = vi.fn();
    mockProc.stderr = new EventEmitter(); mockProc.stderr.setEncoding = vi.fn();
    mockSpawn.mockReturnValue(mockProc);

    const separator = new StemSeparator({ model: 'htdemucs_6s' });
    const analyzePromise = separator.separate('/valid/song.wav');

    mockProc.emit('close', 0);
    const result = await analyzePromise;

    expect(result.piano).toBe(path.join('/tmp/foley-stems', 'htdemucs_6s', 'song', 'piano.wav'));
    expect(result.guitar).toBe(path.join('/tmp/foley-stems', 'htdemucs_6s', 'song', 'guitar.wav'));
  });

  it('should throw if a required stem is missing from output', async () => {
    // 1st: true (audio file exists)
    // 2nd: true (drums exists)
    // 3rd: false (bass missing)
    mockExistsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter(); mockProc.stdout.setEncoding = vi.fn();
    mockProc.stderr = new EventEmitter(); mockProc.stderr.setEncoding = vi.fn();
    mockSpawn.mockReturnValue(mockProc);

    const separator = new StemSeparator();
    const analyzePromise = separator.separate('/valid/song.wav');

    mockProc.emit('close', 0);

    await expect(analyzePromise).rejects.toThrow('Expected stem not found');
  });

  it('should reject if demucs errors', async () => {
    mockExistsSync.mockReturnValue(true);

    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter(); mockProc.stdout.setEncoding = vi.fn();
    mockProc.stderr = new EventEmitter(); mockProc.stderr.setEncoding = vi.fn();
    mockSpawn.mockReturnValue(mockProc);

    const separator = new StemSeparator();
    const analyzePromise = separator.separate('/valid/song.wav');

    mockProc.emit('error', new Error('python3 missing'));

    await expect(analyzePromise).rejects.toThrow('Failed to start demucs');
  });

  it('should reject if demucs non-zero exit', async () => {
    mockExistsSync.mockReturnValue(true);

    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter(); mockProc.stdout.setEncoding = vi.fn();
    mockProc.stderr = new EventEmitter(); mockProc.stderr.setEncoding = vi.fn();
    mockSpawn.mockReturnValue(mockProc);

    const separator = new StemSeparator();
    const analyzePromise = separator.separate('/valid/song.wav');

    mockProc.emit('close', 1);

    await expect(analyzePromise).rejects.toThrow('demucs exited with code 1');
  });
});
