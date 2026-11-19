import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
const apiPort = process.env.CRISO_API_PORT ?? '4174';
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, 'tests/e2e/**'] },
  server: { proxy: { '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } } },
  plugins: [react(), VitePWA({ registerType: 'autoUpdate', includeAssets: ['assets/**'], manifest: false, workbox: { globPatterns: ['**/*.{js,css,html,webmanifest,png,svg,ico,webp}'], maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    // Só os bundles com hash no nome (assets/index-AbCd1234.js) dispensam revisão. Os arquivos de public/assets mantêm o nome ao serem trocados:
    // sem revisão o navegador nunca baixaria a versão nova e ainda duplicava a entrada (includeAssets), o que derrubava a instalação do service worker.
    dontCacheBustURLsMatching: /^assets\/[^/]+-[A-Za-z0-9_-]{8}\.[A-Za-z0-9]+$/, cleanupOutdatedCaches: true } })],
});
