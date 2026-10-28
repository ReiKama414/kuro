import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // keep /assets/sprites free for static art (public/assets junction)
  build: {
    assetsDir: '_vite',
  },
});
