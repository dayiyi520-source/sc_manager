# Unified Work Item Transitions

Goal: execute the previously approved category workflows for core work items, without migrating legacy tasks or changing production data.

## Contract and execution
- Extend `WorkItemDefinition.Edge` with optional `roles` and `requiredFields`. Existing four-field edges retain the existing product write roles. Allowed required fields: assigneeId, description, expectedGoal, plannedEndDate, reason. Persisted item fields are checked on the server; reason is supplied with the action.
- Add `WorkItemTransitionService` and GET/POST `/api/work-items/{id}/transitions?productLineId=...`. POST accepts `{edgeKey, revision, reason}`. Revision must match; repeated requests receive a conflict without duplicate events. GET returns executable actions and specific rejection reasons.
- Use the existing product-line transaction lock and an item compare-and-set update. Validate tenant, visibility, role, pinned published workflow, enabled target, published iteration, parent completion and unfinished children. A declared reverse edge is required for reopening. Keep actual start time; clear current completion time on reopening and preserve history in activity.
- Add mapper queries for direct children and timestamp-aware transitions. No new tables or migration are necessary.
- Test real transactions for normal execution, stale/concurrent requests, unknown edges, roles, required reason, pinned versions, child gates, no-design completion, audit rollback, and published version protection. Run previous storage/version regression tests, package and load the new local backend; verify health and API schema through the frontend proxy.

## Delivery boundary
This is API acceptance. Frontend editors, atomic approval task creation and dependency/defect closure remain subsequent batches. A completed core requirement is not automatically declared publishable by the summary endpoint.
