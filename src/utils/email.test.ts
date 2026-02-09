import { describe, it, expect } from 'vitest'
import { getCategoryLabel, getCategoryStyles, formatEmailDate, formatFullDate } from './email'
import { CATEGORY_STYLES, EMAIL_CATEGORIES } from '../constants/email'

describe('Email Utils', () => {
  describe('getCategoryLabel', () => {
    it('返回正确的分类标签', () => {
      expect(getCategoryLabel('spam')).toBe('垃圾')
      expect(getCategoryLabel('ads')).toBe('广告')
      expect(getCategoryLabel('subscription')).toBe('订阅')
      expect(getCategoryLabel('work')).toBe('工作')
      expect(getCategoryLabel('personal')).toBe('个人')
    })

    it('返回 other 分类标签', () => {
      expect(getCategoryLabel('other')).toBe('其他')
    })

    it('未知分类返回其他', () => {
      expect(getCategoryLabel('unknown')).toBe('其他')
      expect(getCategoryLabel('')).toBe('其他')
    })

    it('区分大小写', () => {
      expect(getCategoryLabel('SPAM')).toBe('其他')
      expect(getCategoryLabel('Spam')).toBe('其他')
    })

    it('特殊字符分类返回默认标签', () => {
      expect(getCategoryLabel('!@#$%')).toBe('其他')
    })
  })

  describe('getCategoryStyles', () => {
    it('返回正确的分类样式', () => {
      expect(getCategoryStyles('spam')).toBe(CATEGORY_STYLES.spam)
      expect(getCategoryStyles('ads')).toBe(CATEGORY_STYLES.ads)
      expect(getCategoryStyles('subscription')).toBe(CATEGORY_STYLES.subscription)
      expect(getCategoryStyles('work')).toBe(CATEGORY_STYLES.work)
      expect(getCategoryStyles('personal')).toBe(CATEGORY_STYLES.personal)
    })

    it('返回 other 分类样式（默认）', () => {
      expect(getCategoryStyles('other')).toBe(CATEGORY_STYLES.other)
    })

    it('未知分类返回默认样式', () => {
      expect(getCategoryStyles('unknown')).toBe(CATEGORY_STYLES.other)
      expect(getCategoryStyles('')).toBe(CATEGORY_STYLES.other)
    })

    it('区分大小写', () => {
      expect(getCategoryStyles('SPAM')).toBe(CATEGORY_STYLES.other)
      expect(getCategoryStyles('Spam')).toBe(CATEGORY_STYLES.other)
    })

    it('特殊字符分类返回默认样式', () => {
      expect(getCategoryStyles('!@#$%')).toBe(CATEGORY_STYLES.other)
    })
  })

  describe('formatEmailDate', () => {
    it('正确格式化日期', () => {
      const date = new Date('2025-01-15T10:30:00')
      expect(formatEmailDate(date)).toBe('01/15 10:30')
    })

    it('支持自定义格式', () => {
      const date = new Date('2025-01-15T10:30:00')
      expect(formatEmailDate(date, 'yyyy-MM-dd')).toBe('2025-01-15')
      expect(formatEmailDate(date, 'HH:mm')).toBe('10:30')
    })

    it('支持字符串日期', () => {
      expect(formatEmailDate('2025-01-15T10:30:00')).toBe('01/15 10:30')
    })

    it('支持 ISO 字符串日期', () => {
      expect(formatEmailDate('2025-01-15T10:30:00.000Z')).toMatch(/\d{2}\/\d{2} \d{2}:\d{2}/)
    })

    it('处理当前日期', () => {
      const now = new Date()
      const result = formatEmailDate(now)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('使用中文本地化', () => {
      const date = new Date('2025-01-15T10:30:00')
      const result = formatEmailDate(date, 'yyyy年MM月dd日')
      expect(result).toContain('年')
      expect(result).toContain('月')
      expect(result).toContain('日')
    })

    it('处理边界日期（年初）', () => {
      const date = new Date('2025-01-01T00:00:00')
      expect(formatEmailDate(date, 'yyyy-MM-dd')).toBe('2025-01-01')
    })

    it('处理边界日期（年末）', () => {
      const date = new Date('2025-12-31T23:59:59')
      expect(formatEmailDate(date, 'yyyy-MM-dd HH:mm:ss')).toBe('2025-12-31 23:59:59')
    })

    it('处理闰年日期', () => {
      const date = new Date('2024-02-29T12:00:00')
      expect(formatEmailDate(date, 'yyyy-MM-dd')).toBe('2024-02-29')
    })

    it('处理时间戳', () => {
      const timestamp = 1705315800000 // 2024-01-15T10:30:00
      expect(formatEmailDate(timestamp, 'yyyy-MM-dd')).toBe('2024-01-15')
    })

    it('处理单数字小时和分钟', () => {
      const date = new Date('2025-01-05T09:05:00')
      expect(formatEmailDate(date)).toBe('01/05 09:05')
    })
  })

  describe('formatFullDate', () => {
    it('正确格式化完整日期', () => {
      const date = new Date('2025-01-15T10:30:00')
      expect(formatFullDate(date)).toBe('2025年01月15日 10:30')
    })

    it('支持字符串日期', () => {
      expect(formatFullDate('2025-01-15T10:30:00')).toBe('2025年01月15日 10:30')
    })

    it('处理当前日期', () => {
      const now = new Date()
      const result = formatFullDate(now)
      expect(result).toBeTruthy()
      expect(result).toContain('年')
      expect(result).toContain('月')
      expect(result).toContain('日')
    })

    it('包含小时和分钟', () => {
      const date = new Date('2025-01-15T14:30:00')
      expect(formatFullDate(date)).toContain('14:30')
    })

    it('处理凌晨时间（00:00）', () => {
      const date = new Date('2025-01-15T00:00:00')
      expect(formatFullDate(date)).toContain('00:00')
    })

    it('处理午夜时间（23:59）', () => {
      const date = new Date('2025-01-15T23:59:00')
      expect(formatFullDate(date)).toContain('23:59')
    })

    it('处理闰年2月29日', () => {
      const date = new Date('2024-02-29T10:30:00')
      expect(formatFullDate(date)).toContain('2024年')
      expect(formatFullDate(date)).toContain('02月')
      expect(formatFullDate(date)).toContain('29日')
    })

    it('处理时间戳', () => {
      const timestamp = 1705315800000 // 2024-01-15T10:30:00
      const result = formatFullDate(timestamp)
      expect(result).toContain('2024年')
      expect(result).toContain('01月')
      expect(result).toContain('15日')
    })

    it('处理单数字月份和日期', () => {
      const date = new Date('2025-01-05T09:05:00')
      expect(formatFullDate(date)).toContain('01月')
      expect(formatFullDate(date)).toContain('05日')
      expect(formatFullDate(date)).toContain('09:05')
    })

    it('使用中文本地化格式', () => {
      const date = new Date('2025-01-15T10:30:00')
      const result = formatFullDate(date)
      expect(result).toMatch(/\d{4}年\d{2}月\d{2}日 \d{2}:\d{2}/)
    })
  })
})
