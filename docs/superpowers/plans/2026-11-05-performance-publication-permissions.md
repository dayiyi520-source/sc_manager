# Performance Publication Permissions Implementation Plan

**Goal:** Rename the KPI menu and deliver role-scoped monthly publication with employee score breakdowns and appeals, supervisor detail dialogs, and HR department grouping.

**Architecture:** Keep the existing React page and mock persistence model. Add pure permission and department-summary helpers plus a local appeal repository, render the role-specific publication views in the current component, and verify behavior with focused Vitest coverage.

**Tech Stack:** React 19, TypeScript, Ant Design, Vite, Vitest, React Testing Library.

**Spec:** User-confirmed requirements and the two attached publication/detail references from 2026-11-05.

## Global Constraints
- Preserve the current React, TypeScript, Vite and Ant Design conventions; do not add dependencies.
- Use existing AIEDIT CSS variables for colors.
- Keep the current supervisor list and actions unchanged; extend only the employee detail view.
- Do not expose employee names or individual scores in the employee department summary.
- Persist appeals in local mock storage; do not add a real backend workflow.
- Update `docs/prd/V1.0.0.md` and run focused project checks.

---

### Task 1: Role-scoped publication data
**Files:** Create `src/services/kpiPerformancePublication.ts`; test `src/services/kpiPerformancePublication.test.ts`.
**Interfaces:** `filterPublishedEmployees(employees, role, supervisor, employeeId)` returns own, current supervisor-team, or all employee rows. `summarizeDepartmentPerformance(employees, departmentCoefficients)` returns average score, average base coefficient, department coefficient, and S/A/B/C/D/E counts without identities. `listKpiAppeals()` and `submitKpiAppeal(input)` persist month and employee keyed local mock appeals.
- [x] Test employee isolation, supervisor team scope, HR full scope, department aggregation math, and appeal save/reload/validation.
- [x] Run the new test and confirm the cases fail before implementation.
- [x] Implement the helpers and a dedicated local-storage key for appeals.
- [x] Re-run the service tests.

### Task 2: Role-specific publication UI
**Files:** Modify `src/components/comprehensive/KpiPerformanceDemoView.tsx`, `src/components/comprehensive/kpi-performance-demo.css`, and `src/components/comprehensive/KpiPerformanceDemoView.test.tsx`.
**Interfaces:** Employee sees department aggregates and only their own identity card, five score dimensions, available source statistics and appeal action. Supervisor retains the existing rows, aggregates and workflow actions; opening a seat reveals five dimension scores and source statistics. HR sees all seats grouped by department and keeps HR-only publication controls.
- [x] Add role-switching tests for privacy, employee aggregates/details/appeals, supervisor details, HR grouping, and publish-button visibility.
- [x] Run the focused component test and inspect failures.
- [x] Implement the role-specific rendering and appeal modal using the current token-based styles.
- [x] Re-run the focused component test.

### Task 3: Menu, PRD and verification
**Files:** Modify `src/context/AppContext.tsx` and `docs/prd/V1.0.0.md`.
- [x] Rename the visible menu to `绩效考核` without changing its internal id.
- [x] Update the matching KPI requirement with role scope, detail, appeal, grouping and acceptance behavior.
- [x] Run focused tests, TypeScript check, production build and `git diff --check`.
- [x] Run PRD validation and compare any failures against the unchanged baseline.
- [x] Verify the running local preview serves the updated page.
