import { defineConfig, devices } from '@playwright/test'

// 真实邮件测试配置 - 需要先手动启动 npm run tauri dev
export default defineConfig({
  testDir: './e2e-real',
  fullyParallel: false, // 串行执行避免并发问题
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 60000, // 每个测试超时60秒
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // 不启动 webServer，需要手动启动 Tauri 应用
})
