import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { mockUseEmailStore, clearMockUseEmailStore } from '../test/mocks/store'

describe('Sidebar 组件', () => {
  const mockOnFolderChange = vi.fn()
  const mockOnCompose = vi.fn()
  const mockOnSettings = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearMockUseEmailStore()
  })

  it('应该渲染默认文件夹列表', () => {
    mockUseEmailStore({
      folders: ['INBOX', '草稿箱', '已发送', '垃圾邮件', '已删除'],
      selectedFolder: 'INBOX',
    })

    render(
      <Sidebar
        onFolderChange={mockOnFolderChange}
        onCompose={mockOnCompose}
        onSettings={mockOnSettings}
      />
    )

    expect(screen.getByText('INBOX')).toBeInTheDocument()
    expect(screen.getByText('草稿箱')).toBeInTheDocument()
    expect(screen.getByText('已发送')).toBeInTheDocument()
    expect(screen.getByText('垃圾邮件')).toBeInTheDocument()
    expect(screen.getByText('已删除')).toBeInTheDocument()
  })

  it('应该渲染分类标签', () => {
    mockUseEmailStore({})

    render(
      <Sidebar
        onFolderChange={mockOnFolderChange}
        onCompose={mockOnCompose}
        onSettings={mockOnSettings}
      />
    )

    expect(screen.getByText('智能分类')).toBeInTheDocument()
    expect(screen.getByText('工作邮件')).toBeInTheDocument()
    expect(screen.getByText('订阅邮件')).toBeInTheDocument()
    expect(screen.getByText('个人邮件')).toBeInTheDocument()
  })

  it('点击文件夹应该触发 onFolderChange', () => {
    mockUseEmailStore({
      folders: ['INBOX', '草稿箱', '已发送', '垃圾邮件', '已删除'],
      selectedFolder: 'INBOX',
    })

    render(
      <Sidebar
        onFolderChange={mockOnFolderChange}
        onCompose={mockOnCompose}
        onSettings={mockOnSettings}
      />
    )

    const draftBoxButton = screen.getByText('草稿箱')
    fireEvent.click(draftBoxButton)

    expect(mockOnFolderChange).toHaveBeenCalledWith('草稿箱')
  })

  it('点击分类标签应该触发 onFolderChange', () => {
    mockUseEmailStore({})

    render(
      <Sidebar
        onFolderChange={mockOnFolderChange}
        onCompose={mockOnCompose}
        onSettings={mockOnSettings}
      />
    )

    const workButton = screen.getByText('工作邮件')
    fireEvent.click(workButton)

    expect(mockOnFolderChange).toHaveBeenCalledWith('工作邮件')
  })

  it('点击写邮件按钮应该触发 onCompose', () => {
    mockUseEmailStore({})

    render(
      <Sidebar
        onFolderChange={mockOnFolderChange}
        onCompose={mockOnCompose}
        onSettings={mockOnSettings}
      />
    )

    const composeButton = screen.getByText('写邮件')
    fireEvent.click(composeButton)

    expect(mockOnCompose).toHaveBeenCalled()
  })

  it('点击设置按钮应该触发 onSettings', () => {
    mockUseEmailStore({})

    render(
      <Sidebar
        onFolderChange={mockOnFolderChange}
        onCompose={mockOnCompose}
        onSettings={mockOnSettings}
      />
    )

    const settingsButton = screen.getByText('设置')
    fireEvent.click(settingsButton)

    expect(mockOnSettings).toHaveBeenCalled()
  })

  it('应该高亮显示选中的文件夹', () => {
    mockUseEmailStore({
      folders: ['INBOX', '草稿箱', '已发送', '垃圾邮件', '已删除'],
      selectedFolder: '草稿箱',
    })

    render(
      <Sidebar
        onFolderChange={mockOnFolderChange}
        onCompose={mockOnCompose}
        onSettings={mockOnSettings}
      />
    )

    const selectedButton = screen.getByText('草稿箱').closest('button')
    expect(selectedButton).toHaveClass('bg-primary-100')
  })

  it('应该显示当前账户信息', () => {
    mockUseEmailStore({
      currentAccount: {
        id: '1',
        email: 'test@example.com',
        name: '测试账户',
        imap_server: 'imap.example.com',
        imap_port: 993,
        smtp_server: 'smtp.example.com',
        smtp_port: 465,
        is_default: true,
      },
    })

    render(
      <Sidebar
        onFolderChange={mockOnFolderChange}
        onCompose={mockOnCompose}
        onSettings={mockOnSettings}
      />
    )

    expect(screen.getByText('测试账户')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('应该能够展开/收起文件夹列表', () => {
    mockUseEmailStore({
      folders: ['INBOX', '草稿箱', '已发送', '垃圾邮件', '已删除'],
      selectedFolder: 'INBOX',
    })

    render(
      <Sidebar
        onFolderChange={mockOnFolderChange}
        onCompose={mockOnCompose}
        onSettings={mockOnSettings}
      />
    )

    const folderHeader = screen.getByText('邮箱文件夹').parentElement
    expect(folderHeader).toBeInTheDocument()

    const inboxButton = screen.getByText('INBOX')
    expect(inboxButton).toBeInTheDocument()

    fireEvent.click(folderHeader!)

    expect(inboxButton).not.toBeInTheDocument()
  })
})
