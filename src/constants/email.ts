export const DEFAULT_FOLDERS = ['INBOX', '草稿箱', '已发送', '垃圾邮件', '已删除']

export const EMAIL_CATEGORIES = {
  spam: '垃圾',
  ads: '广告',
  subscription: '订阅',
  work: '工作',
  personal: '个人',
  other: '其他',
} as const

export const CATEGORY_STYLES: Record<string, string> = {
  spam: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ads: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  subscription: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  work: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  personal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}
