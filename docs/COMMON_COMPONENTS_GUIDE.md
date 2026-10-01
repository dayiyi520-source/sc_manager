# 通用组件使用指南

本文档介绍项目中封装的基于 Ant Design 的通用组件库。

## 📦 组件分类

### 1. 表单组件 (Form)

#### FormInput - 输入框
```tsx
import { FormInput } from '@/components/common';

<FormInput
  label="项目名称"
  value={name}
  onChange={setName}
  placeholder="请输入项目名称"
  required
  error={errors.name}
/>
```

#### FormTextarea - 多行文本
```tsx
<FormTextarea
  label="项目描述"
  value={description}
  onChange={setDescription}
  rows={4}
  placeholder="请输入项目描述"
/>
```

#### FormSelect - 下拉选择
```tsx
<FormSelect
  label="优先级"
  value={priority}
  onChange={setPriority}
  options={[
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' }
  ]}
  placeholder="请选择优先级"
/>
```

#### FormDatePicker - 日期选择
```tsx
<FormDatePicker
  label="计划开始日期"
  value={startDate}  // ISO 8601 字符串
  onChange={setStartDate}
  placeholder="选择日期"
/>
```

#### FormDateRangePicker - 日期范围
```tsx
<FormDateRangePicker
  label="项目周期"
  value={dateRange}  // [startISO, endISO]
  onChange={setDateRange}
  placeholder={['开始日期', '结束日期']}
/>
```

### 2. 数据展示组件 (Data)

#### DataTable - 数据表格
```tsx
import { DataTable } from '@/components/common';

<DataTable
  columns={[
    { title: '项目名称', dataIndex: 'name', key: 'name' },
    { title: '状态', dataIndex: 'status', key: 'status' }
  ]}
  dataSource={projects}
  loading={loading}
  rowKey="id"
  emptyText="暂无数据"
/>
```

#### StatusBadge - 状态徽章
```tsx
import { StatusBadge, getStatusBadgeProps } from '@/components/common';

<StatusBadge status="success" text="已完成" />
<StatusBadge status="processing" text="进行中" />
<StatusBadge status="error" text="已取消" />
<StatusBadge status="warning" text="待审核" />

// 使用预设映射
<StatusBadge {...getStatusBadgeProps('completed')} />
```

#### StatCard - 统计卡片
```tsx
<StatCard
  title="总项目数"
  value={128}
  suffix="个"
  trend="up"
  trendValue="+12%"
  description="较上月"
/>
```

#### EmptyState - 空状态
```tsx
<EmptyState
  title="暂无项目"
  description="创建您的第一个项目"
  action={
    <Button type="primary" icon={<PlusOutlined />}>
      新建项目
    </Button>
  }
/>
```

#### DetailField - 详情字段
```tsx
import { DetailField, DetailFieldGroup } from '@/components/common';

<DetailFieldGroup title="基本信息" columns={2}>
  <DetailField label="项目名称" value="师创管理后台" />
  <DetailField label="负责人" value="张三" />
  <DetailField label="状态">
    <StatusBadge status="processing" text="进行中" />
  </DetailField>
</DetailFieldGroup>
```

### 3. 布局组件 (Layout)

#### PageHeader - 页面头部
```tsx
import { PageHeader } from '@/components/common';
import { HomeOutlined, PlusOutlined } from '@ant-design/icons';

<PageHeader
  title="需求管理"
  subtitle="共 128 条需求"
  breadcrumb={[
    { title: <HomeOutlined /> },
    { title: '产品中心' },
    { title: '需求管理' }
  ]}
  actions={[
    <Button key="export">导出</Button>,
    <Button key="create" type="primary" icon={<PlusOutlined />}>
      新建需求
    </Button>
  ]}
/>
```

#### SearchBar - 搜索栏
```tsx
<SearchBar
  placeholder="搜索需求标题、编号"
  value={keyword}
  onChange={setKeyword}
  onSearch={handleSearch}
  showFilter
  onFilterClick={() => setFilterOpen(true)}
  filterActive={hasActiveFilters}
/>
```

#### FilterPanel - 筛选面板
```tsx
<FilterPanel
  open={filterOpen}
  onClose={() => setFilterOpen(false)}
  onReset={handleReset}
  onApply={handleApply}
>
  <FormSelect label="状态" options={statusOptions} />
  <FormSelect label="优先级" options={priorityOptions} />
  <FormDateRangePicker label="创建时间" />
</FilterPanel>
```

#### Toolbar - 工具栏
```tsx
<Toolbar
  left={
    <>
      <Button icon={<FilterOutlined />}>筛选</Button>
      <Button icon={<SortAscendingOutlined />}>排序</Button>
    </>
  }
  right={
    <>
      <Button icon={<ExportOutlined />}>导出</Button>
      <Button type="primary" icon={<PlusOutlined />}>新建</Button>
    </>
  }
/>
```

### 4. 交互反馈组件 (Feedback)

#### showConfirm - 确认对话框
```tsx
import { showConfirm, showDeleteConfirm } from '@/components/common';

// 通用确认
showConfirm({
  title: '确认操作',
  content: '确定要执行此操作吗？',
  onOk: async () => {
    await performAction();
    message.success('操作成功');
  }
});

// 删除确认（快捷方式）
showDeleteConfirm({
  content: '删除后无法恢复，确定要删除该项目吗？',
  onOk: async () => {
    await deleteProject(id);
    message.success('删除成功');
  }
});
```

#### FormModal - 表单弹窗
```tsx
import { FormModal } from '@/components/common';

<FormModal
  title="新建项目"
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  onSubmit={handleSubmit}
  initialValues={{ status: 'active' }}
>
  <FormInput label="项目名称" name="name" required />
  <FormTextarea label="项目描述" name="description" />
  <FormSelect label="状态" name="status" options={statusOptions} />
</FormModal>
```

#### DrawerPanel - 抽屉面板
```tsx
<DrawerPanel
  title="需求详情"
  open={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  width={720}
>
  <DetailFieldGroup title="基本信息">
    <DetailField label="需求标题" value={requirement.title} />
    <DetailField label="优先级" value={requirement.priority} />
  </DetailFieldGroup>
</DrawerPanel>
```

#### message & notification
```tsx
import { message, notification } from '@/components/common';

// 消息提示
message.success('操作成功');
message.error('操作失败');
message.warning('警告信息');
message.info('提示信息');

// 通知
notification.success({
  message: '创建成功',
  description: '项目已成功创建',
});
```

### 5. 业务组件 (Business)

#### UserSelector - 用户选择器
```tsx
<UserSelector
  label="负责人"
  value={ownerId}
  onChange={setOwnerId}
  users={[
    { id: '1', name: '张三', department: '研发部' },
    { id: '2', name: '李四', department: '产品部' }
  ]}
  placeholder="选择负责人"
/>
```

## 🎨 样式适配

所有组件已自动适配 AIEDIT 暗色主题，使用 CSS 变量：

```css
--primary: #2F66F6
--success: #22C55E
--warning: #FACC15
--danger: #F26D5B
--bg-main: #0C0F13
--bg-surface: #121923
--text-primary: #F8FAFC
--text-muted: #7C8796
--border-main: #2C3440
```

## 📝 迁移指南

### 替换旧组件

| 旧组件 | 新组件 | 说明 |
|--------|--------|------|
| `SearchableSelect` | `FormSelect` | 统一使用 Ant Design Select |
| `DateField` | `FormDatePicker` | 使用 Ant Design DatePicker |
| `StatusTag` | `StatusBadge` | 更丰富的状态显示 |
| `DetailDrawer` | `DrawerPanel` | 基于 Ant Design Drawer |
| 自定义 `Modal` | `FormModal` / `showConfirm` | 统一使用 Ant Design Modal |

### 迁移步骤

1. **导入新组件**
```tsx
// 旧方式
import { SearchableSelect } from '../common/SearchableSelect';
import { DateField } from '../common/DateField';

// 新方式
import { FormSelect, FormDatePicker } from '@/components/common';
```

2. **更新组件用法**
```tsx
// 旧方式
<SearchableSelect
  label="状态"
  value={status}
  options={statusList}
  onChange={setStatus}
/>

// 新方式
<FormSelect
  label="状态"
  value={status}
  options={statusList.map(s => ({ value: s.id, label: s.name }))}
  onChange={setStatus}
/>
```

3. **更新类型定义**
```tsx
// options 格式统一为 Ant Design 格式
type Option = { value: string | number; label: string };
```

## ⚠️ 注意事项

1. **受控组件**：所有表单组件都是受控组件，需要通过 `value` 和 `onChange` 管理状态
2. **类型安全**：所有组件都有完整的 TypeScript 类型定义
3. **错误处理**：表单组件支持 `error` 属性显示验证错误
4. **样式覆盖**：如需自定义样式，使用 `className` 和 CSS 变量

## 🔗 相关文档

- [Ant Design 官方文档](https://ant.design/components/overview-cn)
- [AIEDIT Design Token](../AGENTS.md)
- [组件重构计划](./COMPONENT_REFACTOR_PLAN.md)

---
更新时间：2025-01-XX
