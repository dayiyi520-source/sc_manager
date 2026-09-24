# OKR Hierarchical Goals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 OKR 改造成支持共享来源 A、多级递归拆解、草稿/提交版本和按权重递归进度的目标节点系统。

**Architecture:** 在现有 OKR 记录能力旁新增统一目标节点和承接关系的持久化模型；服务端提供节点摘要、直属子节点、来源链路和版本写入接口，旧接口保留兼容读取。前端将 OKR 页面拆为目标制定和动作承接两条状态明确的工作流，树默认加载两级，子节点按需展开，详情使用右侧抽屉。

**Tech Stack:** Java 17, Spring Boot 3.5, MySQL/Flyway, React 19, TypeScript, Ant Design 5/6 compatibility layer, Vitest, React Testing Library。

**Spec:** `docs/superpowers/specs/2026-09-24-okr-hierarchical-goals-design.md`

## Global Constraints

- 所有写操作必须校验租户、当前版本、节点状态、来源状态和用户权限。
- O 和 A 统一为目标节点；父子关系使用 `parentNodeId`，承接关系使用独立关系记录。
- 同一条 A 可被多个主管承接，但不得复制来源节点。
- 草稿可编辑；已提交节点只读，修改必须经过撤回或创建调整版本。
- 父级进度按直接子动作权重递归加权平均；无子动作时使用自身进度。
- 默认树展开到第二级；后续层级按节点加载，不得由前端一次性扫描全部 records。
- 遵守现有 React/Ant Design、Spring Boot、Flyway 和项目 API 层约定，不新增无必要依赖。

---

### Task 1: 建立目标节点与承接关系迁移

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260924.1__okr_goal_nodes.sql`
- Modify: `docs/prd/V1.0.0.md` requirement 1.1.33 in place
- Modify: `.enterprise-app-factory/prd/V1.0.0/registry.json` matching requirement metadata
- Test: `backend/src/test/java/com/shichuang/manage/okr/OkrGoalNodeMigrationTest.java`

**Interfaces:**
- Produces `t_okr_goal_node` with `id_`, `tenant_id_`, `period_key_`, `kind_`, `parent_node_id_`, `root_node_id_`, `owner_id_`, `creator_id_`, `title_`, `payload_`, `weight_`, `self_progress_`, `aggregated_progress_`, `status_`, `version_`, `source_version_id_`, audit fields and `delete_flag_`.
- Produces `t_okr_goal_assignment` with source node, assignee, assigner, assignment level, cross-level flag, status, notification/audit fields and a unique active assignment constraint.
- Produces indexes for tenant + period, parent lookup, root lookup, owner lookup and source assignment lookup.

- [ ] **Step 1: Write the migration contract test**

Assert the migration creates both tables, the parent/root/tenant indexes, the unique active assignment constraint, and permits multiple assignees for one source node while rejecting duplicate active assignments for the same user.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `mvn -q -f backend/pom.xml -Dtest=OkrGoalNodeMigrationTest test`

Expected: FAIL because the migration and test fixtures do not exist.

- [ ] **Step 3: Add the Flyway migration**

Use explicit `t_` table names and underscore-suffixed columns. Keep payload JSON limited to node fields. Add a migration compatibility backfill that maps existing objective/action records to nodes and translates `parentObjectiveId`, `parentActionId`, `parentKeyResultId`, `assigneeId`, and `assigneeIds` into node parents and assignment rows without deleting legacy data.

- [ ] **Step 4: Update product requirements**

Update the matching numbered requirement in `docs/prd/V1.0.0.md` with the observable hierarchical goal behavior, six views, draft/submitted semantics, assignment rules, progress aggregation, and exception states. Do not include API paths, table names, source paths, or SQL. Update the registry entry without renumbering history.

- [ ] **Step 5: Validate migration and PRD**

Run: `mvn -q -f backend/pom.xml -Dtest=OkrGoalNodeMigrationTest test` and `python3 scripts/manage_prd.py --project . validate`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V20260924.1__okr_goal_nodes.sql backend/src/test/java/com/shichuang/manage/okr/OkrGoalNodeMigrationTest.java docs/prd/V1.0.0.md .enterprise-app-factory/prd/V1.0.0/registry.json
git commit -m "feat(okr): add hierarchical goal node storage"
```

### Task 2: Implement backend node, assignment, and progress services

**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/okr/model/GoalNode.java`
- Create: `backend/src/main/java/com/shichuang/manage/okr/model/GoalAssignment.java`
- Create: `backend/src/main/java/com/shichuang/manage/okr/mapper/GoalNodeMapper.java`
- Create: `backend/src/main/java/com/shichuang/manage/okr/mapper/GoalAssignmentMapper.java`
- Create: `backend/src/main/java/com/shichuang/manage/okr/service/GoalNodeService.java`
- Create: `backend/src/main/java/com/shichuang/manage/okr/service/GoalProgressService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/okr/service/OkrService.java`
- Test: `backend/src/test/java/com/shichuang/manage/okr/GoalNodeServiceTest.java`
- Test: `backend/src/test/java/com/shichuang/manage/okr/GoalProgressServiceTest.java`

**Interfaces:**
- `GoalNodeService.roots(periodKey, view, page)` returns root summaries visible to the current tenant/user.
- `GoalNodeService.children(nodeId, cursor, pageSize)` returns direct children plus `GoalNodeSummary` and `hasMoreChildren`.
- `GoalNodeService.detail(nodeId)` returns node detail, source path, assignments, audit summary, and version.
- `GoalNodeService.saveDraft(input, existingId, expectedVersion)` creates or updates only draft nodes.
- `GoalNodeService.submit(nodeId, expectedVersion)` submits a validated draft.
- `GoalNodeService.createAdjustment(nodeId, expectedVersion)` creates a new adjusting version while preserving the submitted version.
- `GoalProgressService.aggregate(nodeId)` recursively calculates weighted child progress and warnings.

- [ ] **Step 1: Write service tests for visibility and parent validation**

Cover: root owner visibility, assignee visibility, invalid parent rejection, revoked assignment rejection, tenant isolation, duplicate active assignment rejection, and draft-only update behavior.

- [ ] **Step 2: Write progress tests**

Cover: weighted average, nested recursion, no-child self progress, zero-weight warning, completed-child count, and no division by zero.

- [ ] **Step 3: Run focused tests to verify failure**

Run: `mvn -q -f backend/pom.xml -Dtest=GoalNodeServiceTest,GoalProgressServiceTest test`

Expected: FAIL because the node services and mappers are not present.

- [ ] **Step 4: Implement mapper and service boundaries**

Keep Controller -> Service -> Mapper direction. Use type-safe mapper parameters, transaction boundaries in services, explicit `tenantId`, `expectedVersion`, and state checks. Keep conversion between persistence records and response maps outside controllers.

- [ ] **Step 5: Implement recursive progress calculation**

Load direct children only per recursion level, recursively aggregate each child, ignore zero-weight children in the denominator, and return warnings instead of silently treating invalid weights as complete.

- [ ] **Step 6: Run focused tests and commit**

Run: `mvn -q -f backend/pom.xml -Dtest=GoalNodeServiceTest,GoalProgressServiceTest test`

Expected: PASS.

```bash
git add backend/src/main/java/com/shichuang/manage/okr backend/src/test/java/com/shichuang/manage/okr/GoalNodeServiceTest.java backend/src/test/java/com/shichuang/manage/okr/GoalProgressServiceTest.java
git commit -m "feat(okr): add hierarchical goal services"
```

### Task 3: Expose node, assignment, and version APIs

**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/okr/controller/GoalNodeController.java`
- Create: `backend/src/main/java/com/shichuang/manage/okr/controller/GoalAssignmentController.java`
- Create: `backend/src/main/java/com/shichuang/manage/okr/model/dto/GoalNodeRequests.java`
- Create: `backend/src/main/java/com/shichuang/manage/okr/model/vo/GoalNodeViews.java`
- Modify: `backend/src/main/java/com/shichuang/manage/okr/OkrController.java`
- Test: `backend/src/test/java/com/shichuang/manage/okr/GoalNodeControllerIntegrationTest.java`

**Interfaces:**
- `GET /api/okr/goal-nodes/roots?periodKey=&view=`
- `GET /api/okr/goal-nodes/{nodeId}/children?cursor=&pageSize=`
- `GET /api/okr/goal-nodes/{nodeId}`
- `POST /api/okr/goal-nodes/drafts`
- `PUT /api/okr/goal-nodes/{nodeId}/draft`
- `POST /api/okr/goal-nodes/{nodeId}/submit`
- `POST /api/okr/goal-nodes/{nodeId}/adjustments`
- `POST /api/okr/goal-nodes/{nodeId}/assignments`
- `POST /api/okr/goal-nodes/{nodeId}/assignments/{assignmentId}/revoke`

- [ ] **Step 1: Write integration tests**

Verify OpenAPI annotations, tenant isolation, root/children/detail response shapes, draft save, submit conflict, valid/invalid assignment, cross-level flag, and revoked-source errors.

- [ ] **Step 2: Run tests to verify failure**

Run: `mvn -q -f backend/pom.xml -Dtest=GoalNodeControllerIntegrationTest test`

Expected: FAIL because the controllers and contracts do not exist.

- [ ] **Step 3: Implement DTO/VO contracts and controllers**

Controllers handle request parsing, permission declarations, and response assembly only. Delegate validation and conversion to services. Return stable error codes for source invalidation, forbidden parent, version conflict, and invalid progress weight.

- [ ] **Step 4: Run integration tests and commit**

Run: `mvn -q -f backend/pom.xml -Dtest=GoalNodeControllerIntegrationTest test`

Expected: PASS.

```bash
git add backend/src/main/java/com/shichuang/manage/okr/controller backend/src/main/java/com/shichuang/manage/okr/model backend/src/main/java/com/shichuang/manage/okr/OkrController.java backend/src/test/java/com/shichuang/manage/okr/GoalNodeControllerIntegrationTest.java
git commit -m "feat(okr): expose hierarchical goal APIs"
```

### Task 4: Add frontend repository and state hooks

**Files:**
- Modify: `src/services/okrRepository.ts`
- Modify: `src/components/workbench/okr/useOriginalOkr.ts`
- Create: `src/components/workbench/okr/goalNodeTypes.ts`
- Create: `src/components/workbench/okr/useGoalNodeTree.ts`
- Test: `src/components/workbench/okr/useGoalNodeTree.test.ts`

**Interfaces:**
- `goalNodeRepository.roots(periodKey, view)`
- `goalNodeRepository.children(nodeId, cursor, pageSize)`
- `goalNodeRepository.detail(nodeId)`
- `goalNodeRepository.saveDraft(input)`
- `goalNodeRepository.updateDraft(nodeId, input, version)`
- `goalNodeRepository.submit(nodeId, version)`
- `goalNodeRepository.createAdjustment(nodeId, version)`
- `goalNodeRepository.assign(nodeId, input)`
- `goalNodeRepository.revokeAssignment(nodeId, assignmentId, version)`
- `useGoalNodeTree` exposes `roots`, `childrenByNode`, `expandedIds`, `loadingByNode`, `expandNode`, `collapseNode`, `expandAll`, `refreshNode`, and stable error states.

- [ ] **Step 1: Write hook tests**

Cover default two-level expansion, per-node loading/error, retry without losing expanded state, pagination, and no full-record tree scan.

- [ ] **Step 2: Run hook tests to verify failure**

Run: `pnpm exec vitest run src/components/workbench/okr/useGoalNodeTree.test.ts`

Expected: FAIL because the repository and hook do not exist.

- [ ] **Step 3: Implement typed repository functions**

Use the existing API client, not direct `fetch` or `axios` calls in components. Define nullable source, assignment, summary, progress warning, and version fields explicitly.

- [ ] **Step 4: Implement the tree hook**

Load roots plus their direct children for the first two levels. Keep child requests keyed by node ID; a child failure only marks that node failed and exposes retry. Do not derive the tree by filtering the entire legacy `records` array.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm exec vitest run src/components/workbench/okr/useGoalNodeTree.test.ts`

Expected: PASS.

```bash
git add src/services/okrRepository.ts src/components/workbench/okr/goalNodeTypes.ts src/components/workbench/okr/useGoalNodeTree.ts src/components/workbench/okr/useGoalNodeTree.test.ts
git commit -m "feat(okr): add goal node tree client state"
```

### Task 5: Build six-state OKR workflow views

**Files:**
- Modify: `src/components/workbench/OKRPerformanceView.tsx`
- Modify: `src/components/workbench/okr/ActionBreakdownForm.tsx`
- Create: `src/components/workbench/okr/GoalNodeTree.tsx`
- Create: `src/components/workbench/okr/GoalNodeDrawer.tsx`
- Create: `src/components/workbench/okr/GoalDraftView.tsx`
- Create: `src/components/workbench/okr/GoalSubmittedView.tsx`
- Create: `src/components/workbench/okr/ActionDraftView.tsx`
- Create: `src/components/workbench/okr/ActionSubmittedView.tsx`
- Modify: `src/components/workbench/okr/originalOkr.css`
- Test: `src/components/workbench/okr/GoalNodeTree.test.tsx`
- Test: `src/components/workbench/okr/GoalWorkflowViews.test.tsx`

**Interfaces:**
- `GoalNodeTree` accepts root nodes, child loaders, expanded IDs, and node selection callbacks.
- `GoalNodeDrawer` accepts `nodeId`, detail loading/error state, and draft/submitted action handlers.
- Draft views accept a node or source assignment and emit save/submit/cancel events.
- Submitted views expose read-only detail, assignment completion, weighted progress, withdraw, and adjustment actions.

- [ ] **Step 1: Write component tests**

Cover the six view states, default two-level expansion, “全部展开”, child loading/error/retry, source path display, no-source empty state, draft editing controls, submitted read-only controls, and assignment completion text.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm exec vitest run src/components/workbench/okr/GoalNodeTree.test.tsx src/components/workbench/okr/GoalWorkflowViews.test.tsx`

Expected: FAIL because the new components are not present.

- [ ] **Step 3: Implement the shared tree and drawer**

Use Ant Design components and the existing Octicons compatibility layer. Keep node rows stable in size, show loading/error states in place, and avoid rendering the entire descendant tree by default.

- [ ] **Step 4: Implement draft and submitted views**

Draft views allow edit/delete/reorder/assignment changes. Submitted views remove direct edit controls and expose explicit withdraw/create-adjustment actions. Action forms receive the source node from the server and cannot change parent O/A locally.

- [ ] **Step 5: Integrate both workflows into the workbench**

Replace current record-based action parent derivation for the new path. Keep legacy review tabs intact. Ensure an unavailable assignment renders an empty state instead of an editable form.

- [ ] **Step 6: Add design states and run tests**

Provide Normal, Hover/Focus, Active/Loading, Disabled/Error states for node rows, buttons, drawers, and forms. Run the two focused Vitest files and the existing OKR component tests.

```bash
pnpm exec vitest run src/components/workbench/okr/GoalNodeTree.test.tsx src/components/workbench/okr/GoalWorkflowViews.test.tsx src/components/workbench/okr/ActionBreakdownForm.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/workbench/OKRPerformanceView.tsx src/components/workbench/okr src/components/workbench/okr/originalOkr.css
git commit -m "feat(okr): add hierarchical goal workflow views"
```

### Task 6: Compatibility migration, QA, and delivery checkpoint

**Files:**
- Modify: `backend/src/main/java/com/shichuang/manage/okr/service/OkrService.java`
- Modify: `src/components/workbench/okr/useOriginalOkr.ts`
- Modify: `src/services/okrRepository.ts`
- Create: `backend/src/test/java/com/shichuang/manage/okr/GoalHierarchyEndToEndTest.java`
- Create: `src/components/workbench/okr/GoalHierarchyE2E.test.tsx`
- Modify: `docs/prd/V1.0.0.md` if acceptance wording needs final alignment

**Interfaces:**
- Legacy OKR reads remain available during the compatibility window.
- New node APIs are the source of truth for new writes.
- The end-to-end fixtures create O/A1/A11/A111, multiple assignment branches, a draft, a submitted node, and a weighted progress tree.

- [ ] **Step 1: Write end-to-end fixtures and tests**

Verify the full chain, multiple supervisors on one A without duplicated source rows, employee no-source behavior, cross-level assignment marker, draft update, submitted read-only behavior, adjustment version, recursive weighted progress, and concurrency conflict.

- [ ] **Step 2: Run backend and frontend tests**

Run: `mvn -q -f backend/pom.xml test` and `pnpm test`.

Expected: PASS; any pre-existing unrelated failure must be isolated and reported with its exact test name.

- [ ] **Step 3: Run typecheck and production build**

Run: `pnpm lint` and `pnpm build`.

Expected: PASS with no new TypeScript errors and a successful Vite production build.

- [ ] **Step 4: Preview at the required viewport**

Start/reuse services through `.enterprise-app-factory/bin/local_services.py`, set browser viewport to exactly `1920x1080`, verify login, target list, draft view, submitted view, child expansion, drawer, retry/error state, and mobile responsive smoke behavior only if explicitly requested.

- [ ] **Step 5: Create the feature checkpoint**

After all checks pass, run:

```bash
python3 scripts/feature_checkpoint.py --project . create --requirement 1.1.33 --summary "Implement hierarchical OKR goal nodes and recursive action delegation" --path backend/src/main/resources/db/migration/V20260924.1__okr_goal_nodes.sql --path backend/src/main/java/com/shichuang/manage/okr --path backend/src/test/java/com/shichuang/manage/okr --path src/services/okrRepository.ts --path src/components/workbench/OKRPerformanceView.tsx --path src/components/workbench/okr --path docs/prd/V1.0.0.md --path .enterprise-app-factory/prd/V1.0.0/registry.json
```

- [ ] **Step 6: Final review**

Check that no direct API calls were introduced in components, no hard-coded secrets or colors were added, no debug logs remain, all new UI controls have four states, and the working tree contains no unrelated staged files.

## Self-Review Coverage

- Data model, shared source A, multi-assignee branches: Tasks 1–3.
- Draft/submitted/withdraw/adjustment lifecycle: Tasks 2, 3, and 5.
- Recursive tree and lazy loading: Tasks 4 and 5.
- Weighted recursive progress: Task 2 and Task 6.
- Six views and four UI states: Task 5.
- Migration compatibility and legacy records: Tasks 1 and 6.
- Tenant, permission, concurrency, and error handling: Tasks 2, 3, and 6.
- PRD update and checkpoint: Tasks 1 and 6.
