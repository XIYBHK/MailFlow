import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AppError, handleError, logError } from './error'

describe('AppError', () => {
  it('应该创建带有消息的错误实例', () => {
    const error = new AppError('测试错误')
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('测试错误')
    expect(error.name).toBe('AppError')
  })

  it('应该创建带有原始错误的错误实例', () => {
    const originalError = new Error('原始错误')
    const appError = new AppError('应用错误', originalError)
    expect(appError.message).toBe('应用错误')
    expect(appError.originalError).toBe(originalError)
  })

  it('应该处理未知类型的原始错误', () => {
    const originalError = '字符串错误'
    const appError = new AppError('应用错误', originalError)
    expect(appError.originalError).toBe('字符串错误')
  })

  it('应该处理 null 作为原始错误', () => {
    const appError = new AppError('应用错误', null)
    expect(appError.originalError).toBeNull()
  })

  it('应该处理 undefined 作为原始错误', () => {
    const appError = new AppError('应用错误')
    expect(appError.originalError).toBeUndefined()
  })
})

describe('handleError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应该处理 Error 实例并返回消息', () => {
    const error = new Error('测试错误消息')
    const result = handleError(error)
    expect(result).toBe('测试错误消息')
    expect(console.error).toHaveBeenCalledWith(error)
  })

  it('应该处理字符串错误并转换为字符串', () => {
    const error = '字符串错误'
    const result = handleError(error)
    expect(result).toBe('字符串错误')
    expect(console.error).toHaveBeenCalledWith('字符串错误')
  })

  it('应该处理数字错误并转换为字符串', () => {
    const error = 404
    const result = handleError(error)
    expect(result).toBe('404')
    expect(console.error).toHaveBeenCalledWith(404)
  })

  it('应该处理对象错误并转换为字符串', () => {
    const error = { code: 500, message: '服务器错误' }
    const result = handleError(error)
    expect(result).toBe('[object Object]')
    expect(console.error).toHaveBeenCalledWith(error)
  })

  it('应该处理 null 错误', () => {
    const result = handleError(null)
    expect(result).toBe('null')
    expect(console.error).toHaveBeenCalledWith(null)
  })

  it('应该处理 undefined 错误', () => {
    const result = handleError(undefined)
    expect(result).toBe('undefined')
    expect(console.error).toHaveBeenCalledWith(undefined)
  })

  it('应该处理布尔值错误', () => {
    const result = handleError(false)
    expect(result).toBe('false')
    expect(console.error).toHaveBeenCalledWith(false)
  })

  it('应该处理自定义 Error 类实例', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'CustomError'
      }
    }
    const error = new CustomError('自定义错误')
    const result = handleError(error)
    expect(result).toBe('自定义错误')
    expect(console.error).toHaveBeenCalledWith(error)
  })
})

describe('logError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应该记录带有上下文的错误消息', () => {
    logError('测试上下文', '测试错误')
    expect(console.error).toHaveBeenCalledWith('[测试上下文]', '测试错误')
  })

  it('应该记录带有上下文的 Error 实例', () => {
    const error = new Error('实际错误')
    logError('API调用', error)
    expect(console.error).toHaveBeenCalledWith('[API调用]', error)
  })

  it('应该记录带有上下文的字符串错误', () => {
    logError('数据库操作', '连接失败')
    expect(console.error).toHaveBeenCalledWith('[数据库操作]', '连接失败')
  })

  it('应该记录带有上下文的 null 错误', () => {
    logError('空值检查', null)
    expect(console.error).toHaveBeenCalledWith('[空值检查]', null)
  })

  it('应该记录带有上下文的 undefined 错误', () => {
    logError('未定义检查', undefined)
    expect(console.error).toHaveBeenCalledWith('[未定义检查]', undefined)
  })

  it('应该处理空字符串上下文', () => {
    logError('', '测试错误')
    expect(console.error).toHaveBeenCalledWith('[]', '测试错误')
  })

  it('应该处理包含特殊字符的上下文', () => {
    logError('API[测试]', '错误消息')
    expect(console.error).toHaveBeenCalledWith('[API[测试]]', '错误消息')
  })

  it('应该处理非常长的上下文', () => {
    const longContext = 'A'.repeat(1000)
    logError(longContext, '错误')
    expect(console.error).toHaveBeenCalledWith(`[${longContext}]`, '错误')
  })
})
