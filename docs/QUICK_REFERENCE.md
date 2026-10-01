# 通用组件快速参考

> 快速查找组件用法的速查表

## 📋 组件导入

```tsx
import {
  // 表单
  FormInput, FormTextarea, FormSelect, FormDatePicker, FormDateRangePicker,
  // 数据展示
  DataTable, StatusBadge, StatCard, EmptyState, DetailField, DetailFieldGroup,
  // 布局
  PageHeader, SearchBar, FilterPanel, Toolbar,
  // 交互
  showConfirm, showDeleteConfirm, FormModal, DrawerPanel, message, notification,
  // 业务
  UserSelector,
} from '@/components/common';
```

## 🎯 常用模式

### 标准列表页面
```tsx
<PageHeader title="..." actions={[<Button>新建</Button>]} />
<SearchBar showFilter onFilterClick={...} />
<DataTable columns={...} dataSource={...} />
<FilterPanel open={...}>
  <FormSelect label="状态" />
</FilterPanel>
```

### 表单弹窗
```tsx
<FormModal title="新建" open={...} onSubmit={...}>
  <FormInput label="名称" name="name" required />
  <FormSelect label="状态" name="status" />
</FormModal>
```

### 详情抽屉
```tsx
<DrawerPanel title="详情" open={...}>
  <DetailFieldGroup title="基本信息">
    <DetailField label="名称" value="..." />
  </DetailFieldGroup>
</DrawerPanel>
```

### 确认对话框
```tsx
showDeleteConfirm({
  content: '确定要删除吗？',
  onOk: async () => {
    await deleteItem(id);
    message.success('删除成功');
  }
});
```

## 📊 组件速查

| 组件 | 用途 | 示例 |
|------|------|------|
| `FormInput` | 文本输入 | `<FormInput label="名称" value={...} onChange={...} />` |
| `FormSelect` | 下拉选择 | `<FormSelect label="状态" options={[...]} />` |
| `FormDatePicker` | 日期选择 | `<FormDatePicker label="日期" value={...} />` |
| `DataTable` | 数据表格 | `<DataTable columns={...} dataSource={...} />` |
| `StatusBadge` | 状态标签 | `<StatusBadge status="success" text="已完成" />` |
| `PageHeader` | 页面标题 | `<PageHeader title="..." actions={[...]} />` |
| `SearchBar` | 搜索栏 | `<SearchBar placeholder="..." showFilter />` |
| `FilterPanel` | 筛选面板 | `<FilterPanel open={...}>{filters}</FilterPanel>` |
| `FormModal` | 表单弹窗 | `<FormModal title="..." onSubmit={...}>...</FormModal>` |
| `DrawerPanel` | 抽屉面板 | `<DrawerPanel title="..." open={...}>...</DrawerPanel>` |

## 🎨 状态映射

```tsx
import { getStatusBadgeProps } from '@/components/common';

// 自动映射常见状态
<StatusBadge {...getStatusBadgeProps('completed')} />  // 已完成（成功）
<StatusBadge {...getStatusBadgeProps('processing')} /> // 进行中（处理中）
<StatusBadge {...getStatusBadgeProps('pending')} />    // 待处理（警告）
<StatusBadge {...getStatusBadgeProps('cancelled')} />  // 已取消（错误）
```

## ⚡ Props 速查

### 表单组件通用 Props
```tsx
label?: string          // 标签文本
value?: T               // 当前值
onChange?: (T) => void  // 值变化回调
error?: string          // 错误提示
required?: boolean      // 是否必填
placeholder?: string    // 占位符
disabled?: boolean      // 是否禁用
```

### DataTable Props
```tsx
columns: ColumnsType<T>    // 列配置
dataSource?: T[]           // 数据源
loading?: boolean          // 加载状态
rowKey?: string            // 行键
pagination?: PaginationProps | false  // 分页配置
emptyText?: string         // 空状态文本
```

### Modal Props
```tsx
title: string              // 标题
open: boolean              // 是否显示
onClose: () => void        // 关闭回调
onSubmit?: (values) => void // 提交回调（FormModal）
width?: number             // 宽度
```

## 🔧 常见问题

**Q: 如何自定义样式？**
```tsx
<FormInput className="custom-class" style={{ width: 200 }} />
```

**Q: 如何处理表单验证？**
```tsx
const [errors, setErrors] = useState<Record<string, string>>({});
<FormInput error={errors.name} />
```

**Q: 如何显示加载状态？**
```tsx
<DataTable loading={isLoading} />
<Button loading={isSubmitting}>提交</Button>
```

**Q: 如何自定义空状态？**
```tsx
<DataTable
  emptyText="暂无数据"
  emptyDescription="点击右上角按钮创建"
/>
```

## 📚 完整文档

详细文档请查看：
- [使用指南](./COMMON_COMPONENTS_GUIDE.md)
- [迁移示例](./MIGRATION_EXAMPLE.md)
- [重构总结](./COMPONENT_REFACTOR_SUMMARY.md)

---
快速参考 | 更新时间：2025-01-XX
