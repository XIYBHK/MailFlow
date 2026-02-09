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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
      }}
    >
      <div
        onClick={e => {
          e.stopPropagation()
        }}
        style={{
          backgroundColor: '#1f2937',
          width: '800px',
          maxWidth: '90%',
          maxHeight: '80vh',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'auto',
        }}
      >
        {/* 标题栏 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#f3f4f6' }}>
            邮箱账户设置
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#9ca3af',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 成功/错误消息 */}
        {successMessage && (
          <div
            style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: '#065f46',
              color: '#d1fae5',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: '#7f1d1d',
              color: '#fecaca',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            ✗ {errorMessage}
          </div>
        )}

        {/* 现有账户列表 */}
        {accounts.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#e5e7eb',
              }}
            >
              已添加的账户
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {accounts.map(account => (
                <div
                  key={account.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    backgroundColor: '#111827',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px', color: '#f3f4f6' }}>
                      {account.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{account.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      handleDeleteAccount(account.id)
                    }}
                    disabled={isSubmitting}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.5 : 1,
                    }}
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
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <h3
            style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#e5e7eb' }}
          >
            添加新账户
          </h3>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: '500',
                fontSize: '14px',
                color: '#d1d5db',
              }}
            >
              邮箱服务商
            </label>
            <select
              value={provider}
              onChange={e => {
                setProvider(e.target.value)
              }}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #374151',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                backgroundColor: '#111827',
                color: '#f3f4f6',
              }}
            >
              <option value="163">163邮箱</option>
              <option value="qq">QQ邮箱</option>
              <option value="gmail">Gmail</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: '500',
                fontSize: '14px',
                color: '#d1d5db',
              }}
            >
              账户名称
            </label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value)
              }}
              placeholder="如: 工作邮箱"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #374151',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#111827',
                color: '#f3f4f6',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: '500',
                fontSize: '14px',
                color: '#d1d5db',
              }}
            >
              邮箱地址
            </label>
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value)
              }}
              placeholder="your@email.com"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #374151',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#111827',
                color: '#f3f4f6',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: '500',
                fontSize: '14px',
                color: '#d1d5db',
              }}
            >
              密码/授权码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
              }}
              placeholder="请输入密码或授权码"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #374151',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#111827',
                color: '#f3f4f6',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '12px 24px',
              backgroundColor: isSubmitting ? '#4b5563' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? '添加中...' : '添加账户'}
          </button>
        </form>

        {/* 帮助提示 */}
        <div
          style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: '#451a03',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#fef3c7',
          }}
        >
          <strong>提示：</strong>
          <br />• 163邮箱请使用授权码，登录邮箱设置开启IMAP/SMTP服务
          <br />• QQ邮箱请使用授权码，需要在邮箱设置中生成
          <br />• Gmail需要使用应用专用密码
        </div>
      </div>
    </div>
  )
}
