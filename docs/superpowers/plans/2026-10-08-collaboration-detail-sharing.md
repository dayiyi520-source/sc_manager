# 协同事项与任务详情分享实施计划

**Goal:** 统一协同事项文案，通过业务编号识别详情，通过浏览器链接独立打开指定记录。

**Architecture:** 沿用 React、Ant Design、现有抽屉和登录保护；展示层兼容旧分类值，任务分享复用待打开详情机制。

**Tech Stack:** React、TypeScript、Ant Design、React Query、Vitest。

**Spec:** 用户四项调整及复制链接、复制编号补充要求；产品规则记录于 `docs/prd/V1.0.0.md` 的 1.2。

## 全局约束

- 保留已有 OKR 修改，不升级依赖，不部署，不修改历史业务类型值。
- 编号使用 `code || id`；分享定位采用稳定标识及必要产品线上下文。
- 剪贴板失败、记录不存在、无权限必须提示；复制加载中禁止重复点击。

## Task 1: 文案与兼容

**Files:** `src/utils/workOrderDisplay.ts`、工作台和产研模块的事项展示组件、`RequirementActionButtons.tsx`。

- [x] 在展示层执行 `value === '客户诉求' ? '产品需求' : value || ''`，筛选及持久化值不变。
- [x] 更新入口和跨模块引用的“协同事项”文案。
- [x] 移除事项搁置按钮，保留历史搁置状态。

## Task 2: 详情识别与分享

**Files:** `src/utils/copyToClipboard.ts`、`src/components/common/DetailCopyButton.tsx`、`UIComponents.tsx`、`WorkItemCreatePanel.tsx`、两份 `RequirementPoolView.tsx`、`RequirementTasksView.tsx`。

**Interfaces:** `copyToClipboard(value: string): Promise<void>`；`DetailCopyButton` 接收 `label`、可选 `link` 和异步 `onCopy`。

- [x] 浏览器剪贴板可用时调用 `writeText`，兼容复制通过临时元素完成并在失败时清理。
- [x] 编号后放置复制编号按钮；右上角关闭左侧放置复制详情链接按钮。
- [x] 分享 URL 清理原筛选，携带记录标识，按类别定位目标任务菜单。
- [x] 分享详情使用已有读取服务，不依赖列表分页；业务任务使用对应任务详情读取，产研使用工作项详情读取。
- [x] 关闭时取消待打开详情并移除定位参数，异步读取取消后不弹出详情。

## Task 3: 验证与文档

**Files:** `copyToClipboard.test.ts`、`DetailCopyButton.test.tsx`、两份 `RequirementPoolView.test.tsx`、`docs/prd/V1.0.0.md`。

- [x] 验证列表外详情分享、复制编号与链接、复制失败、不可访问、兼容复制清理和加载防重。
- [x] 更新移除搁置入口后的测试预期及 PRD 1.2 和任务详情规则。
- [x] 执行最终检查：类型检查、生产构建及 51 项相关测试通过。构建存在既有大包体积提示。

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run src/utils/copyToClipboard.test.ts src/components/common/DetailCopyButton.test.tsx src/components/workbench/RequirementPoolView.test.tsx src/components/product/RequirementPoolView.test.tsx src/components/product/RequirementTasksView.contract.test.ts --reporter=dot
node node_modules/vite/bin/vite.js build
```

- [x] 执行团队 PRD 校验：登记表为空导致数量不匹配，旧“字段类型”措辞触发禁止内容校验。未自动提交含无关用户修改的文档。未启动浏览器服务，项目缺少约定服务管理脚本，浏览器联调未验证。
