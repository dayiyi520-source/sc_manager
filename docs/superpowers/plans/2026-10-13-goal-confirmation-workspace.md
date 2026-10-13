# Goal confirmation workspace implementation plan

**Goal:** Move manager and administrator goal approvals into a member-based workspace and show approval and modification history as detail cards.
**Architecture:** Reuse OkrRecord changeRequest/changeHistory and existing approve-change/return-change operations. Add a scope group, a focused confirmation workspace and an activity timeline. Preserve pending request/version checks and unrelated review changes already in the shared workspace.
**Spec:** User request 2026-10-13 and PRD requirement 1.1.33.
**Stack:** Existing React, TypeScript, Ant Design, Octicons.

- [x] Build role/member queue and structured comparison helpers; test permission scope and counts.
- [x] Add target confirmation navigation with total/member badges; isolate right-hand workspace and remove old reviewer alerts.
- [x] Render member, comparison and cycle controls, pending/all filters, full target content and approve/suggest/submit actions. Preserve feedback on errors.
- [x] Persist original payload snapshots in future review history; render progress, change and approval cards in target details.
- [x] Update PRD, run focused tests, typecheck and build, inspect 1920×1080 UI; leave checkpoint pending if existing PRD validator issues persist.

Validation: role/queue, workspace, sidebar, detail, history and lifecycle tests passed; typecheck passed. PRD validator reports the same pre-existing 字段类型 business wording and empty-registry requirement-count issues. No checkpoint: PRD verification fails and shared files contain parallel review changes. Browser at 1920×1080 verified badge removal, pending empty state and approval card with original payload differences.
