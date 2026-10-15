# Task board and delivery approval implementation plan

**Goal:** Correct product status grouping, task filters, and delivery completion approval using the user-approved design.
**Architecture:** Keep the existing React/API architecture. Separate delivery review state from task status, normalize legacy review records without deleting data, and enforce transitions in the local persistence service.
**Tech Stack:** Existing React, TypeScript, Ant Design, React Query, Vitest; no dependencies added.
**Spec:** User-approved design in this chat; matching requirements in docs/prd/V1.0.0.md.

## Constraints
Preserve unrelated user changes, official Empty styling, existing tokens and API routes. Production backend is not present in this checkout; do not claim remote enforcement.

## Execution
- [x] Add failing regression tests for pending/cancelled board grouping and review state separation.
- [x] Implement shared delivery review helpers, legacy migration, mandatory hours validation, pending-state locking, permission checks and audit events.
- [x] Connect completion dialog and explicit review actions; correct state choices and project filters including grouping and chips.
- [x] Update the numbered PRD section in place; validate PRD, targeted tests, typecheck and production build.
- [x] Review diff. Feature checkpoint skipped because PRD validation has two pre-existing failures; project rules forbid a checkpoint when verification fails.

## Contract and boundaries
Delivery tasks retain status and add completionApproval (pending/approved/rejected), completionRequestedAt, reviewedAt, reviewedBy and reviewComment. Existing update/review routes remain unchanged. Submit completes only same-person tasks; different-person tasks remain processing pending review. Review is available to the creator or administrator; owner submission is validated by identity. Pending status and ownership are locked. Missing identity, invalid hours, stale review, unauthorized actions and failed saves must not produce successful transitions.

## Verification results
- Targeted regression suite: 8 files, 75 tests passed (`--maxWorkers=2 --testTimeout=15000`).
- TypeScript: passed (`tsc --noEmit`).
- Production build: passed; existing large-chunk warning remains.
- Broader suite: 4 failures in existing ops/task-completion tests. Reproduced all 4 with HEAD versions of mockApi and mockBusinessTasks, retaining the current fixtures.
- PRD validation: two identical errors reproduced using the HEAD PRD and registry in an isolated temporary project (existing forbidden wording and requirement-count mismatch).
- No production backend or deployment was exercised. Unrelated data-file edits are preserved.
