# KPI Lifecycle and Publication Implementation Plan

**Goal:** Make performance approval state exclusive, enforce lifecycle gates, align department publication metrics, and restrict data visibility and edit permissions by role.

**Architecture:** Keep the existing local mock persistence and React views. Normalize period and employee states at the service boundary, derive role-scoped aggregates before rendering, and reuse the unified scoring workspace without duplicate employee headers.

**Tech Stack:** React, TypeScript, Vite, Ant Design, Vitest, React Testing Library.

**Spec:** `docs/prd/V1.0.0.md`, sections 8.1, 8.3, 8.4.

## Global Constraints

- Preserve existing user changes and local mock data; do not introduce backend or database dependencies.
- Keep published history immutable; migrate legacy records without inventing ratings.
- Use existing design tokens and Ant Design defaults; preserve standard empty states.
- Persist workflow changes and retain audit history.
- Validate with related tests, TypeScript, production build, and 1920x1080 browser inspection.

### Task 1: Exclusive Status Lifecycle

**Files:** `src/services/kpiPerformanceDemo.ts`, `src/services/kpiModuleReview.ts`, service tests.

- Define draft, pending-manager, pending-HR, confirmed, returned, and published states.
- Normalize legacy review statuses on load; publish transitions every employee to the published state while retaining history.
- Enable manager confirmation only after HR enables it; require every employee confirmed and all department metrics confirmed before HR can publish.
- Add migration and transition tests.

### Task 2: Publication Metrics and Role Scope

**Files:** `src/components/comprehensive/KpiPerformanceDemoView.tsx`, `src/services/kpiPerformancePublication.ts`, navigation tests.

- Show the arithmetic mean of final department coefficients for HR and boss; show the selected department coefficient for supervisors.
- Show department coefficient and its mapped grade in department groups.
- Limit supervisors to their HR-configured organizational department; keep boss, HR, supervisor, and employee scopes distinct.
- Keep supervisor records out of employee averages and employee grade counts.
- Seed confirmed October supervisor demo records only as explicitly identified demo data; do not create unverified historical business facts.

### Task 3: Read-Only Source Records and Unified Review

**Files:** `KpiPerformanceDemoView.tsx`, `KpiReviewWorkspace.tsx`, `OkrPerformanceScoreView.tsx`, `KpiPublishedResult.tsx`, component tests.

- Remove source-edit, correction, and synchronization controls from source-data views while retaining read-only evidence.
- Render the unified employee detail directly in review; remove duplicate person/month headings.
- Preserve manager and HR edit gates, appeal correction flow, role labels, and audit history.
- Add role and state regression tests.

### Task 4: PRD and Verification

**Files:** `docs/prd/V1.0.0.md`, focused service and UI tests.

- Update requirement 8.1 and related workflow/department-coefficient requirements in place.
- Run PRD validation, focused tests, TypeScript, build, and browser inspection.
- Preserve and report any pre-existing validator limitations without unrelated PRD cleanup.
