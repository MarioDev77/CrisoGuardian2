import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:4277', headless: true },
  webServer: [
    { command: 'node ../backend/economy-api.mjs', url: 'http://127.0.0.1:4275/api/economy', env: { CRISO_API_PORT: '4275', CRISO_TEST_MODE: '1', CRISO_DATA_DIR: '../backend/test-data' }, reuseExistingServer: false, timeout: 30000 },
    { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4277 --strictPort', url: 'http://127.0.0.1:4277', env: { CRISO_API_PORT: '4275' }, reuseExistingServer: false, timeout: 30000 },
  ],
});


