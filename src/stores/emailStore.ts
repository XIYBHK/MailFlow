import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import type { Email, EmailSummary, EmailAccount, AppConfig } from '../types'
import { handleError } from '../utils/error'
import { DEFAULT_FOLDERS } from '../constants/email'

interface EmailState {
  // 账户状态
  accounts: EmailAccount[]
  currentAccount: EmailAccount | null
  isLoadingAccounts: boolean

  // 邮件状态
  emails: EmailSummary[]
  currentEmail: Email | null
  selectedFolder: string
  folders: string[]
  isLoadingEmails: boolean
  isLoadingEmail: boolean

  // 配置
  config: AppConfig | null

  // 错误状态
  error: string | null

  // Actions - 账户管理
  loadAccounts: () => Promise<void>
  addAccount: (email: string, password: string, name: string, provider: string) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  setCurrentAccount: (account: EmailAccount | null) => void

  // Actions - 邮件操作
  loadFolders: () => Promise<void>
  loadEmails: (folder: string, limit?: number, offset?: number, forceRefresh?: boolean) => Promise<void>
  loadEmailDetail: (folder: string, uid: number, forceRefresh?: boolean) => Promise<void>
  refreshEmails: () => Promise<void>
  markAsRead: (folder: string, uid: number) => Promise<void>
  deleteEmail: (folder: string, uid: number) => Promise<void>
  moveEmail: (folder: string, uid: number, destFolder: string) => Promise<void>
  sendEmail: (to: string[], subject: string, body: string, isHtml?: boolean) => Promise<void>

  // Actions - AI功能
  classifyEmail: (subject: string, from: string, body: string) => Promise<string>
  summarizeEmail: (content: string, language?: string) => Promise<string>
  translateText: (text: string, targetLang: string) => Promise<string>
  generateReply: (subject: string, from: string, body: string) => Promise<string>

  // Actions - 配置
  loadConfig: () => Promise<void>
  updateConfig: (config: AppConfig) => Promise<void>
  setAiApiKey: (apiKey: string) => Promise<void>

  // Actions - 工具
  setError: (error: string | null) => void
  clearCurrentEmail: () => void
  setFolder: (folder: string) => void
}

export const useEmailStore = create<EmailState>((set, get) => ({
  // 初始状态
  accounts: [],
  currentAccount: null,
  isLoadingAccounts: false,

  emails: [],
  currentEmail: null,
  selectedFolder: 'INBOX',
  folders: DEFAULT_FOLDERS,
  isLoadingEmails: false,
  isLoadingEmail: false,

  config: null,
  error: null,

  // 账户管理
  loadAccounts: async () => {
    set({ isLoadingAccounts: true, error: null })
    try {
      const accounts = await invoke<EmailAccount[]>('list_accounts')

      if (accounts.length === 0) {
        set({
          accounts: [],
          currentAccount: null,
          emails: [],
          isLoadingAccounts: false,
        })
        return
      }

      set({ accounts, isLoadingAccounts: false })

      // 设置默认账户
      const { currentAccount } = get()
      if (!currentAccount) {
        const defaultAccount = accounts.find(a => a.is_default) || accounts[0]
        set({ currentAccount: defaultAccount })
      }
    } catch (error) {
      set({ error: handleError(error), isLoadingAccounts: false })
    }
  },

  addAccount: async (email, password, name, provider) => {
    set({ isLoadingAccounts: true, error: null })
    try {
      const accountId = await invoke<string>('add_account', { email, password, name, provider })
      await get().loadAccounts()

      // 自动设置为当前账户
      const { accounts } = get()
      const newAccount = accounts.find(a => a.id === accountId)
      if (newAccount) {
        set({ currentAccount: newAccount })
      }
    } catch (error) {
      set({ error: handleError(error), isLoadingAccounts: false })
      throw error
    }
  },

  deleteAccount: async id => {
    set({ error: null })
    try {
      await invoke('delete_account', { id })
      await get().loadAccounts()
    } catch (error) {
      set({ error: handleError(error) })
      throw error
    }
  },

  setCurrentAccount: account => {
    set({ currentAccount: account })
  },

  // 邮件操作
  loadFolders: async () => {
    const { currentAccount } = get()
    if (!currentAccount) {
      set({ error: '请先选择邮箱账户' })
      return
    }

    try {
      const folders = await invoke<string[]>('fetch_folders', {
        accountId: currentAccount.id,
      })
      set({ folders })
    } catch (error) {
      set({ error: handleError(error) })
    }
  },

  loadEmails: async (folder, limit = 50, offset = 0, forceRefresh = false) => {
    const { currentAccount, accounts } = get()

    if (!currentAccount) {
      if (accounts.length === 0) {
        set({ error: '请先添加邮箱账户', isLoadingEmails: false, emails: [] })
        return
      }

      // 有账户但没有 currentAccount，自动设置第一个
      const firstAccount = accounts[0]
      if (!firstAccount) {
        set({ error: '没有可用的账户', isLoadingEmails: false })
        return
      }
      set({
        currentAccount: firstAccount,
        isLoadingEmails: true,
        error: null,
        selectedFolder: folder,
      })
      try {
        const emails = await invoke<EmailSummary[]>('fetch_emails', {
          accountId: firstAccount.id,
          folder,
          limit,
          offset,
          forceRefresh,
        })
        set({ emails, isLoadingEmails: false })
      } catch (error) {
        set({ error: handleError(error), isLoadingEmails: false })
      }
      return
    }

    set({ isLoadingEmails: true, error: null, selectedFolder: folder })
    try {
      const emails = await invoke<EmailSummary[]>('fetch_emails', {
        accountId: currentAccount.id,
        folder,
        limit,
        offset,
        forceRefresh,
      })
      set({ emails, isLoadingEmails: false })
    } catch (error) {
      set({ error: handleError(error), isLoadingEmails: false })
    }
  },

  loadEmailDetail: async (folder, uid, forceRefresh = false) => {
    const { currentAccount } = get()
    if (!currentAccount) {
      set({ error: '请先选择邮箱账户' })
      return
    }

    set({ isLoadingEmail: true, error: null })
    try {
      const email = await invoke<Email>('fetch_email_detail', {
        accountId: currentAccount.id,
        folder,
        uid,
        forceRefresh,
      })
      set({ currentEmail: email, isLoadingEmail: false })
    } catch (error) {
      set({ error: handleError(error), isLoadingEmail: false })
    }
  },

  refreshEmails: async () => {
    const { selectedFolder } = get()
    await get().loadEmails(selectedFolder, 50, 0, true)
  },

  markAsRead: async (folder, uid) => {
    const { currentAccount } = get()
    if (!currentAccount) return

    try {
      await invoke('mark_email_read', {
        accountId: currentAccount.id,
        folder,
        uid,
      })

      // 更新本地状态
      set(state => ({
        emails: state.emails.map(e => (e.uid === uid ? { ...e, is_read: true } : e)),
      }))
    } catch (error) {
      set({ error: handleError(error) })
    }
  },

  deleteEmail: async (folder, uid) => {
    const { currentAccount } = get()
    if (!currentAccount) return

    try {
      await invoke('delete_email', {
        accountId: currentAccount.id,
        folder,
        uid,
      })

      // 从列表中移除
      set(state => ({
        emails: state.emails.filter(e => e.uid !== uid),
      }))
    } catch (error) {
      set({ error: handleError(error) })
      throw error
    }
  },

  moveEmail: async (folder, uid, destFolder) => {
    const { currentAccount } = get()
    if (!currentAccount) return

    try {
      await invoke('move_email', {
        accountId: currentAccount.id,
        folder,
        uid,
        destFolder,
      })

      // 从列表中移除
      set(state => ({
        emails: state.emails.filter(e => e.uid !== uid),
      }))
    } catch (error) {
      set({ error: handleError(error) })
      throw error
    }
  },

  sendEmail: async (to, subject, body, isHtml = false) => {
    const { currentAccount } = get()
    if (!currentAccount) {
      throw new Error('请先选择邮箱账户')
    }

    try {
      await invoke('send_email', {
        accountId: currentAccount.id,
        to,
        subject,
        body,
        isHtml,
      })
    } catch (error) {
      set({ error: handleError(error) })
      throw error
    }
  },

  // AI功能
  classifyEmail: async (subject, from, body) => {
    try {
      return await invoke<string>('classify_email_ai', {
        subject,
        from,
        body,
      })
    } catch (error) {
      set({ error: handleError(error) })
      throw error
    }
  },

  summarizeEmail: async (content, language = 'zh') => {
    try {
      return await invoke<string>('summarize_email', {
        content,
        language,
      })
    } catch (error) {
      set({ error: handleError(error) })
      throw error
    }
  },

  translateText: async (text, targetLang) => {
    try {
      return await invoke<string>('translate_text', {
        text,
        targetLang,
      })
    } catch (error) {
      set({ error: handleError(error) })
      throw error
    }
  },

  generateReply: async (subject, from, body) => {
    try {
      return await invoke<string>('generate_reply', {
        subject,
        from,
        body,
      })
    } catch (error) {
      set({ error: handleError(error) })
      throw error
    }
  },

  // 配置
  loadConfig: async () => {
    try {
      const config = await invoke<AppConfig>('get_app_config')
      set({ config })
    } catch (error) {
      set({ error: handleError(error) })
    }
  },

  updateConfig: async config => {
    try {
      await invoke('update_app_config', { config })
      set({ config })
    } catch (error) {
      set({ error: handleError(error) })
      throw error
    }
  },

  setAiApiKey: async apiKey => {
    try {
      await invoke('set_ai_api_key', { apiKey })
      await get().loadConfig()
    } catch (error) {
      set({ error: handleError(error) })
      throw error
    }
  },

  // 工具
  setError: error => {
    set({ error })
  },

  clearCurrentEmail: () => {
    set({ currentEmail: null })
  },

  setFolder: folder => {
    set({ selectedFolder: folder })
  },
}))
