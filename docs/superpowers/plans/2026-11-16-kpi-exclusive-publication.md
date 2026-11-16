# KPI Exclusive Publication and Role Scope Plan

**Goal:** Enforce one visible lifecycle state, correct published department metrics and role scopes, and align review details with the published result.

**Architecture:** Normalize legacy mock state at load, use explicit KPI service transitions, derive view data from role-scoped selectors, and retain existing local persistence and audit history.

**Tech Stack:** React, TypeScript, Ant Design, Vite, Vitest, React Testing Library.

**Spec:** `docs/prd/V1.0.0.md`, sections 8.1, 8.3, and 8.4.

## Global Constraints

- Preserve all existing working-tree edits, including unrelated accounts-payable work.
- Keep implementation inside the frontend mock and browser-persistence scope.
- Seed only the explicitly requested October 2026 supervisor demo ratings, labeled as demo data; leave other unrated months untouched.
- Make source-data pages read-only; appeal correction remains the sanctioned correction flow.
- Verify focused tests, TypeScript, production build, PRD validation, and a 1920x1080 browser preview.

### Task 1: Exclusive Lifecycle and Legacy Migration

Normalize states to `草稿`, `待主管确认`, `待HR复审`, `已确认`, and `已公示`. HR's manager-confirmation switch transitions drafts; manager submission and HR approve/return use explicit transitions. Publication requires every employee `已确认`, then writes `已公示` as the only current state while retaining history. Add migration and transition tests.

### Task 2: Metrics and Role Scope

Calculate HR/boss average coefficient as the mean of final department coefficients. Show each department coefficient and mapped grade. Restrict supervisor views to the supervisor's organizational department. Keep supervisor results outside employee averages/counts. Preserve missing historic supervisor results as empty states; add only explicit demo-rated records where the confirmed product request requires them.

### Task 3: Read-Only Sources and Unified Review

Remove source edit, correction, and sync controls from raw-data views. Remove duplicate review headings and show the unified detail directly. Preserve role-specific edits, audit history, appeals, and submission gates. Add regression tests.

### Task 4: PRD and Verification

Update KPI requirements in place. Validate migration, role boundaries, calculation, review/publish gates, refresh persistence, typecheck, build, and browser layout.
