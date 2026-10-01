# OKR Draft List Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every saved OKR draft remains independently visible and that personal drafts appear only under the "我的目标" category.

**Architecture:** Keep the existing month-level presentation, but derive every summary input from the active category before aggregating by month. Preserve records by their unique IDs and render all objective records for the selected month without replacing same-month siblings.

**Tech Stack:** React 19, TypeScript, Ant Design, Vitest, React Testing Library

**Spec:** `docs/prd/V1.0.0.md` requirement `1.1.33.2`

## Global Constraints

- This iteration remains a frontend demonstration and adds no backend API or database change.
- Same-month drafts share one month card but remain individually listed by unique record ID.
- Personal objectives, actions, drafts, and demonstration breakdowns are visible only in "我的目标".
- Preserve the existing AIEDIT dark theme and current component layout.

---

### Task 1: Category-scoped month summaries

**Files:**
- Modify: `src/components/workbench/OKRPerformanceView.tsx`
- Test: `src/components/workbench/OKRPerformanceView.test.tsx`

**Interfaces:**
- Consumes: `okrCategoryTab`, `records`, `filteredOkrs`, `demoBreakdowns`, and `selectedCycles`.
- Produces: category-scoped month keys, month records, saved target rows, and empty-state decisions.

- [x] **Step 1: Write failing tests**

Add one test with two same-month objective draft records and assert that both unique titles appear under the saved-target summary. Add one interaction test that switches from "我的目标" to every non-personal category and asserts that personal draft titles and demonstration breakdown summaries are absent.

- [x] **Step 2: Run the focused test and verify failure**

Run: `pnpm exec vitest run src/components/workbench/OKRPerformanceView.test.tsx`

Expected: at least the category-isolation assertion fails because personal records are currently included independently of `okrCategoryTab`.

- [x] **Step 3: Implement category-scoped derivation**

In `OKRPerformanceView.tsx`, derive personal actions, drafts, demonstration breakdowns, and personal objective records only when `okrCategoryTab === 'my'`. Build `summaryMonths`, empty-state checks, `monthRecords`, `savedTargets`, draft counts, and status from those scoped collections. Keep array append semantics so records with different IDs are never replaced because their period keys match.

- [x] **Step 4: Run focused tests**

Run: `pnpm exec vitest run src/components/workbench/OKRPerformanceView.test.tsx`

Expected: all tests pass, including two same-month drafts and non-personal category isolation.

### Task 2: Product contract and release verification

**Files:**
- Modify: `docs/prd/V1.0.0.md`
- Modify: `.enterprise-app-factory/prd/V1.0.0/registry.json` only if the PRD management tool updates it.

**Interfaces:**
- Consumes: requirement `1.1.33.2`.
- Produces: an observable acceptance rule for same-month independent drafts and category-scoped visibility.

- [x] **Step 1: Update requirement acceptance**

Extend `1.1.33.2` in place: all independently saved drafts remain listed within their month card; switching away from "我的目标" removes personal objective drafts, action drafts, and demonstration results from the current category; returning restores them without loss.

- [x] **Step 2: Validate the PRD**

Run: `python scripts/manage_prd.py --project D:\project\manager_admin validate` from the stringplugin root.

Expected: validation succeeds without schema or registry drift errors.

- [x] **Step 3: Run project checks**

Run `pnpm exec tsc --noEmit`, the focused Vitest file, `pnpm lint`, `pnpm build`, and `git diff --check`.

Expected: every command exits successfully.

- [x] **Step 4: Browser acceptance at 1920x1080**

Open the running frontend at `http://127.0.0.1:3010/app/wb_okr_perf`, set and verify the webpage viewport at 1920x1080, save two drafts, confirm both remain visible in "我的目标", switch through the four other category tabs and confirm the personal drafts disappear, then return to "我的目标" and confirm both drafts remain.

- [x] **Step 5: Create the local feature checkpoint**

Run `python scripts/feature_checkpoint.py --project D:\project\manager_admin create --requirement 1.1.33.2 --summary "修复目标草稿追加展示与分类隔离" --path src/components/workbench/OKRPerformanceView.tsx --path src/components/workbench/OKRPerformanceView.test.tsx --path docs/prd/V1.0.0.md --path docs/superpowers/plans/2026-09-24-okr-draft-list-isolation.md` from the stringplugin root.

Expected: one local-only checkpoint is created and no unrelated worktree changes are included.
