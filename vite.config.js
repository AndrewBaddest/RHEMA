import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [
      '.lhr.life',
      '.localhost.run',
      '.serveo.net',
      '.trycloudflare.com',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.ngrok.io',
      '.ngrok.app',
    ],
  },
  build: {
    minify: false,
    sourcemap: false,
  },
  // 👇 Add this block
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.js', // 👈 Add this line
  },
});