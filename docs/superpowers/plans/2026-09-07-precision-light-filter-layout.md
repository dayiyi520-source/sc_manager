# Precision Light Theme and Filter Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成需求任务页亮色/暗色壳层一致性、下拉搜索控件尺寸统一、过滤器连续外框和 1920×1080 自适应布局。

**Architecture:** 保留现有 React 19 + Vite + TypeScript 组件结构，使用 CSS 主题覆盖层区分亮色工作区与深色导航基底；过滤器继续由 `RequirementTasksView` 管理状态，仅重构其呈现结构。所有尺寸通过现有 `app-control`/CSS Token 统一，暗色 Token 不改动。

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS utility classes, CSS custom properties.

**Spec:** 用户确认的 Precision Light Mode 规范与本轮四项 UI 修正需求。

## Global Constraints

- 前端真实技术栈为 React 19 + Vite + TypeScript。
- 不修改暗色模式视觉 Token。
- 不触碰、不删除、不提交 `.tmp_upload/`。
- 每次业务代码变更同步更新 `docs/prd/V1.0.0.md`。
- 浏览器验收视口固定为 1920×1080。
- 使用现有 Octicons 兼容组件，不新增图标依赖。

### Task 1: Theme shell corrections

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/layout/Header.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx` only if class hooks are required

**Steps:**
- [ ] Keep sidebar background, spacing, active navigation and typography on the existing dark navigation base in light mode.
- [ ] Add light-mode-specific top-bar control surfaces, text contrast, avatar frame and popover content without changing dark selectors.
- [ ] Verify no dark token values are changed.

### Task 2: Dropdown search sizing

**Files:**
- Modify: `frontend/src/components/common/SearchableSelect.tsx`
- Modify: `frontend/src/components/common/InlineEditableSelect.tsx`
- Modify: `frontend/src/index.css` if a shared search-input hook is needed

**Steps:**
- [ ] Set dropdown search inputs and their wrapper to the shared 32px control height.
- [ ] Preserve focus, empty, disabled and multiple-selection behavior.
- [ ] Check trigger and menu alignment in light and dark themes.

### Task 3: Continuous filter rows and responsive workspace width

**Files:**
- Modify: `frontend/src/components/product/RequirementTasksView.tsx`
- Modify: `frontend/src/App.tsx`

**Steps:**
- [ ] Keep each filter row as one outer border with internal separators only.
- [ ] Make text, multi-select and date values share the same continuous visual container.
- [ ] Keep two columns on desktop and one column on narrow widths.
- [ ] Replace the restrictive `max-w-7xl` wrapper with a safe-margin, viewport-adaptive width.

### Task 4: PRD, validation and checkpoint

**Files:**
- Modify: `docs/prd/V1.0.0.md`

**Steps:**
- [ ] Update the matching requirement in place with observable theme, control-size, filter-layout and responsive acceptance behavior.
- [ ] Run PRD validation, lint, tests, build and `git diff --check`.
- [ ] Create one local feature checkpoint containing only the changed feature paths.

### Task 5: Browser acceptance

- [ ] Set in-app browser viewport to exactly 1920×1080 and verify dimensions.
- [ ] Verify light/dark sidebar and top-bar behavior.
- [ ] Verify dropdown search input height is 32px.
- [ ] Verify filter rows are continuous and responsive, and right-side whitespace is reduced.
- [ ] Leave the browser on the light-mode requirement tasks page.
