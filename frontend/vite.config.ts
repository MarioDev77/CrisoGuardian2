import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
const apiPort = process.env.CRISO_API_PORT ?? '4174';
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, 'tests/e2e/**'] },
  server: { proxy: { '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } } },
  plugins: [react(), VitePWA({ registerType: 'autoUpdate', includeAssets: ['assets/**'], manifest: false, workbox: { globPatterns: ['**/*.{js,css,html,webmanifest,png,svg,ico,webp}'], maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 } })],
});
