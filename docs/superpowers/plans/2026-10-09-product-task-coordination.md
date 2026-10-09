# Product Task Coordination Implementation Plan

**Goal:** Complete the seven requested product settings and task coordination changes.

**Architecture:** Preserve React and the existing repository adapter. Store project identifiers, independent collaboration/task associations, and requested coordination categories on work items. Derive pending allocation views from persisted product tasks and downstream links.

**Constraints:** No dependencies, backend edits, automatic pushes, or unrelated changes. Preserve theme tokens. Legacy product tasks default to development and testing; an explicit empty selection dispatches nowhere.

- [x] Load inherited work-item templates on product settings entry; remove notification and automation menus.
- [x] Add independent field controls and migrate historical relation configuration without dropping visibility preferences.
- [x] Persist project selection, associations and coordination choices across creation, editing and refresh. Prevent duplicate saves and retain failed input.
- [x] Add pending allocation scopes for development, testing and design; remove design primary tabs and preserve its former pending list.
- [x] Update the product PRD section; test routing, persistence, field migration and template inheritance; run TypeScript and build checks.

Verification: TypeScript passed. The 36 targeted regression tests passed across the combined run and an isolated rerun of the three field-panel tests after one combined-run timeout. Production build passed with existing chunk-size warnings. PRD validation remains blocked by existing prohibited wording and registry count mismatch. Browser interaction inspection was not performed. No checkpoint or push was made because touched files also contain pre-existing work.

Boundary cases: empty coordination array, failed template load, failed save, self/same-category task association, stale revisions, long titles and no matching pending tasks.
