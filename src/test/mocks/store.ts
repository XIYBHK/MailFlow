import { vi } from 'vitest'
import type { EmailSummary, EmailAccount, Email } from '../../types'
import * as emailStoreModule from '../../stores/emailStore'

export const mockAccounts: EmailAccount[] = [
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
]

export const mockEmails: EmailSummary[] = [
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
    preview: '这是第一封测试邮件的预览内容',
    body: '这是第一封测试邮件的正文内容',
  },
  {
    id: '2',
    uid: 2,
    subject: '测试邮件2',
    from: 'sender2@example.com',
    date: '2024-01-02T10:00:00Z',
    is_read: true,
    is_starred: true,
    has_attachment: true,
    category: 'personal',
    preview: '这是第二封测试邮件的预览内容',
    body: '这是第二封测试邮件的正文内容',
  },
]

export const mockEmail: Email = {
  id: '1',
  uid: 1,
  subject: '测试邮件',
  from: 'sender@example.com',
  to: ['recipient@example.com'],
  date: '2024-01-01T10:00:00Z',
  body: '这是测试邮件的正文内容',
  html_body: '<p>这是测试邮件的HTML内容</p>',
  folder: 'INBOX',
  flags: [],
  is_read: false,
  is_starred: false,
  category: 'work',
  has_attachment: false,
  size: 1024,
}

export const defaultStoreState = {
  accounts: mockAccounts,
  currentAccount: mockAccounts[0]!,
  isLoadingAccounts: false,
  emails: mockEmails,
  currentEmail: mockEmail,
  selectedFolder: 'INBOX',
  folders: ['INBOX', '草稿箱', '已发送', '垃圾邮件', '已删除'],
  isLoadingEmails: false,
  isLoadingEmail: false,
  config: null,
  error: null,
  loadAccounts: vi.fn().mockResolvedValue(undefined),
  addAccount: vi.fn().mockResolvedValue(undefined),
  deleteAccount: vi.fn().mockResolvedValue(undefined),
  setCurrentAccount: vi.fn(),
  loadFolders: vi.fn().mockResolvedValue(undefined),
  loadEmails: vi.fn().mockResolvedValue(undefined),
  loadEmailDetail: vi.fn().mockResolvedValue(undefined),
  markAsRead: vi.fn().mockResolvedValue(undefined),
  deleteEmail: vi.fn().mockResolvedValue(undefined),
  moveEmail: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue(undefined),
  classifyEmail: vi.fn().mockResolvedValue('work'),
  summarizeEmail: vi.fn().mockResolvedValue('这是AI生成的摘要'),
  translateText: vi.fn().mockResolvedValue('Translated text'),
  generateReply: vi.fn().mockResolvedValue('Generated reply'),
  loadConfig: vi.fn().mockResolvedValue(undefined),
  updateConfig: vi.fn().mockResolvedValue(undefined),
  setAiApiKey: vi.fn().mockResolvedValue(undefined),
  setError: vi.fn(),
  clearCurrentEmail: vi.fn(),
  setFolder: vi.fn(),
}

export function mockUseEmailStore(overrides: Partial<typeof defaultStoreState> = {}) {
  const mockState = { ...defaultStoreState, ...overrides }
  vi.spyOn(emailStoreModule, 'useEmailStore').mockImplementation((selector) => {
    if (selector) {
      return selector(mockState)
    }
    return mockState
  })
  return mockState
}

export function clearMockUseEmailStore() {
  vi.spyOn(emailStoreModule, 'useEmailStore').mockRestore()
}

export type MockStoreState = typeof defaultStoreState
