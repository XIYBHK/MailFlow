import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'cross-env E2E_TEST=true npm run dev',
    url: 'http://localhost:1420',
    // 总是重新启动服务器，确保使用正确的环境变量
    reuseExistingServer: false,
    timeout: 120 * 1000,
    // 显示服务器输出
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
