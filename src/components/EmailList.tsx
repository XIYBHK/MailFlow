import React from 'react';
import { useEmailStore } from '../stores/emailStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Mail, Star, Paperclip, Clock } from 'lucide-react';

interface EmailListProps {
  onEmailSelect: (uid: number) => void;
  selectedUid?: number;
}

export const EmailList: React.FC<EmailListProps> = ({ onEmailSelect, selectedUid }) => {
  const { emails, isLoadingEmails, loadEmails, selectedFolder } = useEmailStore();

  React.useEffect(() => {
    loadEmails(selectedFolder);
  }, [selectedFolder]);

  if (isLoadingEmails && emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Mail className="w-16 h-16 mb-4" />
        <p className="text-lg">暂无邮件</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {emails.map((email) => (
        <div
          key={email.id}
          onClick={() => onEmailSelect(email.uid)}
          className={`
            p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer
            hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
            ${!email.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
            ${selectedUid === email.uid ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-500' : ''}
          `}
        >
          <div className="flex items-start gap-3">
            {/* 未读标记 */}
            {!email.is_read && (
              <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              {/* 发件人和日期 */}
              <div className="flex items-center justify-between mb-1">
                <span className={`
                  font-medium truncate
                  ${!email.is_read ? 'font-semibold' : ''}
                `}>
                  {email.from}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-shrink-0 ml-2">
                  <Clock className="w-3 h-3" />
                  {format(new Date(email.date), 'MM/dd HH:mm', { locale: zhCN })}
                </span>
              </div>

              {/* 主题 */}
              <div className={`
                text-sm mb-1 truncate
                ${!email.is_read ? 'font-medium' : 'text-gray-700 dark:text-gray-300'}
              `}>
                {email.subject || '(无主题)'}
              </div>

              {/* 预览和标签 */}
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                  {email.preview || email.body?.substring(0, 100)}
                </div>

                {/* 附件标记 */}
                {email.has_attachment && (
                  <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}

                {/* 星标 */}
                {email.is_starred && (
                  <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 fill-current" />
                )}

                {/* 分类标签 */}
                {email.category && (
                  <span className={`
                    px-2 py-0.5 text-xs rounded-full flex-shrink-0
                    ${getCategoryStyles(email.category)}
                  `}>
                    {getCategoryLabel(email.category)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* 加载更多 */}
      {isLoadingEmails && emails.length > 0 && (
        <div className="p-4 text-center text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      )}
    </div>
  );
};

function getCategoryStyles(category: string): string {
  const styles: Record<string, string> = {
    spam: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ads: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    subscription: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    work: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    personal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };
  return styles[category] || styles.other;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    spam: '垃圾',
    ads: '广告',
    subscription: '订阅',
    work: '工作',
    personal: '个人',
    other: '其他',
  };
  return labels[category] || '其他';
}
