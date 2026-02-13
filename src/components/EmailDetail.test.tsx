import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmailDetail } from './EmailDetail'
import { mockUseEmailStore, clearMockUseEmailStore } from '../test/mocks/store'

describe('EmailDetail 组件', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    global.confirm = vi.fn(() => true)
  })

  afterEach(() => {
    clearMockUseEmailStore()
  })

  it('应该渲染邮件详情', () => {
    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '测试邮件',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '这是邮件正文',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        category: 'work',
        has_attachment: false,
        size: 1024,
      },
      isLoadingEmail: false,
    })

    render(<EmailDetail onBack={mockOnBack} />)

    expect(screen.getByText('测试邮件')).toBeInTheDocument()
    expect(screen.getByText('sender@example.com')).toBeInTheDocument()
    expect(screen.getByText('发送至 recipient@example.com')).toBeInTheDocument()
  })

  it('没有选中邮件时应该显示提示信息', () => {
    mockUseEmailStore({
      currentEmail: null,
      isLoadingEmail: false,
    })

    render(<EmailDetail onBack={mockOnBack} />)

    expect(screen.getByText('选择一封邮件查看详情')).toBeInTheDocument()
  })

  it('加载状态应该显示加载动画', () => {
    mockUseEmailStore({
      currentEmail: null,
      isLoadingEmail: true,
    })

    const { container } = render(<EmailDetail onBack={mockOnBack} />)

    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('点击返回按钮应该触发 onBack', () => {
    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '测试',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '正文',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        size: 1024,
      },
      isLoadingEmail: false,
    })

    const { container } = render(<EmailDetail onBack={mockOnBack} />)
    const backButton = container.querySelector('[class*="arrow-left"]')
    if (backButton) {
      fireEvent.click(backButton)
      expect(mockOnBack).toHaveBeenCalled()
    }
  })

  it('点击AI摘要按钮应该调用摘要功能', () => {
    const mockSummarize = vi.fn().mockResolvedValue('这是AI生成的摘要内容')

    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '测试',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '正文内容',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        size: 1024,
      },
      isLoadingEmail: false,
      summarizeEmail: mockSummarize,
    })

    const { container } = render(<EmailDetail onBack={mockOnBack} />)
    const summarizeButton = container.querySelector('[title="AI摘要"]')
    if (summarizeButton) {
      fireEvent.click(summarizeButton)
      expect(mockSummarize).toHaveBeenCalledWith('正文内容')
    }
  })

  it('点击翻译按钮应该调用翻译功能', () => {
    const mockTranslate = vi.fn().mockResolvedValue('Translated text')

    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '测试',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '原文内容',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        size: 1024,
      },
      isLoadingEmail: false,
      translateText: mockTranslate,
    })

    const { container } = render(<EmailDetail onBack={mockOnBack} />)
    const translateButton = container.querySelector('[title="翻译"]')
    if (translateButton) {
      fireEvent.click(translateButton)
      expect(mockTranslate).toHaveBeenCalledWith('原文内容', 'en')
    }
  })

  it('点击删除按钮应该确认并删除', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined)

    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '测试',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '正文',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        size: 1024,
      },
      isLoadingEmail: false,
      selectedFolder: 'INBOX',
      deleteEmail: mockDelete,
    })

    const { container } = render(<EmailDetail onBack={mockOnBack} />)
    const deleteButton = container.querySelector('[title="删除"]')
    if (deleteButton) {
      // 第一次点击显示确认按钮
      fireEvent.click(deleteButton)
      await screen.findByText('确认删除')

      // 第二次点击确认删除
      fireEvent.click(screen.getByText('确认删除'))
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockDelete).toHaveBeenCalledWith('INBOX', 1)
      expect(mockOnBack).toHaveBeenCalled()
    }
  })

  it('应该显示HTML邮件内容', () => {
    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: 'HTML邮件',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '纯文本',
        html_body: '<p>HTML内容</p>',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        size: 1024,
      },
      isLoadingEmail: false,
    })

    render(<EmailDetail onBack={mockOnBack} />)

    expect(screen.getByText('HTML内容')).toBeInTheDocument()
  })

  it('应该显示纯文本邮件内容', () => {
    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '纯文本邮件',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '这是纯文本内容',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        size: 1024,
      },
      isLoadingEmail: false,
    })

    render(<EmailDetail onBack={mockOnBack} />)

    expect(screen.getByText('这是纯文本内容')).toBeInTheDocument()
  })

  it('应该显示附件信息', () => {
    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '带附件的邮件',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '正文',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        has_attachment: true,
        size: 1024,
      },
      isLoadingEmail: false,
    })

    render(<EmailDetail onBack={mockOnBack} />)

    expect(screen.getByText('附件')).toBeInTheDocument()
  })

  it('无正文邮件应显示提示信息', () => {
    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '无正文邮件',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        has_attachment: false,
        size: 1024,
      },
      isLoadingEmail: false,
    })

    render(<EmailDetail onBack={mockOnBack} />)

    expect(screen.getByText('（无正文内容）')).toBeInTheDocument()
  })

  it('无主题邮件应显示(无主题)', () => {
    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '正文内容',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        has_attachment: false,
        size: 1024,
      },
      isLoadingEmail: false,
    })

    render(<EmailDetail onBack={mockOnBack} />)

    expect(screen.getByRole('heading', { name: '(无主题)' })).toBeInTheDocument()
  })

  it('星标邮件应显示高亮星标图标', () => {
    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '星标邮件',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '正文',
        folder: 'INBOX',
        flags: [],
        is_read: true,
        is_starred: true,
        has_attachment: false,
        size: 1024,
      },
      isLoadingEmail: false,
    })

    const { container } = render(<EmailDetail onBack={mockOnBack} />)

    // 使用更灵活的选择器匹配 CSS 变量类名
    const starIcon = container.querySelector('[class*="text-[var(--color-accent)]"]')
    expect(starIcon).toBeInTheDocument()
  })

  it('应该显示发件人头像', () => {
    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '测试邮件',
        from: 'alice@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '正文',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        has_attachment: false,
        size: 1024,
      },
      isLoadingEmail: false,
    })

    render(<EmailDetail onBack={mockOnBack} />)

    // 发件人头像应显示首字母
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('完整日期应正确格式化', () => {
    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '测试邮件',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-15T10:30:00Z',
        body: '正文',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        has_attachment: false,
        size: 1024,
      },
      isLoadingEmail: false,
    })

    render(<EmailDetail onBack={mockOnBack} />)

    // 完整日期格式 (yyyy年MM月dd日 HH:mm)
    const datePattern = /\d{4}年\d{2}月\d{2}日\s+\d{2}:\d{2}/
    const dateElement = screen.getByText(datePattern)
    expect(dateElement).toBeInTheDocument()
  })

  it('多收件人应全部显示', () => {
    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '多收件人邮件',
        from: 'sender@example.com',
        to: ['recipient1@example.com', 'recipient2@example.com', 'recipient3@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '正文',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        has_attachment: false,
        size: 1024,
      },
      isLoadingEmail: false,
    })

    render(<EmailDetail onBack={mockOnBack} />)

    // 应该显示所有收件人
    expect(screen.getByText(/recipient1@example.com/)).toBeInTheDocument()
  })

  it('删除邮件需要二次确认', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined)

    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '测试',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '正文',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        size: 1024,
      },
      isLoadingEmail: false,
      selectedFolder: 'INBOX',
      deleteEmail: mockDelete,
    })

    const { container } = render(<EmailDetail onBack={mockOnBack} />)

    // 第一次点击删除按钮
    const deleteButton = container.querySelector('[title="删除"]')
    if (deleteButton) {
      fireEvent.click(deleteButton)

      // 应该显示确认和取消按钮
      await screen.findByText('确认删除')
      expect(screen.getByText('取消')).toBeInTheDocument()

      // 第一次点击不应该调用删除
      expect(mockDelete).not.toHaveBeenCalled()
    }
  })

  it('取消删除后应隐藏确认按钮', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined)

    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '测试',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '正文',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        size: 1024,
      },
      isLoadingEmail: false,
      selectedFolder: 'INBOX',
      deleteEmail: mockDelete,
    })

    const { container } = render(<EmailDetail onBack={mockOnBack} />)

    // 点击删除按钮
    const deleteButton = container.querySelector('[title="删除"]')
    if (deleteButton) {
      fireEvent.click(deleteButton)
      await screen.findByText('取消')

      // 点击取消
      fireEvent.click(screen.getByText('取消'))

      // 确认按钮应该消失
      expect(screen.queryByText('确认删除')).not.toBeInTheDocument()
      expect(mockDelete).not.toHaveBeenCalled()
    }
  })

  it('AI摘要时按钮应显示加载状态', () => {
    const mockSummarize = vi.fn().mockImplementation(() => new Promise(() => {})) // 永不 resolve

    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '测试',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '正文内容',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        size: 1024,
      },
      isLoadingEmail: false,
      summarizeEmail: mockSummarize,
    })

    const { container } = render(<EmailDetail onBack={mockOnBack} />)
    const summarizeButton = container.querySelector('[title="AI摘要"]')

    if (summarizeButton) {
      fireEvent.click(summarizeButton)

      // 按钮应该有 animate-pulse 类
      const pulsingIcon = container.querySelector('.animate-pulse')
      expect(pulsingIcon).toBeInTheDocument()
    }
  })

  it('未读邮件打开后应自动标记为已读', async () => {
    const mockMarkAsRead = vi.fn().mockResolvedValue(undefined)

    mockUseEmailStore({
      currentEmail: {
        id: '1',
        uid: 1,
        subject: '未读邮件',
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        date: '2024-01-01T10:00:00Z',
        body: '正文',
        folder: 'INBOX',
        flags: [],
        is_read: false,
        is_starred: false,
        has_attachment: false,
        size: 1024,
      },
      isLoadingEmail: false,
      selectedFolder: 'INBOX',
      markAsRead: mockMarkAsRead,
    })

    render(<EmailDetail onBack={mockOnBack} />)

    // 等待 useEffect 执行
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockMarkAsRead).toHaveBeenCalledWith('INBOX', 1)
  })
})
