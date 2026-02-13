import React from 'react'
import { useEmailStore } from '../stores/emailStore'
import { Mail, Star, Paperclip, Clock } from 'lucide-react'
import { getCategoryStyles, getCategoryLabel, formatEmailDate } from '../utils/email'

interface EmailListProps {
  onEmailSelect: (uid: number) => void
  selectedUid?: number
}

export const EmailList: React.FC<EmailListProps> = React.memo(({ onEmailSelect, selectedUid }) => {
  const { emails, isLoadingEmails, loadEmails, selectedFolder, accounts, currentAccount } = useEmailStore()

  React.useEffect(() => {
    if (accounts.length > 0 && currentAccount) {
      void loadEmails(selectedFolder)
    }
  }, [selectedFolder, loadEmails, accounts.length, currentAccount])

  if (isLoadingEmails && emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--color-border)]"></div>
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-[var(--color-primary)] animate-spin"></div>
        </div>
      </div>
    )
  }

  if (emails.length === 0) {
    if (accounts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-bg-secondary)] flex items-center justify-center mb-4">
            <Mail className="w-10 h-10 opacity-50" />
          </div>
          <p className="text-base font-medium mb-1">还没有添加邮箱账户</p>
          <p className="text-sm opacity-75">请点击右上角的设置按钮添加账户</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] animate-fade-in">
        <div className="w-16 h-16 rounded-xl bg-[var(--color-bg-secondary)] flex items-center justify-center mb-3">
          <Mail className="w-8 h-8 opacity-50" />
        </div>
        <p className="text-base font-medium">暂无邮件</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="space-y-2">
        {emails.map((email, index) => (
          <div
            key={email.id}
            onClick={() => {
              onEmailSelect(email.uid)
            }}
            className={`
              email-item group relative
              p-4 rounded-xl cursor-pointer
              card-hover gradient-border
              ${!email.is_read ? 'bg-[var(--color-bg-tertiary)]' : 'bg-transparent'}
              ${selectedUid === email.uid ? 'active bg-[var(--color-bg-active)] shadow-sm' : 'hover:bg-[var(--color-bg-hover)]'}
            `}
            style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
          >
            <div className="flex items-start gap-3">
              {/* 未读标记 */}
              {!email.is_read && (
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] mt-2.5 flex-shrink-0 unread-dot" />
              )}

              {/* 头像 */}
              <div
                className={`
                  w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center
                  text-white text-sm font-semibold
                  ${!email.is_read
                    ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)]'
                    : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                  }
                `}
              >
                {email.from.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                {/* 发件人和日期 */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`
                      text-sm truncate
                      ${!email.is_read ? 'font-semibold text-[var(--color-text-primary)]' : 'font-medium text-[var(--color-text-secondary)]'}
                    `}
                  >
                    {email.from}
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1 flex-shrink-0 ml-2 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Clock className="w-3 h-3" />
                    {formatEmailDate(email.date)}
                  </span>
                </div>

                {/* 主题 */}
                <div
                  className={`
                    text-sm mb-1.5 truncate leading-snug
                    ${!email.is_read ? 'font-medium text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}
                  `}
                >
                  {email.subject || '(无主题)'}
                </div>

                {/* 预览和标签 */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-xs text-[var(--color-text-tertiary)] truncate leading-relaxed">
                    {email.preview || email.body.substring(0, 100)}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* 附件标记 */}
                    {email.has_attachment && (
                      <div className="p-1 rounded-md bg-[var(--color-bg-secondary)] group-hover:bg-[var(--color-bg-hover)] transition-colors">
                        <Paperclip className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                      </div>
                    )}

                    {/* 星标 */}
                    {email.is_starred && (
                      <Star className="w-4 h-4 text-[var(--color-accent)] fill-current" />
                    )}

                    {/* 分类标签 */}
                    {email.category && (
                      <span
                        className={`
                          px-2 py-0.5 text-[10px] font-medium rounded-full text-white
                          tag-${email.category}
                        `}
                      >
                        {getCategoryLabel(email.category)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 选中状态指示器 */}
            {selectedUid === email.uid && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-full bg-[var(--color-primary)]" />
            )}
          </div>
        ))}
      </div>

      {/* 加载更多 */}
      {isLoadingEmails && emails.length > 0 && (
        <div className="p-4 flex justify-center">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-border)]"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-primary)] animate-spin"></div>
          </div>
        </div>
      )}
    </div>
  )
})
