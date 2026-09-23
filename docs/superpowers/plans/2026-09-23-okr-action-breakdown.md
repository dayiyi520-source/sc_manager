# OKR Action Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an acceptance-mode action breakdown workflow beside target creation, with department-specific structured fields, parent-action selection, optional assignees, and persistent backend records.

**Architecture:** Keep existing `objective` and `review` records unchanged. Add an independent `action` record type stored in the existing OKR record table, with parent objective/action references and structured department fields in its JSON payload. The frontend will show both entry buttons to every user during phase one; the backend will validate action ownership and parent-action visibility but will not distinguish a business boss role.

**Tech Stack:** React 19, TypeScript, Ant Design 5, TanStack Query, Spring Boot 3.5, Java 17, MyBatis, MySQL migrations, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-23-okr-action-breakdown-design.md`

## Global Constraints

- Phase one displays both “新增目标” and “拆解动作” to every user.
- No boss field or boss permission is added in phase one.
- Action records must retain month, creator, assignee, parent objective, parent action, and department-specific fields.
- Existing objective/review behavior and historical records remain compatible.
- Update `docs/prd/V1.0.0.md` in the matching requirement section and validate it.

### Task 1: Define action contracts and migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260923.1__okr_action_breakdown.sql`
- Modify: `src/services/okrRepository.ts`
- Modify: backend OKR payload filtering and validation in `backend/src/main/java/com/shichuang/manage/okr/service/OkrService.java`
- Test: `backend/src/test/java/com/shichuang/manage/okr/OkrPolicyTest.java`

- [ ] Add the `action` kind to the server's accepted record types and payload allowlist.
- [ ] Define payload fields: `title`, `department`, `parentObjectiveId`, `parentActionId`, `creatorId`, optional `assigneeId`, `assigneeName`, `structureType`, `productLine`, `businessObject`, `milestone`, `acceptanceStandard`, `deadline`, and `weight`.
- [ ] Validate required parent action, same-month parent objective, current-user visibility, department field rules, date format, weight range, and optional assignee existence.
- [ ] Return action records through `/api/okr/records` while preserving existing visibility rules.
- [ ] Add repository types and `createAction` helper.
- [ ] Add tests for valid action creation, missing parent rejection, inaccessible parent rejection, and optional assignee.

### Task 2: Add parent-action and action creation APIs

**Files:**
- Modify: `backend/src/main/java/com/shichuang/manage/okr/controller/OkrController.java`
- Modify: `src/services/okrRepository.ts`
- Test: `backend/src/test/java/com/shichuang/manage/okr/OkrIntegrationTest.java`

- [ ] Add `GET /api/okr/actions/parents?periodKey=YYYY-MM` returning only active parent A actions assigned to the current user or otherwise available under the existing organization relation.
- [ ] Add `POST /api/okr/actions` using the validated action payload and returning the created record id/version.
- [ ] Keep request handling thin and route business validation through `OkrService`.
- [ ] Cover empty parent list, valid creation, and rejected unassigned parent in integration tests.

### Task 3: Build action breakdown form

**Files:**
- Create: `src/components/workbench/okr/ActionBreakdownForm.tsx`
- Create: `src/components/workbench/okr/ActionBreakdownForm.test.tsx`
- Modify: `src/components/workbench/okr/okr.css`

- [ ] Render the month header and a two-column layout.
- [ ] Render the left parent-action list with selectable parent A actions and source context.
- [ ] Render one or more collapsible “新增关键动作” cards with a “继续添加” button.
- [ ] Render fields by department: product line, lead/opportunity, project, or acceptance standard; all variants include action, milestone where applicable, deadline, and weight.
- [ ] Allow optional assignee selection and display loading, empty, validation, save-error, disabled, hover, and collapsed states.
- [ ] Test multiple cards, collapse/expand, parent selection, department field switching, optional assignee, and required validation.

### Task 4: Wire both entry buttons and action records into the workspace

**Files:**
- Modify: `src/components/workbench/okr/OkrWorkspace.tsx`
- Modify: `src/components/workbench/okr/ObjectiveEditor.tsx`
- Modify: `src/components/workbench/okr/useOriginalOkr.ts`
- Modify: `src/components/workbench/OKRPerformanceView.tsx` if legacy workspace copy remains active
- Test: `src/components/workbench/okr/OkrWorkspace.actionBreakdown.test.tsx`

- [ ] Always render “新增目标” and “拆解动作” in the phase-one operation area.
- [ ] Open the existing objective editor for the first button and the action form for the second.
- [ ] Load parent actions and people through query invalidation after successful saves.
- [ ] Show saved actions in the current-month list with parent action and assignee context.
- [ ] Keep action records out of objective/review filters and preserve current target/review behavior.
- [ ] Test both buttons, action form opening, successful save refresh, and empty parent state.

### Task 5: Update PRD, verification, and checkpoint

**Files:**
- Modify: `docs/prd/V1.0.0.md`
- Modify: `src/components/workbench/okr/ObjectiveForm.interaction.test.tsx` only if shared copy changes require it

- [ ] Update requirement `1.1.33` with phase-one action breakdown behavior and acceptance states.
- [ ] Run frontend focused Vitest tests, TypeScript check, production build, backend OKR tests, `manage_prd.py validate`, and scoped `git diff --check`.
- [ ] Create the required local feature checkpoint with all changed paths; do not push.

