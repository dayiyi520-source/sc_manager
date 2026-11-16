# KPI Review Layout Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make boss and supervisor KPI review layouts stable across month and selected subject while removing the duplicate publication status tag.

**Architecture:** Reuse the existing HR calculation/review shell and `KpiReviewWorkspace`. Boss review supplies only supervisor records to the left rail, while boss publication remains on its existing view. Supervisor department overview metrics are derived from employee rows for the selected department.

**Tech Stack:** React, TypeScript, Ant Design, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-16-kpi-review-layout-consistency.md`

## Global Constraints

- Preserve all existing working-tree edits and unrelated changes.
- Keep KPI permissions, score calculation, publication state, and persisted data unchanged.
- Follow the existing React/Ant Design UI and CSS token conventions; add no dependency.
- Update `docs/prd/V1.0.0.md` in place and run focused tests, typecheck, and build.
- Browser preview viewport is exactly 1920x1080; do not bypass the application's authentication flow.

---

### Task 1: Lock the review layout contract with regression tests

**Files:**
- Modify: `src/components/comprehensive/KpiPerformanceDemoView.hr.test.tsx`
- Modify: `src/components/comprehensive/KpiUnifiedReview.test.tsx`

**Interfaces:**
- Consume existing public role selectors, monthly selector, department/member buttons, and result workspace accessible names.
- No new production interface is required.

- [x] Add a supervisor-review test that selects a supervisor and a department employee in turn; assert the department overview remains visible and its count/current/preview metrics are finite and consistent.
- [x] Add boss calculation-view cases for `2026-10` (published) and `2026-11` (unpublished); assert the supervisor-only left rail, shared calculation heading, and bordered right result region are present in both, while rating controls remain read-only for October and editable for November.
- [x] Add a published HR review assertion that the outer duplicate status is absent while the result card's right-side `已公示` status remains.
- [x] Run the two focused Vitest files; the targeted assertions initially failed on the current layout, then passed after implementation.

### Task 2: Unify review rendering and status placement

**Files:**
- Modify: `src/components/comprehensive/KpiPerformanceDemoView.tsx`
- Modify: `src/components/comprehensive/KpiPublishedResult.tsx` only if a targeted status prop is required by the tests.
- Modify: `src/components/comprehensive/kpi-performance-demo.css` only if the reused review shell needs an existing-token class adjustment.

**Interfaces:**
- Consume `reviewMembers`, `employeeGroups`, `KpiReviewWorkspace`, and existing `.kpi-calculation-layout` / `.kpi-calc-detail` styles.
- Keep the boss left rail sourced from `period.supervisors`; do not add employee records to it.

- [x] Derive boss review members from supervisor records only and render boss calculation through the same heading and calculation shell as HR, using the department supervisor group list and a `.kpi-calc-detail` wrapper around the selected result.
- [x] Keep boss public view on its existing published-summary path, independent of `period.published` branches in boss review.
- [x] Derive the supervisor overview from employees in `selectedEmployee.department`, including when the selected result is the supervisor record; guard empty departments to display zero values.
- [x] Suppress the duplicate outer `已公示` tag only for published periods; retain the result card's own right-aligned status and non-published workflow tags.
- [x] Rerun the focused tests from Task 1 and verify all new assertions pass.

### Task 3: Update product requirements and verify the change

**Files:**
- Modify: `docs/prd/V1.0.0.md`, section 8.3.

**Interfaces:**
- PRD text documents role-visible layout behavior only; no source paths, component names, or implementation detail.

- [x] Update the existing 8.3 display and acceptance rules to describe shared boss/HR review framing, boss-only supervisor left rail, month-independent review structure, supervisor department overview on both selected subject types, and one visible published status.
- [x] Run all KPI-focused tests (96 passed), `tsc --noEmit`, production build, `git diff --check`, and the PRD validator. The validator still reports the existing field-type technical detail and PRD/registry count mismatches.
- [x] Inspect the running site at 1920x1080 through its normal login flow; the login page loads, and role-specific page preview remains behind authentication.
