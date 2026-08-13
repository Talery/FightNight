import { defineConfig } from '@playwright/test'

const viewports = [
  { name: 'mobile-360', viewport: { width: 360, height: 800 }, hasTouch: true },
  { name: 'mobile-390', viewport: { width: 390, height: 844 }, hasTouch: true },
  { name: 'tablet-768', viewport: { width: 768, height: 900 }, hasTouch: true },
  { name: 'desktop-1280', viewport: { width: 1280, height: 800 }, hasTouch: false },
  { name: 'desktop-1920', viewport: { width: 1920, height: 1080 }, hasTouch: false },
]

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: viewports.map(({ name, viewport, hasTouch }) => ({ name, use: { viewport, hasTouch } })),
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
