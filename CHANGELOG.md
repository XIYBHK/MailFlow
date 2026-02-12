# 更新日志

## 最近更新

### 核心工具函数单元测试

- 为 src/utils/error.ts 编写完整单元测试（21 个测试用例）
  - AppError 类构造函数测试
  - handleError() 函数测试（Error、字符串、未知类型）
  - logError() 函数测试
- 扩展 src/utils/email.test.ts 测试（31 个测试用例）
  - getCategoryStyles() 测试所有分类和未知分类
  - getCategoryLabel() 测试所有分类标签
  - formatEmailDate() 测试各种日期格式
  - formatFullDate() 测试完整日期格式化
- 创建 src/stores/emailStore.test.ts 完整测试（48 个测试用例）
  - 初始状态测试
  - 账户管理测试（loadAccounts、addAccount、deleteAccount、setCurrentAccount）
  - 邮件操作测试（loadEmails、loadEmailDetail、markAsRead、deleteEmail、sendEmail）
  - AI 功能测试（classifyEmail、summarizeEmail、translateText、generateReply）
  - 配置管理测试（loadConfig、updateConfig、setAiApiKey）
  - 工具方法测试（setError、clearCurrentEmail、setFolder）
- 测试覆盖率达到 85.52%（超过 80% 目标）
  - 语句覆盖率 85.52%
  - 分支覆盖率 79.48%
  - 函数覆盖率 89.18%
  - 行覆盖率 86.71%

### 测试环境配置

- 配置 Vitest 测试框架
- 添加 @testing-library/react、@testing-library/jest-dom、@testing-library/user-event
- 创建 vitest.config.ts 配置文件
- 创建 src/test/setup.ts 测试设置文件
- 添加测试脚本：test、test:ui、test:coverage
- 创建 src/utils/email.test.ts 示例测试文件

### void 表达式混淆错误修复

修复了所有文件中的 `@typescript-eslint/no-confusing-void-expression` 错误，所有返回 void 的箭头函数都添加了花括号：
- App.tsx：修复 4 处错误（onClick 和 onClose 事件处理器）
- ComposeModal.tsx：修复 3 处错误（onChange 事件处理器）
- EmailList.tsx：修复 1 处错误（onClick 事件处理器）
- Sidebar.tsx：修复 3 处错误（onClick 事件处理器）
- SettingsModal.tsx：修复 6 处错误（onChange、onClick 事件处理器）
- test-connection.ts：修复 1 处错误（onclick 事件处理器）

### TypeScript 严格检查错误修复

- 修复 main.tsx 非空断言：改用安全的空值检查
- 修复 EmailList.tsx 不必要的可选链：body 字段不是可选的
- 修复 test-connection.ts 未使用的变量：移除 config 变量
- 修复 vite.config.ts unsafe 错误：添加类型断言
- 修复 vite.config.ts 不必要的 async：移除 async 关键字

### 性能优化 + 代码组织重构

**性能优化**
- EmailList、EmailDetail、Sidebar 组件使用 React.memo 优化渲染性能
- App.tsx 中的事件处理函数使用 useCallback 避免不必要的重新渲染
- EmailDetail 中的 handleSummarize、handleTranslate、handleDelete 使用 useCallback 优化

**代码组织**
- 新建 src/constants/email.ts：统一管理邮件分类、样式等常量
- 新建 src/utils/email.ts：提取邮件辅助函数（getCategoryStyles、getCategoryLabel、formatEmailDate、formatFullDate）
- 新建 src/utils/error.ts：统一错误处理（AppError 类、handleError、logError 函数）
- emailStore.ts 重构：使用统一错误处理，使用常量替换硬编码

### 代码质量改进

**配置文件**
- 配置 ESLint + Prettier + Git Hooks
- 添加 TypeScript 严格模式检查
- 配置 Tailwind CSS 优化和生产环境压缩

**安全性**
- 修复 React Hooks 依赖问题
- 增强 CSP 内容安全策略
- 密码存储安全性加固

### 初始版本

- 实现 163 邮箱客户端基础功能
- 支持邮件收发、AI 摘要、翻译等功能
- 采用 Tauri + React + TypeScript 技术栈
