/**
 * mapper.test.ts — PSI Daemon Semantic Mapper Tests
 * @inception/psi-daemon
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { AuraProfile } from '@inception/core';

// Mock @inception/core types
vi.mock('@inception/core', () => ({
  // Empty mock — types only, no runtime needed
}));

// Spy on console.log to capture action execution output
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

// applyMappings imported lazily to avoid issues with mock ordering
let applyMappings: (rawInput: number[], aura: AuraProfile) => void;

beforeAll(async () => {
  const mod = await import('../mapper.js');
  applyMappings = mod.applyMappings;
});

const makeAura = (overrides: Partial<AuraProfile> = {}): AuraProfile => ({
  id: 'test-aura-1',
  name: 'Test Aura',
  device_class: 'mouse',
  owner: 'justin',
  updated_at: new Date().toISOString(),
  mappings: [
    { capability: 'side_button_1', action: { type: 'os' as const, value: 'browser_back' } },
    { capability: 'side_button_2', action: { type: 'os' as const, value: 'browser_forward' } },
  ],
  ...overrides,
});

describe('applyMappings', () => {
  beforeEach(() => {
    consoleSpy.mockClear();
  });

  it('should execute action when side_button_1 (0x08) is triggered', () => {
    const aura = makeAura();
    applyMappings([0x08], aura);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[PSI] Executing semantic action: [os] browser_back')
    );
  });

  it('should execute action when side_button_2 (0x10) is triggered', () => {
    const aura = makeAura();
    applyMappings([0x10], aura);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[PSI] Executing semantic action: [os] browser_forward')
    );
  });

  it('should NOT execute action for unrecognized button state', () => {
    const aura = makeAura();
    applyMappings([0x99], aura);

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should NOT execute action if no mappings match capability', () => {
    const aura = makeAura({ mappings: [] });
    applyMappings([0x08], aura);

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle empty rawInput array gracefully', () => {
    const aura = makeAura();
    expect(() => applyMappings([], aura)).not.toThrow();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should handle rawInput of undefined first byte (0x00) gracefully', () => {
    const aura = makeAura();
    applyMappings([0x00], aura);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should use the first byte only for button detection', () => {
    const aura = makeAura();
    // Second byte is 0x08 but should be ignored
    applyMappings([0x00, 0x08, 0x10], aura);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should work with custom mappings that have different capabilities', () => {
    const aura = makeAura({
      mappings: [
        { capability: 'side_button_1', action: { type: 'script' as const, value: 'launch_spotlight' } },
      ],
    });
    applyMappings([0x08], aura);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[PSI] Executing semantic action: [script] launch_spotlight')
    );
  });
});
