# OKR alignment and change-summary implementation plan

**Goal:** Make alignment previews and detail labels accurate; show only changed fields in modification and source-sync confirmation.
**Architecture:** Reuse existing goal difference contract; derive personal alignment entries from saved execution actions, retain a historical fallback, and share preview across KR and supervisor O. Keep first-time goal review intact. No new dependency or API.
**Tech Stack:** React 19, Ant Design, TypeScript, Vitest.
**Spec:** User-approved design of 2026-10-14 and PRD 1.1.33.

- [x] Update alignment projection and preview with company KR numbering and supervisor O placement; test plan-action source and navigation.
- [x] Show owner department in manager/personal details and test roles/legacy data.
- [x] Replace modification confirmation's repeated objective card with a change-only summary; apply same rule to source synchronization, test normal/empty/stale cases.
- [x] Update PRD in matching requirement; run focused tests, typecheck/build and PRD validation. Checkpoint only if verification and ownership allow.

Validation: 47/47 focused tests pass; typecheck and build pass. Broader OKRPerformanceView suite retains five pre-existing tests asserting former A1 and direct-supervisor navigation labels. PRD validate remains blocked by existing banned phrase and empty registry; no checkpoint. Existing concurrent working-tree changes were preserved. Browser visual validation was not performed in this turn.
