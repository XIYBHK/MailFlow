import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'
import { mockUseEmailStore, clearMockUseEmailStore } from './test/mocks/store'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('App 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearMockUseEmailStore()
  })

  it('应该渲染欢迎页面（无账户时）', () => {
    mockUseEmailStore({
      accounts: [],
      currentAccount: null,
    })

    render(<App />)

    expect(screen.getByText('163邮件客户端')).toBeInTheDocument()
    expect(screen.getByText('智能邮件管理，AI驱动的高效办公工具')).toBeInTheDocument()
    expect(screen.getByText('添加邮箱账户')).toBeInTheDocument()
  })

  it('应该渲染主界面（有账户时）', () => {
    mockUseEmailStore({
      accounts: [
        {
          id: '1',
          email: 'test@example.com',
          name: '测试账户',
          imap_server: 'imap.example.com',
          imap_port: 993,
          smtp_server: 'smtp.example.com',
          smtp_port: 465,
          is_default: true,
        },
      ],
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

    render(<App />)

    // 检查是否有多个 INBOX 元素
    const inboxElements = screen.getAllByText('INBOX')
    expect(inboxElements.length).toBeGreaterThan(0)
    expect(inboxElements[0]).toBeInTheDocument()
  })

  it('应该能够切换文件夹', () => {
    const mockSetFolder = vi.fn()
    const mockClearCurrentEmail = vi.fn()

    mockUseEmailStore({
      accounts: [
        {
          id: '1',
          email: 'test@example.com',
          name: '测试账户',
          imap_server: 'imap.example.com',
          imap_port: 993,
          smtp_server: 'smtp.example.com',
          smtp_port: 465,
          is_default: true,
        },
      ],
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
      selectedFolder: 'INBOX',
      folders: ['INBOX', '草稿箱', '已发送', '垃圾邮件', '已删除'],
      setFolder: mockSetFolder,
      clearCurrentEmail: mockClearCurrentEmail,
    })

    render(<App />)

    const draftBoxButton = screen.getByText('草稿箱')
    fireEvent.click(draftBoxButton)

    expect(mockSetFolder).toHaveBeenCalledWith('草稿箱')
    expect(mockClearCurrentEmail).toHaveBeenCalled()
  })

  it('应该能够打开设置模态框', () => {
    mockUseEmailStore({
      accounts: [
        {
          id: '1',
          email: 'test@example.com',
          name: '测试账户',
          imap_server: 'imap.example.com',
          imap_port: 993,
          smtp_server: 'smtp.example.com',
          smtp_port: 465,
          is_default: true,
        },
      ],
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

    render(<App />)

    const settingsButton = screen.getByText('设置')
    fireEvent.click(settingsButton)

    expect(screen.getByText('邮箱账户设置')).toBeInTheDocument()
  })

  it('应该能够打开写邮件模态框', () => {
    mockUseEmailStore({
      accounts: [
        {
          id: '1',
          email: 'test@example.com',
          name: '测试账户',
          imap_server: 'imap.example.com',
          imap_port: 993,
          smtp_server: 'smtp.example.com',
          smtp_port: 465,
          is_default: true,
        },
      ],
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

    render(<App />)

    const composeButton = screen.getByText('写邮件')
    fireEvent.click(composeButton)

    expect(screen.getByText('新邮件')).toBeInTheDocument()
  })

  it('应该显示错误信息', () => {
    mockUseEmailStore({
      accounts: [
        {
          id: '1',
          email: 'test@example.com',
          name: '测试账户',
          imap_server: 'imap.example.com',
          imap_port: 993,
          smtp_server: 'smtp.example.com',
          smtp_port: 465,
          is_default: true,
        },
      ],
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
      error: '连接失败',
    })

    render(<App />)

    expect(screen.getByText('连接失败')).toBeInTheDocument()
  })

  it('应该能够关闭错误提示', () => {
    const mockSetError = vi.fn()

    mockUseEmailStore({
      accounts: [
        {
          id: '1',
          email: 'test@example.com',
          name: '测试账户',
          imap_server: 'imap.example.com',
          imap_port: 993,
          smtp_server: 'smtp.example.com',
          smtp_port: 465,
          is_default: true,
        },
      ],
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
      error: '测试错误',
      setError: mockSetError,
    })

    render(<App />)

    const closeButton = screen.getByText('关闭')
    fireEvent.click(closeButton)

    expect(mockSetError).toHaveBeenCalledWith(null)
  })

  it('应该显示邮件列表空状态', () => {
    mockUseEmailStore({
      accounts: [
        {
          id: '1',
          email: 'test@example.com',
          name: '测试账户',
          imap_server: 'imap.example.com',
          imap_port: 993,
          smtp_server: 'smtp.example.com',
          smtp_port: 465,
          is_default: true,
        },
      ],
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
      emails: [],
      isLoadingEmails: false,
    })

    render(<App />)

    expect(screen.getByText('暂无邮件')).toBeInTheDocument()
  })
})
