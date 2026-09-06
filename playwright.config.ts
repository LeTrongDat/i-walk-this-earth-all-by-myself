import { defineConfig } from '@playwright/test'

const localURL = `http://127.0.0.1:${process.env.E2E_PRODUCTION ? 4173 : 5173}/i-walk-this-earth-all-by-myself/`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || localURL,
    channel: process.env.CI ? 'chromium' : 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: process.env.E2E_PRODUCTION ? 'npm run preview -- --host 127.0.0.1 --port 4173' : 'npm run dev -- --host 127.0.0.1',
    url: localURL,
    reuseExistingServer: true,
    timeout: 30_000
  }
})
