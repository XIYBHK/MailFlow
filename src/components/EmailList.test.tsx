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

    const unreadDot = container.querySelector('.bg-primary-500')
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

    const starIcon = container.querySelector('.text-yellow-500')
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

    // 找到带有 bg-primary-50 类的元素
    const emailItem = container.querySelector('.bg-primary-50')
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
})
