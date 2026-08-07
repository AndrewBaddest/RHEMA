import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Disable minification to avoid the crypto error on Node 18
    minify: false,
    // Optional: generate sourcemaps for debugging (set to false for smaller builds)
    sourcemap: false,
  },
});