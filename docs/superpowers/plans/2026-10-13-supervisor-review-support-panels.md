# Supervisor weekly review support panels Implementation Plan

**Goal:** Match the supplied supervisor screenshots with a two-line read-only O header, shared risk callout and collapsible employee A/evidence sections.

**Architecture:** Derive O progress from weighted KR drafts and actual progress-history/deadline status. Query aligned direct-report A separately from submitted same-week reports; build evidence only from those A report work IDs. Reuse review snapshots and read-only support detail, record viewed report IDs in the supervisor draft.

**Tech Stack:** Existing React/TypeScript, Ant Design, Octicons and Vitest; no new dependencies.

**Spec:** User four-point request with three screenshots, 2026-10-13; PRD requirement 1.1.33.

## Contracts and boundaries
- O title ellipsizes on its first line, with no redundant 目标N prefix. Second line: immutable sum of the O’s KR weights; weighted previous/current KR progress with icons; actual aggregate execution status (ahead/normal/risk/overdue), not lifecycle status.
- Risk UI uses the exact employee risk-callout component and sits after KR controls before the divider/support panels.
- Employee support groups real aligned A by employee, including those without a submitted report; same-week submitted/reviewed reports attach to the correct objective/KR/A only. Pending counts use unviewed submitted records; missing reports show 未提交.
- Both support and work-evidence section headers are on the left, have counts and expand/collapse independently. Evidence is read-only employee-linked task/collaboration data; do not offer a supervisor-owned picker for a KR.
- Retain judgment, saved report snapshots, old report history, viewing markers and evidence across draft saves, retries and target refresh. New copies clear historical report/evidence/viewing IDs.
- Validate unrelated employees, same-title targets, cross-month weeks, duplicate evidence, removed source/evidence, loading/failure, zero weights and long titles.
- Preserve unrelated ongoing modifications. No checkpoint if PRD validation or file ownership is unresolved.

## Tasks
- [x] Regression tests for summary calculation/status, aligned A without reports, exact evidence scope/deduplication, layout/risk and collapse/view/save behavior.
- [x] Implement data projections for objective summary and employee action/evidence panels.
- [x] Share the risk component, implement objective header and collapsible support panels; integrate weekly payload/restore/copy.
- [x] Update matching PRD requirement; run focused tests, typecheck/build, PRD validation and 1920×1080 browser checks.

## Verification results
- Review regressions: 10 files / 54 cases passed; final summary/viewing-metadata follow-up passed 20 cases including one additional metadata test. Relevant workspace tests passed 4 cases (remaining unrelated cases intentionally skipped). Total distinct cases verified across the runs: 59.
- Production build passed after final changes; existing bundle-size warnings remain.
- Full typecheck is blocked by seven errors in the concurrently modified GoalConfirmationWorkspace and its tests (undeclared or missing selectedCycles/onSelectCycles). No diagnostics reference this change’s review modules; unrelated files were preserved.
- PRD validator still reports the pre-existing phrase false positive and registry/document requirement-count mismatch. No feature checkpoint or push due to failed global validation and mixed ownership in shared files.
- Browser viewport set and verified at 1920×1080. Verified two-line O header, calculated metrics, actual overdue status, shared risk warning before divider, independent panel collapse and left-aligned counts. Live data in the inspected historical KR had no aligned employee A; non-empty A/evidence behavior was covered by fixtures in tests, without adding fake product data.
- Production backend is absent; employee report and viewing-marker persistence remain verified through the existing local record contract.
