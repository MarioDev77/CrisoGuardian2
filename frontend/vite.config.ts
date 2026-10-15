import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({ test: { exclude: [...configDefaults.exclude, 'tests/e2e/**'] }, plugins: [react(), VitePWA({ registerType: 'autoUpdate', includeAssets: ['assets/**'], manifest: false, workbox: { globPatterns: ['**/*.{js,css,html,webmanifest,png,svg,ico,webp}'], maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 } })] });
