import React, { useState } from 'react'
import { useEmailStore } from '../stores/emailStore'
import { X } from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  // 表单状态
  const [provider, setProvider] = useState('163')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const addAccount = useEmailStore(state => state.addAccount)
  const accounts = useEmailStore(state => state.accounts)

  // 重置表单
  const resetForm = () => {
    setProvider('163')
    setName('')
    setEmail('')
    setPassword('')
    setErrorMessage('')
    setSuccessMessage('')
  }

  // 提交表单
  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault()

    // 基本验证
    if (!name.trim()) {
      setErrorMessage('请输入账户名称')
      return
    }
    if (!email.trim()) {
      setErrorMessage('请输入邮箱地址')
      return
    }
    if (!password.trim()) {
      setErrorMessage('请输入密码或授权码')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await addAccount(email, password, name, provider)
      setSuccessMessage('账户添加成功！')

      // 成功后延迟关闭模态框
      setTimeout(() => {
        resetForm()
        onClose()
      }, 1500)
    } catch (error) {
      setErrorMessage(String(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 删除账户
  const handleDeleteAccount = (id: string) => {
    const deleteAccount = useEmailStore.getState().deleteAccount
    deleteAccount(id)
      .then(() => {
        setSuccessMessage('账户已删除')
        setTimeout(() => {
          setSuccessMessage('')
        }, 2000)
      })
      .catch((error: unknown) => {
        setErrorMessage(String(error))
      })
  }

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      style={{ zIndex: 999999 }}
    >
      <div
        onClick={e => {
          e.stopPropagation()
        }}
        className="bg-gray-800 w-[800px] max-w-[90%] max-h-[80vh] rounded-xl p-6 shadow-2xl overflow-auto"
      >
        {/* 标题栏 */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-100">邮箱账户设置</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 成功/错误消息 */}
        {successMessage && (
          <div className="px-3 py-3 mb-4 bg-emerald-900 text-emerald-100 rounded-md text-sm">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="px-3 py-3 mb-4 bg-red-900 text-red-200 rounded-md text-sm">
            {errorMessage}
          </div>
        )}

        {/* 现有账户列表 */}
        {accounts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-base font-semibold mb-3 text-gray-200">已添加的账户</h3>
            <div className="flex flex-col gap-2">
              {accounts.map(account => (
                <div
                  key={account.id}
                  className="flex justify-between items-center p-3 border border-gray-700 rounded-md bg-gray-900"
                >
                  <div>
                    <div className="font-medium text-sm text-gray-100">{account.name}</div>
                    <div className="text-xs text-gray-400">{account.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      handleDeleteAccount(account.id)
                    }}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 添加账户表单 */}
        <form
          onSubmit={e => {
            void handleSubmit(e)
          }}
          className="flex flex-col gap-4"
        >
          <h3 className="text-base font-semibold mb-1 text-gray-200">添加新账户</h3>

          <div>
            <label className="block mb-1 font-medium text-sm text-gray-300">邮箱服务商</label>
            <select
              value={provider}
              onChange={e => {
                setProvider(e.target.value)
              }}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-700 rounded-md text-sm bg-gray-900 text-gray-100 disabled:cursor-not-allowed"
            >
              <option value="163">163邮箱</option>
              <option value="qq">QQ邮箱</option>
              <option value="gmail">Gmail</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium text-sm text-gray-300">账户名称</label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value)
              }}
              placeholder="如: 工作邮箱"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-700 rounded-md text-sm bg-gray-900 text-gray-100 placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-sm text-gray-300">邮箱地址</label>
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value)
              }}
              placeholder="your@email.com"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-700 rounded-md text-sm bg-gray-900 text-gray-100 placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-sm text-gray-300">密码/授权码</label>
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
              }}
              placeholder="请输入密码或授权码"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-700 rounded-md text-sm bg-gray-900 text-gray-100 placeholder-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-base font-medium transition-colors disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '添加中...' : '添加账户'}
          </button>
        </form>

        {/* 帮助提示 */}
        <div className="mt-5 p-3 bg-amber-950 rounded-md text-xs text-amber-100">
          <strong>提示：</strong>
          <br />- 163邮箱请使用授权码，登录邮箱设置开启IMAP/SMTP服务
          <br />- QQ邮箱请使用授权码，需要在邮箱设置中生成
          <br />- Gmail需要使用应用专用密码
        </div>
      </div>
    </div>
  )
}
