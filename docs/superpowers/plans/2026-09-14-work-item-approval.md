# Requirement Approval Dispatch Implementation Plan

Goal: implement the approved atomic creation of design, development and testing main tasks on requirement approval.

Architecture: optional `Edge.approvalTasks` binds explicit designTypeId, devTypeId and testTypeId in the pinned workflow. Only requirement edges targeting IN_PROGRESS may dispatch. Existing edges remain compatible. The existing product-line lock serializes requests; a committed dispatch activity makes reapproval idempotent. All task inserts, activities and the requirement transition share one transaction. A transaction completion callback logs rollback without creating failure work items.

Spec: `docs/superpowers/specs/2026-09-14-unified-work-item-model-design.md` and confirmed conversation rules.

- [x] Extend Edge with ApprovalTasks, validate category/types and published downstream workflows.
- [x] Add WorkItemApprovalService dispatch and integrate before transition persistence; preserve version, requirement and priority; leave main tasks unassigned for later assignment.
- [x] Add real transaction integration tests: three categories, repeated and concurrent approval, missing/disabled type, rollback after partial insertion and late failure, isolated tenant, pinned workflows, published version and authenticated HTTP action.
- [x] Run approval tests and existing storage/transition/version regressions: 58 tests passed, package exit 0. Restore main local services and verify authenticated proxy reads and OpenAPI ApprovalTasks schema.
- [x] Update PRD 1.1 / acceptance 1.1.28 and acceptance record. PRD validator attempted but blocked by missing existing registry; no PRD migration performed. No frontend changes or production database migration. Local checkpoint omitted because affected files contain changes from earlier batches with unclear ownership.

API: existing POST work-item transitions retains `{edgeKey,revision,reason}`. Workflow definitions may include `approvalTasks: {designTypeId,devTypeId,testTypeId}` on the approved edge. No implicit matching of localized state names. Auto-created items are main tasks linked by requirementId, not task-type-constrained subtasks.
