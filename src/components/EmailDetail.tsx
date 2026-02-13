import React from 'react'
import { useEmailStore } from '../stores/emailStore'
import { ArrowLeft, Star, Trash2, Reply, Forward, Sparkles, Languages, Mail, Paperclip } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { formatFullDate } from '../utils/email'

export const EmailDetail: React.FC<{ onBack: () => void; uid?: number }> = React.memo(({ onBack, uid }) => {
  const {
    currentEmail,
    isLoadingEmail,
    selectedFolder,
    loadEmailDetail,
    markAsRead,
    deleteEmail,
    summarizeEmail,
    translateText,
  } = useEmailStore()
  const [aiSummary, setAiSummary] = React.useState<string>('')
  const [isSummarizing, setIsSummarizing] = React.useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false)

  React.useEffect(() => {
    if (uid) {
      void loadEmailDetail(selectedFolder, uid)
    }
  }, [uid, selectedFolder, loadEmailDetail])

  React.useEffect(() => {
    if (currentEmail && !currentEmail.is_read) {
      void markAsRead(selectedFolder, currentEmail.uid)
    }
  }, [currentEmail, markAsRead, selectedFolder])

  const handleSummarize = React.useCallback(async () => {
    if (!currentEmail) return
    setIsSummarizing(true)
    try {
      const summary = await summarizeEmail(currentEmail.body)
      setAiSummary(summary)
    } catch (error) {
      console.error('Summary failed:', error)
    } finally {
      setIsSummarizing(false)
    }
  }, [currentEmail, summarizeEmail])

  const handleTranslate = React.useCallback(async () => {
    if (!currentEmail) return
    try {
      const translated = await translateText(currentEmail.body, 'en')
      setAiSummary(`英文翻译:\n\n${translated}`)
    } catch (error) {
      console.error('Translation failed:', error)
    }
  }, [currentEmail, translateText])

  const handleDelete = React.useCallback(async () => {
    if (!currentEmail) return
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true)
      return
    }
    await deleteEmail(selectedFolder, currentEmail.uid)
    setIsConfirmingDelete(false)
    onBack()
  }, [currentEmail, selectedFolder, deleteEmail, onBack, isConfirmingDelete])

  if (isLoadingEmail) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--color-border)]"></div>
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-[var(--color-primary)] animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!currentEmail) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-[var(--color-bg-secondary)] flex items-center justify-center mb-4">
          <Sparkles className="w-10 h-10 opacity-50" />
        </div>
        <p className="text-base font-medium mb-1">选择一封邮件查看详情</p>
        <p className="text-sm opacity-75">点击左侧列表中的邮件</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-tertiary)]">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-6 py-4 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border-light)]">
        <button
          onClick={onBack}
          className="
            flex items-center gap-2 px-3 py-2 rounded-lg
            text-[var(--color-text-secondary)]
            hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]
            transition-all duration-150
          "
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回</span>
        </button>

        <div className="flex items-center gap-1">
          {/* AI摘要按钮 */}
          <button
            onClick={() => {
              void handleSummarize()
            }}
            disabled={isSummarizing}
            className="
              flex items-center gap-1.5 px-3 py-2 rounded-lg
              text-[var(--color-primary)]
              hover:bg-[var(--color-primary)]/10
              transition-all duration-150
            "
            title="AI摘要"
          >
            <Sparkles className={`w-4 h-4 ${isSummarizing ? 'animate-pulse' : ''}`} />
            <span className="text-sm">AI摘要</span>
          </button>

          {/* 翻译按钮 */}
          <button
            onClick={() => {
              void handleTranslate()
            }}
            className="
              flex items-center gap-1.5 px-3 py-2 rounded-lg
              text-[var(--color-text-secondary)]
              hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]
              transition-all duration-150
            "
            title="翻译"
          >
            <Languages className="w-4 h-4" />
            <span className="text-sm">翻译</span>
          </button>

          <div className="w-px h-6 bg-[var(--color-border)] mx-2" />

          {/* 回复按钮 */}
          <button
            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-all duration-150"
            title="回复"
          >
            <Reply className="w-5 h-5" />
          </button>

          {/* 转发按钮 */}
          <button
            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-all duration-150"
            title="转发"
          >
            <Forward className="w-5 h-5" />
          </button>

          {/* 星标按钮 */}
          <button
            className={`
              p-2 rounded-lg transition-all duration-150
              ${currentEmail.is_starred
                ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
              }
            `}
            title="星标"
          >
            <Star className={`w-5 h-5 ${currentEmail.is_starred ? 'fill-current' : ''}`} />
          </button>

          {/* 删除按钮 */}
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <button
                onClick={() => {
                  void handleDelete()
                }}
                className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
              >
                确认删除
              </button>
              <button
                onClick={() => {
                  setIsConfirmingDelete(false)
                }}
                className="px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                void handleDelete()
              }}
              className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-all duration-150"
              title="删除"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 邮件内容 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8 animate-fade-in">
          {/* 主题 */}
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6 leading-tight">
            {currentEmail.subject || '(无主题)'}
          </h1>

          {/* 发件人信息卡片 */}
          <div className="flex items-start gap-4 mb-8 pb-8 border-b border-[var(--color-border-light)]">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center text-white font-semibold text-lg shadow-sm flex-shrink-0">
              {currentEmail.from.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-[var(--color-text-primary)]">
                  {currentEmail.from}
                </span>
                {currentEmail.is_starred && (
                  <Star className="w-4 h-4 text-[var(--color-accent)] fill-current" />
                )}
              </div>
              <div className="text-sm text-[var(--color-text-tertiary)]">
                发送至 {currentEmail.to.join(', ')}
              </div>
            </div>
            <div className="text-sm text-[var(--color-text-tertiary)] text-right flex-shrink-0">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                {formatFullDate(currentEmail.date)}
              </div>
            </div>
          </div>

          {/* AI摘要卡片 */}
          {aiSummary && (
            <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-[var(--color-primary-50)] to-blue-50 dark:from-[var(--color-primary-900)]/20 dark:to-blue-900/20 border border-[var(--color-primary-200)] dark:border-[var(--color-primary-800)] animate-slide-up">
              <div className="flex items-center gap-2 mb-3 text-[var(--color-primary)]">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium text-sm">AI智能摘要</span>
              </div>
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                {aiSummary}
              </p>
            </div>
          )}

          {/* 邮件正文 */}
          <div className="prose dark:prose-invert max-w-none">
            {currentEmail.html_body ? (
              <div
                dangerouslySetInnerHTML={{ __html: currentEmail.html_body }}
                className="email-content"
              />
            ) : currentEmail.body ? (
              <div className="whitespace-pre-wrap leading-relaxed">
                <ReactMarkdown>{currentEmail.body}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-tertiary)]">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-secondary)] flex items-center justify-center mb-3">
                  <Mail className="w-6 h-6 opacity-50" />
                </div>
                <p className="text-sm">（无正文内容）</p>
              </div>
            )}
          </div>

          {/* 附件区域 */}
          {currentEmail.has_attachment && (
            <div className="mt-8 pt-8 border-t border-[var(--color-border-light)]">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">附件</h3>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-hover)] flex items-center justify-center">
                  <Paperclip className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">附件列表</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">功能开发中...</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
