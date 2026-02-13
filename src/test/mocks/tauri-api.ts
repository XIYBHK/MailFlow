// Mock Tauri API for E2E testing
// 此文件在测试环境替代 @tauri-apps/api/core

interface InvokeArgs {
  [key: string]: unknown
}

// 模拟数据
const mockData = {
  accounts: [
    {
      id: 'test-account-1',
      email: 'xiybhk@163.com',
      name: '测试邮箱',
      imap_server: 'imap.163.com',
      imap_port: 993,
      smtp_server: 'smtp.163.com',
      smtp_port: 465,
      is_default: true
    }
  ],
  emails: [
    {
      id: 'email-1',
      uid: 1,
      subject: '【测试】项目进度汇报',
      from: '张三',
      to: ['xiybhk@163.com'],
      date: '2024-01-15T10:30:00.000Z',
      preview: '本周项目进度汇报如下：1. 前端开发完成80%...',
      body: '本周项目进度汇报如下：\n\n1. 前端开发完成80%\n2. 后端API已部署\n3. 数据库设计已定稿\n\n请各位领导审阅。',
      is_read: false,
      is_starred: false,
      has_attachment: true,
      category: 'work',
    },
    {
      id: 'email-2',
      uid: 2,
      subject: 'Re: 会议邀请',
      from: '李四',
      date: '2024-01-14T15:00:00.000Z',
      preview: '好的，我会准时参加会议...',
      body: '好的，我会准时参加会议。',
      is_read: true,
      is_starred: true,
      has_attachment: false,
      category: 'work',
    },
    {
      id: 'email-3',
      uid: 3,
      subject: '【广告】限时优惠活动',
      from: 'marketing@shop.com',
      date: '2024-01-13T09:00:00.000Z',
      preview: '亲爱的用户，我们为您准备了超值优惠...',
      body: '亲爱的用户，我们为您准备了超值优惠活动。',
      is_read: false,
      is_starred: false,
      has_attachment: false,
      category: 'ads',
    },
  ],
  emailDetail: {
    id: 'email-1',
    uid: 1,
    subject: '【测试】项目进度汇报',
    from: '张三',
    to: ['xiybhk@163.com'],
    date: '2024-01-15T10:30:00.000Z',
    body: '本周项目进度汇报如下：\n\n1. 前端开发完成80%\n2. 后端API已部署\n3. 数据库设计已定稿\n\n请各位领导审阅。',
    html_body: '<p>本周项目进度汇报如下：</p><ol><li>前端开发完成80%</li><li>后端API已部署</li><li>数据库设计已定稿</li></ol><p>请各位领导审阅。</p>',
    folder: 'INBOX',
    flags: [],
    is_read: false,
    is_starred: false,
    has_attachment: true,
    category: 'work',
    size: 1024,
  }
}

export async function invoke<T>(cmd: string, args?: InvokeArgs): Promise<T> {
  console.log('[Mock Tauri API] invoke:', cmd, args)

  // 模拟网络延迟
  await new Promise(r => setTimeout(r, 50))

  switch (cmd) {
    // 账户管理
    case 'list_accounts':
      return mockData.accounts as T

    case 'add_account':
      return 'new-account-id' as T

    case 'delete_account':
      return null as T

    case 'get_account_password':
      return 'mock-password' as T

    // 配置
    case 'get_app_config':
      return {
        ai_config: {
          zhipu_api_key: 'mock-api-key',
          zhipu_api_base: 'https://open.bigmodel.cn/api/paas/v4/',
          zhipu_model: 'glm-4'
        }
      } as T

    case 'update_app_config':
      return null as T

    case 'set_ai_api_key':
      return null as T

    // 邮件操作
    case 'fetch_folders':
      return ['INBOX', '已发送', '草稿箱', '垃圾邮件', '已删除'] as T

    case 'fetch_emails':
      return mockData.emails as T

    case 'fetch_email_detail':
      return mockData.emailDetail as T

    case 'mark_email_read':
      return null as T

    case 'delete_email':
      return null as T

    case 'move_email':
      return null as T

    case 'send_email':
      return null as T

    // AI 功能
    case 'classify_email_ai':
      return 'work' as T

    case 'summarize_email':
      return '**邮件摘要**\n\n这是一封项目进度汇报邮件，主要内容包括：\n- 前端开发进度达80%\n- 后端API已部署测试环境\n- 数据库设计已完成' as T

    case 'translate_text':
      return 'This is a project progress report email. Main content includes frontend development progress at 80%, backend API deployed, database design finalized.' as T

    case 'generate_reply':
      return '1. 收到，我会跟进进度。\n2. 好的，已了解。\n3. 感谢汇报。' as T

    default:
      console.warn('[Mock Tauri API] Unknown command:', cmd)
      return null as T
  }
}
