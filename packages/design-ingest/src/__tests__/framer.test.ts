import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FramerExtractor } from '../framer.js';

// Mock child_process and fs
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
}));

import * as childProcess from 'child_process';
import fs from 'fs';

describe('FramerExtractor', () => {
  let extractor: FramerExtractor;

  beforeEach(() => {
    extractor = new FramerExtractor();
    vi.clearAllMocks();
  });

  it('creates output directory if it does not exist', async () => {
    (fs.existsSync as any).mockReturnValue(false);
    const execMock = vi.fn((cmd: string, cb: Function) => cb(null, { stdout: 'done', stderr: '' }));
    (childProcess.exec as any).mockImplementation(execMock);

    await extractor.extract('https://framer.com/test', '/tmp/framer-out');
    expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/framer-out', { recursive: true });
  });

  it('does not create directory if it already exists', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    const execMock = vi.fn((cmd: string, cb: Function) => cb(null, { stdout: 'done', stderr: '' }));
    (childProcess.exec as any).mockImplementation(execMock);

    await extractor.extract('https://framer.com/test', '/tmp/exists');
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('returns success:true and outPath on successful exec', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    const execMock = vi.fn((cmd: string, cb: Function) => cb(null, { stdout: 'extracted!', stderr: '' }));
    (childProcess.exec as any).mockImplementation(execMock);

    const result = await extractor.extract('https://framer.com/mycomp', '/tmp/mycomp');
    expect(result.success).toBe(true);
    expect(result.outPath).toBe('/tmp/mycomp');
    expect(result.error).toBeUndefined();
  });

  it('returns success:false and error message on exec failure', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    const execMock = vi.fn((cmd: string, cb: Function) => cb(new Error('unframer not found'), null));
    (childProcess.exec as any).mockImplementation(execMock);

    const result = await extractor.extract('https://framer.com/bad', '/tmp/bad');
    expect(result.success).toBe(false);
    expect(result.error).toContain('unframer not found');
  });

  it('includes the URL and outDir in the exec command', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    let capturedCmd = '';
    const execMock = vi.fn((cmd: string, cb: Function) => {
      capturedCmd = cmd;
      cb(null, { stdout: '', stderr: '' });
    });
    (childProcess.exec as any).mockImplementation(execMock);

    const testUrl = 'https://framer.com/component-test';
    const testDir = '/tmp/components/test';
    await extractor.extract(testUrl, testDir);

    expect(capturedCmd).toContain('unframer');
    expect(capturedCmd).toContain(testUrl);
    expect(capturedCmd).toContain(testDir);
  });
});
