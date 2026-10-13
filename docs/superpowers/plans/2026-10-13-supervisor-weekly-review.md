# Supervisor weekly review Implementation Plan

**Goal:** Show the specified exemption message for company weekly/monthly writing and implement supervisor goal/KR review cards with employee support, work evidence and judgment.

**Architecture:** Reuse weekly-period, draft, evidence and submission behavior. Put supervisor-specific KR presentation and direct-report support lookup in focused modules. The existing record endpoint exposes owned reviews plus submitted direct-report reviews; no unrestricted review read or new endpoint is introduced.

**Tech Stack:** Existing React, TypeScript, Ant Design, Octicons, React Query and Vitest.

**Spec:** User request on 2026-10-13, requirement 1.1.33 in docs/prd/V1.0.0.md.

## Contracts and boundaries
- Company root identity gets the exact message 你无需写复盘总结 before write-date checks; neither weekly nor monthly editor is opened.
- Supervisor monthly targets project actual KR IDs and progress rather than personal A, even when a KR has executionActions.
- Employee support is read-only: direct reports, submitted/reviewed weekly reports, exact selected week, explicit parent objective/KR identity. Titles are never used to guess association.
- OkrKrReview adds optional supervisorJudgment and employeeReviewSnapshots; reviewMode adds supervisor. Employee evidence reuses OkrWeeklyReviewSnapshot with optional author identity, allowing historical detail to retain support.
- Preserve old drafts and notes, cross-month weeks, live title/progress refresh and failure recovery. Missing employee reports uses official Empty; requests fail visibly and can retry; long input has a limit.
- Keep unrelated working-tree edits; no new dependencies.

## Tasks
- [x] Write targeted tests for company feedback, real KR projection, scoped employee support, editor ordering/actions and persistence.
- [x] Implement supervisor support lookup and review visibility, reuse the existing record API and mock storage.
- [x] Add supervisor KR card and employee support dialog; wire shared weekly draft/submission and historical display.
- [x] Replace manager template gate and company creation flow; maintain employee and monthly behavior.
- [x] Update the existing numbered PRD section; run focused tests, typecheck, build, default-viewport browser inspection and PRD validation.
- [ ] Create a checkpoint only when validation passes and every selected path belongs to this feature. Baseline PRD validation already fails (registry count mismatch and forbidden-phrase false positive), with unrelated changes in shared files.

## Verification
- Broad regression: 13 files / 120 tests, including company feedback and supervisor actions. Two unrelated goal-navigation cases exceeded their default 5-second timeout during the concurrent run; the workspace file passed all 41 cases on its own without test changes.
- Final support suite: 16 tests passed, including three additional association/history cases. Across runs, 123 distinct relevant cases were verified.
- Browser: reused existing frontend on port 3012; viewport set and checked at 1920×1080. Both company write buttons showed the exact exemption message. Historical supervisor goal rendered real KR rows, left/right actions, an official empty support dialog and a four-row judgment field with token-based minimum height.
- Typecheck and production build passed; existing large-chunk build warnings remain.
- PRD validation continues to report the same pre-existing phrase false positive and registry/document requirement mismatch seen before this change. Shared source/PRD paths also contain unrelated user changes. No checkpoint or push was created.
- Production backend is absent from this checkout; received-review scope and new judgment/support persistence were verified using the existing local mock record API.
