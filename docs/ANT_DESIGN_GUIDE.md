# Ant Design 使用指南

本项目已配置 Ant Design 5.x + AIEDIT 暗色主题适配。

## ✅ 已完成配置

### 1. 依赖安装
- `antd@6.6.3` - Ant Design 组件库
- `@ant-design/icons@6.3.4` - Ant Design 图标库

### 2. 主题适配
在 `src/main.tsx` 中已配置 `ConfigProvider`，将 AIEDIT Design Token 映射到 Ant Design：

```tsx
<ConfigProvider
  theme={{
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#2F66F6',      // AIEDIT 品牌主色
      colorBgBase: '#0C0F13',       // 页面底色
      colorBgContainer: '#121923',  // 主面板
      // ... 完整 Token 映射
    }
  }}
>
  <App />
</ConfigProvider>
```

### 3. CSS 变量同步
`src/index.css` 中的 CSS 变量已与 Ant Design Token 保持一致。

## 📖 如何使用

### 直接导入组件
```tsx
import { Button, Input, Table, Modal, message } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';

export const MyComponent = () => {
  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />}>
        新建
      </Button>
      <Input placeholder="搜索" prefix={<SearchOutlined />} />
    </div>
  );
};
```

### 常用组件

**按钮**
```tsx
<Button type="primary">主要按钮</Button>
<Button>默认按钮</Button>
<Button type="dashed">虚线按钮</Button>
<Button type="link">链接按钮</Button>
<Button danger>危险按钮</Button>
```

**表单**
```tsx
import { Form, Input, Select } from 'antd';

<Form layout="vertical">
  <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
    <Input />
  </Form.Item>
  <Form.Item label="角色" name="role">
    <Select options={[{ value: 'admin', label: '管理员' }]} />
  </Form.Item>
</Form>
```

**表格**
```tsx
import { Table } from 'antd';

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '状态', dataIndex: 'status', key: 'status' },
];

<Table dataSource={data} columns={columns} />
```

**弹窗**
```tsx
import { Modal, message } from 'antd';

// 确认框
Modal.confirm({
  title: '确认删除？',
  content: '此操作不可恢复',
  onOk: () => message.success('删除成功'),
});

// 自定义弹窗
const [open, setOpen] = useState(false);

<Modal 
  title="标题" 
  open={open} 
  onOk={() => setOpen(false)}
  onCancel={() => setOpen(false)}
>
  内容
</Modal>
```

**消息提示**
```tsx
import { message } from 'antd';

message.success('操作成功');
message.error('操作失败');
message.warning('警告信息');
message.info('提示信息');
```

## 🎨 设计规范

### 图标使用规则
根据 `AGENTS.md` 规范：

1. **Ant Design Icons** - 用于 UI 控件
   ```tsx
   import { SearchOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
   ```

2. **Octicons** - 用于技术/品牌语义
   ```tsx
   import { MarkGithubIcon, RepoIcon } from '@primer/octicons-react';
   ```

3. **禁止新增 `lucide-react`**（现有代码可保留）

### 颜色使用规则
**禁止硬编码颜色值**，使用 CSS 变量或 Ant Design Token：

```tsx
// ❌ 错误
<div style={{ background: '#1890ff' }}>

// ✅ 正确
<div className="bg-[var(--primary)]">
<Button type="primary">  // Ant Design 自动应用主题色
```

### 状态覆盖（4 态）
所有交互组件必须提供：
- Normal（正常）
- Hover（悬停）
- Loading（加载）
- Disabled / Error（禁用/错误）

Ant Design 组件已内置这些状态，直接使用：
```tsx
<Button loading={isLoading} disabled={isDisabled}>提交</Button>
```

## 🧪 测试组件
已创建测试页面：`src/components/test/AntDesignTestView.tsx`

可用于验证主题适配效果，包含：
- 按钮（各种类型和状态）
- 表单控件（Input、Select）
- 表格（Table）
- 弹窗与消息（Modal、Message）

## 📚 官方文档
- Ant Design 官网：https://ant.design/
- React 组件文档：https://ant.design/components/overview-cn
- 主题定制：https://ant.design/docs/react/customize-theme-cn

## ⚠️ 注意事项

1. **不要覆盖全局样式**
   Ant Design 组件通过 ConfigProvider 统一管理样式，避免直接覆盖 `.ant-*` 类名。

2. **响应式设计**
   使用 Ant Design 的 Grid 系统或 Tailwind 的响应式工具类：
   ```tsx
   import { Row, Col } from 'antd';
   
   <Row gutter={16}>
     <Col xs={24} md={12}><Input /></Col>
     <Col xs={24} md={12}><Select /></Col>
   </Row>
   ```

3. **表单验证**
   使用 Ant Design Form 的内置验证，不需要额外引入 `react-hook-form`（除非特殊需求）：
   ```tsx
   <Form.Item 
     name="email" 
     rules={[
       { required: true, message: '请输入邮箱' },
       { type: 'email', message: '邮箱格式不正确' }
     ]}
   >
     <Input />
   </Form.Item>
   ```

4. **国际化**
   如需中文，已在 ConfigProvider 中默认配置，无需额外设置。

---

**总结**：现在可以直接在项目中使用 Ant Design 组件，无需额外配置。所有组件已自动适配 AIEDIT 暗色主题。