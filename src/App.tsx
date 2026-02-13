import { useEffect, useState, useCallback } from 'react'
import { useEmailStore } from './stores/emailStore'
import { Sidebar } from './components/Sidebar'
import { EmailList } from './components/EmailList'
import { EmailDetail } from './components/EmailDetail'
import { ComposeModal } from './components/ComposeModal'
import { SettingsModal } from './components/SettingsModal'
import { Mail, AlertCircle } from 'lucide-react'
import './styles/index.css'

function App() {
  const {
    accounts,
    loadAccounts,
    loadConfig,
    selectedFolder,
    setFolder,
    clearCurrentEmail,
    error,
    setError,
  } = useEmailStore()

  const [selectedUid, setSelectedUid] = useState<number | undefined>()
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await loadConfig()
      } catch (_err) {
        // 配置加载失败由 store 统一处理错误
      }

      try {
        await loadAccounts()
      } catch (_err) {
        // 账户加载失败由 store 统一处理错误
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [loadConfig, loadAccounts])

  const handleFolderChange = useCallback(
    (folder: string) => {
      setFolder(folder)
      setSelectedUid(undefined)
      clearCurrentEmail()
    },
    [setFolder, clearCurrentEmail]
  )

  const handleEmailSelect = useCallback((uid: number) => {
    setSelectedUid(uid)
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedUid(undefined)
    clearCurrentEmail()
  }, [clearCurrentEmail])

  // 判断是否显示欢迎页面
  const showWelcome = accounts.length === 0

  return (
    <>
      {/* 欢迎页面 */}
      {showWelcome ? (
        <div className="h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
          <div className="text-center max-w-md">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Mail className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">163邮件客户端</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              智能邮件管理，AI驱动的高效办公工具
            </p>
            <button
              onClick={() => {
                setIsSettingsOpen(true)
              }}
              className="px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors shadow-lg"
            >
              添加邮箱账户
            </button>
          </div>
        </div>
      ) : (
        /* 主界面 */
        <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="flex-1 text-sm text-red-800 dark:text-red-300">{error}</p>
              <button
                onClick={() => {
                  setError(null)
                }}
                className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 px-2 py-1 rounded"
              >
                关闭
              </button>
            </div>
          )}

          {/* 主界面内容 */}
          <div className="flex-1 flex overflow-hidden">
            <Sidebar
              onFolderChange={handleFolderChange}
              onCompose={() => {
                setIsComposeOpen(true)
              }}
              onSettings={() => {
                setIsSettingsOpen(true)
              }}
            />

            {/* 邮件列表 */}
            <div className="w-96 border-r border-[var(--color-border-light)] flex flex-col bg-[var(--color-bg-secondary)]">
              <div className="p-4 border-b border-[var(--color-border-light)] bg-[var(--color-bg-tertiary)]">
                <h2 className="font-semibold text-lg text-[var(--color-text-primary)]">{selectedFolder}</h2>
              </div>
              {selectedUid ? (
                <div className="flex-1 overflow-hidden">
                  <EmailList onEmailSelect={handleEmailSelect} selectedUid={selectedUid} />
                </div>
              ) : (
                <div className="flex-1">
                  <EmailList onEmailSelect={handleEmailSelect} />
                </div>
              )}
            </div>

            {/* 邮件详情 */}
            <div className="flex-1">
              {selectedUid ? (
                <EmailDetail onBack={handleBackToList} uid={selectedUid} />
              ) : (
                <div className="h-full flex items-center justify-center text-[var(--color-text-tertiary)] bg-[var(--color-bg-tertiary)]">
                  <div className="text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-2xl bg-[var(--color-bg-secondary)] flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-10 h-10 opacity-50" />
                    </div>
                    <p className="text-base font-medium mb-1">选择一封邮件查看详情</p>
                    <p className="text-sm opacity-75">点击左侧列表中的邮件</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 模态框 - 始终渲染 */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false)
        }}
      />

      {/* SettingsModal - 使用更高的 z-index */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false)
        }}
      />
    </>
  )
}

export default App
