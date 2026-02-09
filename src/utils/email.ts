import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { CATEGORY_STYLES, EMAIL_CATEGORIES } from '../constants/email'

export function getCategoryStyles(category: string): string {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES['other']!
}

export function getCategoryLabel(category: string): string {
  const key = category as keyof typeof EMAIL_CATEGORIES
  return key in EMAIL_CATEGORIES ? EMAIL_CATEGORIES[key] : EMAIL_CATEGORIES.other
}

export function formatEmailDate(date: Date | string, formatStr: string = 'MM/dd HH:mm'): string {
  return format(new Date(date), formatStr, { locale: zhCN })
}

export function formatFullDate(date: Date | string): string {
  return format(new Date(date), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
}
