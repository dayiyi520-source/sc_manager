# Light Workspace Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all right-workspace dialogs, page tabs, and action controls follow the light theme without changing the dark navigation rail.

**Architecture:** Centralize light-theme overrides in `frontend/src/index.css` under right-workspace selectors, preserving component markup and dark-mode branches. Add visual contract tests that assert the relevant surface selectors exist and use semantic theme variables rather than page-only overrides.

**Tech Stack:** React, TypeScript, Tailwind utility classes, CSS custom properties, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-08-light-workspace-controls-design.md`

## Global Constraints

- Preserve the existing dark left navigation in light mode.
- Do not change routes, APIs, data models, permissions, or dialog submit behavior.
- Keep dark mode unchanged.
- Update `docs/prd/V1.0.0.md`, validate its registry, and create a verified local checkpoint.

---

### Task 1: Establish Right-Workspace Theme Coverage

**Files:**
- Modify: `frontend/src/index.css`
- Test: `frontend/src/index.test.ts`

**Interfaces:**
- Consumes: Existing `--bg-*`, `--border-*`, `--text-*`, and `--primary` tokens in `:root` and `html:not(.dark)`.
- Produces: Light-mode CSS coverage for `.tech-main` dialogs, controls, and segmented tabs without matching `.tech-sidebar`.

- [x] **Step 1: Write the failing theme contract test**

```ts
expect(styles).toContain('html:not(.dark) .tech-main .fixed.inset-0')
expect(styles).toContain('background: var(--bg-card)')
expect(styles).not.toContain('html:not(.dark) .tech-sidebar {\n  background: var(--bg-card)')
```

- [x] **Step 2: Run the focused test and confirm it fails**

Run: `bun run test -- index.test.ts`

Expected: FAIL because the global right-workspace dialog rule does not yet exist.

- [x] **Step 3: Add the minimal global light-theme rules**

```css
html:not(.dark) .tech-main .fixed.inset-0 > div:not(.fixed) {
  background: var(--bg-card) !important;
  color: var(--text-body) !important;
  border-color: var(--border-main) !important;
}
```

Extend the rule group for title/footer surfaces, legacy dark backgrounds, labels, inputs, standard buttons, primary buttons, disabled controls, and page-scoped segmented tabs. Keep the selector rooted at `.tech-main` so the navigation rail is excluded.

- [x] **Step 4: Run the focused test**

Run: `bun run test -- index.test.ts`

Expected: PASS.

### Task 2: Remove Page-Only Theme Assumptions

**Files:**
- Modify: `frontend/src/index.css`
- Test: `frontend/src/index.test.ts`

**Interfaces:**
- Consumes: The global right-workspace selectors from Task 1.
- Produces: Product-line dialogs inherit the common light contract rather than a duplicate detail-page-only rule set.

- [x] **Step 1: Extend the contract test for product dialogs**

```ts
expect(styles).toContain('.product-line-detail .fixed.inset-0')
expect(styles).toContain('.tech-main .fixed.inset-0')
```

- [x] **Step 2: Run the focused test and confirm it fails**

Run: `bun run test -- index.test.ts`

Expected: FAIL until the product-line rules are folded into the common coverage.

- [x] **Step 3: Consolidate CSS selectors**

Keep product-specific card and cover styling intact, remove only duplicate dialog overrides superseded by the common right-workspace block, and preserve all dark-mode selectors.

- [x] **Step 4: Run the focused test**

Run: `bun run test -- index.test.ts`

Expected: PASS.

### Task 3: Document and Verify the Acceptance Surface

**Files:**
- Modify: `docs/prd/V1.0.0.md`
- Modify: `.enterprise-app-factory/prd/V1.0.0/registry.json`

**Interfaces:**
- Consumes: Requirement `1.1` visual consistency acceptance criteria.
- Produces: Product/QA-visible light-workspace acceptance rule with explicit dark-navigation compatibility.

- [x] **Step 1: Update requirement `1.1` in place**

Add an observable acceptance rule for right-workspace dialogs, page tabs, and operation buttons in light mode. State that the left navigation remains dark and no business process changes.

- [x] **Step 2: Validate the PRD registry**

Run: `python scripts/manage_prd.py --project D:\project\manage_admin validate`

Expected: validation succeeds with no registry or acceptance errors.

### Task 4: Run Regression and Browser Acceptance

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/index.test.ts`
- Modify: `docs/prd/V1.0.0.md`

**Interfaces:**
- Consumes: Theme rules and PRD criteria from Tasks 1-3.
- Produces: Verified UI behavior and local feature checkpoint.

- [x] **Step 1: Run static and automated checks**

Run: `bun run lint`, `bun run test`, and `bun run build` from `frontend`.

Expected: all commands exit successfully.

- [x] **Step 2: Perform browser acceptance at 1920x1080**

In light mode, open product-line creation, version creation/editing, member management, and the version iteration tabs. Verify normal, hover/focus, disabled/error, and empty/long-text surfaces. Switch to dark mode and confirm these rules do not alter the dark experience or left navigation.

- [x] **Step 3: Create the local feature checkpoint**

Run: `python scripts/feature_checkpoint.py --project D:\project\manage_admin create --requirement 1.1 --summary "统一亮色工作区弹窗与控件" --path frontend/src/index.css --path frontend/src/index.test.ts --path docs/prd/V1.0.0.md --path .enterprise-app-factory/prd/V1.0.0/registry.json`

Expected: a local commit is created without staging unrelated files.
