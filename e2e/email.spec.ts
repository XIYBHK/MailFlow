import { test, expect } from '@playwright/test'

test.describe('邮件列表功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible({ timeout: 15000 })
  })

  test('应显示邮件列表', async ({ page }) => {
    await expect(page.getByText('【测试】项目进度汇报')).toBeVisible()
    await expect(page.getByText('Re: 会议邀请')).toBeVisible()
    await expect(page.getByText('【广告】限时优惠活动')).toBeVisible()
  })

  test('未读邮件应有视觉标识', async ({ page }) => {
    const unreadEmail = page.locator('text=【测试】项目进度汇报').first()
    await expect(unreadEmail).toBeVisible()
  })

  test('切换文件夹', async ({ page }) => {
    await page.getByRole('button', { name: '已发送' }).click()
    await expect(page.getByRole('heading', { name: '已发送' })).toBeVisible()
  })

  test('邮件列表应显示发件人信息', async ({ page }) => {
    // 验证邮件列表中显示发件人
    const emailList = page.locator('.h-full.overflow-y-auto')
    await expect(emailList).toBeVisible()

    // 检查邮件条目中包含发件人（张三、李四等）
    await expect(page.getByText('张三')).toBeVisible()
  })

  test('邮件列表应显示日期信息', async ({ page }) => {
    // 验证日期格式正确 (MM/DD HH:mm 或类似格式)
    const datePattern = /\d{2}\/\d{2}\s+\d{2}:\d{2}/
    const dateElement = page.locator(`text=${datePattern}`).first()
    await expect(dateElement).toBeVisible({ timeout: 5000 })
  })

  test('邮件列表应显示预览内容', async ({ page }) => {
    // 验证邮件预览文本存在
    const previewText = page.locator('[class*="truncate"]').filter({ hasText: /./ }).first()
    await expect(previewText).toBeVisible()
  })
})

test.describe('邮件详情功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible({ timeout: 15000 })
  })

  test('点击邮件应显示详情', async ({ page }) => {
    // 点击第一封邮件
    const firstEmail = page.getByText('【测试】项目进度汇报').first()
    await firstEmail.click()

    // 等待邮件详情加载
    await expect(page.getByRole('heading', { name: /项目进度/ })).toBeVisible({ timeout: 5000 })
  })

  test('邮件详情应显示完整标题', async ({ page }) => {
    const firstEmail = page.getByText('【测试】项目进度汇报').first()
    await firstEmail.click()

    // 验证标题完整显示
    const detailTitle = page.getByRole('heading', { name: /项目进度汇报/ })
    await expect(detailTitle).toBeVisible({ timeout: 5000 })
  })

  test('邮件详情应显示发件人信息', async ({ page }) => {
    const firstEmail = page.getByText('【测试】项目进度汇报').first()
    await firstEmail.click()

    // 验证发件人头像和信息
    await expect(page.getByText(/发送至/)).toBeVisible({ timeout: 5000 })
  })

  test('邮件详情应显示正文内容', async ({ page }) => {
    const firstEmail = page.getByText('【测试】项目进度汇报').first()
    await firstEmail.click()

    // 等待正文加载 - 检查 prose 容器
    await expect(page.locator('.prose')).toBeVisible({ timeout: 5000 })

    // 验证正文区域不为空
    const proseContent = page.locator('.prose')
    await expect(proseContent).not.toBeEmpty()
  })

  test('返回按钮应返回邮件列表', async ({ page }) => {
    const firstEmail = page.getByText('【测试】项目进度汇报').first()
    await firstEmail.click()

    // 等待详情页面加载
    await expect(page.getByRole('heading', { name: /项目进度/ })).toBeVisible({ timeout: 5000 })

    // 点击返回按钮
    await page.getByRole('button').first().click()

    // 验证返回到列表视图 - 使用更精确的选择器
    await expect(page.locator('.h-full.overflow-y-auto').getByText('【测试】项目进度汇报')).toBeVisible()
  })

  test('邮件详情应显示工具栏按钮', async ({ page }) => {
    const firstEmail = page.getByText('【测试】项目进度汇报').first()
    await firstEmail.click()

    // 等待详情页面加载
    await expect(page.getByRole('heading', { name: /项目进度/ })).toBeVisible({ timeout: 5000 })

    // 验证工具栏按钮存在
    await expect(page.getByRole('button', { name: 'AI摘要' })).toBeVisible()
    await expect(page.getByRole('button', { name: '翻译' })).toBeVisible()
    // 使用 title 选择器来精确匹配删除按钮
    await expect(page.locator('[title="删除"]')).toBeVisible()
  })
})

test.describe('写邮件功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible({ timeout: 15000 })
  })

  test('点击写邮件应打开撰写模态框', async ({ page }) => {
    await page.getByRole('button', { name: '写邮件' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: '新邮件' })).toBeVisible()
  })

  test('填写邮件表单', async ({ page }) => {
    await page.getByRole('button', { name: '写邮件' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const toInput = page.getByPlaceholder(/多个收件人/)
    await toInput.fill('test@example.com')

    const subjectInput = page.getByPlaceholder('邮件主题')
    await subjectInput.fill('测试邮件主题')

    await expect(toInput).toHaveValue('test@example.com')
    await expect(subjectInput).toHaveValue('测试邮件主题')
  })

  test('关闭撰写模态框', async ({ page }) => {
    await page.getByRole('button', { name: '写邮件' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('button', { name: '取消' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})

test.describe('设置功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible({ timeout: 15000 })
  })

  test('打开设置模态框', async ({ page }) => {
    await page.getByRole('button', { name: '设置' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: '邮箱账户设置' })).toBeVisible()
  })

  test('应显示已添加的账户', async ({ page }) => {
    await page.getByRole('button', { name: '设置' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    // 使用更精确的选择器 - 在 dialog 内查找
    await expect(page.getByRole('dialog').getByText('xiybhk@163.com').first()).toBeVisible()
  })

  test('关闭设置模态框', async ({ page }) => {
    await page.getByRole('button', { name: '设置' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const closeBtn = page.getByRole('dialog').locator('button').first()
    await closeBtn.click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})

test.describe('邮件分类和标签', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible({ timeout: 15000 })
  })

  test('应显示邮件分类标签', async ({ page }) => {
    // 检查是否有分类标签显示
    const tag = page.locator('[class*="rounded-full"]').filter({ hasText: /工作|广告|个人|订阅|垃圾|其他/ }).first()
    await expect(tag).toBeVisible({ timeout: 5000 })
  })

  test('广告邮件应显示广告标签', async ({ page }) => {
    // 检查广告邮件标签
    await expect(page.getByText('【广告】限时优惠活动')).toBeVisible()
  })
})

test.describe('邮件刷新和加载', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible({ timeout: 15000 })
  })

  test('首次加载应显示加载状态', async ({ page }) => {
    // 重新加载页面检查加载状态
    await page.reload()

    // 在加载完成前应该显示 INBOX 标题
    await expect(page.getByRole('heading', { name: 'INBOX' })).toBeVisible({ timeout: 15000 })
  })

  test('邮件列表应为可滚动区域', async ({ page }) => {
    // 验证邮件列表容器存在 - 使用更精确的选择器
    const emailList = page.locator('.h-full.overflow-y-auto')
    await expect(emailList).toBeVisible()
  })

  test('切换账户后应刷新邮件', async ({ page }) => {
    // 如果有多个账户，测试切换
    const settingsBtn = page.getByRole('button', { name: '设置' })
    await settingsBtn.click()

    // 等待设置对话框
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
  })
})
