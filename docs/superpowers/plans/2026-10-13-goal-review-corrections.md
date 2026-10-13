# Goal review corrections implementation plan

**Goal:** Complete six requested corrections to confirmation, detail metrics, activity cards, draft submission and inherited business associations.
**Spec:** User screenshots and requirements 2026-10-13; PRD 1.1.33.
**Contracts:** Preserve approve-change/return-change/submit/save and record version checks. Normalize previously returned initial submissions to draft without fabricating approval. Existing changeHistory stores original and submitted payloads; A inherits the business context of its containing KR.

- [x] Isolate single-target submits; keep monthly batch weights only for explicitly batched submissions. Test one of two drafts and rejection/edit/resubmit.
- [x] Restore returned initial records to draft in mutation and load normalization; preserve live payload for rejected modifications.
- [x] Limit confirmation content to pending queue for both filters; move before/after legend immediately left of comparison switch.
- [x] Set detail metric spacing to 48px via token, use existing Ant Design PieChartOutlined and remove execution-action assignee placeholders.
- [x] Match compact activity-card hierarchy, muted subject, blue hover and focus, status dots, progress delta; ensure avatar initials remain white.
- [x] Count actual KR business objects, delivery detail products and inherited parent contexts for A, with deduplication; test personal and supervisor paths.
- [x] Update PRD, run focused tests/typecheck/build, inspect at 1920×1080 and clean local QA harness. No checkpoint if pre-existing PRD errors or mixed ownership remain.

Verification: single-edited-draft integration test passed; rejection/edit/resubmit and source associations covered. Browser measured 48px metric gap, white avatar initials, 12px record subjects, 416px timeline and legend before switch at 1920×1080. PRD validator retains its pre-existing business wording/empty registry failures; shared workspace has unrelated changes, so no feature checkpoint.
