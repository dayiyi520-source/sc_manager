# Work Item Relations Implementation Plan

Goal: deliver approved dependency and testing-defect relations for core work items within one product line, including cross-requirement and cross-version endpoints.

Architecture: an additive relation table stores BLOCKS (source prerequisite, target dependent, START or FINISH), symmetric canonical RELATES_TO, and FOUND_DEFECT (test source, bug target). Parent-child and requirement delivery edges are derived. A topological graph check rejects cycles including implicit edges. Blockers are derived without replacing business state; transactionally recorded changes bump affected item revisions.

Spec: `docs/superpowers/specs/2026-09-14-unified-work-item-model-design.md`.

- [x] Add relation migration, mapper, graph computation and local relation endpoints with tenant, role, published-version and soft-delete checks.
- [x] Gate transitions and record blocker changes/unblocking; retain original business state.
- [x] Verify direct/indirect/implicit cycles, idempotent writes, P0/P1 versus P2/P3, finished-test defects, cross-version references, permissions, true transaction rollback and unblock activities. Product-line lock serializes relation writes; relation concurrency is not separately stress-tested.
- [x] Focused regression: 73 tests passed across ten classes; package exit 0. Update PRD 1.1.29 and acceptance record. PRD validation remains blocked by missing registry; no checkpoint created because shared modified files contain previous batches.
- [x] Running backend health UP, authenticated frontend proxy login/product-line read successful, relation endpoint present in OpenAPI, frontend login HTTP 200. Main backend replaced with the packaged artifact; local service registry remains healthy.

Contract: POST `/api/work-items/{id}/relations?productLineId=...` accepts `{targetId,type,scope}`; GET returns relations and blockers; DELETE `/{relationId}` requires relation revision. Repeating identical creation/deletion is idempotent. Recreating a deleted relation increments its revision. FOUND_DEFECT snapshots whether the test was unfinished at creation; later defects never reopen completed tests/requirements. P0/P1 in-test defects block completion until terminal; P2/P3 and plain associations do not. Explicit BLOCKS is independent of priority and requires successful prerequisite completion.

Boundary: core records only, same product line, no legacy data conversion, no frontend changes, no automatic requirement/version completion. New schema contains no destructive changes. Existing local migration history must remain intact.
