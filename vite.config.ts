import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tauri expects a fixed port and does not want Vite obscuring Rust errors.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // ⚠️ Never inline an asset as a `data:` URL. The window's CSP (tauri.conf.json) is
    // `default-src 'self'`, which a `data:` font does not match — so a font small enough for
    // Vite to inline (under 4 KB, the default) is *blocked* in the built app and falls back,
    // silently, while working perfectly in `tauri dev`, where nothing is inlined. That
    // happened to the 2.8 KB Latin Extended file of the display face. Loosening the CSP to
    // allow `data:` fonts would fix it the wrong way round.
    assetsInlineLimit: 0,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
