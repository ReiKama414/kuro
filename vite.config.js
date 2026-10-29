import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so GitHub Pages project URLs keep favicon/sprites under /kuro/
  base: './',
  plugins: [react()],
  // keep /assets/sprites free for static art (public/assets)
  build: {
    assetsDir: '_vite',
  },
});
