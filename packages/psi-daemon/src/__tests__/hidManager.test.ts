/**
 * hidManager.test.ts — PSI Daemon HID Manager Tests
 * @inception/psi-daemon
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

// ─── Mock node-hid ───────────────────────────────────────────────────────────

class MockHID extends EventEmitter {
  static shouldThrow = false;
  static lastCreated: MockHID | null = null;

  constructor(_vid: number, _pid: number) {
    super();
    if (MockHID.shouldThrow) throw new Error('HID device not found');
    MockHID.lastCreated = this;
  }
}

vi.mock('node-hid', () => ({
  HID: MockHID,
}));

// ─── Mock nasClient ───────────────────────────────────────────────────────────

const mockNasClientEmitter = new EventEmitter();
const mockRequestCurrentState = vi.fn();

vi.mock('../nasClient.js', () => ({
  nasClient: Object.assign(mockNasClientEmitter, {
    requestCurrentState: mockRequestCurrentState,
  }),
}));

// ─── Mock mapper ─────────────────────────────────────────────────────────────

const mockApplyMappings = vi.fn();
vi.mock('../mapper.js', () => ({
  applyMappings: mockApplyMappings,
}));

vi.mock('@inception/core', () => ({}));

const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('HiddenDeviceManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockHID.shouldThrow = false;
    MockHID.lastCreated = null;
    consoleSpy.mockClear();
    vi.useFakeTimers();
  });

  it('should log initialization on construction', async () => {
    const { HiddenDeviceManager } = await import('../hidManager.js');
    new HiddenDeviceManager();
    expect(consoleSpy).toHaveBeenCalledWith('[PSI] HID Manager initialized');
  });

  it('should try to connect to HID device on start()', async () => {
    const { HiddenDeviceManager } = await import('../hidManager.js');
    const mgr = new HiddenDeviceManager();
    mgr.start();

    expect(MockHID.lastCreated).not.toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[PSI] Connected to HID device')
    );
  });

  it('should request current state from NAS after HID connect', async () => {
    const { HiddenDeviceManager } = await import('../hidManager.js');
    const mgr = new HiddenDeviceManager();
    mgr.start();

    expect(mockRequestCurrentState).toHaveBeenCalledWith('mouse');
  });

  it('should NOT throw when HID device is not found (graceful handling)', async () => {
    MockHID.shouldThrow = true;
    const { HiddenDeviceManager } = await import('../hidManager.js');
    const mgr = new HiddenDeviceManager();

    expect(() => mgr.start()).not.toThrow();
    expect(MockHID.lastCreated).toBeNull();
  });

  it('should re-poll device after 2000ms interval if not connected', async () => {
    MockHID.shouldThrow = true; // First attempt fails
    const { HiddenDeviceManager } = await import('../hidManager.js');
    const mgr = new HiddenDeviceManager();
    mgr.start();

    expect(MockHID.lastCreated).toBeNull();

    // Now make it succeed on next poll
    MockHID.shouldThrow = false;
    vi.advanceTimersByTime(2001);

    expect(MockHID.lastCreated).not.toBeNull();
  });

  it('should call applyMappings when data event fires from HID device', async () => {
    const fakeProfile = {
      id: 'test',
      name: 'Test',
      device_class: 'mouse',
      owner: 'justin',
      updated_at: new Date().toISOString(),
      mappings: [{ capability: 'side_button_1', action: { type: 'os', value: 'back' } }],
    };

    const { HiddenDeviceManager } = await import('../hidManager.js');
    const mgr = new HiddenDeviceManager();
    mgr.start();

    // Inject aura via NAS client event
    mockNasClientEmitter.emit('aura_updated', fakeProfile);

    // Simulate HID data input
    const fakeBuffer = Buffer.from([0x08, 0x00]);
    MockHID.lastCreated?.emit('data', fakeBuffer);

    expect(mockApplyMappings).toHaveBeenCalledWith(
      [0x08, 0x00],
      fakeProfile
    );
  });

  it('should update currentAura when aura_updated event fires from nasClient', async () => {
    const { HiddenDeviceManager } = await import('../hidManager.js');
    const mgr = new HiddenDeviceManager();
    mgr.start();

    const newAura = {
      id: 'new-aura',
      name: 'Updated Aura',
      device_class: 'mouse',
      owner: 'justin',
      updated_at: new Date().toISOString(),
      mappings: [],
    };

    mockNasClientEmitter.emit('aura_updated', newAura);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[PSI] Aura updated from NAS: Updated Aura')
    );
  });
});
