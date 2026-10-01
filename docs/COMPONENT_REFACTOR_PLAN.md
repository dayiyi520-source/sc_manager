# 前端组件重构计划

## 📋 重构目标

1. 将重复的 UI 组件抽离为通用组件
2. 用 Ant Design 组件替换自定义实现
3. 统一组件 API 和使用方式
4. 减少代码重复，提高可维护性

## 🎯 待抽离的通用组件

### 1. 表单组件（高优先级）
- [ ] FormInput - 替换 DetailTextInput
- [ ] FormTextarea - 多行文本输入
- [ ] FormSelect - 替换 InlineEditableSelect
- [ ] FormDatePicker - 替换 DateField
- [ ] FormDateRangePicker - 日期范围选择
- [ ] FormCascader - 级联选择器

### 2. 数据展示组件（高优先级）
- [ ] DataTable - 统一表格组件（替换现有 DataTable）
- [ ] StatusBadge - 替换 StatusTag
- [ ] StatCard - 统计卡片
- [ ] EmptyState - 空状态占位
- [ ] DetailField - 详情字段展示

### 3. 布局组件（中优先级）
- [ ] PageHeader - 页面头部（面包屑 + 操作按钮）
- [ ] SearchBar - 搜索栏
- [ ] FilterPanel - 筛选面板
- [ ] Toolbar - 工具栏
- [ ] SplitView - 左右分栏视图

### 4. 交互组件（中优先级）
- [ ] ConfirmModal - 确认对话框
- [ ] FormModal - 表单弹窗
- [ ] DrawerPanel - 抽屉面板（替换 DetailDrawer）
- [ ] DropdownMenu - 下拉菜单
- [ ] Tabs - 标签页

### 5. 业务组件（低优先级）
- [ ] WorkOrderPicker - 工单选择器
- [ ] UserSelector - 人员选择器
- [ ] CustomerSelector - 客户选择器
- [ ] VersionSelector - 版本选择器
- [ ] PrioritySelector - 优先级选择器

## 🔄 Ant Design 替换映射

| 自定义组件 | Ant Design 组件 | 优先级 |
|-----------|----------------|-------|
| SearchableSelect | Select | 高 |
| DateField | DatePicker | 高 |
| Pagination | Pagination | 高 |
| StatusTag | Tag/Badge | 高 |
| InlineEditableSelect | Select + Editable | 高 |
| DetailDrawer | Drawer | 高 |
| UIComponents.Modal | Modal | 高 |
| UIComponents.Toast | message/notification | 高 |
| DataTable | Table | 中 |
| ListToolbar | Space + Button | 中 |

## 📁 目录结构

```
src/components/
├── common/              # 通用组件
│   ├── Form/           # 表单组件
│   │   ├── FormInput.tsx
│   │   ├── FormSelect.tsx
│   │   ├── FormDatePicker.tsx
│   │   └── index.ts
│   ├── Data/           # 数据展示
│   │   ├── DataTable.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── StatCard.tsx
│   │   └── index.ts
│   ├── Layout/         # 布局组件
│   │   ├── PageHeader.tsx
│   │   ├── SearchBar.tsx
│   │   ├── FilterPanel.tsx
│   │   └── index.ts
│   ├── Feedback/       # 交互反馈
│   │   ├── ConfirmModal.tsx
│   │   ├── FormModal.tsx
│   │   └── index.ts
│   └── Business/       # 业务组件
│       ├── WorkOrderPicker.tsx
│       ├── UserSelector.tsx
│       └── index.ts
├── layout/             # 页面布局
├── workbench/          # 业务页面
├── crm/
├── product/
└── ...
```

## 🚀 重构步骤

### Phase 1: 基础组件（第1周）
1. 创建目录结构
2. 封装表单组件（FormInput, FormSelect, FormDatePicker）
3. 封装数据展示组件（DataTable, StatusBadge）
4. 编写组件文档和示例

### Phase 2: 布局与交互（第2周）
5. 封装布局组件（PageHeader, SearchBar, FilterPanel）
6. 封装交互组件（Modal, Drawer, ConfirmModal）
7. 迁移 1-2 个页面作为示例

### Phase 3: 业务组件与迁移（第3周）
8. 封装业务组件（UserSelector, WorkOrderPicker）
9. 批量迁移剩余页面
10. 删除旧的自定义组件

## 📝 组件设计原则

1. **API 统一**：所有表单组件支持 value/onChange
2. **受控组件**：优先使用受控模式
3. **TypeScript**：完整的类型定义
4. **主题适配**：自动适配 AIEDIT 暗色主题
5. **可访问性**：遵循 WCAG 标准
6. **文档完整**：每个组件都有使用示例

## ⚠️ 注意事项

1. 保持向后兼容，逐步迁移
2. 优先迁移使用频率高的页面
3. 保留旧组件直到所有页面迁移完成
4. 每次提交只重构 1-2 个组件，确保可测试
5. 更新 PRD 文档记录组件变更

---
创建时间: 2025-01-XX
