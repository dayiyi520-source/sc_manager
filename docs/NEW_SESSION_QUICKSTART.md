# 🚀 新会话快速启动指南

## 📋 给新会话的 AI 助手

你好！我是上一个会话的 AI 助手。这个项目正在进行前端组件重构，我已经完成了 Phase 1 和 Phase 2。

---

## ✅ 已完成的工作

1. **通用组件库**：封装了 18 个基于 Ant Design 的通用组件
2. **组织与系统模块**：迁移了 2 个页面（TeamOrgView, SystemSettingsView）
3. **主题问题**：修复了亮色/暗色主题自动切换

---

## 🎯 下一步任务

请继续迁移：

### 高优先级
1. **工作台模块** - `src/components/workbench/MyTasksView.tsx`
2. **产研管理模块** - `src/components/product/RequirementTasksView.tsx`

---

## ⚠️ 重要提醒

### 必须遵守的规则

#### 1. 主题适配（最重要！）
```tsx
// ✅ 正确：使用 CSS 变量
className="bg-[var(--bg-surface)] text-[var(--text-primary)]"

// ❌ 错误：不要使用这些！
className="dark-panel"  // 强制暗色
className="bg-slate-900"  // 硬编码颜色
```

#### 2. 使用通用组件
```tsx
import {
  PageHeader,      // 页面头部
  SearchBar,       // 搜索栏
  FilterPanel,     // 筛选面板
  DataTable,       // 数据表格
  FormModal,       // 表单弹窗
  StatCard,        // 统计卡片
  StatusBadge,     // 状态徽章
  showConfirm,     // 确认对话框
  message,         // 消息提示
} from '@/components/common';
```

#### 3. 迁移后必须测试
- [ ] 亮色模式（白色背景、黑色文字）
- [ ] 暗色模式（深色背景、白色文字）
- [ ] 所有功能正常工作

---

## 📚 关键文档

请先阅读这些文档：

1. **PROJECT_HANDOVER.md** - 完整交接文档（必读！）
2. **COMMON_COMPONENTS_GUIDE.md** - 组件使用指南
3. **ORG_SYSTEM_MIGRATION_REPORT.md** - 已完成迁移的示例

位置：`D:\project\manage_admin\docs\`

---

## 🛠️ 快速命令

```bash
# 启动项目
cd D:\project\manage_admin
bun run dev

# 访问地址
http://localhost:3000

# 测试亮色模式（浏览器控制台）
document.documentElement.classList.remove('dark')

# 测试暗色模式（浏览器控制台）
document.documentElement.classList.add('dark')
```

---

## 📝 标准迁移流程

### 1. 读取原文件
```bash
Get-Content "src/components/xxx/XxxView.tsx"
```

### 2. 替换为通用组件
- 页面头部 → `<PageHeader>`
- 搜索框 → `<SearchBar>`
- 表格 → `<DataTable>`
- 弹窗 → `<FormModal>` 或 `<DrawerPanel>`
- 统计卡片 → `<StatCard>`

### 3. 移除 `dark-panel` 类
```tsx
// 全局替换
className="dark-panel" → className="bg-[var(--bg-surface)]"
```

### 4. 测试验证
- 启动项目
- 测试亮色和暗色模式
- 截图给用户确认

---

## 🎨 CSS 变量速查

```css
/* 背景 */
--bg-surface: 亮色 #FFFFFF, 暗色 #121923
--bg-main: 亮色 #F5F6F8, 暗色 #0C0F13

/* 文字 */
--text-primary: 亮色 #111827, 暗色 #F8FAFC
--text-muted: 亮色 #6B7280, 暗色 #7C8796

/* 品牌色（固定） */
--primary: #2F66F6
--success: #22C55E
--warning: #FACC15
--danger: #F26D5B
```

---

## ✅ 检查清单

开始工作前，请确认：
- [ ] 已读取 PROJECT_HANDOVER.md
- [ ] 已理解主题适配规则
- [ ] 知道如何使用通用组件
- [ ] 了解迁移流程

---

**准备好了就开始吧！用户会告诉你要迁移哪个模块。** 🚀

祝开发顺利！
