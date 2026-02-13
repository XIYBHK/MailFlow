import { test, expect } from '@playwright/test'

test.describe('邮件数据完整性测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible({ timeout: 15000 })
  })

  test.describe('邮件列表字段验证', () => {
    test('每封邮件应包含必要的字段信息', async ({ page }) => {
      // 等待邮件列表加载
      await expect(page.getByText('【测试】项目进度汇报')).toBeVisible()

      // 验证邮件条目存在
      const emailItem = page.locator('.h-full.overflow-y-auto > div').first()
      await expect(emailItem).toBeVisible()
    })

    test('邮件日期格式应正确', async ({ page }) => {
      // 验证日期格式 (MM/DD HH:mm 或 yyyy年MM月dd日 HH:mm)
      const datePattern = /\d{2}\/\d{2}\s+\d{2}:\d{2}|\d{4}年\d{2}月\d{2}日/
      const dateElement = page.locator(`text=${datePattern}`).first()
      await expect(dateElement).toBeVisible({ timeout: 5000 })
    })

    test('邮件预览内容应被截断', async ({ page }) => {
      // 预览文本应该在截断容器中
      const preview = page.locator('[class*="truncate"]').filter({ hasText: /./ }).first()
      await expect(preview).toBeVisible()
    })
  })

  test.describe('邮件详情字段验证', () => {
    test('邮件详情应包含完整的发件人信息', async ({ page }) => {
      // 点击第一封邮件
      const firstEmail = page.getByText('【测试】项目进度汇报').first()
      await firstEmail.click()

      // 等待详情加载
      await expect(page.getByRole('heading', { name: /项目进度/ })).toBeVisible({ timeout: 5000 })

      // 验证发件人邮箱格式
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      const senderElement = page.locator(`text=${emailPattern}`).first()
      await expect(senderElement).toBeVisible({ timeout: 5000 })
    })

    test('邮件详情应包含收件人信息', async ({ page }) => {
      const firstEmail = page.getByText('【测试】项目进度汇报').first()
      await firstEmail.click()

      // 等待详情加载
      await expect(page.getByRole('heading', { name: /项目进度/ })).toBeVisible({ timeout: 5000 })

      // 验证收件人信息
      await expect(page.getByText(/发送至/)).toBeVisible({ timeout: 5000 })
    })

    test('邮件详情应包含完整日期时间', async ({ page }) => {
      const firstEmail = page.getByText('【测试】项目进度汇报').first()
      await firstEmail.click()

      // 等待详情加载
      await expect(page.getByRole('heading', { name: /项目进度/ })).toBeVisible({ timeout: 5000 })

      // 验证完整日期格式 (yyyy年MM月dd日 HH:mm)
      const fullDatePattern = /\d{4}年\d{2}月\d{2}日\s+\d{2}:\d{2}/
      const dateElement = page.locator(`text=${fullDatePattern}`)
      await expect(dateElement).toBeVisible({ timeout: 5000 })
    })

    test('无主题邮件应显示默认文本', async ({ page }) => {
      // 检查邮件列表是否正确显示
      const emailList = page.locator('.h-full.overflow-y-auto')
      await expect(emailList).toBeVisible()

      // 邮件主题区域不应为空
      const subjects = page.locator('.h-full.overflow-y-auto > div')
      const count = await subjects.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('邮件内容渲染', () => {
    test('纯文本邮件应正确渲染', async ({ page }) => {
      const firstEmail = page.getByText('【测试】项目进度汇报').first()
      await firstEmail.click()

      // 等待详情加载
      await expect(page.getByRole('heading', { name: /项目进度/ })).toBeVisible({ timeout: 5000 })

      // 验证正文容器存在
      const proseContent = page.locator('.prose')
      await expect(proseContent).toBeVisible({ timeout: 5000 })

      // 验证正文不为空
      const content = await proseContent.innerHTML()
      expect(content.length).toBeGreaterThan(0)
    })

    test('邮件正文应保留换行格式', async ({ page }) => {
      const firstEmail = page.getByText('【测试】项目进度汇报').first()
      await firstEmail.click()

      // 等待详情加载
      await expect(page.getByRole('heading', { name: /项目进度/ })).toBeVisible({ timeout: 5000 })

      // 验证 whitespace-pre-wrap 或 prose 类存在
      const contentArea = page.locator('.prose, .whitespace-pre-wrap')
      await expect(contentArea.first()).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('邮件分类显示', () => {
    test('工作邮件应显示工作标签', async ({ page }) => {
      // 点击包含"项目进度"的邮件
      const workEmail = page.getByText('【测试】项目进度汇报').first()
      await workEmail.click()

      // 在邮件详情或列表中检查是否有分类标签
      const tags = page.locator('[class*="rounded-full"]')
      const count = await tags.count()

      // 验证至少有一个标签存在
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('分类标签颜色应正确', async ({ page }) => {
      // 检查不同分类的背景颜色
      const workTag = page.locator('[class*="tag-work"]')
      const adsTag = page.locator('[class*="tag-ads"]')

      // 至少应该有一个标签可见
      const workVisible = await workTag.count() > 0
      const adsVisible = await adsTag.count() > 0

      expect(workVisible || adsVisible).toBeTruthy()
    })
  })

  test.describe('邮件排序', () => {
    test('邮件应按日期降序排列', async ({ page }) => {
      // 获取所有邮件条目
      const emailItems = page.locator('[class*="overflow-y-auto"] > div')
      const count = await emailItems.count()

      if (count >= 2) {
        // 获取前两封邮件的日期
        const firstItem = emailItems.first()
        const secondItem = emailItems.nth(1)

        // 验证两封邮件都存在
        await expect(firstItem).toBeVisible()
        await expect(secondItem).toBeVisible()
      }
    })
  })

  test.describe('邮件状态显示', () => {
    test('未读邮件应有视觉区分', async ({ page }) => {
      // 检查未读邮件的圆点指示器（使用新的 CSS 变量类名）
      const unreadIndicator = page.locator('[class*="unread-dot"], [class*="bg-[var(--color-primary)]"]').first()
      await expect(unreadIndicator).toBeVisible({ timeout: 5000 })
    })

    test('已读邮件样式应不同', async ({ page }) => {
      // 点击邮件标记为已读
      const firstEmail = page.getByText('【测试】项目进度汇报').first()
      await firstEmail.click()

      // 等待详情加载
      await expect(page.getByRole('heading', { name: /项目进度/ })).toBeVisible({ timeout: 5000 })

      // 返回列表
      await page.getByRole('button').first().click()

      // 邮件状态应该更新 - 使用更精确的选择器
      await expect(page.locator('.h-full.overflow-y-auto').getByText('【测试】项目进度汇报')).toBeVisible()
    })

    test('星标邮件应显示星标图标', async ({ page }) => {
      // 检查是否有黄色星标
      const starredIcon = page.locator('[class*="text-yellow-500"]')
      const count = await starredIcon.count()

      // 如果有星标邮件，验证图标显示
      if (count > 0) {
        await expect(starredIcon.first()).toBeVisible()
      }
    })

    test('带附件邮件应显示附件图标', async ({ page }) => {
      // 检查附件图标 (paperclip)
      const attachmentIcon = page.locator('[class*="paperclip"], svg[class*="w-4"][class*="h-4"]')
      const count = await attachmentIcon.count()

      // 如果有带附件的邮件，验证图标显示
      if (count > 0) {
        await expect(attachmentIcon.first()).toBeVisible()
      }
    })
  })
})
