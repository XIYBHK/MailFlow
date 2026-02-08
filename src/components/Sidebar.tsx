import React from 'react';
import { useEmailStore } from '../stores/emailStore';
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
} from 'lucide-react';

interface SidebarProps {
  onFolderChange: (folder: string) => void;
  onCompose: () => void;
  onSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onFolderChange, onCompose, onSettings }) => {
  const { folders, selectedFolder, currentAccount, accounts } = useEmailStore();
  const [isExpanded, setIsExpanded] = React.useState(true);

  const folderIcons: Record<string, React.ReactNode> = {
    INBOX: <Inbox className="w-5 h-5" />,
    '草稿箱': <FileText className="w-5 h-5" />,
    '已发送': <Send className="w-5 h-5" />,
    '已删除': <Trash2 className="w-5 h-5" />,
    '垃圾邮件': <ShieldAlert className="w-5 h-5" />,
    '订阅邮件': <Tag className="w-5 h-5" />,
    '工作邮件': <Archive className="w-5 h-5" />,
  };

  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* 账户信息 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          写邮件
        </button>
      </div>

      {/* 当前账户 */}
      {currentAccount && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-blue-600 flex items-center justify-center text-white font-semibold">
              {currentAccount.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{currentAccount.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {currentAccount.email}
              </div>
            </div>
          </div>

          {/* 账户切换 */}
          {accounts.length > 1 && (
            <button
              className="mt-3 w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => {/* TODO: 打开账户切换器 */}}
            >
              切换账户 ({accounts.length})
            </button>
          )}
        </div>
      )}

      {/* 文件夹列表 */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div
          className="flex items-center justify-between mb-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">邮箱文件夹</span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
          />
        </div>

        {isExpanded && (
          <ul className="space-y-1">
            {folders.map((folder) => (
              <li key={folder}>
                <button
                  onClick={() => onFolderChange(folder)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                    ${selectedFolder === folder
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {folderIcons[folder] || <Inbox className="w-5 h-5" />}
                  <span className="flex-1 text-left">{folder}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* 分类标签 */}
        <div className="mt-6">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">智能分类</div>
          <ul className="space-y-1">
            {[
              { name: '工作邮件', color: 'bg-purple-500' },
              { name: '订阅邮件', color: 'bg-blue-500' },
              { name: '个人邮件', color: 'bg-green-500' },
            ].map((category) => (
              <li key={category.name}>
                <button
                  onClick={() => onFolderChange(category.name)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className={`w-3 h-3 rounded-full ${category.color}`} />
                  <span>{category.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* 底部设置按钮 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>设置</span>
        </button>
      </div>
    </div>
  );
};
