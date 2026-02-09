// 测试 Tauri 命令连接 - 将结果显示在页面上
import { invoke } from '@tauri-apps/api/core'

async function testConnection() {
  const results: string[] = []
  results.push('=== Tauri 连接测试 ===\n')

  // 测试 1: list_accounts 命令
  try {
    results.push('测试 1: list_accounts...')
    const accounts = await invoke('list_accounts')
    results.push(`✓ 成功! 账户数量: ${Array.isArray(accounts) ? String(accounts.length) : '0'}`)
  } catch (error) {
    results.push(`✗ 失败: ${String(error)}`)
  }

  // 测试 2: get_app_config 命令
  try {
    results.push('\n测试 2: get_app_config...')
    await invoke('get_app_config')
    results.push('✓ 成功! 配置已加载')
  } catch (error) {
    results.push(`✗ 失败: ${String(error)}`)
  }

  // 显示结果在页面上
  const testDiv = document.createElement('div')
  testDiv.id = 'tauri-test-results'
  testDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.9);
    color: #0f0;
    padding: 15px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    max-width: 400px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 99999;
    white-space: pre-wrap;
  `
  testDiv.textContent = results.join('\n')

  // 添加关闭按钮
  const closeBtn = document.createElement('button')
  closeBtn.textContent = '×'
  closeBtn.style.cssText = `
    position: absolute;
    top: 5px;
    right: 5px;
    background: #f00;
    color: white;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    cursor: pointer;
  `
  closeBtn.onclick = () => {
    testDiv.remove()
  }
  testDiv.appendChild(closeBtn)

  // 移除旧的测试结果
  const oldDiv = document.getElementById('tauri-test-results')
  if (oldDiv) oldDiv.remove()

  document.body.appendChild(testDiv)
}

// 在页面加载后执行测试
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testConnection, 2000)
  })
} else {
  setTimeout(testConnection, 2000)
}

export { testConnection }
