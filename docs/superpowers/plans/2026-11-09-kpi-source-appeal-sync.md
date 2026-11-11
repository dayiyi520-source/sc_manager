# KPI Source, Appeal, and Sync Implementation Plan

> **For agentic workers:** Implement in the current project-frontend worktree; preserve unrelated work and do not commit without the user's request.

## Scope

- `src/services/kpiPerformanceDemo.ts`: authoritative manager adjustment, source refresh, HR correction rules.
- `src/services/kpiPerformancePublication.ts`: appeal decisions and persistent audit fields.
- `src/components/comprehensive/KpiPerformanceDemoView.tsx`: source filters/sync, HR appeal handling, editable correction form, remove redundant history.
- `src/components/comprehensive/kpi-performance-demo.css`: existing-token layout for the new controls.
- Focused service and component tests; `docs/prd/V1.0.0.md` requirement 8.1/8.2.

## Tasks

1. Add service tests for zero/default adjustment, HR approval propagation, source sync preservation, appeal correction validation, duplicate/rejected decisions, and storage reload. Implement corresponding service functions.
2. Add component tests for name/department filtering, four-tab sync feedback, removed history, employee appeal, HR correction and rejection flows. Implement the page controls with disabled/error states.
3. Update the existing PRD requirement sections. Run focused Vitest, TypeScript, build, PRD validation, and inspect the final diff. Keep unrelated work untouched.

## Data Rules

- Manager adjustment is authoritative in approved `scores.managerAdjustment`; pending draft is never shown in source data.
- Sync re-reads the current mock snapshot and recalculates derived attendance/extra-work display fields without overwriting approved or appeal-corrected values. Sync time is persisted per period.
- An employee can submit a published-month appeal; only HR can resolve it. A correction changes the selected employee's objective/report source and scores atomically, records before/after, and refreshes the published result. Rejection records a reason and leaves the result untouched.
