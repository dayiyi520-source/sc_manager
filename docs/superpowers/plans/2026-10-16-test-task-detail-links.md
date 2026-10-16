# Test Task Detail Associations Implementation Plan

**Goal:** Restore ordered test-plan associations in test task details, keep development task associations ordered, and improve defect creation defaults and wording.

**Architecture:** Extend the existing task detail association tabs; load plans belonging to the selected test task only and render explicit loading, empty, and retry states. Default defect verifier from the selected owner while preserving the ability to change it, and use the agreed iteration label.

**Tech Stack:** React, TypeScript, Ant Design, TanStack Query, Vitest.

**Spec:** User-confirmed requirements on 2026-10-16; update V1.0.0 product requirements in place.

## Tasks
- [ ] Add failing tests for exact tab order, selected-task plan isolation and states, and defect verifier default/override.
- [ ] Restore test-plan tab and ensure development association tabs follow the specified order.
- [ ] Default defect verifier from the selected assignee and relabel the bug version field as “迭代版本”.
- [ ] Update V1.0.0 PRD; run focused tests, typecheck/build and diff checks.
