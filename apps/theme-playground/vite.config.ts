import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@inception/ui': resolve(__dirname, '../../packages/ui/src'),
      '@inception/design-tokens': resolve(__dirname, '../../packages/design-tokens/dist'),
      '@inception/theme-engine': resolve(__dirname, '../../packages/theme-engine/src'),
      '@inception/design-sandbox': resolve(__dirname, '../../packages/design-sandbox/src'),
      '@inception/design-agent': resolve(__dirname, '../../packages/design-agent/src'),
    },
  },
  server: {
    port: 5174,
    host: true,
  },
});
