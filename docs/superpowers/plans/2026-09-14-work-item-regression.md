# Online Issues and Regression Tasks Implementation Plan

Goal: persist online issues as core bugs and atomically convert bugs into typed regression testing work items, preserving historical requirement states.

Architecture: reuse work-item source_type and activity JSON for provenance and request fingerprint. Existing request uniqueness and product-line lock serialize retries. REQUIRES_REGRESSION points from bug to test, contributes a reverse FINISH dependency (test must succeed before bug closes), and cannot be removed through generic relation APIs. No new table or migration.

Spec: confirmed workflow in `docs/superpowers/specs/2026-09-14-unified-work-item-model-design.md`.

Contract:
- POST `/api/work-items/online-issues`: existing CreateItem contract restricted to bug, no parent. Mark ONLINE_ISSUE. Historical requirement may be referenced, but task version must be writable; no old requirement state mutation.
- POST `/api/work-items/{id}/regression-tests?productLineId=...`: `{requestId,revision,taskTypeId,title,versionId,assigneeId,plannedEndDate}`. Version is explicitly selected, nullable for backlog. Inherit bug requirement, priority, description and expected goal. Validate source bug is unfinished and its version writable. Create main test, mark DEFECT_REGRESSION, record relation and activities atomically. Return current test detail.
- Same request and same input/actor/source returns existing task even after state changes; other content or actor conflicts. Existing unfinished regression blocks creating another request; completed regressions allow another round.

Tasks:
- [x] Add provenance mapper, service, endpoints and dependency graph support; prevent generic deletion of regression constraint.
- [x] Ten integration tests cover online origin, historic requirement, idempotency/concurrency, invalid source/type/version/actor, regression gate, subsequent rounds and true outer transaction rollback.
- [x] 83 tests across 11 classes passed, Maven package exit 0. Latest main backend started on 8080, health UP; frontend login HTTP 200, authenticated proxy read successful, both new endpoints present in runtime OpenAPI.
- [x] Update PRD 1.1.30 and acceptance guide. Validator attempted but existing registry is missing; no migration performed. Existing shared files contain earlier batches, so no isolated checkpoint commit is made.

Boundary: core records only; no external incident connector or frontend changes. Bug state remains controlled by configured workflow. Regression success only removes its gate; it does not automatically close bugs or reopen historical requirements.
