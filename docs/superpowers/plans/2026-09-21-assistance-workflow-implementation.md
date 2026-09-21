# 协助事项工单化闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有复用需求任务的协助事项升级为可持久化、可并行转任务、可逐条验收、可重开的工单闭环，并让“我的工作”首期真实聚合产研任务与协助事项。

**Architecture:** 保留统一工作项作为产研任务的事实来源，在其上增加协助事项专属责任、转派、任务关联、验收和活动模型；附件通过统一暂存/绑定资源服务管理，不再把文件本体作为 Base64 直接嵌入事项字段。后端负责状态机、权限、版本并发、负责人确认关闭和幂等，React 前端通过 repository API 读取真实状态并在事项详情抽屉中呈现全历程、任务进度和发起人验收操作。

**Tech Stack:** Java 17, Spring Boot 3.5.x, MyBatis/JdbcTemplate 既有持久化约定, MySQL 9.3/Flyway migrations, React 19, TypeScript, Ant Design 6, Vitest, React Testing Library, existing `apiClient` and design-token CSS.

**Spec:** `docs/superpowers/specs/2026-09-21-assistance-workflow-closure-design.md`

## Global Constraints

- 事项主状态使用：待受理、处理中、待验收、验收未通过、待负责人关闭、已关闭、已搁置、已驳回；“等待下游任务”只作为派生进度。
- 转派只有被转派人接受后才切换当前负责人；接受前原负责人继续负责，拒绝/过期/并发冲突不得改变责任关系。
- 一个事项允许多条下游任务；每条任务独立记录是否影响关闭，默认影响关闭；仅发起人可逐条或批量验收。
- 任一任务完成立即回传；单条验收不通过进入验收未通过并重新指派对应任务负责人，其他已验收结果保留。
- 存在至少一条闭环必要任务且全部验收通过后进入待负责人关闭；必须由当前负责人主动确认关闭。没有闭环必要任务时必须由当前负责人提交直接解决结果并由发起人验收。
- 个人备忘录默认作者私有，不改变事项状态，不进入其他用户的共享全历程。
- “我的工作”首期只接入产品需求、设计、研发、测试、缺陷任务与协助事项，不展示未接入模块的演示数据。
- 新增业务表必须使用版本化迁移、租户隔离、软删除、审计字段、索引和乐观并发校验；Controller 不承载业务逻辑。
- 前端不得新增 `lucide-react`、原生 alert/confirm/prompt、页面直连 fetch/axios 或生产 Mock；使用现有 API 层、Ant Design/Octicons 和 AIEDIT Design Tokens。
- 所有新增交互提供默认、悬停/聚焦、加载/提交中、禁用/错误四态；附件失败、网络超时、空数据、长文本和并发冲突必须保留可恢复输入。

---

## Task 1: 建立协助事项领域状态与数据模型

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260921.3__assistance_workflow.sql`
- Create: `backend/src/main/java/com/shichuang/manage/product/AssistanceStatus.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/AssistanceWorkflowMapper.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/AssistanceWorkflowService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementMapper.java:77-127`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementService.java:20-180`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementController.java:25-55`
- Test: `backend/src/test/java/com/shichuang/manage/product/AssistanceWorkflowServiceTest.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/RequirementControllerIntegrationTest.java`

**Interfaces:**
- Produce `AssistanceStatus.Main` values `PENDING_ACCEPTANCE, PROCESSING, PENDING_REVIEW, ACCEPTANCE_FAILED, PENDING_OWNER_CLOSE, CLOSED, ON_HOLD, REJECTED` mapped to the Chinese display labels; expose `isTerminal()` and `canReopen()`.
- Produce service methods `detail(String id)`, `accept(String id,int revision)`, `reopen(String id,int revision)`, `submitDirectResolution(String id, Map<String,Object> input)`, and `recalculate(String id)`.
- Produce mapper operations for current owner, revision, activity append, direct-resolution record, and status transition guarded by `tenant_id_`, `delete_flag_` and `version_`.
- Replace the current `RequirementService.memo` behavior so a memo never executes `处理中 -> 已完成`; the current operation only writes a private record.
- Replace `rejectTerminal` checks for the old `已完成` terminal assumption with the new assistance status policy; legacy rows are normalized to `待受理/处理中` without preserving conflicting old behavior.

- [ ] **Step 1: Write failing state and service tests.** Cover initial 待受理, accept to 处理中, hold/reject, reopen, direct-resolution to 待验收, terminal rejection of updates, and optimistic revision conflict.
- [ ] **Step 2: Run the focused backend tests and verify they fail** with missing status/model behavior.
- [ ] **Step 3: Add the migration and mapper/service implementation.** Add explicit assistance columns or tables for main status, current owner, initiator, revision, direct-resolution result, and audit activity; backfill existing assistance work items to 待受理 or 处理中 based on existing ownership/processing evidence.
- [ ] **Step 4: Update controller endpoints and response assembly.** Expose status/role/action availability in detail responses; keep Controller limited to input, permission declaration and service delegation.
- [ ] **Step 5: Run focused tests and the backend compile.** Expected: all assistance state tests pass and `mvn -f backend/pom.xml -DskipTests compile` succeeds.
- [ ] **Step 6: Commit the isolated state-model change.**
  `git add backend/src/main/resources/db/migration/V20260921.3__assistance_workflow.sql backend/src/main/java/com/shichuang/manage/product/AssistanceStatus.java backend/src/main/java/com/shichuang/manage/product/AssistanceWorkflowMapper.java backend/src/main/java/com/shichuang/manage/product/AssistanceWorkflowService.java backend/src/main/java/com/shichuang/manage/product/RequirementMapper.java backend/src/main/java/com/shichuang/manage/product/RequirementService.java backend/src/main/java/com/shichuang/manage/product/RequirementController.java backend/src/test/java/com/shichuang/manage/product/AssistanceWorkflowServiceTest.java backend/src/test/java/com/shichuang/manage/product/RequirementControllerIntegrationTest.java && git commit -m "feat(assistance): add workflow state model"`

---

## Task 2: Add attachment staging, binding, and visibility enforcement

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260921.4__assistance_attachments.sql`
- Create: `backend/src/main/java/com/shichuang/manage/product/AttachmentResource.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/AttachmentResourceMapper.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/AttachmentResourceService.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/AttachmentResourceController.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementController.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementService.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/AttachmentResourceServiceTest.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/RequirementControllerIntegrationTest.java`

**Interfaces:**
- Produce `POST /api/attachments/stage` returning `{id,name,mimeType,size,storageKey,scanStatus,expiresAt}`.
- Produce `POST /api/attachments/{id}/bind` accepting `{subjectType,subjectId,visibility}` and returning the bound metadata.
- Produce `GET /api/attachments/{id}/download` with tenant, subject permission and visibility checks.
- Produce a typed `AttachmentMetadata` contract consumed by requirement repository and flow forms; no response includes file Base64.
- Visibility values are `SHARED`, `PRIVATE_AUTHOR`, and `PARTICIPANTS`; personal memo attachments always resolve to `PRIVATE_AUTHOR`.

- [ ] **Step 1: Write failing tests** for valid staging, MIME/size rejection, interrupted upload retry, binding rollback on business failure, private memo isolation and unauthorized download.
- [ ] **Step 2: Run focused tests to verify failure.**
- [ ] **Step 3: Add migration, storage adapter using the project’s configured file storage convention, and service validation.** Store only metadata and storage key in the database; make unbound staged rows expire through the existing scheduler/cleanup mechanism.
- [ ] **Step 4: Add controller endpoints and connect binding IDs to assistance create, reassign, work-item creation, direct resolution and rejection/acceptance records.**
- [ ] **Step 5: Run attachment tests plus backend compile and integration tests.**
- [ ] **Step 6: Commit the isolated attachment change.**
  `git add backend/src/main/resources/db/migration/V20260921.4__assistance_attachments.sql backend/src/main/java/com/shichuang/manage/product/AttachmentResource.java backend/src/main/java/com/shichuang/manage/product/AttachmentResourceMapper.java backend/src/main/java/com/shichuang/manage/product/AttachmentResourceService.java backend/src/main/java/com/shichuang/manage/product/AttachmentResourceController.java backend/src/main/java/com/shichuang/manage/product/RequirementController.java backend/src/main/java/com/shichuang/manage/product/RequirementService.java backend/src/test/java/com/shichuang/manage/product/AttachmentResourceServiceTest.java backend/src/test/java/com/shichuang/manage/product/RequirementControllerIntegrationTest.java && git commit -m "feat(assistance): add staged attachment resources"`

---

## Task 3: Implement accepted reassignment and private memo semantics

**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/product/AssistanceReassignmentService.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/AssistanceReassignmentMapper.java`
- Create: `backend/src/main/resources/db/migration/V20260921.5__assistance_reassignments.sql`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementController.java:40-48`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementService.java:100-140`
- Modify: `src/services/requirementRepository.ts:47-51`
- Modify: `src/types/index.ts:496-544`
- Modify: `src/components/workbench/RequirementPoolView.tsx:369-451`
- Test: `backend/src/test/java/com/shichuang/manage/product/AssistanceReassignmentIntegrationTest.java`
- Test: `src/services/requirementRepository.test.ts`
- Test: `src/components/workbench/RequirementPoolView.test.tsx`

**Interfaces:**
- Produce `POST /api/requirements/{id}/reassign` input `{assigneeId,reason,handoffNote,attachmentIds,revision}` returning `{pendingReassignmentId,status,owner,revision}`.
- Produce `POST /api/requirements/{id}/reassign/{reassignmentId}/accept` and `.../reject` accepting `{revision,reason?}`.
- Produce `GET /api/requirements/{id}/reassignments` returning pending and historical handoffs.
- Produce repository methods `reassign`, `acceptReassignment`, `rejectReassignment`, and `memo(id,{content,attachmentIds,revision})`; memo returns a detail with unchanged main status.
- Frontend shows 接受/拒绝 only to the pending assignee, keeps original owner until acceptance, and keeps memo input/attachments after request failure.

- [ ] **Step 1: Add failing integration and repository tests** for acceptance-required owner change, rejection/expiry, concurrent accept/reassign, private memo status invariance and attachment preservation.
- [ ] **Step 2: Run the focused tests to verify failure.**
- [ ] **Step 3: Implement pending handoff persistence and service transitions.** Enforce one pending handoff per item, active employee validation, revision checks and audit events; remove the current direct owner update in `RequirementMapper.reassign`.
- [ ] **Step 4: Implement private memo persistence without status changes.** Return memo records only to the author and exclude them from shared events.
- [ ] **Step 5: Implement the repository methods and update the detail drawer flow controls.** Add loading/disabled/error states and attachment retry behavior.
- [ ] **Step 6: Run backend integration plus `npm run test -- --run src/services/requirementRepository.test.ts src/components/workbench/RequirementPoolView.test.tsx`.**
- [ ] **Step 7: Commit the reassignment/memo change.**
  `git add backend/src/main/java/com/shichuang/manage/product/AssistanceReassignmentService.java backend/src/main/java/com/shichuang/manage/product/AssistanceReassignmentMapper.java backend/src/main/resources/db/migration/V20260921.5__assistance_reassignments.sql backend/src/main/java/com/shichuang/manage/product/RequirementController.java backend/src/main/java/com/shichuang/manage/product/RequirementService.java src/services/requirementRepository.ts src/types/index.ts src/components/workbench/RequirementPoolView.tsx backend/src/test/java/com/shichuang/manage/product/AssistanceReassignmentIntegrationTest.java src/services/requirementRepository.test.ts src/components/workbench/RequirementPoolView.test.tsx && git commit -m "feat(assistance): require reassignment acceptance"`

---

## Task 4: Support atomic multi-task creation and task-level feedback

**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/product/AssistanceTaskService.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/AssistanceTaskMapper.java`
- Create: `backend/src/main/resources/db/migration/V20260921.6__assistance_task_links.sql`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementService.java:140-165`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementMapper.java:101-111`
- Modify: `backend/src/main/java/com/shichuang/manage/product/WorkItemCompletionService.java`
- Modify: `src/services/requirementRepository.ts:51-58`
- Modify: `src/types/index.ts:515-540`
- Modify: `src/components/workbench/RequirementPoolView.tsx:230-430`
- Test: `backend/src/test/java/com/shichuang/manage/product/AssistanceTaskServiceTest.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/RequirementControllerIntegrationTest.java`
- Test: `src/components/workbench/RequirementPoolView.test.tsx`

**Interfaces:**
- Produce `POST /api/requirements/{id}/work-items/batch` with `{requestId,tasks:[{taskType,workItemTypeId,title,assigneeId,expectedCompleteDate,note,attachmentIds,blocksClosure}]}` and atomic response `{items:[...],progress}`.
- Produce `GET /api/requirements/{id}/work-items` returning every linked task, its `blocksClosure`, completion/feedback/acceptance state and attachment metadata.
- Produce `POST /api/requirements/{id}/work-items/{linkId}/feedback` from successful task completion; it is idempotent by source task and completion revision.
- Remove `activeWorkItems()>0` single-task rejection. Use link-level uniqueness and request idempotency instead.
- Add task completion event handling after the task transaction commits; repeated events must not duplicate feedback or activity records.
- Keep auxiliary tasks visible but exclude them from closure blocking.

- [ ] **Step 1: Write failing tests** for two-task atomic creation, one failed validation rolling back all rows, duplicate request replay, one task completing while another remains active, auxiliary task not blocking, and feedback idempotency.
- [ ] **Step 2: Run focused backend tests to verify failure.**
- [ ] **Step 3: Add link migration and mapper.** Store source task ID, assistance ID, blocks-closure flag, completion revision, feedback state, acceptance state, and audit timestamps with indexes on tenant/source/assistance.
- [ ] **Step 4: Implement batch creation around existing `WorkItemStorageService.create` inside one transaction and emit one activity per linked task.**
- [ ] **Step 5: Implement completion callback/event reconciliation.** A successful work-item completion creates task feedback immediately; cancellation/failure creates an exception activity and leaves the assistance in 处理中.
- [ ] **Step 6: Update frontend types, repository and flow modal** to support add/remove task rows, per-row assignee/date/note/attachments/blocksClosure, and progress counters.
- [ ] **Step 7: Run backend and frontend focused tests, then commit.**
  `git add backend/src/main/java/com/shichuang/manage/product/AssistanceTaskService.java backend/src/main/java/com/shichuang/manage/product/AssistanceTaskMapper.java backend/src/main/resources/db/migration/V20260921.6__assistance_task_links.sql backend/src/main/java/com/shichuang/manage/product/RequirementService.java backend/src/main/java/com/shichuang/manage/product/RequirementMapper.java backend/src/main/java/com/shichuang/manage/product/WorkItemCompletionService.java src/services/requirementRepository.ts src/types/index.ts src/components/workbench/RequirementPoolView.tsx backend/src/test/java/com/shichuang/manage/product/AssistanceTaskServiceTest.java backend/src/test/java/com/shichuang/manage/product/RequirementControllerIntegrationTest.java src/components/workbench/RequirementPoolView.test.tsx && git commit -m "feat(assistance): support multi-task feedback"`

---

## Task 5: Add initiator-only acceptance, rework, reopen, and full history

**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/product/AssistanceAcceptanceService.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/AssistanceAcceptanceMapper.java`
- Create: `backend/src/main/resources/db/migration/V20260921.7__assistance_acceptance.sql`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementController.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementMapper.java:41-79`
- Modify: `src/services/requirementRepository.ts`
- Modify: `src/types/index.ts`
- Modify: `src/components/workbench/RequirementPoolView.tsx:900-1080`
- Test: `backend/src/test/java/com/shichuang/manage/product/AssistanceAcceptanceServiceTest.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/RequirementControllerIntegrationTest.java`
- Test: `src/components/workbench/RequirementPoolView.test.tsx`

**Interfaces:**
- Produce `POST /api/requirements/{id}/work-items/{linkId}/accept` input `{revision,decision:"pass"|"reject",reason?,attachmentIds?}`.
- Produce `POST /api/requirements/{id}/work-items/accept-batch` input `{revision,linkIds:[...],decision:"pass"|"reject",reason?,attachmentIds?}`.
- Produce `POST /api/requirements/{id}/reopen` input `{revision,reason,attachmentIds?}`.
- Produce `GET /api/requirements/{id}/timeline` with merged shared events, task feedback, acceptance, rework and status transitions; omit private memos unless requester is author.
- Rejection changes the assistance to 验收未通过 and reassigns the existing task responsibility to that task owner; no rework task is created. Acceptance responses include recalculated `completedCount,pendingAcceptanceCount,acceptedCount,blockingCount`.
- All blocking links accepted changes the assistance to 待负责人关闭; only the current owner can confirm close, and a pending reassignment must be accepted before the new owner can continue or close.
- Only initiator may accept; current owner and collaborators can view/comment/supply materials but never receive acceptance actions.

- [ ] **Step 1: Write failing tests** for initiator-only pass/reject, partial acceptance, reject-to-rework, preserving passed rows, automatic closure, no-necessary-task direct-resolution acceptance, reopen original vs create new scope, and timeline privacy.
- [ ] **Step 2: Run focused tests to verify failure.**
- [ ] **Step 3: Implement acceptance/link state and recalculation.** Use row-level revision checks; when all blocking links are accepted, move to 待负责人关闭 instead of closing.
- [ ] **Step 4: Implement 验收未通过 responsibility return and direct-resolution reopen path.** Preserve the original completion and acceptance history; do not create a rework task automatically.
- [ ] **Step 5: Implement current-owner close confirmation and transfer-aware close guard.** A pending reassignment blocks close until accepted; only the effective current owner can close.
- [ ] **Step 6: Implement merged timeline query and visibility filtering.**
- [ ] **Step 7: Update detail drawer with progress counters, per-task feedback cards, initiator-only actions, 验收未通过 reason/attachment form, close confirmation and reopen action.**
- [ ] **Step 8: Run backend integration and frontend component tests, then commit.**
  `git add backend/src/main/java/com/shichuang/manage/product/AssistanceAcceptanceService.java backend/src/main/java/com/shichuang/manage/product/AssistanceAcceptanceMapper.java backend/src/main/resources/db/migration/V20260921.7__assistance_acceptance.sql backend/src/main/java/com/shichuang/manage/product/RequirementController.java backend/src/main/java/com/shichuang/manage/product/RequirementService.java backend/src/main/java/com/shichuang/manage/product/RequirementMapper.java src/services/requirementRepository.ts src/types/index.ts src/components/workbench/RequirementPoolView.tsx backend/src/test/java/com/shichuang/manage/product/AssistanceAcceptanceServiceTest.java backend/src/test/java/com/shichuang/manage/product/RequirementControllerIntegrationTest.java src/components/workbench/RequirementPoolView.test.tsx && git commit -m "feat(assistance): add initiator acceptance loop"`

---

## Task 6: Replace “我的工作” demo aggregation with real source projections

**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/workbench/MyWorkController.java`
- Create: `backend/src/main/java/com/shichuang/manage/workbench/MyWorkService.java`
- Create: `backend/src/main/java/com/shichuang/manage/workbench/MyWorkMapper.java`
- Create: `src/services/myWorkRepository.ts`
- Create: `src/types/myWork.ts`
- Modify: `src/components/workbench/MyTasksView.tsx:24-175`
- Modify: `src/context/AppContext.tsx:406-461`
- Modify: `src/App.tsx:80-95`
- Test: `backend/src/test/java/com/shichuang/manage/workbench/MyWorkIntegrationTest.java`
- Test: `src/services/myWorkRepository.test.ts`
- Test: `src/components/workbench/MyTasksView.test.tsx`

**Interfaces:**
- Produce `GET /api/my-work?view=all|tasks|assistance|completed&page&pageSize` returning `{items,total,page,pageSize}`.
- Each item has `id,sourceType,sourceId,title,code,status,progress,currentRole,ownerName,dueDate,availableActions,targetPage`; `sourceType` is `TASK` or `ASSISTANCE`.
- Backend adapters query unified product work items and assistance records under the current tenant/user; no CRM, project delivery, calendar, project acceptance or demo records are returned.
- Frontend repository maps items to source-specific open actions. Assistance opens `wb_work_order`; product tasks open their actual task page and detail identifier instead of always opening `prod_req_tasks`.

- [ ] **Step 1: Write failing projection tests** for all/tasks/assistance/completed views, current-role filtering, pending reassignment, pending acceptance, due date/status, empty results and unauthorized tenant data.
- [ ] **Step 2: Run focused tests to verify failure.**
- [ ] **Step 3: Implement backend adapter queries and stable projection DTO/VO.** Keep source ownership in product/assistance services; aggregation is read-only.
- [ ] **Step 4: Add frontend repository and replace mock/static requirement filtering.** Preserve approvals, CRM/OKR sections only if they are outside the “我的工作” first-phase requirement; the work list itself must be real.
- [ ] **Step 5: Add four views 全部/任务/协助事项/已完成, source badges, role/action labels, loading/error/empty states and correct navigation.**
- [ ] **Step 6: Run backend/frontend projection tests and commit.**
  `git add backend/src/main/java/com/shichuang/manage/workbench/MyWorkController.java backend/src/main/java/com/shichuang/manage/workbench/MyWorkService.java backend/src/main/java/com/shichuang/manage/workbench/MyWorkMapper.java src/services/myWorkRepository.ts src/types/myWork.ts src/components/workbench/MyTasksView.tsx src/context/AppContext.tsx src/App.tsx backend/src/test/java/com/shichuang/manage/workbench/MyWorkIntegrationTest.java src/services/myWorkRepository.test.ts src/components/workbench/MyTasksView.test.tsx && git commit -m "feat(workbench): aggregate real my work"`

---

## Task 7: Align frontend copy, forms, and four-state interaction contract

**Files:**
- Modify: `src/components/workbench/RequirementPoolView.tsx`
- Modify: `src/components/product/RequirementPoolView.tsx`
- Modify: `src/components/product/RequirementActionButtons.tsx`
- Modify: `src/components/product/RequirementTasksView.tsx`
- Modify: `src/components/workbench/okr/WorkLinks.tsx`
- Modify: `src/components/workbench/okr/WeeklyReviewEditor.tsx`
- Modify: `src/types/index.ts`
- Test: `src/components/workbench/RequirementPoolView.test.tsx`
- Test: `src/components/product/RequirementPoolView.test.tsx`
- Test: `src/components/workbench/MyTasksView.test.tsx`
- Test: `src/components/workbench/okr/WorkLinks.test.tsx`

**Interfaces:**
- User-facing assistance copy uses 协助事项/发起协助/事项列表/事项详情/来源事项 consistently; old 工单 terms remain only in historical data compatibility labels where needed.
- Task type options include 产品需求、设计、研发、测试、缺陷; no four-type validation remains.
- Flow forms share `AttachmentPicker`, `ReassignmentPanel`, `TaskBatchEditor`, and `AcceptancePanel` contracts introduced in prior tasks.
- All controls expose normal, hover/focus, loading/active and disabled/error states using existing CSS variables; no hard-coded hex values or nested decorative cards.

- [ ] **Step 1: Add failing component assertions** for copy, five task types, attachment retention, pending acceptance actions and disabled non-initiator actions.
- [ ] **Step 2: Run frontend focused tests to verify failure.**
- [ ] **Step 3: Extract or implement shared flow components** under `src/components/workbench/assistance/`:
  `AttachmentPicker.tsx`, `ReassignmentPanel.tsx`, `TaskBatchEditor.tsx`, `AcceptancePanel.tsx`, and `assistance.css`.
- [ ] **Step 4: Replace duplicated conversion/reassign/memo markup in both workbench and product views; ensure all actions call repository methods and refresh source data after success.**
- [ ] **Step 5: Update history rendering to show merged event type/operator/time/status/related task/attachments and keep private memo hidden from other users.**
- [ ] **Step 6: Run component and repository tests, then commit.**
  `git add src/components/workbench/RequirementPoolView.tsx src/components/product/RequirementPoolView.tsx src/components/product/RequirementActionButtons.tsx src/components/product/RequirementTasksView.tsx src/components/workbench/okr/WorkLinks.tsx src/components/workbench/okr/WeeklyReviewEditor.tsx src/components/workbench/assistance src/types/index.ts src/components/workbench/RequirementPoolView.test.tsx src/components/product/RequirementPoolView.test.tsx src/components/workbench/MyTasksView.test.tsx src/components/workbench/okr/WorkLinks.test.tsx && git commit -m "feat(assistance): align workflow UI and copy"`

---

## Task 8: End-to-end verification, PRD sync, and checkpoint

**Files:**
- Modify: `docs/prd/V1.0.0.md`
- Modify: `.enterprise-app-factory/prd/V1.0.0/registry.json`
- Test: `backend/src/test/java/com/shichuang/manage/product/RequirementControllerIntegrationTest.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/AssistanceWorkflowServiceTest.java`
- Test: `src/components/workbench/RequirementPoolView.test.tsx`
- Test: `src/components/workbench/MyTasksView.test.tsx`

**Interfaces:**
- Acceptance IDs 1.2.29–1.2.36 must map to observable automated or manual verification evidence.
- PRD must be updated in place for any behavior or page-field change; registry retains stable IDs and records a new change entry.
- Use the configured feature checkpoint tool only after PRD validation and all tests pass.

- [ ] **Step 1: Run backend focused suite.**
  `mvn -f backend/pom.xml test -Dtest=AssistanceWorkflowServiceTest,AttachmentResourceServiceTest,AssistanceReassignmentIntegrationTest,AssistanceTaskServiceTest,AssistanceAcceptanceServiceTest,MyWorkIntegrationTest,RequirementControllerIntegrationTest`
- [ ] **Step 2: Run frontend typecheck and focused tests.**
  `npm run lint && npm run test -- --run src/services/requirementRepository.test.ts src/services/myWorkRepository.test.ts src/components/workbench/RequirementPoolView.test.tsx src/components/workbench/MyTasksView.test.tsx`
- [ ] **Step 3: Run production build and inspect at 1920x1080.**
  `npm run build`; use the managed frontend service after checking `python .enterprise-app-factory/bin/local_services.py --project D:\project\manager_admin status --json`, then verify normal/hover/loading/disabled/error states in the browser at exactly 1920x1080.
- [ ] **Step 4: Update PRD requirement 1.2 in place** with implementation-observable behavior and add the corresponding registry change record; run `python scripts/manage_prd.py --project D:\project\manager_admin validate`.
- [ ] **Step 5: Create the local feature checkpoint** only for changed feature paths after all checks pass:
  `python scripts/feature_checkpoint.py --project D:\project\manager_admin create --requirement 1.2 --summary "完成协助事项工单化闭环与我的工作真实聚合" --path backend/src --path src/components/workbench/assistance --path src/components/workbench/RequirementPoolView.tsx --path src/components/workbench/MyTasksView.tsx --path src/services --path src/types --path docs/prd/V1.0.0.md --path .enterprise-app-factory/prd/V1.0.0/registry.json`
- [ ] **Step 6: Review the final diff** to confirm no `backend/target`, secrets, generated artifacts, unrelated config or mock-only data were staged; run `git diff --check` and report any remaining risk.

---

## Coverage and self-review

- State and responsibility model: Tasks 1 and 3.
- Attachments and visibility: Task 2, then Task 7 UI.
- Multi-task creation and partial progress: Task 4.
- Initiator-only acceptance, rework, reopen and automatic close: Task 5.
- Full history: Task 5 and Task 7.
- My Work first-phase real aggregation: Task 6.
- Existing frontend demo/static paths and old “memo completes item” behavior: Tasks 1, 3, 6 and 7.
- PRD traceability, tests and release checkpoint: Task 8.
- No placeholders/TODO/TBD remain; each task defines files, interfaces, tests, commands and commit boundary.
