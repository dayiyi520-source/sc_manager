# Monthly goal correction implementation plan

**Goal:** Correct alignment placement, confirmation, project-map linkage, employee editing, and KR summaries.
**Architecture:** Keep shared snapshot project map as versioned portable default; use a single adapter for map and KR selectors. Preserve inherited personal fields. Derive supervisor KR titles from detail counts. Restore original reviewer objective preview while collapsing changes.
**Tech Stack:** React 19, Ant Design, TypeScript, Vitest.
**Spec:** User-approved eight-point correction of 2026-10-14.

- [x] Restore list alignment; relocate one indicator to O within company preview and remove each supervisor KR indicator.
- [x] Restore objective preview and collapse change detail only.
- [x] Share portable project delivery map snapshot with delivery KR parent/child/stage options.
- [x] Restore employee KR icon and alignment, fix inherited fields and submit feedback.
- [x] Add department list tag, compact synchronization summary and derived supervisor KR labels in save/reopen/list/detail.
- [x] Update PRD in place, tests, typecheck/build, PRD validation; no checkpoint if checks fail or ownership mixed.

Verification: 109 focused tests plus added form/list/detail/lifecycle cases passed; Typecheck and build passed with existing large-chunk warning. Broad view has five pre-existing assertions of removed A1 and direct-supervisor controls. PRD validator remains blocked by pre-existing banned wording and empty registry. Portable map is the repository-committed snapshot, not browser storage; ad-hoc browser changes cannot sync without a service. No checkpoint while validation fails and shared working tree contains unrelated edits.
