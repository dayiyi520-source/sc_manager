# CRM Journey Linkage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute this plan task-by-task with a test cycle after each bounded change.

**Goal:** Make CRM lead visibility and the customer-to-lead-to-opportunity-to-follow-up-to-work-order journey observable from every relevant detail view.

**Architecture:** Keep the existing React context and Spring Controller -> Service -> Mapper layering. Add one tenant-scoped journey read model assembled by the backend from existing CRM and requirement/work-item records, then render it through one reusable frontend timeline component. Preserve existing IDs and conversion rules; do not introduce a second source of truth.

**Tech Stack:** React 19, TypeScript, TanStack Query, Vite, Spring Boot 3.5, Java 17, JdbcTemplate, MySQL/Flyway, Maven, Bun.

**Spec:** Approved in chat on 2026-09-03: default lead filtering must not hide all database rows; customer, lead, opportunity, follow-up, presales ticket and delivery ticket histories must be linked and viewable.

## Global Constraints

- Preserve React 19 + Vite + Bun and Spring Boot 3.5 + Java 17 + Maven.
- All new backend reads must enforce the current request tenant and existing role checks.
- Reuse existing CRM and requirement IDs; no direct opportunity creation outside lead conversion.
- Every user-visible behavior change updates `docs/prd/V1.0.0.md` and its registry.
- Do not commit secrets, runtime env files, build output, or production changes.

### Task 1: Confirm data state and lead default behavior

**Files:**
- Modify: `frontend/src/components/crm/CRMLeadsView.tsx`
- Test: `frontend/src/components/crm/CRMLeadsView.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `useApp().leads` and `LeadStatus`.
- Produces: a first-load selection that uses `跟进中` when it has rows and otherwise uses `all`, while preserving manual tab selection.

- [ ] Add a regression test that renders ten converted leads and asserts the all-leads view contains a row instead of the empty-state message.
- [ ] Implement a one-time initial-tab adjustment after API data arrives; do not auto-switch after a user explicitly selects a tab.
- [ ] Run the focused frontend test and TypeScript check.

### Task 2: Add tenant-scoped backend journey query

**Files:**
- Modify: `backend/src/main/java/com/shichuang/manage/crm/CrmController.java`
- Modify: `backend/src/main/java/com/shichuang/manage/crm/CrmService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/crm/CrmMapper.java`
- Modify: `backend/src/test/java/com/shichuang/manage/crm/CrmControllerIntegrationTest.java`

**Interfaces:**
- Consumes: `GET /api/crm/journey?customerId=&leadId=&opportunityId=` with the existing JWT and tenant context.
- Produces: `PageResult<Map<String,Object>>` items containing `id`, `eventType`, `title`, `description`, `status`, `occurredAt`, `customerId`, `leadId`, `opportunityId`, `requirementId`, `workItemId`, and `taskType`.

- [ ] Add failing integration coverage for a customer journey containing a lead, converted opportunity, follow-up, requirement, presales ticket, and delivery ticket, plus tenant exclusion.
- [ ] Add a mapper UNION query joining CRM records and requirement work items through `t_product_requirement.customer_id_`; use only tenant-scoped rows and soft-delete predicates.
- [ ] Add service normalization, optional ID filters, bounded pagination, and deterministic descending timestamp ordering.
- [ ] Add `@Operation` documentation on the new controller method and run the focused Maven test.

### Task 3: Expose journey data to the frontend

**Files:**
- Modify: `frontend/src/services/crmRepository.ts`
- Modify: `frontend/src/context/AppContext.tsx`
- Modify: `frontend/src/types/index.ts`

**Interfaces:**
- Consumes: backend journey page result.
- Produces: `CrmJourneyEvent` type, `crmRepository.journey(filters)`, and a context helper for refetching journey data.

- [ ] Add type-safe parsing for nullable IDs and timestamps without changing existing CRM repository response shapes.
- [ ] Add a query helper that keeps journey loading/error state separate from the existing list queries.
- [ ] Run frontend lint and repository tests.

### Task 4: Render reusable history timeline and link detail views

**Files:**
- Create: `frontend/src/components/crm/CRMJourneyTimeline.tsx`
- Modify: `frontend/src/components/crm/CRMCustomersView.tsx`
- Modify: `frontend/src/components/crm/CRMLeadsView.tsx`
- Modify: `frontend/src/components/crm/CRMOpportunitiesView.tsx`
- Modify: `frontend/src/components/crm/CRMFollowupsView.tsx`
- Modify: `frontend/src/components/common/RequirementWorkItemsView.tsx`

**Interfaces:**
- Consumes: `CrmJourneyEvent[]`, optional `customerId`, `leadId`, or `opportunityId`, and existing `openPageTab`/drawer actions.
- Produces: consistent loading, empty, error/retry, normal, hover/focus, active/loading, and disabled states; event links open the corresponding existing page or source requirement drawer.

- [ ] Add the timeline to the customer detail workspace first, then add the same component to lead/opportunity/follow-up/work-item detail surfaces where an ID is available.
- [ ] Keep visual tokens from the existing UI design system and avoid hard-coded colors.
- [ ] Add focused component coverage for empty and populated journeys.

### Task 5: Product record and verification

**Files:**
- Modify: `docs/prd/V1.0.0.md`
- Modify: `.enterprise-app-factory/prd/V1.0.0/registry.json`

- [ ] Update customer, opportunity, and follow-up requirement sections with the observable journey behavior and lead default-filter behavior.
- [ ] Run PRD validation, frontend lint/test/build, Maven test/package, and `git diff --check`.
- [ ] Review the complete diff, create a local checkpoint commit for the feature paths, and report any browser validation limitation without claiming it passed.
