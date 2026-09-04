import { defineConfig, devices } from '@playwright/test';

/**
 * Two viewports, both first-class: the phone he'll actually use in bed, and
 * the shared family computer.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  // Point at a deployment with E2E_BASE_URL to run the same suite against live.
  // Some CI and sandbox environments only reach the internet through a proxy,
  // which the browser needs told about explicitly; local runs never use it.
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100',
    trace: 'off',
    ...(process.env.E2E_BASE_URL && process.env.HTTPS_PROXY
      ? { proxy: { server: process.env.HTTPS_PROXY }, ignoreHTTPSErrors: true }
      : {}),
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npx next start -p 3100',
        url: 'http://127.0.0.1:3100',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
