# 友商管理界面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增友商管理的可运行前端界面原型，不伪造外部数据或写入结果。

**Architecture:** 独立页面组件持有仅在弹窗内有效的草稿。列表与详情从明确的友商档案契约渲染，当前默认空数据；产品选项读取现有产品目录的可销售项。导航仅增加页面入口，不改 CRM 或产品数据。

**Tech Stack:** React 19、TypeScript、Ant Design、Octicons、Vitest、Vite。

**Spec:** `docs/superpowers/specs/2026-11-11-competitor-management-ui.md`

## Global Constraints

- 纯前端仓库；不要求真实业务后端或数据库。
- 不添加依赖、不使用第三方密钥、不写入虚构企业记录。
- 使用既有 Design Token、官方空状态与 1920x1080 浏览器预览。
- 保留现有未提交更改。

---

### Task 1: Navigation and UI contract

**Files:** `src/types/index.ts`, `src/context/AppContext.tsx`, `src/App.tsx`, `src/components/customer/CompetitorManagementView.tsx`, `src/components/customer/competitorManagement.css`

- [x] 定义友商、竞品、交锋展示契约及页面入口。
- [x] 实现空列表、蓝色数量详情、企业选择与只读字段、竞品子表、附件和链接编辑态。
- [x] 保证未接入企业搜索时无法误保存；检查无结果、长文本与交互状态。

### Task 2: Verification and PRD

**Files:** `src/components/customer/CompetitorManagementView.test.tsx`, `src/context/Navigation.test.ts`, `docs/prd/V1.0.0.md`

- [x] 补充导航、空态、详情、产品过滤与草稿交互测试。
- [x] 更新商机管理模块对应需求，执行 PRD 校验（仓库既有注册表与禁词问题仍阻断）。
- [x] 运行定向测试、TypeScript 检查、构建及 1920x1080 浏览器预览。
