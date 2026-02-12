// 邮件类型定义
export interface Email {
  id: string
  uid: number
  subject: string
  from: string
  to: string[]
  date: string
  body: string
  html_body?: string
  folder: string
  flags: string[]
  is_read: boolean
  is_starred: boolean
  category?: string
  has_attachment: boolean
  size: number
}

export interface EmailSummary {
  id: string
  uid: number
  subject: string
  from: string
  date: string
  is_read: boolean
  is_starred: boolean
  has_attachment: boolean
  category?: string
  preview: string
  body: string
}

export interface EmailAccount {
  id: string
  email: string
  imap_server: string
  imap_port: number
  smtp_server: string
  smtp_port: number
  name: string
  is_default: boolean
}

/// 用于添加账户时的数据（包含密码）
export interface AddAccountRequest {
  email: string
  password: string
  name: string
  provider: '163' | 'qq' | 'gmail'
}

export interface AppConfig {
  accounts: string[]
  default_account_id?: string
  ai_config: AiConfig
  ui_config: UiConfig
}

export interface AiConfig {
  zhipu_api_key?: string
  zhipu_api_base: string
  zhipu_model: string
  auto_classify: boolean
  auto_summarize: boolean
  summary_language: string
}

export interface UiConfig {
  theme: string
  language: string
  emails_per_page: number
  show_preview: boolean
  font_size: number
}

export type EmailCategory = 'spam' | 'ads' | 'subscription' | 'work' | 'personal' | 'other'

export interface FilterRule {
  id: string
  name: string
  conditions: FilterCondition[]
  actions: FilterAction[]
  enabled: boolean
}

export interface FilterCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'date'
  operator: 'contains' | 'notContains' | 'equals' | 'notEquals' | 'regex'
  value: string
}

export type FilterAction =
  | { type: 'moveToFolder'; folder: string }
  | { type: 'markAsRead' }
  | { type: 'markAsStarred' }
  | { type: 'delete' }
  | { type: 'addTag'; tag: string }
