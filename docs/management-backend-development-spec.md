# 管理后台项目级开发规范

> **适用范围**：本规范适用于管理后台项目的需求分析、界面设计、前端开发、后端开发、数据库设计、权限安全、测试验收、发布维护和后续迭代。
>
> **适用原则**：本规范不绑定具体菜单、业务板块或版本。菜单和业务模块可以调整，但新增和修改功能必须遵守本规范。
>
> **维护日期**：2026-09-10

## 1. 总体原则

### 1.1 项目目标

项目应具备以下特征：

- 业务边界清晰，页面和接口职责明确。
- 基础控件统一，业务模式适度复用。
- 数据真实、可持久化、可追踪、可审计。
- 前后端职责分离，后端负责最终业务约束。
- 权限控制可靠，租户和数据范围隔离完整。
- 数据库结构可演进，迁移过程可验证。
- 页面状态完整，错误能够被理解和恢复。
- 代码可测试、可维护、可扩展。
- 新功能不会破坏既有功能、接口和数据。

### 1.2 核心原则

1. 先明确业务规则，再设计页面和接口。
2. 先定义数据契约，再编写前后端代码。
3. 优先复用已有能力，避免重复实现。
4. 基础控件使用成熟组件库，业务模式适度封装。
5. 页面负责展示和交互，后端负责权限、状态和数据约束。
6. 核心业务数据必须持久化，不能依赖前端内存。
7. 重要操作必须支持权限校验、审计、幂等和并发控制。
8. 所有页面和接口都必须设计正常、异常、空数据和恢复流程。
9. 管理看板必须使用真实数据，禁止使用伪造统计。
10. 删除、状态变更和批量操作必须可追踪、可恢复或可解释。

## 2. 需求分析与产品设计

### 2.1 开发前必须明确

每个新功能开始开发前，必须明确：

- 功能目标和业务价值。
- 使用角色和数据范围。
- 使用前置条件。
- 业务对象及其生命周期。
- 核心操作和操作结果。
- 数据来源和保存位置。
- 状态流转和前置条件。
- 权限范围。
- 异常场景和恢复方式。
- 与现有功能的依赖关系。
- 对已有数据、接口和用户行为的兼容影响。
- 验收标准。

### 2.2 用户流程

每个功能至少说明：

```text
进入页面
→ 查询或选择数据
→ 执行业务操作
→ 前端即时反馈
→ 后端校验并保存
→ 返回处理结果
→ 刷新局部数据或页面状态
→ 支持继续操作、撤销或重试
```

### 2.3 边界状态

开发前必须识别：

- 数据为空。
- 数据加载失败。
- 网络中断。
- 请求超时。
- 用户重复提交。
- 用户没有权限。
- 数据已经被删除。
- 数据已被其他用户修改。
- 当前状态不允许继续操作。
- 关联对象不存在或已失效。
- 数据量过大。
- 文本过长。
- 文件上传失败。
- 批量操作部分成功、部分失败。

## 3. 前端开发规范

### 3.1 技术栈

项目统一使用：

```text
React 19
函数组件
React Hooks
React Context
React Query（或 TanStack Query）
React Router
Vite
antd（Ant Design 5.x）
@ant-design/icons
Tailwind CSS
TypeScript 或项目统一的 JavaScript 规范
```

禁止在新代码中引入已废弃的 Class 组件写法和旧版本生命周期方法。

### 3.2 分层原则

前端至少区分以下层次：

```text
页面层（Pages）
├── 页面布局
├── 页面状态
├── 用户交互
└── 业务组件组合

业务组件层（Components）
├── 表单
├── 列表
├── 详情
├── 弹窗
├── 抽屉
└── 状态展示

API 层（Services/API）
├── 请求封装
├── 参数转换
├── 响应转换
└── 错误处理

状态管理层（Context/Hooks）
├── 用户会话
├── 权限
├── 页面状态
├── 列表缓存
└── 用户偏好

工具层（Utils）
├── 日期格式化
├── 金额格式化
├── 文件处理
├── 权限判断
└── 通用校验
```

页面组件不得：

- 直接访问数据库。
- 直接编写复杂业务规则。
- 直接拼接复杂 HTTP 请求。
- 把权限判断作为唯一安全措施。
- 用固定数据伪造生产结果。
- 重复维护多个页面共享的业务状态。

### 3.3 组件编写规范

#### 推荐写法

```tsx
import { useState, useEffect } from 'react'
import { Button, Table, message } from 'antd'
import { getItems, updateItem } from '@/api/items'

export function ItemList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getItems()
      setItems(data)
    } catch (error) {
      message.error('数据加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div>
      <Table
        columns={columns}
        dataSource={items}
        loading={loading}
        rowKey="id"
      />
    </div>
  )
}
```

#### 使用 React Query

推荐使用 TanStack Query（React Query）管理服务端状态：

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getItems, updateItem } from '@/api/items'

export function ItemList() {
  const queryClient = useQueryClient()

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['items'],
    queryFn: getItems
  })

  const updateMutation = useMutation({
    mutationFn: updateItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      message.success('保存成功')
    }
  })

  if (error) {
    return <div>数据加载失败</div>
  }

  return (
    <Table
      columns={columns}
      dataSource={items}
      loading={isLoading}
      rowKey="id"
    />
  )
}
```

### 3.4 API 调用

页面不得直接编写底层请求：

```javascript
fetch('/api/...')
axios.get('/api/...')
```

页面应调用业务 API：

```javascript
import { getItems, updateItem } from '@/api/items'
```

API 层统一负责：

- 请求地址和 HTTP 方法。
- 参数序列化。
- Token 注入。
- 响应解包。
- 错误转换。
- 超时处理。
- 重试策略。
- 请求取消。
- 分页参数。
- 日期、枚举值和字段格式转换。

推荐 API 层结构：

```typescript
// src/api/client.ts
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options?.headers
    }
  })

  if (!response.ok) {
    throw new Error('请求失败')
  }

  const result = await response.json()
  return result.data
}

// src/api/items.ts
export function getItems() {
  return apiRequest<Item[]>('/api/items')
}

export function updateItem(id: string, data: Partial<Item>) {
  return apiRequest<void>(`/api/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}
```

### 3.5 状态管理

状态应按作用域划分：

```text
全局状态（Context/Redux/Zustand）
页面状态（useState）
服务端状态（React Query）
表单状态（受控组件 / React Hook Form）
URL 状态（React Router）
```

#### 全局状态适合保存

- 当前用户和会话。
- 权限。
- 主题。
- 全局导航。
- 用户偏好。
- 跨页面共享的稳定数据。

示例：

```tsx
// src/context/AppContext.tsx
import { createContext, useContext, ReactNode } from 'react'

interface AppContextType {
  currentUser: User | null
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  return (
    <AppContext.Provider value={{ currentUser, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
```

#### 页面状态适合保存

- 筛选条件。
- 当前分页。
- 当前排序。
- 当前选中行。
- 当前打开的弹窗或抽屉。
- 页面局部查询结果。

#### 组件状态适合保存

- 弹窗开关。
- 表单草稿。
- 下拉展开状态。
- 临时输入内容。
- 局部展开或收起状态。

### 3.6 请求状态

不得只用一个 `loading` 变量管理全部请求。至少区分：

```typescript
type RequestStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'saving'
  | 'deleting'
  | 'success'
  | 'error'

interface RequestState {
  status: RequestStatus
  error?: Error
}
```

不同请求之间不得互相覆盖状态。例如列表刷新不应锁定保存按钮，删除单行数据不应无条件锁定整个页面。

### 3.7 自定义 Hooks

推荐将重复的业务逻辑封装为自定义 Hook：

```tsx
// src/hooks/useTable.ts
export function useTable<T>(fetchFn: () => Promise<T[]>) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return { data, loading, error, reload: load }
}

// 使用
export function ItemList() {
  const { data, loading, error, reload } = useTable(getItems)

  return <Table dataSource={data} loading={loading} />
}
```

## 4. 界面设计规范

### 4.1 设计目标

管理后台界面优先保证：

- 信息清晰。
- 操作高效。
- 层级明确。
- 状态可理解。
- 数据可扫描。
- 反馈及时。
- 长期使用不疲劳。
- 适配不同屏幕。
- 不依赖装饰性元素传递业务含义。

### 4.2 信息层级

每个页面必须明确：

- **第一层级**：核心指标、主要数据列表、当前状态和主要操作。
- **第二层级**：辅助判断信息，如负责人、更新时间、关联对象和状态说明。
- **第三层级**：审计记录、历史数据、扩展字段和技术元数据。

### 4.3 标准页面结构

```text
页面容器
├── 页面标题区
│   ├── 页面名称
│   ├── 页面说明
│   └── 页面级操作
├── 筛选区
├── 列表工具栏
├── 数据区域
├── 分页区域
├── 详情抽屉或弹窗
└── 全局消息反馈
```

页面不得出现：

- 标题和主要操作不明确。
- 同一页面存在多个相同含义的主按钮。
- 操作按钮顺序不一致。
- 大量装饰性空白但缺少有效信息。
- 使用装饰性卡片代替真实数据。
- 使用虚假的数量、进度或趋势。

### 4.4 8pt 栅格

优先使用：

```text
4px、8px、12px、16px、24px、32px、40px、48px
```

推荐默认值：

```text
页面内边距：24px
大区块间距：24px
卡片内边距：16px 或 24px
表单字段间距：16px
按钮间距：8px
标题与描述间距：8px
```

## 5. 组件库与业务组件

### 5.1 基础控件

按钮、输入框、选择器、表格、弹窗、抽屉、分页、标签、日期控件等原则上直接使用 `antd`（Ant Design 5.x）：

```tsx
import { Button, Input, Select, Table, Modal, Drawer, Pagination } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'

export function MyPage() {
  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />}>
        新增
      </Button>

      <Input
        placeholder="请输入关键词"
        prefix={<SearchOutlined />}
      />

      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        pagination={{
          total: 100,
          pageSize: 20,
          current: 1
        }}
      />

      <Modal
        title="编辑"
        open={open}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form>...</Form>
      </Modal>
    </div>
  )
}
```

Ant Design 5.x 常用组件：

```text
Button
Input
Input.TextArea
InputNumber
Select
TreeSelect
Cascader
DatePicker
RangePicker
Form
Table
Pagination
Modal
Drawer
Tabs
Tag
Badge
Dropdown
Tooltip
Popconfirm
Alert
Empty
Spin
Skeleton
Upload
Checkbox
Radio
Switch
Segmented
```

不得重新实现组件库已经提供的基础能力。

### 5.2 适度封装

允许封装反复出现且具有稳定业务语义的模式：

```text
AppPage
AppPageHeader
AppSearchForm
AppListToolbar
AppDataTable
AppDetailDrawer
AppStatusTag
AppStateView
AppPermissionGuard
AppFilterSummary
AppBatchActionBar
```

封装目标是统一业务结构、状态、权限、反馈和数据转换，而不是重新实现基础组件。

示例：

```tsx
// src/components/AppPage.tsx
export function AppPage({ 
  title, 
  extra, 
  children 
}: { 
  title: string
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        {extra}
      </div>
      {children}
    </div>
  )
}
```

满足以下任一条件时可考虑封装：

- 至少三个业务页面重复使用。
- 具有稳定业务含义。
- 包含统一权限或状态逻辑。
- 包含统一数据转换。
- 复制代码会造成明显维护成本。

不要封装：

- 只出现一次的普通输入框。
- 只有几行代码的按钮。
- 单纯为了减少代码行数的包装层。
- 没有稳定业务含义的布局片段。
- 需要大量互斥 Props 才能支持不同场景的组件。

## 6. Design Token 与主题

### 6.1 主题入口

Ant Design 5.x 主题通过 `ConfigProvider` 统一配置：

```tsx
// src/App.tsx
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'

const customTheme = {
  token: {
    colorPrimary: '#2f66f6',
    borderRadius: 8,
    fontSize: 14
  },
  components: {
    Button: {
      controlHeight: 32
    },
    Table: {
      headerBg: '#fafafa'
    }
  }
}

export function App() {
  return (
    <ConfigProvider theme={customTheme} locale={zhCN}>
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}
```

页面和组件不得逐页定义颜色、圆角、阴影和控件风格。

### 6.2 Token 分层

#### 基础 Token

```text
颜色、字体、间距、圆角、阴影、层级、动效
```

#### 语义 Token

```text
colorPrimary
colorSuccess
colorWarning
colorError
colorTextBase
colorTextSecondary
colorBorder
colorBgContainer
```

#### 组件 Token

```text
Button.controlHeight
Button.borderRadius
Table.headerBg
Modal.contentBg
Drawer.footerPaddingBlock
Form.itemMarginBottom
Tag.defaultBg
```

组件 Token 不得脱离全局主题单独定义颜色。

### 6.3 Ant Design 与 Tailwind 分工

`ConfigProvider` 作为 Ant Design 主题入口，统一配置所有组件。

Tailwind 主要用于：

- 页面布局。
- Flex 和 Grid。
- 宽高和定位。
- 响应式。
- 间距。
- 文本布局。

Tailwind 不应重写 Ant Design 控件本身的背景、边框、圆角、阴影、hover、focus 和 disabled 状态。

不推荐：

```tsx
<Button className="bg-blue-600 rounded-xl px-6">保存</Button>
```

推荐：

```tsx
<div className="flex justify-end gap-2">
  <Button>取消</Button>
  <Button type="primary">保存</Button>
</div>
```

### 6.4 主题切换

Ant Design 5.x 支持动态主题切换：

```tsx
import { ConfigProvider, theme } from 'antd'

export function App() {
  const [isDark, setIsDark] = useState(false)

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2f66f6'
        }
      }}
    >
      <Button onClick={() => setIsDark(!isDark)}>
        切换主题
      </Button>
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}
```

## 7. 图标规范

### 7.1 Ant Design 图标

用于标准控件交互：

```tsx
import {
  SearchOutlined,
  CloseOutlined,
  LeftOutlined,
  DownOutlined,
  UpOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  SaveOutlined,
  UploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
  FilterOutlined,
  PlusOutlined,
  CopyOutlined
} from '@ant-design/icons'
```

### 7.2 Octicons

用于品牌化和技术领域语义：

```tsx
import { 
  CodeIcon, 
  GitBranchIcon, 
  RepoIcon, 
  TagIcon,
  IssueOpenedIcon,
  BugIcon,
  ProjectIcon
} from '@primer/octicons-react'
```

### 7.3 自定义 SVG

仅用于：

- 品牌 Logo。
- 香蕉品牌元素。
- 空状态插画。
- 产品专属图形。
- 无法由组件库图标或 Octicons 表达的专业图形。

### 7.4 禁止事项

- 新代码禁止引入未约定的图标库。
- 禁止新增 `lucide-react`（如需替换现有 lucide 图标，优先使用 Ant Design Icons 或 Octicons）。
- 同一组控件不得无规则混用图标体系。
- 纯图标按钮必须提供 Tooltip 或 `aria-label`。
- 图标不得替代关键文字说明。
- 删除和危险操作不得使用含义模糊的图标。

## 8. 交互与状态规范

### 8.1 四种基本状态

所有新增交互组件必须覆盖：

#### Normal

- 默认状态清晰。
- 可操作状态明确。
- 文案完整。
- 必填字段明确。
- 空数据不伪造内容。

#### Hover / Focus

- 可点击元素有明显反馈。
- 键盘聚焦有清晰 Focus Ring。
- 不依赖颜色作为唯一反馈。
- 不造成布局跳动。

#### Active / Loading

- 提交、保存、删除和刷新显示处理中状态。
- 防止重复点击。
- 按钮宽度不因 Loading 改变。
- 操作完成后提示成功或失败。
- 失败后提供恢复路径。

```tsx
<Button
  type="primary"
  loading={loading}
  onClick={handleSubmit}
>
  保存
</Button>
```

#### Disabled / Error / Empty

必须处理：

- 无权限。
- 不允许操作。
- 字段校验失败。
- 接口异常。
- 网络超时。
- 数据为空。
- 数据不存在。
- 状态不允许操作。
- 并发冲突。
- 关联对象失效。

### 8.2 删除操作

删除必须：

1. 说明影响范围。
2. 说明是否可恢复。
3. 对危险操作进行确认。
4. 防止重复提交。
5. 后端再次校验权限和对象状态。
6. 记录操作人和时间。
7. 优先使用软删除。
8. 关联数据存在时阻止删除或改为归档。
9. 删除失败时说明原因。

推荐使用：

```tsx
import { Modal, message } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

const handleDelete = (id: string) => {
  Modal.confirm({
    title: '确认删除',
    icon: <ExclamationCircleOutlined />,
    content: '删除后不可恢复，确定要删除吗？',
    okText: '确认',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await deleteItem(id)
        message.success('删除成功')
        reload()
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}
```

禁止使用：

```javascript
window.alert()
window.confirm()
window.prompt()
```

### 8.3 批量操作

批量操作必须明确：

- 选中数量。
- 操作范围。
- 是否允许部分成功。
- 成功和失败对象。
- 是否可以重试。
- 最大批量数量。
- 是否需要二次确认。

```tsx
const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

const rowSelection = {
  selectedRowKeys,
  onChange: setSelectedRowKeys
}

const handleBatchDelete = () => {
  if (selectedRowKeys.length === 0) {
    message.warning('请选择要删除的数据')
    return
  }

  Modal.confirm({
    title: `确认删除 ${selectedRowKeys.length} 条数据？`,
    onOk: async () => {
      try {
        await batchDelete(selectedRowKeys)
        message.success('批量删除成功')
        reload()
      } catch (error) {
        message.error('批量删除失败')
      }
    }
  })
}

return (
  <Table
    rowSelection={rowSelection}
    dataSource={data}
  />
)
```

优先提供真正的批量接口，不得在前端无控制地逐条发送请求。

## 9. 表单规范

### 9.1 表单布局

Ant Design Form 推荐用法：

```tsx
import { Form, Input, Select, DatePicker, Button } from 'antd'

export function ItemForm() {
  const [form] = Form.useForm()

  const onFinish = async (values: any) => {
    try {
      await createItem(values)
      message.success('保存成功')
    } catch (error) {
      message.error('保存失败')
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <Form.Item
        label="名称"
        name="name"
        rules={[{ required: true, message: '请输入名称' }]}
      >
        <Input placeholder="请输入名称" />
      </Form.Item>

      <Form.Item
        label="状态"
        name="status"
        rules={[{ required: true }]}
      >
        <Select>
          <Select.Option value="active">启用</Select.Option>
          <Select.Option value="inactive">禁用</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          保存
        </Button>
        <Button style={{ marginLeft: 8 }} onClick={() => form.resetFields()}>
          重置
        </Button>
      </Form.Item>
    </Form>
  )
}
```

### 9.2 表单校验

前端校验用于即时反馈，后端校验用于最终约束。

必须校验：

- 必填。
- 长度。
- 格式。
- 数值范围。
- 日期关系。
- 枚举值。
- 关联对象是否存在。
- 当前状态是否允许修改。
- 当前用户是否有权限。
- 是否重复。
- 是否超过业务上限。

```tsx
<Form.Item
  label="邮箱"
  name="email"
  rules={[
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入有效的邮箱地址' }
  ]}
>
  <Input />
</Form.Item>

<Form.Item
  label="手机号"
  name="phone"
  rules={[
    { required: true },
    { pattern: /^1\d{10}$/, message: '请输入有效的手机号' }
  ]}
>
  <Input />
</Form.Item>
```

更新数据前，后端必须重新读取并校验 ID、租户、状态、权限、版本和关联对象。

### 9.3 提交行为

提交时必须：

- 防止重复提交。
- 显示 Loading。
- 保留用户输入。
- 成功后刷新数据或关闭窗口。
- 失败后保持表单内容。
- 明确提示错误字段。
- 对并发冲突提供刷新或重新编辑入口。

```tsx
const [submitting, setSubmitting] = useState(false)

const onFinish = async (values: any) => {
  setSubmitting(true)
  try {
    await createItem(values)
    message.success('保存成功')
    onClose()
  } catch (error) {
    message.error('保存失败')
  } finally {
    setSubmitting(false)
  }
}

return (
  <Form onFinish={onFinish}>
    {/* ... */}
    <Button type="primary" htmlType="submit" loading={submitting}>
      保存
    </Button>
  </Form>
)
```

## 10. 表格与列表规范

### 10.1 表格设计

```tsx
import { Table, Button, Space } from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface Item {
  id: string
  name: string
  status: string
  createdAt: string
}

export function ItemList() {
  const { data, loading } = useQuery({
    queryKey: ['items'],
    queryFn: getItems
  })

  const columns: ColumnsType<Item> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt'
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small">编辑</Button>
          <Button type="link" size="small" danger>删除</Button>
        </Space>
      )
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      pagination={{
        total: 100,
        pageSize: 20,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`
      }}
    />
  )
}
```

表格应：

- 优先展示核心字段。
- 控制列数量。
- 固定关键列。
- 支持横向滚动。
- 长文本截断并支持完整查看。
- 使用统一状态标签。
- 统一日期、金额和数量格式。
- 提供加载、空数据、错误和刷新状态。
- 支持分页或虚拟滚动。

### 10.2 搜索表单

```tsx
import { Form, Input, Select, Button, Space } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'

export function SearchForm({ onSearch }: { onSearch: (values: any) => void }) {
  const [form] = Form.useForm()

  const handleReset = () => {
    form.resetFields()
    onSearch({})
  }

  return (
    <Form
      form={form}
      layout="inline"
      onFinish={onSearch}
    >
      <Form.Item name="keyword">
        <Input placeholder="搜索关键词" />
      </Form.Item>

      <Form.Item name="status">
        <Select placeholder="状态" style={{ width: 120 }}>
          <Select.Option value="">全部</Select.Option>
          <Select.Option value="active">启用</Select.Option>
          <Select.Option value="inactive">禁用</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
```

## 11. 后端开发规范

### 11.1 分层结构

统一遵守：

```text
Controller
→ Service
→ Mapper / Repository
→ Database
```

职责如下：

#### Controller

负责：

- 接收 HTTP 请求。
- 参数基础校验。
- 权限声明。
- 调用 Service。
- 组装响应。

Controller 不得：

- 编写复杂业务逻辑。
- 直接执行 SQL。
- 直接操作 Redis、文件和数据源。
- 管理事务。
- 拼接大量业务判断。

#### Service

负责：

- 业务规则。
- 权限后的数据校验。
- 事务。
- 状态流转。
- 远程调用。
- DTO、Entity、VO 转换。
- 幂等和并发控制。

#### Mapper / Repository

负责：

- 数据查询。
- 数据写入。
- 必要的持久化 SQL。

Mapper 不得：

- 调用远程服务。
- 产生页面提示文案。
- 管理事务边界。
- 直接决定业务状态。

### 11.2 接口设计

接口应：

- 语义清晰。
- 使用稳定资源路径。
- 区分查询、创建、更新、删除和状态变更。
- 使用正确 HTTP 方法。
- 统一分页、筛选和排序。
- 返回稳定错误码。
- 避免一个接口承担多个不相关动作。

### 11.3 DTO、Entity、VO

不得直接将数据库 Entity 作为接口响应。

推荐：

```text
Request DTO
→ Service
→ Entity
→ Service
→ Response VO
```

接口不得泄露密码、Token、内部堆栈、不必要的审计字段和数据库字段。

### 11.4 统一响应

成功响应：

```json
{
  "code": "OK",
  "message": "",
  "data": {},
  "requestId": "request-id"
}
```

错误响应：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "请求参数不合法",
  "data": null,
  "requestId": "request-id"
}
```

推荐错误码：

```text
OK
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
BUSINESS_ERROR
RATE_LIMITED
INTERNAL_ERROR
```

### 11.5 分页

统一结构：

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0
}
```

接口必须限制最大 `pageSize`、查询范围和深分页风险，并定义默认排序。

### 11.6 状态机

涉及状态的业务必须定义：

```text
当前状态
→ 允许的目标状态
→ 执行条件
→ 操作角色
→ 失败原因
→ 审计事件
```

后端不得让前端提交任意状态字符串后直接落库。

### 11.7 幂等性

创建、删除、审批、同步、批量操作等接口必须考虑幂等性，可使用：

- 业务唯一键。
- 请求幂等键。
- 数据库唯一索引。
- 状态校验。
- 重复请求结果复用。

### 11.8 并发控制

重要更新接口必须使用乐观锁或悲观锁。

推荐请求携带：

```json
{
  "version": 3,
  "status": "处理中"
}
```

更新条件必须包含：

```text
id_
tenant_id_
version_
delete_flag_
```

并发冲突返回 `409 Conflict`，前端提示用户刷新后重试。

## 12. 数据库规范

### 12.1 表结构

业务表原则上包含：

```text
id_
tenant_id_
create_by_
update_by_
create_time_
update_time_
delete_flag_
version_
```

### 12.2 命名

表名使用：

```text
t_<domain>_<name>
```

数据库字段使用下划线命名，接口字段使用语义化命名，不直接暴露数据库字段名。

### 12.3 租户隔离

所有查询、详情、统计、更新和删除必须带 `tenant_id_` 条件，禁止仅根据 ID 查询业务数据。

### 12.4 软删除

重要业务数据原则上使用软删除：

```text
delete_flag_ = 1
```

软删除必须记录审计，默认查询不返回已删除数据，恢复操作必须有权限。

### 12.5 数据库迁移

所有结构变化必须通过版本化迁移文件管理：

```text
Vx.y.z__description.sql
```

迁移必须考虑：

- 新环境初始化。
- 已有环境升级。
- 重复执行。
- 数据兼容。
- 旧字段迁移。
- 索引创建。
- 大表变更。
- 失败回滚或补偿。
- 生产执行耗时。

### 12.6 索引与唯一性

应为租户过滤、唯一业务编码、状态查询、负责人查询、时间排序、关联查询、分页排序和软删除条件设计索引。

重要业务规则必须由数据库唯一索引兜底，不能只依赖前端判断重复。

### 12.7 JSON 字段

JSON 适合保存非核心扩展属性和不参与核心统计的配置，不适合长期保存：

- 核心关联关系。
- 需要反向查询的数据。
- 需要唯一约束的数据。
- 需要排序和统计的数据。
- 需要权限控制的数据。

## 13. 权限与安全规范

### 13.1 前后端双重控制

前端权限用于隐藏菜单、按钮和展示无权限状态；后端权限用于真正保证数据访问和操作安全。

不能把前端隐藏按钮视为安全措施。

### 13.2 权限层级

权限至少考虑：

```text
菜单权限
页面权限
按钮权限
接口权限
数据权限
字段权限
操作范围权限
```

数据权限可按租户、部门、项目、产品线、负责人、角色、创建人和组织范围控制。

### 13.3 后端操作校验

每次操作必须验证：

- 用户身份。
- Token 有效期。
- 租户。
- 角色。
- 数据归属。
- 数据状态。
- 操作权限。
- 关联对象权限。
- 数据版本。
- 删除状态。

### 13.4 认证与会话

必须：

- 安全存储 Token。
- 设置合理过期时间。
- 支持退出登录和会话失效。
- 处理 Token 过期。
- 避免在 URL 中暴露敏感 Token。
- 不在日志中打印 Token、密码和敏感请求体。
- 对登录和高风险操作限流。

### 13.5 输入与输出安全

必须防范：

- SQL 注入。
- XSS。
- CSRF。
- SSRF。
- 路径穿越。
- 文件上传漏洞。
- JSON 反序列化风险。
- 恶意 HTML。
- 超长请求和恶意文件类型。
- 越权访问。

富文本必须经过白名单清洗，禁止直接渲染未经处理的 HTML。

### 13.6 敏感信息

禁止：

- 将密码、API Key、Token 和密钥写入代码。
- 将敏感信息提交到 Git。
- 将生产数据复制到测试环境而不脱敏。
- 在错误信息中返回堆栈和内部实现细节。

## 14. 可访问性规范

必须保证：

- 所有交互元素可键盘操作。
- Focus 状态清晰。
- 图标按钮提供 `aria-label` 或 Tooltip。
- 表单控件有明确 label。
- 错误信息与字段关联。
- 颜色不是唯一信息来源。
- 状态标签同时显示文字。
- 弹窗和抽屉具备正确语义。
- 关闭、返回和确认操作可通过键盘完成。
- 文字缩放后页面仍可使用。
- 动效不会妨碍阅读和操作。

## 15. 响应式规范

至少验证以下尺寸：

```text
1920 × 1080
1440 × 900
1280 × 800
1024 × 768
768 × 1024
375 × 812
```

重点检查：

- 侧边栏折叠。
- 搜索表单换行。
- 表格横向滚动。
- 弹窗和抽屉宽度。
- 底部操作区域。
- 长文本截断。
- 空状态布局。
- 复杂表单可操作性。
- 移动端触控区域。

浏览器视觉验证默认使用 `1920 × 1080` 页面 viewport，并确认实际网页 viewport 尺寸。

## 16. 测试规范

### 16.1 前端测试

使用 Vitest 和 React Testing Library：

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ItemList } from './ItemList'

describe('ItemList', () => {
  it('should render list', async () => {
    render(<ItemList />)
    
    await waitFor(() => {
      expect(screen.getByText('数据1')).toBeInTheDocument()
    })
  })

  it('should handle delete', async () => {
    const mockDelete = vi.fn()
    render(<ItemList onDelete={mockDelete} />)
    
    const deleteButton = screen.getByText('删除')
    fireEvent.click(deleteButton)
    
    expect(mockDelete).toHaveBeenCalled()
  })
})
```

至少覆盖：

- 组件渲染。
- 用户点击和输入。
- 表单校验。
- API 成功、失败和超时。
- 空数据和加载状态。
- 禁用状态。
- 重复提交。
- 删除确认。
- 权限不足。
- 并发冲突。
- 长文本。
- 分页和筛选。
- 响应式布局。

### 16.2 后端测试

至少覆盖：

- 正常流程。
- 参数校验。
- 未登录访问。
- 无权限访问。
- 跨租户访问。
- 数据不存在。
- 重复提交和幂等性。
- 非法状态流转。
- 并发更新和乐观锁冲突。
- 软删除。
- 关联对象不存在。
- 数据库约束。
- 事务回滚。
- 批量操作部分失败。

### 16.3 数据库测试

必须验证：

- 新环境初始化。
- 已有环境升级。
- 迁移幂等性。
- 索引和唯一约束。
- 软删除查询。
- 租户隔离。
- 大数据量分页。
- 关联删除策略。
- 迁移失败处理。

### 16.4 工程检查

前端至少执行：

```bash
bun run lint
bun run test
bun run build
```

TypeScript 项目建议增加：

```bash
tsc --noEmit
```

后端至少执行：

```bash
mvn test
mvn package
```

新增数据库迁移后，必须执行迁移校验和集成测试。

## 17. 验收规范

### 17.1 功能验收

验收必须包含：

- 正常流程。
- 空数据流程。
- 加载流程。
- 错误流程。
- 权限流程。
- 删除流程。
- 重复提交。
- 并发冲突。
- 长文本。
- 大数据量。
- 移动端。
- 刷新后数据持久化。

### 17.2 接口验收

检查：

- 请求参数。
- 响应字段。
- 错误码和 HTTP 状态码。
- 分页、排序和筛选。
- 权限和租户隔离。
- 并发控制。
- 幂等性。
- 审计记录。

### 17.3 数据验收

检查：

- 数据是否正确保存。
- 刷新后是否仍存在。
- 多用户是否看到正确数据。
- 删除是否符合预期。
- 关联关系是否正确。
- 状态是否同步。
- 审计是否完整。
- 迁移是否可重复执行。
- 旧数据是否兼容。

### 17.4 发布门禁

以下任一项未通过，不得直接发布：

- 核心测试失败。
- 存在权限绕过或跨租户数据风险。
- 存在生产环境硬编码数据。
- 存在严重数据丢失风险。
- 数据库迁移无法回滚或补偿。
- 关键接口没有错误处理。
- 页面只有成功状态，没有失败状态。
- 构建失败。
- 关键页面无法在目标浏览器运行。

## 18. 日志、监控与审计

### 18.1 日志

日志应记录：

- 请求 ID。
- 用户 ID。
- 租户 ID。
- 接口路径。
- 操作类型。
- 执行耗时。
- 成功或失败。
- 错误码。
- 关键业务对象 ID。

禁止记录密码、Token、API Key、完整身份证号、银行卡号和敏感请求体。

### 18.2 审计

以下操作必须记录：

- 登录和退出。
- 权限变更。
- 新增、编辑、删除和恢复。
- 状态变更和审批。
- 批量操作。
- 文件上传和下载。
- 数据导入和导出。
- 关键配置变更。

审计记录至少包含：

```text
操作人
租户
操作类型
对象类型
对象 ID
变更前
变更后
操作时间
请求 ID
来源地址
结果
失败原因
```

### 18.3 监控

建议监控：

- 接口成功率和响应时间。
- 错误码分布。
- 数据库连接池和慢查询。
- 队列积压。
- 文件存储失败。
- 定时任务失败。
- 外部接口失败。
- 登录异常和权限异常。
- 批量操作失败率。

## 19. 代码质量规范

必须：

- 使用清晰的变量名。
- 保持函数职责单一。
- 控制组件复杂度。
- 删除无用导入和调试日志。
- 处理 Promise 异常、空值和边界。
- 避免重复请求和不必要的重复渲染。
- 清理事件监听，避免内存泄漏。
- 避免魔法数字和隐式类型转换。
- 保留必要的错误上下文。
- 保持代码格式和目录结构一致。

禁止：

- 提交临时调试代码。
- 提交未完成的核心逻辑。
- 用绕过业务规则的方式通过测试。
- 复制大段重复代码。
- 用前端限制代替后端安全校验。

## 20. 禁止实现的内容

### 20.1 数据与业务

- 使用固定数字伪造统计结果。
- 使用虚构进度伪装真实进度。
- 使用静态时间伪装实时动态。
- 使用前端内存代替核心业务持久化。
- 刷新页面后丢失重要业务数据。
- 使用补数逻辑制造业务结论。
- 未确认关联关系就删除核心数据。
- 让前端任意修改后端状态。
- 让重复请求产生重复数据。
- 通过忽略错误实现"看起来成功"。

### 20.2 前端

- 页面直接调用底层 HTTP。
- 页面直接处理完整权限规则。
- 页面硬编码颜色、圆角和组件样式。
- 页面重复实现基础控件。
- 使用原生 `alert`、`confirm`、`prompt`。
- 只设计成功状态。
- 只用颜色表达状态。
- 使用无法恢复的静默操作。
- 创建看似可点击但未实现的按钮。

### 20.3 后端

- Controller 直接执行 SQL。
- Controller 编写复杂业务逻辑。
- 使用 Entity 直接作为接口响应。
- 长期使用 `Map<String, Object>` 代替稳定 DTO。
- 不校验租户直接查询数据。
- 不校验权限直接修改数据。
- 不校验状态直接流转。
- 不校验版本直接更新数据。
- 捕获所有异常后统一返回成功。
- 把密码、Token 和密钥写入代码或日志。
- 通过返回 200 隐藏业务失败。
- 通过删除数据绕过业务约束。
- 依赖前端保证唯一性、幂等性和安全性。

### 20.4 数据库

- 手工修改生产表而没有迁移文件。
- 直接物理删除重要业务数据。
- 使用 JSON 保存核心关系并长期依赖。
- 不加租户条件查询。
- 不为唯一业务规则建立数据库约束。
- 不为高频查询设计索引。
- 迁移脚本不可重复执行。
- 修改字段但不考虑旧数据兼容。
- 删除仍被其他业务使用的表。
- 为删除某个菜单而删除共享业务表。

## 21. 标准开发流程

### 阶段一：需求确认

1. 明确业务目标。
2. 明确角色和权限。
3. 明确对象和状态。
4. 明确正常和异常流程。
5. 明确数据来源和保存位置。
6. 明确与现有模块的依赖。
7. 明确验收标准。

### 阶段二：数据和接口设计

1. 定义请求 DTO。
2. 定义响应 VO。
3. 定义分页和错误结构。
4. 定义状态机。
5. 定义权限规则。
6. 定义并发和幂等策略。
7. 定义数据表和索引。
8. 编写数据库迁移方案。

### 阶段三：界面设计

1. 确定页面信息层级。
2. 确定页面布局。
3. 确定组件使用方式。
4. 确定 Design Token。
5. 设计加载、空数据和错误状态。
6. 设计表单校验。
7. 设计删除和危险操作。
8. 设计响应式和可访问性行为。

### 阶段四：代码实现

1. 实现数据库迁移。
2. 实现后端 DTO、Service 和接口。
3. 实现后端权限和状态校验。
4. 实现 API 层。
5. 实现页面和业务组件。
6. 接入真实数据。
7. 完善错误和恢复流程。
8. 增加审计和日志。
9. 清理调试代码和无用依赖。

### 阶段五：验证验收

1. 执行单元测试。
2. 执行接口和集成测试。
3. 执行前端构建。
4. 执行数据库迁移验证。
5. 验证权限和租户隔离。
6. 验证并发和幂等。
7. 验证响应式布局。
8. 验证可访问性。
9. 验证生产配置和敏感信息。
10. 更新需求文档和变更记录。

## 22. 功能完成定义

一个功能只有同时满足以下条件，才算完成：

- 页面功能可用。
- API 契约稳定。
- 数据正确持久化。
- 数据库迁移已记录。
- 权限在前后端均已生效。
- 状态流转符合业务规则。
- 重复操作不会产生脏数据。
- 并发冲突有明确反馈。
- 加载、空数据、错误和禁用状态完整。
- 页面符合统一 Design Token。
- 基础控件使用组件库。
- 图标使用符合规范。
- 支持键盘和响应式使用。
- 通过相关测试和构建检查。
- 无调试日志和敏感信息。
- 已记录潜在风险和后续建议。

## 23. 新功能需求提交模板

后续新增功能建议使用以下模板：

```text
功能名称：

业务目标：

使用角色：

页面入口：

核心流程：

页面字段：

接口需求：

数据表需求：

状态流转：

权限要求：

异常场景：

空状态：

加载状态：

错误状态：

禁用状态：

响应式要求：

图标要求：

验收标准：

测试范围：
```

## 24. 最终判断标准

任何设计和实现方案都应回答以下问题：

1. 业务数据是否真实、持久化并可追踪？
2. 前端是否正确使用组件库和 Design Token？
3. 页面是否提供完整的加载、空数据、错误和恢复状态？
4. 后端是否真正校验权限、租户、状态、版本和关联关系？
5. 数据库是否有迁移、索引、唯一约束和兼容方案？
6. 重复请求、并发更新和部分失败是否有明确处理？
7. 页面是否支持键盘、响应式和不同主题？
8. 测试是否覆盖正常流程和关键边界？
9. 发布后是否能够监控、审计和定位问题？
10. 后续开发者能否在不依赖口头说明的情况下继续维护？