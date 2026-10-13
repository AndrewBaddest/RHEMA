import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,                       // bind to 0.0.0.0 so tunnels can reach it
    port: 5173,
    strictPort: true,                 // fail loudly if 5173 is taken, don't drift
    allowedHosts: [
      '.lhr.life',                    // localhost.run
      '.localhost.run',
      '.serveo.net',                  // serveo
      '.trycloudflare.com',           // cloudflared quick tunnel
      '.ngrok-free.app',              // ngrok (current)
      '.ngrok-free.dev',              // ngrok (newer TLD)
      '.ngrok.io',                    // ngrok (legacy)
      '.ngrok.app',                   // ngrok (legacy)
    ],
  },
  build: {
    minify: false,
    sourcemap: false,
  },
});