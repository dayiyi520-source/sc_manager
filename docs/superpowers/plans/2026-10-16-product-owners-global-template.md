# Product Owners and Global Work Item Template Implementation Plan

> **For agentic workers:** Execute inline in this workspace. Preserve unrelated uncommitted changes and do not create a checkpoint unless PRD validation and all relevant checks pass.

**Goal:** Align product responsibility displays and make the research template the sole source of new work item types and states for five product task categories.

**Architecture:** Share the four-role responsibility presentation between card and table. Keep product IDs for task ownership and historical workflow bindings, but resolve current type options from the global template; historical tasks retain their published workflow version. Remove obsolete configuration surfaces without deleting stored records.

**Tech Stack:** React 19, TypeScript, Ant Design, TanStack Query, Vitest, Vite. Existing design tokens and Octicons conventions apply.

**Spec:** `docs/prd/V1.0.0.md`, section 1.1.40, with the user-approved compatibility rule from this chat.

## Task 1: Responsibility presentation and layout

**Files:** `src/components/product/ProductLinesView.tsx`, `src/components/product/ProductLineDetailView.tsx`, focused component tests.

- [x] Update the shared list/card responsibility grid to four roles in two rows, with stable badge widths and overflow titles.
- [x] Render every secondary owner in the detail card using `PersonAvatar`; primary names use the brand text token and secondary names use the muted text token.
- [x] Rebalance the basic-detail grid and verify no horizontal overflow at the required 1920x1080 preview viewport.
- [x] Match the right activity panel height to the combined left panels on desktop, scrolling activity within the panel.

## Task 2: Configuration navigation and section widths

**Files:** `src/components/product/ProductLineDetailView.tsx`, `src/components/system/ResearchTemplateView.tsx`, `src/components/system/WorkItemModuleView.tsx`, `src/components/system/WorkItemCategoryPanel.tsx` as needed.

- [x] Remove the product-members settings section and research-template roles section while retaining historical data.
- [x] Rename archive to archived products and align all research-template content widths and horizontal padding.
- [x] Verify normal, loading, empty, and failure states on affected pages.

## Task 3: Global type and workflow contract

**Files:** `src/services/productRepository.ts`, `src/services/mockApi.ts`, `src/services/workItemTemplateSync.ts`, `src/components/product/RequirementTasksView.tsx`, `src/components/product/VersionIterationView.tsx`, other task-type consumers and tests as the dependency search requires.

- [x] Add failing integration tests proving global type and published status changes apply to every product for requirement, design, dev, test, and bug creation, while historical started tasks retain their bound workflow.
- [x] Remove product-local type preference from task creation and transition option resolution; keep product ID for ownership and history.
- [x] Verify missing, disabled, stale, and concurrent template states with focused tests.
- [x] Update the matching numbered PRD requirement in place; run PRD validation, typecheck, focused tests, build, and visual preview. PRD validation remains blocked by the pre-existing empty registry versus document requirement count, and the shared tree has unrelated changes; do not checkpoint.
