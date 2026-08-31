import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['6c7b-102-209-109-187.ngrok-free.app'],
    host: true, // ensure it binds to all interfaces
  },
  build: {
    minify: false,
    sourcemap: false,
  },
});