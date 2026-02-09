import React from 'react'
import { useEmailStore } from '../stores/emailStore'
import { ArrowLeft, Star, Trash2, Reply, Forward, Sparkles, Languages } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { formatFullDate } from '../utils/email'

export const EmailDetail: React.FC<{ onBack: () => void }> = React.memo(({ onBack }) => {
  const {
    currentEmail,
    isLoadingEmail,
    selectedFolder,
    markAsRead,
    deleteEmail,
    summarizeEmail,
    translateText,
  } = useEmailStore()
  const [aiSummary, setAiSummary] = React.useState<string>('')
  const [isSummarizing, setIsSummarizing] = React.useState(false)

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
    if (confirm('确定要删除这封邮件吗？')) {
      await deleteEmail(selectedFolder, currentEmail.uid)
      onBack()
    }
  }, [currentEmail, selectedFolder, deleteEmail, onBack])

  if (isLoadingEmail) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!currentEmail) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Sparkles className="w-16 h-16 mb-4" />
        <p className="text-lg">选择一封邮件查看详情</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {/* AI摘要按钮 */}
          <button
            onClick={() => {
              void handleSummarize()
            }}
            disabled={isSummarizing}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-primary-600"
            title="AI摘要"
          >
            <Sparkles className={`w-5 h-5 ${isSummarizing ? 'animate-pulse' : ''}`} />
          </button>

          {/* 翻译按钮 */}
          <button
            onClick={() => {
              void handleTranslate()
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="翻译"
          >
            <Languages className="w-5 h-5" />
          </button>

          {/* 回复按钮 */}
          <button
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="回复"
          >
            <Reply className="w-5 h-5" />
          </button>

          {/* 转发按钮 */}
          <button
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="转发"
          >
            <Forward className="w-5 h-5" />
          </button>

          {/* 星标按钮 */}
          <button
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${
              currentEmail.is_starred ? 'text-yellow-500' : ''
            }`}
            title="星标"
          >
            <Star className={`w-5 h-5 ${currentEmail.is_starred ? 'fill-current' : ''}`} />
          </button>

          {/* 删除按钮 */}
          <button
            onClick={() => {
              void handleDelete()
            }}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-600"
            title="删除"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 邮件内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* 主题 */}
        <h1 className="text-2xl font-bold mb-4">{currentEmail.subject || '(无主题)'}</h1>

        {/* 发件人信息 */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold text-lg">
            {currentEmail.from.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{currentEmail.from}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              发送至 {currentEmail.to.join(', ')}
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatFullDate(currentEmail.date)}
          </div>
        </div>

        {/* AI摘要 */}
        {aiSummary && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <div className="flex items-center gap-2 mb-2 text-primary-700 dark:text-primary-300 font-medium">
              <Sparkles className="w-4 h-4" />
              <span>AI摘要</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
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
            <div className="whitespace-pre-wrap">
              <ReactMarkdown>{currentEmail.body}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-400 italic">（无正文内容）</p>
          )}
        </div>

        {/* 附件 */}
        {currentEmail.has_attachment && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2">附件</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">（附件列表待实现）</div>
          </div>
        )}
      </div>
    </div>
  )
})
