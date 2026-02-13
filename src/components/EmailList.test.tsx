import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmailList } from './EmailList'
import { mockUseEmailStore, clearMockUseEmailStore } from '../test/mocks/store'

describe('EmailList 组件', () => {
  const mockOnEmailSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearMockUseEmailStore()
  })

  it('应该渲染邮件列表', () => {
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 1,
          subject: '测试邮件1',
          from: 'sender1@example.com',
          date: '2024-01-01T10:00:00Z',
          is_read: false,
          is_starred: false,
          has_attachment: false,
          category: 'work',
          preview: '预览内容',
          body: '正文内容',
        },
        {
          id: '2',
          uid: 2,
          subject: '测试邮件2',
          from: 'sender2@example.com',
          date: '2024-01-02T10:00:00Z',
          is_read: true,
          is_starred: false,
          has_attachment: false,
          category: 'personal',
          preview: '预览内容2',
          body: '正文内容2',
        },
      ],
      isLoadingEmails: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    expect(screen.getByText('测试邮件1')).toBeInTheDocument()
    expect(screen.getByText('测试邮件2')).toBeInTheDocument()
    expect(screen.getByText('sender1@example.com')).toBeInTheDocument()
    expect(screen.getByText('sender2@example.com')).toBeInTheDocument()
  })

  it('应该显示邮件摘要信息', () => {
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 1,
          subject: '测试邮件',
          from: 'sender@example.com',
          date: '2024-01-01T10:00:00Z',
          is_read: false,
          is_starred: false,
          has_attachment: false,
          preview: '这是邮件的预览内容',
          body: '正文',
        },
      ],
      isLoadingEmails: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    expect(screen.getByText('这是邮件的预览内容')).toBeInTheDocument()
  })

  it('点击邮件应该触发 onEmailSelect', () => {
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 123,
          subject: '测试邮件',
          from: 'sender@example.com',
          date: '2024-01-01T10:00:00Z',
          is_read: false,
          is_starred: false,
          has_attachment: false,
          preview: '预览',
          body: '正文',
        },
      ],
      isLoadingEmails: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    const emailItem = screen.getByText('测试邮件').closest('div')
    fireEvent.click(emailItem!)

    expect(mockOnEmailSelect).toHaveBeenCalledWith(123)
  })

  it('应该正确显示分类标签', () => {
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 1,
          subject: '工作邮件',
          from: 'sender@example.com',
          date: '2024-01-01T10:00:00Z',
          is_read: false,
          is_starred: false,
          has_attachment: false,
          category: 'work',
          preview: '预览',
          body: '正文',
        },
      ],
      isLoadingEmails: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    expect(screen.getByText('工作')).toBeInTheDocument()
  })

  it('应该显示未读邮件标记', () => {
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 1,
          subject: '未读邮件',
          from: 'sender@example.com',
          date: '2024-01-01T10:00:00Z',
          is_read: false,
          is_starred: false,
          has_attachment: false,
          preview: '预览',
          body: '正文',
        },
      ],
      isLoadingEmails: false,
    })

    const { container } = render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    // 使用更灵活的选择器匹配 CSS 变量类名
    const unreadDot = container.querySelector('[class*="bg-[var(--color-primary)]"]')
    expect(unreadDot).toBeInTheDocument()
  })

  it('应该显示附件标记', () => {
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 1,
          subject: '带附件的邮件',
          from: 'sender@example.com',
          date: '2024-01-01T10:00:00Z',
          is_read: true,
          is_starred: false,
          has_attachment: true,
          preview: '预览',
          body: '正文',
        },
      ],
      isLoadingEmails: false,
    })

    const { container } = render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    const attachmentIcon = container.querySelector('[class*="paperclip"]')
    expect(attachmentIcon).toBeInTheDocument()
  })

  it('应该显示星标邮件', () => {
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 1,
          subject: '星标邮件',
          from: 'sender@example.com',
          date: '2024-01-01T10:00:00Z',
          is_read: true,
          is_starred: true,
          has_attachment: false,
          preview: '预览',
          body: '正文',
        },
      ],
      isLoadingEmails: false,
    })

    const { container } = render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    // 使用更灵活的选择器匹配 CSS 变量类名
    const starIcon = container.querySelector('[class*="text-[var(--color-accent)]"]')
    expect(starIcon).toBeInTheDocument()
  })

  it('应该高亮显示选中的邮件', () => {
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 123,
          subject: '选中的邮件',
          from: 'sender@example.com',
          date: '2024-01-01T10:00:00Z',
          is_read: true,
          is_starred: false,
          has_attachment: false,
          preview: '预览',
          body: '正文',
        },
      ],
      isLoadingEmails: false,
    })

    const { container } = render(<EmailList onEmailSelect={mockOnEmailSelect} selectedUid={123} />)

    // 找到带有 bg-active 类的元素
    const emailItem = container.querySelector('[class*="bg-[var(--color-bg-active)]"]')
    expect(emailItem).toBeInTheDocument()
  })

  it('空状态应该显示提示信息', () => {
    mockUseEmailStore({
      emails: [],
      isLoadingEmails: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    expect(screen.getByText('暂无邮件')).toBeInTheDocument()
  })

  it('加载状态应该显示加载动画', () => {
    mockUseEmailStore({
      emails: [],
      isLoadingEmails: true,
    })

    const { container } = render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('无主题邮件应显示(无主题)', () => {
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 1,
          subject: '',
          from: 'sender@example.com',
          date: '2024-01-01T10:00:00Z',
          is_read: false,
          is_starred: false,
          has_attachment: false,
          preview: '预览内容',
          body: '正文',
        },
      ],
      isLoadingEmails: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    expect(screen.getByText('(无主题)')).toBeInTheDocument()
  })

  it('没有预览内容时应该使用正文截取', () => {
    const longBody = '这是一段很长的正文内容，用于测试正文截取功能是否正常工作。'.repeat(5)
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 1,
          subject: '测试邮件',
          from: 'sender@example.com',
          date: '2024-01-01T10:00:00Z',
          is_read: false,
          is_starred: false,
          has_attachment: false,
          preview: '',
          body: longBody,
        },
      ],
      isLoadingEmails: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    // 验证截取的正文内容显示
    expect(screen.getByText(/这是一段很长的正文内容/)).toBeInTheDocument()
  })

  it('没有账户时应显示添加账户提示', () => {
    mockUseEmailStore({
      emails: [],
      accounts: [],
      currentAccount: null,
      isLoadingEmails: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    expect(screen.getByText('还没有添加邮箱账户')).toBeInTheDocument()
    expect(screen.getByText('请点击右上角的设置按钮添加账户')).toBeInTheDocument()
  })

  it('有账户但没有邮件时应显示暂无邮件', () => {
    mockUseEmailStore({
      emails: [],
      accounts: [{ id: '1', email: 'test@example.com', name: '测试', is_default: true, imap_server: '', imap_port: 993, smtp_server: '', smtp_port: 465 }],
      currentAccount: { id: '1', email: 'test@example.com', name: '测试', is_default: true, imap_server: '', imap_port: 993, smtp_server: '', smtp_port: 465 },
      isLoadingEmails: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    expect(screen.getByText('暂无邮件')).toBeInTheDocument()
  })

  it('未读邮件应有特殊的背景样式', () => {
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 1,
          subject: '未读邮件',
          from: 'sender@example.com',
          date: '2024-01-01T10:00:00Z',
          is_read: false,
          is_starred: false,
          has_attachment: false,
          preview: '预览',
          body: '正文',
        },
      ],
      isLoadingEmails: false,
    })

    const { container } = render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    // 未读邮件应该有背景色
    const unreadBg = container.querySelector('[class*="bg-[var(--color-bg-tertiary)]"]')
    expect(unreadBg).toBeInTheDocument()
  })

  it('邮件日期应正确格式化显示', () => {
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 1,
          subject: '测试邮件',
          from: 'sender@example.com',
          date: '2024-01-15T10:30:00Z',
          is_read: false,
          is_starred: false,
          has_attachment: false,
          preview: '预览',
          body: '正文',
        },
      ],
      isLoadingEmails: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    // 日期应该被格式化 (MM/DD HH:mm 格式)
    const datePattern = /\d{2}\/\d{2}\s+\d{2}:\d{2}/
    const dateElement = screen.getByText(datePattern)
    expect(dateElement).toBeInTheDocument()
  })

  it('多个邮件应全部显示', () => {
    mockUseEmailStore({
      emails: [
        {
          id: '1',
          uid: 1,
          subject: '邮件1',
          from: 'sender1@example.com',
          date: '2024-01-01T10:00:00Z',
          is_read: false,
          is_starred: false,
          has_attachment: false,
          preview: '预览1',
          body: '正文1',
        },
        {
          id: '2',
          uid: 2,
          subject: '邮件2',
          from: 'sender2@example.com',
          date: '2024-01-02T10:00:00Z',
          is_read: true,
          is_starred: false,
          has_attachment: false,
          preview: '预览2',
          body: '正文2',
        },
        {
          id: '3',
          uid: 3,
          subject: '邮件3',
          from: 'sender3@example.com',
          date: '2024-01-03T10:00:00Z',
          is_read: false,
          is_starred: true,
          has_attachment: true,
          preview: '预览3',
          body: '正文3',
        },
      ],
      isLoadingEmails: false,
    })

    render(<EmailList onEmailSelect={mockOnEmailSelect} />)

    expect(screen.getByText('邮件1')).toBeInTheDocument()
    expect(screen.getByText('邮件2')).toBeInTheDocument()
    expect(screen.getByText('邮件3')).toBeInTheDocument()
  })
})
