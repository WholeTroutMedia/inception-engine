import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/genkit': { target: 'http://localhost:4100', rewrite: (p: string) => p.replace('/api/genkit', ''), changeOrigin: true },
      '/api/relay': { target: 'http://localhost:5100', rewrite: (p: string) => p.replace('/api/relay', ''), changeOrigin: true },
      '/api/ghost': { target: 'http://localhost:6000', rewrite: (p: string) => p.replace('/api/ghost', ''), changeOrigin: true },
      '/api/god': { target: 'http://localhost:7000', rewrite: (p: string) => p.replace('/api/god', ''), changeOrigin: true },
      '/api/atlas': { target: 'http://localhost:8000', rewrite: (p: string) => p.replace('/api/atlas', ''), changeOrigin: true },
      '/api/zeroday': { target: 'http://localhost:9000', rewrite: (p: string) => p.replace('/api/zeroday', ''), changeOrigin: true },
      '/api/gateway': { target: 'http://localhost:3080', rewrite: (p: string) => p.replace('/api/gateway', ''), changeOrigin: true },
      '/api/dispatch': { target: 'http://127.0.0.1:5050', rewrite: (p: string) => p.replace('/api/dispatch', '/api'), changeOrigin: true },
    },
  },
})
