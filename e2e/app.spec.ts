import { test, expect } from '@playwright/test'

test.describe('MailFlow 邮件客户端 - 基础功能', () => {
  test('主界面加载', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible({ timeout: 15000 })
  })

  test('主界面布局', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible({ timeout: 15000 })

    // 验证侧边栏文件夹按钮存在
    await expect(page.getByRole('button', { name: 'INBOX' })).toBeVisible()
    await expect(page.getByRole('button', { name: '已发送' })).toBeVisible()
    await expect(page.getByRole('button', { name: '草稿箱' })).toBeVisible()

    // 验证工具按钮存在
    await expect(page.getByRole('button', { name: '写邮件' })).toBeVisible()
    await expect(page.getByRole('button', { name: '设置' })).toBeVisible()
  })

  test('响应式布局 - 窗口调整', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible({ timeout: 15000 })

    await page.setViewportSize({ width: 1024, height: 768 })
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible()
  })
})

test.describe('性能测试', () => {
  test('页面加载时间', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.getByRole('heading', { name: 'INBOX' }).waitFor({ timeout: 15000 })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(15000)
    console.log(`页面加载时间: ${loadTime}ms`)
  })
})
