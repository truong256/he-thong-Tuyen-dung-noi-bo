/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  if (process.env.VERCEL === '1') {
    const value = process.env.VITE_API_BASE_URL || loadEnv(mode, process.cwd()).VITE_API_BASE_URL;
    const url = value ? new URL(value) : null;
    if (!url || url.protocol !== 'https:' || url.origin !== value || url.hostname === 'localhost'
        || url.hostname.endsWith('.invalid') || url.hostname === '127.0.0.1') {
      throw new Error('VITE_API_BASE_URL must be the actual HTTPS backend origin before deploying to Vercel.');
    }
  }
  return {
  plugins: [
    tailwindcss(),
    react()
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
  };
});
