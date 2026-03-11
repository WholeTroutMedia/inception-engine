import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Use fake timers globally so setTimeout-heavy RundownManager doesn't hang tests
    fakeTimers: {
      enable: true,
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    },
    testTimeout: 10000,
    hookTimeout: 5000,
  },
});
