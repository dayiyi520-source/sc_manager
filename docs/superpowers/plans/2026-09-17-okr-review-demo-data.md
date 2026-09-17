# OKR Review Demo Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute this plan task-by-task and verify each checkpoint before continuing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide persistent, realistic local demo records for both "My Reviews" and "Reviews Received" without using frontend mock data.

**Architecture:** Add one Flyway migration scoped to `local-tenant`. The migration establishes the minimum reporting hierarchy required by the existing authorization query, then inserts stable review records with deterministic identifiers and complete JSON payloads. Product-facing acceptance language is updated in the current PRD requirement.

**Tech Stack:** MySQL 9.3, Flyway, Spring Boot 3.5.x, React 19 API consumer

**Spec:** `docs/prd/V1.0.0.md`, requirement `1.1.33`

## Global Constraints

- Preserve all existing review records and user-created organization relationships.
- Restrict demo records to tenant `local-tenant`.
- Use stable IDs and idempotent inserts; never create duplicates on repeat execution.
- Store all demo data in the backend database; do not add frontend mock data.
- Keep API and frontend contracts unchanged.

---

### Task 1: Persistent Review Demo Dataset

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260917.3__local_okr_review_demo_data.sql`

**Interfaces:**
- Consumes: `t_sys_user`, `t_okr_reporting`, and `t_okr_record` schemas.
- Produces: three direct-report relationships plus eleven new review records visible through `GET /api/okr/records` for `user-admin`.

- [x] Insert the local reporting hierarchy with stable IDs and duplicate protection.
- [x] Insert five `user-admin` reviews so the existing draft brings "My Reviews" to six records.
- [x] Insert six direct-report reviews split evenly between `submitted` and `reviewed`.
- [x] Include weekly and monthly payloads with KR results, risks, plans, assistance, extra work, and reviewer feedback where applicable.
- [x] Start the backend through the project service manager so Flyway applies the migration.
- [x] Query the API as `admin` and assert six own reviews, six received reviews, three submitted received reviews, and three reviewed received reviews.

### Task 2: Product Acceptance Documentation

**Files:**
- Modify: `docs/prd/V1.0.0.md`

**Interfaces:**
- Consumes: requirement `1.1.33` review-list behavior.
- Produces: observable acceptance criteria for the local review dataset.

- [x] Extend requirement `1.1.33` with the local acceptance dataset and its visibility rules.
- [x] Run the project PRD validator and report any pre-existing registry/configuration blocker explicitly.
- [x] Run the available checks: backend migration/health/API verification plus frontend typecheck and production build. Full Maven tests are unavailable because this checkout has no Maven Wrapper and Maven is not installed on the host.
