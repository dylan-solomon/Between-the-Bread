import { defineConfig, devices } from '@playwright/test'

const LOCAL_URL = 'http://localhost:4173'
const baseURL = process.env.E2E_BASE_URL ?? 'https://betweenbread.co'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  workers: 4,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: baseURL === LOCAL_URL
    ? { command: 'pnpm build && pnpm preview --port 4173 --strictPort', url: LOCAL_URL, reuseExistingServer: true, timeout: 180_000 }
    : undefined,
})
