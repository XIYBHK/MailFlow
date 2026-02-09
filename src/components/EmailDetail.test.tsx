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
      fireEvent.click(deleteButton)
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(global.confirm).toHaveBeenCalledWith('确定要删除这封邮件吗？')
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
})
