# Task Pages Visual Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Synchronize requirement-task visual layout and form chrome across development-task and defect-management submenus, while restoring the dark-mode-equivalent selected-state structure for the light sidebar.

**Architecture:** Keep existing React page components and business data flows. Centralize only the shared visual primitives through existing CSS classes and small shared helpers where needed; preserve dark-mode tokens and route-specific fields/actions.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind utility classes, shared CSS tokens, Vitest/Bun scripts.

**Spec:** Approved in chat on 2026-09-07.

## Global Constraints

- Preserve dark-mode visual tokens.
- Update `docs/prd/V1.0.0.md` in the same change.
- Keep `.tmp_upload/` untracked and never commit it.
- Browser acceptance uses the in-app browser at exactly 1920x1080.

### Task 1: Inspect and map shared task-page chrome

**Files:** `frontend/src/components/product/RequirementTasksView.tsx`, `frontend/src/components/product/DevTasksView.tsx`, `frontend/src/components/product/BugManagementView.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/index.css`

- [ ] Compare filter rows, table headers, form drawers, detail drawers, date/search controls, and selected navigation classes.
- [ ] Identify the smallest shared selectors/helpers that can apply consistently without changing business behavior.

### Task 2: Implement visual synchronization

- [ ] Apply requirement-task dimensions and shared filter/form chrome to development tasks and defects.
- [ ] Align create/detail page controls and drawer spacing while retaining route-specific fields.
- [ ] Restore light-sidebar selected/hover class structure to match dark-sidebar geometry and state behavior.
- [ ] Add focused interaction states for normal, hover/focus, loading, and disabled/error controls where touched.

### Task 3: Update product requirements

- [ ] Update the matching V1.0.0 requirement sections with observable cross-menu visual consistency and sidebar compatibility acceptance criteria.
- [ ] Run PRD validation.

### Task 4: Verify

- [ ] Run lint, test, build, and `git diff --check`.
- [ ] Set in-app browser viewport to 1920x1080 and inspect requirement, development, and defect pages plus create/detail states in both themes.

### Task 5: Commit and push

- [ ] Review diff and status, excluding `.tmp_upload/`.
- [ ] Create a Conventional Commit and push `shichuang-admin` to `github/shichuang-admin`.
