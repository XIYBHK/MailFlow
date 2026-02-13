import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Tauri API - 必须在所有导入之前
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { useEmailStore } from './emailStore'
import { invoke } from '@tauri-apps/api/core'

// 获取 mock 的 invoke 函数
const mockInvoke = invoke as unknown as ReturnType<typeof vi.fn>

describe('emailStore', () => {
  // 在每个测试前重置 store 状态
  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks()
    // 重置 store 状态
    useEmailStore.setState({
      accounts: [],
      currentAccount: null,
      isLoadingAccounts: false,
      emails: [],
      currentEmail: null,
      selectedFolder: 'INBOX',
      folders: ['INBOX', '草稿箱', '已发送', '垃圾邮件', '已删除'],
      isLoadingEmails: false,
      isLoadingEmail: false,
      config: null,
      error: null,
    })
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const store = useEmailStore.getState()
      expect(store.accounts).toEqual([])
      expect(store.currentAccount).toBeNull()
      expect(store.isLoadingAccounts).toBe(false)
      expect(store.emails).toEqual([])
      expect(store.currentEmail).toBeNull()
      expect(store.selectedFolder).toBe('INBOX')
      expect(store.folders).toEqual(['INBOX', '草稿箱', '已发送', '垃圾邮件', '已删除'])
      expect(store.isLoadingEmails).toBe(false)
      expect(store.isLoadingEmail).toBe(false)
      expect(store.config).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('账户管理', () => {
    describe('loadAccounts', () => {
      it('应该成功加载账户列表', async () => {
        const mockAccounts = [
          { id: '1', email: 'test@example.com', name: '测试账户', provider: 'gmail', is_default: true },
        ]
        mockInvoke.mockResolvedValue(mockAccounts)

        const store = useEmailStore.getState()
        await store.loadAccounts()

        expect(mockInvoke).toHaveBeenCalledWith('list_accounts')
        expect(useEmailStore.getState().accounts).toEqual(mockAccounts)
        expect(useEmailStore.getState().currentAccount).toEqual(mockAccounts[0])
        expect(useEmailStore.getState().isLoadingAccounts).toBe(false)
        expect(useEmailStore.getState().error).toBeNull()
      })

      it('应该处理加载账户失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('加载失败'))

        const store = useEmailStore.getState()
        await store.loadAccounts()

        expect(useEmailStore.getState().accounts).toEqual([])
        expect(useEmailStore.getState().isLoadingAccounts).toBe(false)
        expect(useEmailStore.getState().error).toBe('加载失败')
      })

      it('应该设置第一个账户为当前账户（如果没有默认账户）', async () => {
        const mockAccounts = [
          { id: '1', email: 'test1@example.com', name: '账户1', provider: 'gmail', is_default: false },
          { id: '2', email: 'test2@example.com', name: '账户2', provider: 'outlook', is_default: false },
        ]
        mockInvoke.mockResolvedValue(mockAccounts)

        const store = useEmailStore.getState()
        await store.loadAccounts()

        expect(useEmailStore.getState().currentAccount).toEqual(mockAccounts[0])
      })

      it('应该优先设置默认账户', async () => {
        const mockAccounts = [
          { id: '1', email: 'test1@example.com', name: '账户1', provider: 'gmail', is_default: false },
          { id: '2', email: 'test2@example.com', name: '账户2', provider: 'outlook', is_default: true },
        ]
        mockInvoke.mockResolvedValue(mockAccounts)

        const store = useEmailStore.getState()
        await store.loadAccounts()

        expect(useEmailStore.getState().currentAccount).toEqual(mockAccounts[1])
      })

      it('应该保持当前账户不变（如果已存在）', async () => {
        const existingAccount = { id: '3', email: 'existing@example.com', name: '现有账户', provider: 'gmail', is_default: false }
        useEmailStore.setState({ currentAccount: existingAccount })

        const mockAccounts = [
          { id: '1', email: 'test1@example.com', name: '账户1', provider: 'gmail', is_default: true },
        ]
        mockInvoke.mockResolvedValue(mockAccounts)

        const store = useEmailStore.getState()
        await store.loadAccounts()

        expect(useEmailStore.getState().currentAccount).toEqual(existingAccount)
      })
    })

    describe('addAccount', () => {
      it('应该成功添加新账户', async () => {
        const newAccountId = 'new-account-id'
        mockInvoke
          .mockResolvedValueOnce(newAccountId)
          .mockResolvedValueOnce([
            { id: newAccountId, email: 'new@example.com', name: '新账户', provider: 'gmail', is_default: false },
          ])

        const store = useEmailStore.getState()
        await store.addAccount('new@example.com', 'password', '新账户', 'gmail')

        expect(mockInvoke).toHaveBeenCalledWith('add_account', {
          email: 'new@example.com',
          password: 'password',
          name: '新账户',
          provider: 'gmail',
        })
        expect(useEmailStore.getState().currentAccount?.id).toBe(newAccountId)
        expect(useEmailStore.getState().isLoadingAccounts).toBe(false)
      })

      it('应该处理添加账户失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('添加失败'))

        const store = useEmailStore.getState()
        await expect(store.addAccount('test@example.com', 'password', '测试', 'gmail')).rejects.toThrow('添加失败')

        expect(useEmailStore.getState().error).toBe('添加失败')
        expect(useEmailStore.getState().isLoadingAccounts).toBe(false)
      })
    })

    describe('deleteAccount', () => {
      it('应该成功删除账户', async () => {
        const mockAccounts = [
          { id: '1', email: 'test@example.com', name: '测试账户', provider: 'gmail', is_default: true },
        ]
        mockInvoke
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(mockAccounts)

        useEmailStore.setState({ accounts: mockAccounts })

        const store = useEmailStore.getState()
        await store.deleteAccount('1')

        expect(mockInvoke).toHaveBeenCalledWith('delete_account', { id: '1' })
        expect(useEmailStore.getState().error).toBeNull()
      })

      it('应该处理删除账户失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('删除失败'))

        const store = useEmailStore.getState()
        await expect(store.deleteAccount('1')).rejects.toThrow('删除失败')

        expect(useEmailStore.getState().error).toBe('删除失败')
      })
    })

    describe('setCurrentAccount', () => {
      it('应该设置当前账户', () => {
        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        const store = useEmailStore.getState()
        store.setCurrentAccount(account)

        expect(useEmailStore.getState().currentAccount).toEqual(account)
      })

      it('应该可以清空当前账户', () => {
        useEmailStore.setState({ currentAccount: { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false } })
        const store = useEmailStore.getState()
        store.setCurrentAccount(null)

        expect(useEmailStore.getState().currentAccount).toBeNull()
      })
    })
  })

  describe('邮件操作', () => {
    describe('loadEmails', () => {
      it('应该成功加载邮件列表（有当前账户）', async () => {
        const mockEmails = [
          { uid: 1, subject: '测试邮件1', from: 'sender1@example.com', date: '2025-01-15', is_read: false },
          { uid: 2, subject: '测试邮件2', from: 'sender2@example.com', date: '2025-01-15', is_read: true },
        ]
        mockInvoke.mockResolvedValue(mockEmails)

        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        useEmailStore.setState({ currentAccount: account })

        const store = useEmailStore.getState()
        await store.loadEmails('INBOX')

        expect(mockInvoke).toHaveBeenCalledWith('fetch_emails', {
          accountId: '1',
          folder: 'INBOX',
          limit: 50,
          offset: 0,
          forceRefresh: false,
        })
        expect(useEmailStore.getState().emails).toEqual(mockEmails)
        expect(useEmailStore.getState().selectedFolder).toBe('INBOX')
        expect(useEmailStore.getState().isLoadingEmails).toBe(false)
      })

      it('应该使用自定义 limit 和 offset', async () => {
        mockInvoke.mockResolvedValue([])

        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        useEmailStore.setState({ currentAccount: account })

        const store = useEmailStore.getState()
        await store.loadEmails('INBOX', 100, 50)

        expect(mockInvoke).toHaveBeenCalledWith('fetch_emails', {
          accountId: '1',
          folder: 'INBOX',
          limit: 100,
          offset: 50,
          forceRefresh: false,
        })
      })

      it('应该处理没有账户的情况', async () => {
        useEmailStore.setState({ accounts: [], currentAccount: null })

        const store = useEmailStore.getState()
        await store.loadEmails('INBOX')

        expect(useEmailStore.getState().error).toBe('请先添加邮箱账户')
        expect(useEmailStore.getState().emails).toEqual([])
      })

      it('应该处理有账户但没有当前账户的情况（自动设置第一个账户）', async () => {
        const mockEmails = [{ uid: 1, subject: '测试', from: 'test@example.com', date: '2025-01-15', is_read: false }]
        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        mockInvoke.mockResolvedValue(mockEmails)

        useEmailStore.setState({ accounts: [account], currentAccount: null })

        const store = useEmailStore.getState()
        await store.loadEmails('INBOX')

        expect(useEmailStore.getState().currentAccount).toEqual(account)
        expect(useEmailStore.getState().emails).toEqual(mockEmails)
      })

      it('应该处理加载邮件失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('加载失败'))

        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        useEmailStore.setState({ currentAccount: account })

        const store = useEmailStore.getState()
        await store.loadEmails('INBOX')

        expect(useEmailStore.getState().error).toBe('加载失败')
        expect(useEmailStore.getState().isLoadingEmails).toBe(false)
      })
    })

    describe('loadEmailDetail', () => {
      it('应该成功加载邮件详情', async () => {
        const mockEmail = {
          uid: 1,
          subject: '测试邮件',
          from: 'sender@example.com',
          to: ['recipient@example.com'],
          date: '2025-01-15',
          body: '邮件内容',
          is_read: false,
        }
        mockInvoke.mockResolvedValue(mockEmail)

        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        useEmailStore.setState({ currentAccount: account })

        const store = useEmailStore.getState()
        await store.loadEmailDetail('INBOX', 1)

        expect(mockInvoke).toHaveBeenCalledWith('fetch_email_detail', {
          accountId: '1',
          folder: 'INBOX',
          uid: 1,
          forceRefresh: false,
        })
        expect(useEmailStore.getState().currentEmail).toEqual(mockEmail)
        expect(useEmailStore.getState().isLoadingEmail).toBe(false)
      })

      it('应该处理没有当前账户的情况', async () => {
        useEmailStore.setState({ currentAccount: null })

        const store = useEmailStore.getState()
        await store.loadEmailDetail('INBOX', 1)

        expect(useEmailStore.getState().error).toBe('请先选择邮箱账户')
      })

      it('应该处理加载邮件详情失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('加载失败'))

        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        useEmailStore.setState({ currentAccount: account })

        const store = useEmailStore.getState()
        await store.loadEmailDetail('INBOX', 1)

        expect(useEmailStore.getState().error).toBe('加载失败')
        expect(useEmailStore.getState().isLoadingEmail).toBe(false)
      })
    })

    describe('markAsRead', () => {
      it('应该成功标记邮件为已读', async () => {
        mockInvoke.mockResolvedValue(undefined)

        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        useEmailStore.setState({
          currentAccount: account,
          emails: [
            { uid: 1, subject: '测试', from: 'test@example.com', date: '2025-01-15', is_read: false },
          ],
        })

        const store = useEmailStore.getState()
        await store.markAsRead('INBOX', 1)

        expect(mockInvoke).toHaveBeenCalledWith('mark_email_read', {
          accountId: '1',
          folder: 'INBOX',
          uid: 1,
        })
        expect(useEmailStore.getState().emails[0].is_read).toBe(true)
      })

      it('应该处理标记已读失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('标记失败'))

        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        useEmailStore.setState({
          currentAccount: account,
          emails: [
            { uid: 1, subject: '测试', from: 'test@example.com', date: '2025-01-15', is_read: false },
          ],
        })

        const store = useEmailStore.getState()
        await store.markAsRead('INBOX', 1)

        expect(useEmailStore.getState().error).toBe('标记失败')
      })

      it('应该在无当前账户时不执行操作', async () => {
        useEmailStore.setState({ currentAccount: null })

        const store = useEmailStore.getState()
        await store.markAsRead('INBOX', 1)

        expect(mockInvoke).not.toHaveBeenCalled()
      })
    })

    describe('deleteEmail', () => {
      it('应该成功删除邮件', async () => {
        mockInvoke.mockResolvedValue(undefined)

        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        useEmailStore.setState({
          currentAccount: account,
          emails: [
            { uid: 1, subject: '测试', from: 'test@example.com', date: '2025-01-15', is_read: false },
            { uid: 2, subject: '测试2', from: 'test2@example.com', date: '2025-01-15', is_read: false },
          ],
        })

        const store = useEmailStore.getState()
        await store.deleteEmail('INBOX', 1)

        expect(mockInvoke).toHaveBeenCalledWith('delete_email', {
          accountId: '1',
          folder: 'INBOX',
          uid: 1,
        })
        expect(useEmailStore.getState().emails).toHaveLength(1)
        expect(useEmailStore.getState().emails[0].uid).toBe(2)
      })

      it('应该处理删除邮件失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('删除失败'))

        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        useEmailStore.setState({
          currentAccount: account,
          emails: [
            { uid: 1, subject: '测试', from: 'test@example.com', date: '2025-01-15', is_read: false },
          ],
        })

        const store = useEmailStore.getState()
        await expect(store.deleteEmail('INBOX', 1)).rejects.toThrow('删除失败')

        expect(useEmailStore.getState().error).toBe('删除失败')
      })
    })

    describe('sendEmail', () => {
      it('应该成功发送邮件', async () => {
        mockInvoke.mockResolvedValue(undefined)

        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        useEmailStore.setState({ currentAccount: account })

        const store = useEmailStore.getState()
        await store.sendEmail(['recipient@example.com'], '测试主题', '邮件内容')

        expect(mockInvoke).toHaveBeenCalledWith('send_email', {
          accountId: '1',
          to: ['recipient@example.com'],
          subject: '测试主题',
          body: '邮件内容',
          isHtml: false,
        })
      })

      it('应该发送 HTML 邮件', async () => {
        mockInvoke.mockResolvedValue(undefined)

        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        useEmailStore.setState({ currentAccount: account })

        const store = useEmailStore.getState()
        await store.sendEmail(['recipient@example.com'], '测试主题', '<p>HTML内容</p>', true)

        expect(mockInvoke).toHaveBeenCalledWith('send_email', {
          accountId: '1',
          to: ['recipient@example.com'],
          subject: '测试主题',
          body: '<p>HTML内容</p>',
          isHtml: true,
        })
      })

      it('应该在无当前账户时抛出错误', async () => {
        useEmailStore.setState({ currentAccount: null })

        const store = useEmailStore.getState()
        await expect(store.sendEmail(['recipient@example.com'], '主题', '内容')).rejects.toThrow('请先选择邮箱账户')
      })

      it('应该处理发送邮件失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('发送失败'))

        const account = { id: '1', email: 'test@example.com', name: '测试', provider: 'gmail', is_default: false }
        useEmailStore.setState({ currentAccount: account })

        const store = useEmailStore.getState()
        await expect(store.sendEmail(['recipient@example.com'], '主题', '内容')).rejects.toThrow('发送失败')

        expect(useEmailStore.getState().error).toBe('发送失败')
      })
    })
  })

  describe('AI 功能', () => {
    describe('classifyEmail', () => {
      it('应该成功分类邮件', async () => {
        mockInvoke.mockResolvedValue('work')

        const store = useEmailStore.getState()
        const result = await store.classifyEmail('测试主题', 'sender@example.com', '邮件内容')

        expect(result).toBe('work')
        expect(mockInvoke).toHaveBeenCalledWith('classify_email_ai', {
          subject: '测试主题',
          from: 'sender@example.com',
          body: '邮件内容',
        })
      })

      it('应该处理分类失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('分类失败'))

        const store = useEmailStore.getState()
        await expect(store.classifyEmail('主题', 'from', 'content')).rejects.toThrow('分类失败')

        expect(useEmailStore.getState().error).toBe('分类失败')
      })
    })

    describe('summarizeEmail', () => {
      it('应该成功总结邮件（默认中文）', async () => {
        mockInvoke.mockResolvedValue('邮件摘要')

        const store = useEmailStore.getState()
        const result = await store.summarizeEmail('长邮件内容...')

        expect(result).toBe('邮件摘要')
        expect(mockInvoke).toHaveBeenCalledWith('summarize_email', {
          content: '长邮件内容...',
          language: 'zh',
        })
      })

      it('应该支持指定语言', async () => {
        mockInvoke.mockResolvedValue('Email summary')

        const store = useEmailStore.getState()
        const result = await store.summarizeEmail('Long email content...', 'en')

        expect(result).toBe('Email summary')
        expect(mockInvoke).toHaveBeenCalledWith('summarize_email', {
          content: 'Long email content...',
          language: 'en',
        })
      })

      it('应该处理总结失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('总结失败'))

        const store = useEmailStore.getState()
        await expect(store.summarizeEmail('内容')).rejects.toThrow('总结失败')

        expect(useEmailStore.getState().error).toBe('总结失败')
      })
    })

    describe('translateText', () => {
      it('应该成功翻译文本', async () => {
        mockInvoke.mockResolvedValue('翻译结果')

        const store = useEmailStore.getState()
        const result = await store.translateText('Hello', 'zh')

        expect(result).toBe('翻译结果')
        expect(mockInvoke).toHaveBeenCalledWith('translate_text', {
          text: 'Hello',
          targetLang: 'zh',
        })
      })

      it('应该处理翻译失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('翻译失败'))

        const store = useEmailStore.getState()
        await expect(store.translateText('Hello', 'zh')).rejects.toThrow('翻译失败')

        expect(useEmailStore.getState().error).toBe('翻译失败')
      })
    })

    describe('generateReply', () => {
      it('应该成功生成回复', async () => {
        mockInvoke.mockResolvedValue('生成的回复内容')

        const store = useEmailStore.getState()
        const result = await store.generateReply('主题', 'sender@example.com', '原邮件内容')

        expect(result).toBe('生成的回复内容')
        expect(mockInvoke).toHaveBeenCalledWith('generate_reply', {
          subject: '主题',
          from: 'sender@example.com',
          body: '原邮件内容',
        })
      })

      it('应该处理生成回复失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('生成失败'))

        const store = useEmailStore.getState()
        await expect(store.generateReply('主题', 'from', '内容')).rejects.toThrow('生成失败')

        expect(useEmailStore.getState().error).toBe('生成失败')
      })
    })
  })

  describe('配置管理', () => {
    describe('loadConfig', () => {
      it('应该成功加载配置', async () => {
        const mockConfig = { ai_api_key: 'test-key', ai_provider: 'openai' }
        mockInvoke.mockResolvedValue(mockConfig)

        const store = useEmailStore.getState()
        await store.loadConfig()

        expect(mockInvoke).toHaveBeenCalledWith('get_app_config')
        expect(useEmailStore.getState().config).toEqual(mockConfig)
      })

      it('应该处理加载配置失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('加载配置失败'))

        const store = useEmailStore.getState()
        await store.loadConfig()

        expect(useEmailStore.getState().error).toBe('加载配置失败')
      })
    })

    describe('updateConfig', () => {
      it('应该成功更新配置', async () => {
        mockInvoke.mockResolvedValue(undefined)

        const newConfig = { ai_api_key: 'new-key', ai_provider: 'anthropic' }
        const store = useEmailStore.getState()
        await store.updateConfig(newConfig)

        expect(mockInvoke).toHaveBeenCalledWith('update_app_config', { config: newConfig })
        expect(useEmailStore.getState().config).toEqual(newConfig)
      })

      it('应该处理更新配置失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('更新配置失败'))

        const store = useEmailStore.getState()
        await expect(store.updateConfig({ ai_api_key: 'key', ai_provider: 'openai' })).rejects.toThrow('更新配置失败')

        expect(useEmailStore.getState().error).toBe('更新配置失败')
      })
    })

    describe('setAiApiKey', () => {
      it('应该成功设置 API 密钥', async () => {
        const mockConfig = { ai_api_key: 'new-api-key', ai_provider: 'openai' }
        mockInvoke
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(mockConfig)

        const store = useEmailStore.getState()
        await store.setAiApiKey('new-api-key')

        expect(mockInvoke).toHaveBeenCalledWith('set_ai_api_key', { apiKey: 'new-api-key' })
        expect(mockInvoke).toHaveBeenCalledWith('get_app_config')
        expect(useEmailStore.getState().config).toEqual(mockConfig)
      })

      it('应该处理设置 API 密钥失败的情况', async () => {
        mockInvoke.mockRejectedValue(new Error('设置密钥失败'))

        const store = useEmailStore.getState()
        await expect(store.setAiApiKey('key')).rejects.toThrow('设置密钥失败')

        expect(useEmailStore.getState().error).toBe('设置密钥失败')
      })
    })
  })

  describe('工具方法', () => {
    describe('setError', () => {
      it('应该设置错误消息', () => {
        const store = useEmailStore.getState()
        store.setError('测试错误')

        expect(useEmailStore.getState().error).toBe('测试错误')
      })

      it('应该可以清空错误', () => {
        useEmailStore.setState({ error: '现有错误' })
        const store = useEmailStore.getState()
        store.setError(null)

        expect(useEmailStore.getState().error).toBeNull()
      })
    })

    describe('clearCurrentEmail', () => {
      it('应该清空当前邮件', () => {
        useEmailStore.setState({
          currentEmail: { uid: 1, subject: '测试', from: 'test@example.com', to: [], date: '2025-01-15', body: '内容' },
        })
        const store = useEmailStore.getState()
        store.clearCurrentEmail()

        expect(useEmailStore.getState().currentEmail).toBeNull()
      })
    })

    describe('setFolder', () => {
      it('应该设置选中的文件夹', () => {
        const store = useEmailStore.getState()
        store.setFolder('已发送')

        expect(useEmailStore.getState().selectedFolder).toBe('已发送')
      })
    })
  })
})
