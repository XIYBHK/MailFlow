import React, { useState } from 'react';
import { useEmailStore } from '../stores/emailStore';
import { X, Send, Paperclip } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose }) => {
  const { sendEmail, currentAccount } = useEmailStore();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!to.trim()) {
      alert('请输入收件人');
      return;
    }

    if (!subject.trim()) {
      alert('请输入主题');
      return;
    }

    setIsSending(true);
    try {
      const toList = to.split(',').map(email => email.trim());
      await sendEmail(toList, subject, body, false);
      handleClose();
    } catch (error) {
      alert('发送失败: ' + String(error));
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setTo('');
    setSubject('');
    setBody('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-3xl bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">新邮件</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 发件人信息 */}
        {currentAccount && (
          <div className="px-6 py-2 text-sm text-gray-400 border-b border-gray-800">
            发件人: {currentAccount.name} &lt;{currentAccount.email}&gt;
          </div>
        )}

        {/* 编辑表单 */}
        <div className="p-6 space-y-4">
          {/* 收件人 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              收件人
            </label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="多个收件人用逗号分隔"
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-800 text-white placeholder-gray-500"
            />
          </div>

          {/* 主题 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              主题
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="邮件主题"
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-800 text-white placeholder-gray-500"
            />
          </div>

          {/* 正文 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              正文
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="在此输入邮件正文..."
              rows={12}
              className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-gray-800 text-white placeholder-gray-500"
            />
          </div>

          {/* 附件按钮 */}
          <button className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors">
            <Paperclip className="w-4 h-4" />
            <span>添加附件</span>
          </button>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            支持快捷键: Ctrl+Enter 发送
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSend}
              disabled={isSending}
              className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? '发送中...' : '发送'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
