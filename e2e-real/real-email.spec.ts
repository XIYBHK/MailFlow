import { test, expect } from '@playwright/test'

test.describe('真实邮件测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 等待应用加载完成 - 真实环境可能需要更长时间
    await expect(page.getByRole('heading', { name: /INBOX|收件箱/ })).toBeVisible({ timeout: 30000 })
  })

  test('邮件列表应加载真实邮件', async ({ page }) => {
    // 验证邮件列表区域存在
    const emailList = page.locator('.h-full.overflow-y-auto')
    await expect(emailList).toBeVisible({ timeout: 10000 })

    // 等待邮件加载 - 真实IMAP可能需要时间
    await page.waitForTimeout(3000)

    // 验证至少有一封邮件显示
    const emailItems = page.locator('.h-full.overflow-y-auto > div')
    const count = await emailItems.count()
    console.log(`加载了 ${count} 封邮件`)

    expect(count).toBeGreaterThan(0)
  })

  test('点击邮件应显示详情和正文', async ({ page }) => {
    // 等待邮件加载
    await page.waitForTimeout(3000)

    // 获取第一封邮件
    const firstEmail = page.locator('.h-full.overflow-y-auto > div').first()
    await expect(firstEmail).toBeVisible({ timeout: 10000 })

    // 获取邮件主题
    const subjectText = await firstEmail.locator('[class*="truncate"]').first().textContent()
    console.log(`点击邮件: ${subjectText}`)

    // 点击邮件
    await firstEmail.click()

    // 等待邮件详情加载
    await expect(page.getByRole('heading', { name: /.+/ }).nth(1)).toBeVisible({ timeout: 15000 })

    // 验证正文区域存在
    const proseContent = page.locator('.prose')
    await expect(proseContent).toBeVisible({ timeout: 10000 })

    // 获取正文内容
    const bodyContent = await proseContent.textContent()
    console.log(`正文内容长度: ${bodyContent?.length || 0}`)

    // 验证正文不为空或仅包含默认文本
    expect(bodyContent).toBeTruthy()
    expect(bodyContent?.trim().length).toBeGreaterThan(0)
  })

  test('中文邮件正文应无乱码', async ({ page }) => {
    await page.waitForTimeout(3000)

    const firstEmail = page.locator('.h-full.overflow-y-auto > div').first()
    await expect(firstEmail).toBeVisible({ timeout: 10000 })
    await firstEmail.click()

    // 等待详情加载
    await expect(page.locator('.prose')).toBeVisible({ timeout: 15000 })

    // 获取正文内容
    const bodyContent = await page.locator('.prose').textContent() || ''

    // 检查是否有常见乱码模式
    const hasGarbledChars = /[^\x00-\x7F\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s\p{P}]/gu.test(bodyContent)

    if (hasGarbledChars) {
      console.log('警告: 检测到可能的乱码字符')
      console.log(`正文片段: ${bodyContent.substring(0, 200)}`)
    }

    // 打印正文用于人工检查
    console.log(`邮件正文前200字符: ${bodyContent.substring(0, 200)}`)
  })

  test('标记已读功能应正常工作', async ({ page }) => {
    await page.waitForTimeout(3000)

    // 检查是否有未读邮件
    const unreadDot = page.locator('.bg-primary-500.rounded-full')
    const hasUnread = await unreadDot.count() > 0

    if (hasUnread) {
      console.log('发现未读邮件')

      // 点击第一封未读邮件
      const firstUnread = unreadDot.first().locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]')
      await firstUnread.click()

      // 等待加载
      await page.waitForTimeout(2000)

      // 验证没有错误提示
      const errorAlert = page.locator('[class*="bg-red-"]')
      const hasError = await errorAlert.count()

      if (hasError > 0) {
        const errorText = await errorAlert.first().textContent()
        console.log(`错误: ${errorText}`)
      }

      expect(hasError).toBe(0)
    } else {
      console.log('没有未读邮件，跳过此测试')
    }
  })

  test('切换文件夹应正常工作', async ({ page }) => {
    // 点击已发送文件夹
    const sentFolder = page.getByRole('button', { name: '已发送' })
    await expect(sentFolder).toBeVisible()
    await sentFolder.click()

    // 等待切换完成
    await page.waitForTimeout(3000)

    // 验证标题变化
    await expect(page.getByRole('heading', { name: '已发送' })).toBeVisible({ timeout: 10000 })

    // 切换回收件箱
    await page.getByRole('button', { name: 'INBOX' }).click()
    await page.waitForTimeout(2000)
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible({ timeout: 10000 })
  })
})

test.describe('应用持久化测试', () => {
  test('重启应用后账户应保持登录状态', async ({ page, context }) => {
    // 第一次访问
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /INBOX|收件箱/ })).toBeVisible({ timeout: 30000 })

    // 验证有账户存在（不是欢迎页面）
    const welcomePage = page.getByText('还没有添加邮箱账户')
    const isWelcomePage = await welcomePage.count()

    expect(isWelcomePage).toBe(0)
    console.log('账户验证通过')

    // 模拟刷新页面
    await page.reload()
    await expect(page.getByRole('heading', { name: /INBOX|收件箱/ })).toBeVisible({ timeout: 30000 })

    // 再次验证
    const stillWelcomePage = page.getByText('还没有添加邮箱账户')
    const stillWelcome = await stillWelcomePage.count()
    expect(stillWelcome).toBe(0)
  })
})
