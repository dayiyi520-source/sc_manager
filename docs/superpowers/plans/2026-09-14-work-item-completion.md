# Requirement Completion and Release Eligibility

Goal: finish approved requirements through their pinned explicit workflow and calculate release eligibility without rewriting historical data.

Architecture: optional Edge.autoComplete marks a successful requirement transition. Automatic edges cannot require an acting role or free-text reason, but persisted required fields are enforced. A transactional reconciliation after task transitions or blocker changes reaches a fixed point for cross-requirement dependencies. Requirements need a successful dispatch record, design/dev/test main tasks, every linked non-bug delivery task successful, and no effective blockers. Existing workflows remain pinned and unchanged.

Contracts: existing workflow JSON accepts autoComplete. Existing requirement summary supplies completionEligible and reasons; version summary returns readyToRelease for fully core, governed data only. Unknown historical coverage remains null; empty versions false. This is eligibility, not publishing or a new release approval step.

- [x] Add workflow validation, completion service, transactional reconciliation and manual completion gate.
- [x] Integrate core summaries while preserving historical uncertainty.
- [x] Ten completion integration tests plus prior regression cover final-task completion, required acceptance state, children, defects, dependencies, single completion activity, true rollback, empty versions and published read-only behavior. Historical summary tests preserve unknown readiness.
- [x] 93 tests across 12 classes passed; final summary/text adjustment rechecked with 25 relevant tests. Maven package succeeded. Runtime health UP, authenticated proxy read successful, autoComplete and readinessReasons present in OpenAPI, frontend HTTP 200. PRD 1.1.31 updated; validator still blocked by missing existing registry. Shared files contain previous work, so no isolated checkpoint commit was created.

No new database migration or frontend changes. Business state names are never used to select an automatic target. Already terminal requirements and released iterations are not automatically reopened. Version readiness is derived, not a persisted replacement for the existing iteration status.
