import React from 'react'
import { useEmailStore } from '../stores/emailStore'
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Tag,
  Archive,
  ShieldAlert,
  Settings,
  Plus,
  ChevronDown,
  Sparkles,
} from 'lucide-react'

interface SidebarProps {
  onFolderChange: (folder: string) => void
  onCompose: () => void
  onSettings: () => void
}

export const Sidebar: React.FC<SidebarProps> = React.memo(
  ({ onFolderChange, onCompose, onSettings }) => {
    const { folders, selectedFolder, currentAccount, accounts } = useEmailStore()
    const [isExpanded, setIsExpanded] = React.useState(true)

    const folderIcons: Record<string, React.ReactNode> = {
      INBOX: <Inbox className="w-[18px] h-[18px]" />,
      草稿箱: <FileText className="w-[18px] h-[18px]" />,
      已发送: <Send className="w-[18px] h-[18px]" />,
      已删除: <Trash2 className="w-[18px] h-[18px]" />,
      垃圾邮件: <ShieldAlert className="w-[18px] h-[18px]" />,
      订阅邮件: <Tag className="w-[18px] h-[18px]" />,
      工作邮件: <Archive className="w-[18px] h-[18px]" />,
    }

    return (
      <div className="w-64 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-light)] flex flex-col">
        {/* Logo 和写邮件按钮 */}
        <div className="p-4 border-b border-[var(--color-border-light)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-[var(--color-text-primary)] text-sm">MailFlow</h1>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">智能邮件助手</p>
            </div>
          </div>

          <button
            onClick={onCompose}
            className="
              w-full flex items-center justify-center gap-2
              px-4 py-2.5 rounded-xl
              bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)]
              hover:from-[var(--color-primary-dark)] hover:to-[var(--color-primary-800)]
              text-white text-sm font-medium
              shadow-sm hover:shadow-md
              transition-all duration-200 ease-out
              btn-interactive
            "
          >
            <Plus className="w-4 h-4" />
            写邮件
          </button>
        </div>

        {/* 当前账户 */}
        {currentAccount && (
          <div className="p-4 border-b border-[var(--color-border-light)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)] flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {currentAccount.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {currentAccount.name}
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)] truncate">
                  {currentAccount.email}
                </div>
              </div>
            </div>

            {/* 账户切换 */}
            {accounts.length > 1 && (
              <button
                className="
                  mt-3 w-full text-left px-3 py-2
                  text-xs text-[var(--color-text-secondary)]
                  rounded-lg
                  hover:bg-[var(--color-bg-hover)]
                  transition-colors duration-150
                "
                onClick={() => {
                  /* TODO: 打开账户切换器 */
                }}
              >
                切换账户 ({accounts.length})
              </button>
            )}
          </div>
        )}

        {/* 文件夹列表 */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div
            className="flex items-center justify-between mb-2 px-2 cursor-pointer group"
            onClick={() => {
              setIsExpanded(!isExpanded)
            }}
          >
            <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
              邮箱文件夹
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[var(--color-text-tertiary)] transition-transform duration-200 ${
                isExpanded ? '' : '-rotate-90'
              }`}
            />
          </div>

          {isExpanded && (
            <ul className="space-y-0.5">
              {folders.map((folder, index) => (
                <li
                  key={folder}
                  className="animate-slide-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <button
                    onClick={() => {
                      onFolderChange(folder)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg
                      text-sm transition-all duration-150
                      ${
                        selectedFolder === folder
                          ? 'bg-[var(--color-bg-active)] text-[var(--color-primary)] font-medium shadow-sm'
                          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
                      }
                    `}
                  >
                    <span className={selectedFolder === folder ? 'text-[var(--color-primary)]' : ''}>
                      {folderIcons[folder] || <Inbox className="w-[18px] h-[18px]" />}
                    </span>
                    <span className="flex-1 text-left">{folder}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* 分类标签 */}
          <div className="mt-6">
            <div className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2 px-2">
              智能分类
            </div>
            <ul className="space-y-0.5">
              {[
                { name: '工作邮件', gradient: 'from-purple-500 to-purple-600' },
                { name: '订阅邮件', gradient: 'from-blue-500 to-blue-600' },
                { name: '个人邮件', gradient: 'from-emerald-500 to-emerald-600' },
              ].map((category, index) => (
                <li
                  key={category.name}
                  className="animate-slide-in"
                  style={{ animationDelay: `${(folders.length + index) * 30}ms` }}
                >
                  <button
                    onClick={() => {
                      onFolderChange(category.name)
                    }}
                    className="
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg
                      text-sm text-[var(--color-text-secondary)]
                      hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]
                      transition-all duration-150
                    "
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${category.gradient}`}
                    />
                    <span>{category.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* 底部设置按钮 */}
        <div className="p-3 border-t border-[var(--color-border-light)]">
          <button
            onClick={onSettings}
            className="
              w-full flex items-center gap-3 px-3 py-2 rounded-lg
              text-sm text-[var(--color-text-secondary)]
              hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]
              transition-all duration-150
            "
          >
            <Settings className="w-[18px] h-[18px]" />
            <span>设置</span>
          </button>
        </div>
      </div>
    )
  }
)
