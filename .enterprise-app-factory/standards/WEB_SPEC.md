# 前端语法与公共组件使用约束

## 1. 适用范围

本文件只约束两件事：

1. Vue 前端代码的基本语法。
2. `@string/string-framework-v3` 公共组件和公共工具的调用。

本文件不规定目录结构、路由、状态管理、页面布局、样式、接口格式、权限、交互状态、测试、构建、发布或命名方式。这些内容按用户当前要求和目标项目已有约定处理。

## 2. Vue 语法

- 新增 Vue 页面和组件默认使用 Vue 3、JavaScript、Composition API 和 `<script setup>`。
- 目标模块已经使用 TypeScript 时沿用现状，不强制转换为 JavaScript，也不为了局部改动改变整个项目技术栈。
- Vue API 和外部模块使用明确的 `import`。
- 组件输入使用 `defineProps`，组件事件使用 `defineEmits`；不要直接修改 props。
- 当前组件状态使用 `ref` 或 `reactive`，派生值使用 `computed`。
- 只在确有需要时使用 `watch`、生命周期函数和 `defineExpose`。
- 模板中的复杂逻辑放到脚本函数或计算属性中。

推荐的单文件组件结构：

```vue
<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['submit'])
const count = ref(0)
const displayTitle = computed(() => props.title || '未命名')

function handleSubmit() {
  emit('submit', count.value)
}
</script>

<template>
  <section>
    <h2>{{ displayTitle }}</h2>
    <button type="button" @click="handleSubmit">提交</button>
  </section>
</template>

<style scoped>
</style>
```

## 3. 公共组件与工具

### 3.1 引入公共包

公共包名称和当前版本：

```text
@string/string-framework-v3 1.0.83
```

项目初始化后，插件会把公共包同步到：

```text
.enterprise-app-factory/vendor/string-framework-v3
```

初始化脚本发现前端 `package.json` 后，会自动通过相对 `file:` 路径声明依赖并调用项目现有的 npm、pnpm 或 yarn 完成安装。前端目录为 `frontend` 时，写入内容为：

```json
{
  "dependencies": {
    "@string/string-framework-v3": "file:../.enterprise-app-factory/vendor/string-framework-v3"
  }
}
```

前端目录不同时，脚本根据实际目录计算相对路径，不使用开发者机器上的绝对路径。初始化时尚未创建 `package.json` 的项目，需要在创建前端包后重新运行初始化脚本。

### 3.2 注册组件

PC 组件注册：

```js
import { createApp } from 'vue'
import App from './App.vue'
import { componentPligin } from '@string/string-framework-v3/components/pc.js'

const app = createApp(App)
app.use(componentPligin)
app.mount('#app')
```

`componentPligin` 是公共包当前真实导出名称，调用时保留这个拼写。

移动端组件注册：

```js
import { mobileComponentPligin } from '@string/string-framework-v3/components/mobile.js'

app.use(mobileComponentPligin)
```

### 3.3 使用公共功能

功能匹配时直接使用公共包已有能力，不重复实现同类组件。常用 PC 组件包括：

- 页面和布局：`SPage`、`SPageHeader`、`SPageMain`、`SLayout`、`SLayoutHeader`、`SLayoutMain`、`SLayoutSearch`、`SLayoutOptions`。
- 表格和分页：`STable`、`SPagination`、`STableTag`、`STableFileList`、`STableImages`。
- 表单和弹窗：`SButton`、`STextButton`、`SModal`、`SModalForm`、`SModalTable`、`SConfirmModal`。
- 数据选择：`SUser`、`SOrg`、`SApp`、`SRole`、`SProjectSelect`、`SSelectPeople`、`SSystemTree`。
- 文件处理：`SUpload`、`SBigUpload`、`SFile`、`SImport`、`SExport`、`SExportBtn`、`SExportModal`。

移动端组件使用 `SV*` 名称，例如 `SVButton`、`SVSearch`、`SVUploader`、`SVPopup`、`SVUser` 和 `SVOrg`。

消息提示：

```js
import Message from '@string/string-framework-v3/components/message.js'

Message.success('保存成功')
Message.error('保存失败')
Message.warning('请检查输入')
Message.info('处理中')
```

确认弹窗：

```js
import Confirm from '@string/string-framework-v3/components/confirm.js'

Confirm.warning({
  title: '确认操作',
  content: '是否继续？',
  onOk: () => {
    // 执行已确认的操作
  }
})
```

公共请求工具：

```js
import {
  DownloadRequest,
  Request,
  RequestMobile,
  WorkRequest
} from '@string/string-framework-v3/api/index.js'
```

调用某项公共能力前，先检查公共包中的实际导出文件和目标项目已有用法；不要臆造不存在的组件名、参数或导入路径。
