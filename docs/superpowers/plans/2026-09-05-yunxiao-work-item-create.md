# 云效风格工作项创建实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 将需求任务、研发任务和缺陷管理的创建入口统一为大尺寸右侧工作项创建面板。

**架构：** 复用 `WorkItemCreatePanel` 处理遮罩、键盘关闭、固定标题栏、滚动主体和固定底部操作栏；三个业务页面保留现有状态和提交函数，仅迁移容器与表单布局。

**技术栈：** React 19、TypeScript、Tailwind CSS、Octicons。

**规格：** `docs/superpowers/specs/2026-09-05-yunxiao-work-item-create-design.md`

## 任务

### Task 1: 公共创建面板

**文件：** `frontend/src/components/product/WorkItemCreatePanel.tsx`

- [x] 实现右侧大尺寸面板、Escape/遮罩关闭、固定标题栏和底部操作栏。
- [x] 使用项目深色 Token 和 Octicons 关闭按钮。

### Task 2: 三个产品页面迁移

**文件：**
- `frontend/src/components/product/RequirementTasksView.tsx`
- `frontend/src/components/product/DevTasksView.tsx`
- `frontend/src/components/product/BugManagementView.tsx`

- [x] 将原 `Modal` 替换为 `WorkItemCreatePanel`。
- [x] 保留原字段和保存逻辑，统一主体为响应式两列布局。
- [x] 增加保存并继续操作；沿用现有同步保存契约并在保存成功后重置新建表单。

### Task 3: 验收与交付

- [x] 更新 PRD 变更记录并通过校验。
- [x] 运行 `bun run lint`、`bun run test`、`bun run build`、`git diff --check`。
- [ ] 在三个页面验证创建面板打开、关闭、提交和无横向溢出；本次浏览器标签发现为空，无法连接现有预览。
- [ ] 提交并推送 `shichuang-admin`。
