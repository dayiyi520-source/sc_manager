# Test Case Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a product-line test case library and a manual, multi-round test execution flow that plugs into the existing unified test work-item hierarchy and existing defect module.

**Architecture:** Keep test main tasks and child tasks in `t_product_work_item`. Add focused test-domain tables and services for reusable cases, one current plan per executable child task, immutable execution snapshots, per-case results, evidence, and many-to-many defect links. Compose new React workspaces around the existing `RequirementTasksView`; do not replace the defect list or general work-item workflow.

**Tech Stack:** React 19, TypeScript 5.8, Ant Design 6, React Query, Vitest, Spring Boot 3.5, Java 17, MyBatis-style annotated mappers, MySQL/Flyway, JUnit 5, MockMvc.

**Spec:** `docs/superpowers/specs/2026-09-18-test-case-execution-design.md`

## Global Constraints

- Do not add or upgrade dependencies.
- Keep `测试任务 / 用例库 / 缺陷管理` as the only top-level tabs; do not redesign the existing defect list.
- Keep test cases separate from unified work items; `用例编写` remains a work item subtype.
- Implement manual execution only. Do not expose an automatic-run action.
- Store product line, requirement, version, employee, work item, and defect identities by ID; names are display snapshots only.
- A failed execution result can link to multiple defects, and a defect cannot be linked twice to the same result.
- Preserve executed case content through immutable snapshots.
- All writes enforce tenant, product line, state, revision, soft-delete, and published-version checks in the backend.
- Use existing Design Tokens, Ant Design components, Octicons compatibility components, and the 8pt spacing system; do not hard-code new colors.
- Every code change must update `docs/prd/V1.0.0.md` in the same implementation series and pass PRD validation.
- Browser acceptance uses an exact `1920x1080` page viewport.
- Do not stage or commit existing `backend/target`, `.open-imagegen`, `output`, `tmp`, logs, or unrelated user changes.

---

### Task 1: Test-Domain Database Schema

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260918.4__test_case_execution.sql`
- Create: `backend/src/test/java/com/shichuang/manage/product/TestDomainMigrationIntegrationTest.java`

**Interfaces:**
- Produces tables `t_product_test_case_directory`, `t_product_test_case`, `t_product_test_case_step`, `t_product_test_case_work_item`, `t_product_test_plan`, `t_product_test_plan_case`, `t_product_test_execution`, `t_product_test_execution_case`, `t_product_test_execution_evidence`, and `t_product_test_execution_defect`.
- Every table exposes `id_`, `tenant_id_`, audit columns, `delete_flag_`, and `version_`; relationship tables add composite unique keys.

- [ ] **Step 1: Synchronize project configuration and verify version/service state**

Run:

```powershell
python "C:\Users\Administrator\.codex\plugins\cache\team-codex\stringplugin\0.1.44+codex.20260904073000\scripts\sync_config.py" --project "D:\project\manager_admin"
python "C:\Users\Administrator\.codex\plugins\cache\team-codex\stringplugin\0.1.44+codex.20260904073000\scripts\manage_version.py" --project "D:\project\manager_admin" status
python "C:\Users\Administrator\.codex\plugins\cache\team-codex\stringplugin\0.1.44+codex.20260904073000\scripts\local_services.py" --project "D:\project\manager_admin" status --json
```

Expected: configuration is current, active PRD is `V1.0.0`, and existing frontend/backend services are identified before any restart.

- [ ] **Step 2: Write the failing migration integration test**

Create a Spring integration test that queries `information_schema` and asserts the ten tables, the test-case product-line/code uniqueness constraint, the plan/work-item uniqueness constraint, the execution/round uniqueness constraint, and the result/defect uniqueness constraint.

```java
@Test
void testDomainTablesAndUniqueKeysExist() {
    assertEquals(10, jdbc.queryForObject("""
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name IN (
          't_product_test_case_directory','t_product_test_case','t_product_test_case_step',
          't_product_test_case_work_item','t_product_test_plan','t_product_test_plan_case',
          't_product_test_execution','t_product_test_execution_case',
          't_product_test_execution_evidence','t_product_test_execution_defect')
        """, Integer.class));
    assertIndex("t_product_test_case", "uk_test_case_code");
    assertIndex("t_product_test_plan", "uk_test_plan_work_item");
    assertIndex("t_product_test_execution", "uk_test_execution_round");
    assertIndex("t_product_test_execution_defect", "uk_test_result_defect");
}
```

- [ ] **Step 3: Run the test and confirm it fails before the migration exists**

Run: `mvn -f backend/pom.xml -Dtest=TestDomainMigrationIntegrationTest test`

Expected: FAIL because the test-domain tables do not exist.

- [ ] **Step 4: Implement the versioned migration**

Use `VARCHAR(36)` IDs, `DATETIME(6)` audit timestamps, `TINYINT` soft deletion, and `INT` optimistic versions. Use normalized rows for core associations and steps. Store the immutable execution-case snapshot in explicit title/precondition fields plus a `LONGTEXT steps_snapshot_` JSON document because it is historical content rather than a query relationship. Store evidence name, content type, byte size, and bounded data URL in the evidence row, matching the project's existing persisted-media pattern; reject unsupported types or content larger than 10 MB.

Required uniqueness:

```sql
UNIQUE KEY uk_test_case_code (tenant_id_, product_line_id_, code_, delete_flag_),
UNIQUE KEY uk_test_plan_work_item (tenant_id_, work_item_id_, delete_flag_),
UNIQUE KEY uk_test_plan_case (tenant_id_, test_plan_id_, test_case_id_, delete_flag_),
UNIQUE KEY uk_test_execution_round (tenant_id_, test_plan_id_, round_no_, delete_flag_),
UNIQUE KEY uk_test_execution_case (tenant_id_, execution_id_, test_case_id_, delete_flag_),
UNIQUE KEY uk_test_result_defect (tenant_id_, execution_case_id_, defect_work_item_id_, delete_flag_)
```

Add indexes beginning with `tenant_id_` for product-line directory queries, case keyword/status queries, work-item lookups, execution status/round order, and defect reverse lookups.

- [ ] **Step 5: Run migration verification**

Run: `mvn -f backend/pom.xml -Dtest=TestDomainMigrationIntegrationTest test`

Expected: PASS with all tables and indexes present.

- [ ] **Step 6: Commit the database slice**

```powershell
git add backend/src/main/resources/db/migration/V20260918.4__test_case_execution.sql backend/src/test/java/com/shichuang/manage/product/TestDomainMigrationIntegrationTest.java
git commit -m "feat(test): add test execution schema"
```

### Task 2: Product-Line Test Case Library Backend

**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/product/TestCaseDefinition.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/TestCaseMapper.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/TestCaseService.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/TestCaseController.java`
- Create: `backend/src/test/java/com/shichuang/manage/product/TestCaseIntegrationTest.java`

**Interfaces:**
- Produces records `TestCaseDefinition.StepInput`, `SaveCase`, `SaveDirectory`, `CaseView`, and `CasePage`.
- Produces service methods `directories(String lineId)`, `list(String lineId, Query query)`, `detail(String lineId, String caseId)`, `create(String lineId, SaveCase input)`, `update(String lineId, String caseId, SaveCase input)`, and `setEnabled(String lineId, String caseId, int revision, boolean enabled)`.
- Produces endpoints under `/api/product-lines/{lineId}/test-cases` and `/api/product-lines/{lineId}/test-case-directories`.

- [ ] **Step 1: Write failing service and endpoint tests**

Cover create/list/detail/update/disable plus invalid employee, foreign product line, empty steps, mismatched step pairs, stale revision, and duplicate code. Use the existing authenticated MockMvc pattern.

```java
@Test
void createsCaseWithOrderedStepsAndReturnsDirectoryCounts() throws Exception {
    String response = mockMvc.perform(post("/api/product-lines/{line}/test-cases", line)
        .header("Authorization", bearer())
        .contentType("application/json")
        .content(objectMapper.writeValueAsString(caseBody("工作首页跳转", List.of(
            Map.of("action", "打开工作首页", "expectedResult", "展示我的待办"),
            Map.of("action", "点击任务测评", "expectedResult", "打开详情")
        ))))).andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.steps.length()").value(2))
        .andReturn().getResponse().getContentAsString();
    String id = objectMapper.readTree(response).path("data").path("id").asText();
    mockMvc.perform(get("/api/product-lines/{line}/test-cases/{id}", line, id)
        .header("Authorization", bearer()))
        .andExpect(jsonPath("$.data.title").value("工作首页跳转"));
}
```

- [ ] **Step 2: Run the tests and verify the missing-domain failure**

Run: `mvn -f backend/pom.xml -Dtest=TestCaseIntegrationTest test`

Expected: FAIL because the controller and service do not exist.

- [ ] **Step 3: Define stable request and response records**

```java
public final class TestCaseDefinition {
    public record StepInput(String id, int sort, String action, String expectedResult) {}
    public record SaveCase(
        String requestId, String directoryId, String sourceRequirementId, String title,
        String precondition, String priority, String ownerId, List<String> tags,
        List<StepInput> steps, Integer revision) {}
    public record Query(String directoryId, String keyword, String priority,
        String ownerId, Boolean enabled, int page, int pageSize) {}
}
```

Use maps only inside mapper result assembly where the existing product package already does so; controller contracts use records.

- [ ] **Step 4: Implement mapper and service validation**

Generate codes under a product-line row lock in `TC-000001` style. Validate active product line, directory ownership, optional source requirement ownership, active employee ID, P0-P3 priority, nonblank title, at least one complete step, maximum page size, and revision. Replace steps in one transaction only after the case update succeeds. Disable idempotently and never physically delete referenced cases.

- [ ] **Step 5: Add OpenAPI controller endpoints**

```java
@RestController
@RequestMapping("/api/product-lines/{lineId}")
@Tag(name = "Test Case Library")
public class TestCaseController {
    @GetMapping("/test-cases")
    @PostMapping("/test-cases")
    @GetMapping("/test-cases/{caseId}")
    @PutMapping("/test-cases/{caseId}")
    @PutMapping("/test-cases/{caseId}/enabled")
    @GetMapping("/test-case-directories")
    @PostMapping("/test-case-directories")
}
```

- [ ] **Step 6: Run focused tests**

Run: `mvn -f backend/pom.xml -Dtest=TestCaseIntegrationTest test`

Expected: PASS for normal, invalid, cross-line, idempotent, and concurrency cases.

- [ ] **Step 7: Commit the case-library backend**

```powershell
git add backend/src/main/java/com/shichuang/manage/product/TestCaseDefinition.java backend/src/main/java/com/shichuang/manage/product/TestCaseMapper.java backend/src/main/java/com/shichuang/manage/product/TestCaseService.java backend/src/main/java/com/shichuang/manage/product/TestCaseController.java backend/src/test/java/com/shichuang/manage/product/TestCaseIntegrationTest.java
git commit -m "feat(test): add product line case library API"
```

### Task 3: Test Plans and Manual Execution Backend

**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/product/TestExecutionDefinition.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/TestExecutionMapper.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/TestExecutionService.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/TestExecutionController.java`
- Create: `backend/src/test/java/com/shichuang/manage/product/TestExecutionIntegrationTest.java`

**Interfaces:**
- Produces records `SavePlan`, `CreateExecution`, `SaveResult`, `LinkDefect`, `PlanView`, `ExecutionView`, and `TestTaskOverview`.
- Produces `/api/work-items/{workItemId}/test-plan`, `/api/work-items/{workItemId}/test-executions`, `/api/work-items/{workItemId}/test-overview`, `/api/test-executions/{executionId}`, `/api/test-executions/{executionId}/end`, `/api/test-execution-cases/{resultId}`, and `/api/test-execution-cases/{resultId}/defects`.
- Consumes test cases from Task 2 and unified work-item details from `WorkItemStorageMapper`.

- [ ] **Step 1: Write failing plan and execution tests**

Test executable subtype acceptance, `用例编写` rejection for execution, one plan per task, cross-line case rejection, plan revision conflicts, all/failed/custom scopes, immutable snapshots, pass/fail validation, ended-round read-only behavior, and idempotent execution creation.

```java
@Test
void failedOnlyRoundCopiesPreviousFailuresAndPreservesSnapshot() {
    String planId = savePlan(executableTask, List.of(caseA, caseB));
    String first = createExecution(executableTask, "ALL", List.of());
    saveResult(first, caseA, "PASSED", "", 0);
    saveResult(first, caseB, "FAILED", "点击后无响应", 0);
    endExecution(first);
    String regression = createExecution(executableTask, "FAILED_ONLY", List.of());
    assertEquals(List.of(caseB), executionCaseIds(regression));
    assertEquals("点击任务测评", firstStepSnapshot(regression, caseB));
}
```

- [ ] **Step 2: Verify tests fail before implementation**

Run: `mvn -f backend/pom.xml -Dtest=TestExecutionIntegrationTest test`

Expected: FAIL because execution services and endpoints are missing.

- [ ] **Step 3: Define execution contracts and state constants**

```java
public final class TestExecutionDefinition {
    public enum ScopeType { ALL, FAILED_ONLY, CUSTOM }
    public enum ExecutionStatus { NOT_STARTED, IN_PROGRESS, ENDED, CANCELLED }
    public enum ResultStatus { NOT_EXECUTED, PASSED, FAILED }
    public record SavePlan(List<String> testCaseIds, String environment, Integer revision) {}
    public record CreateExecution(String requestId, ScopeType scopeType,
        List<String> testCaseIds, String name, String environment, String buildVersion) {}
    public record EvidenceInput(String name, String contentType, long size, String dataUrl) {}
    public record SaveResult(ResultStatus result, String actualResult,
        List<EvidenceInput> evidence, Integer revision) {}
}
```

- [ ] **Step 4: Implement plan persistence and eligibility checks**

Require category `test`, a child work item, and an enabled subtype whose name is one of `测试任务`, `测试验收`, `安全测试`, or `回归测试`. Reject `用例编写`. Validate that all selected cases are enabled and belong to the task product line. Replace ordered plan cases transactionally using optimistic revision.

- [ ] **Step 5: Implement round creation and snapshots**

Under a plan row lock, assign the next round number and resolve the requested scope. Copy each selected case title, precondition, priority, and ordered step JSON into `t_product_test_execution_case`. Treat identical `requestId` and payload as a retry returning the existing round; reject a reused key with different content.

- [ ] **Step 6: Implement result transitions and evidence**

Allow `NOT_EXECUTED -> PASSED|FAILED` and correction while a round is active, guarded by revision. Require trimmed `actualResult` for `FAILED`. Validate evidence name, MIME allowlist, declared byte size, data URL media prefix, and a 10 MB maximum before persisting the content transactionally. Ending a round returns a conflict containing the count of unexecuted cases; ended and cancelled rounds reject result updates.

- [ ] **Step 7: Run focused backend tests**

Run: `mvn -f backend/pom.xml -Dtest=TestExecutionIntegrationTest test`

Expected: PASS for scopes, snapshots, results, revisions, idempotency, and read-only states.

- [ ] **Step 8: Commit plan and execution backend**

```powershell
git add backend/src/main/java/com/shichuang/manage/product/TestExecutionDefinition.java backend/src/main/java/com/shichuang/manage/product/TestExecutionMapper.java backend/src/main/java/com/shichuang/manage/product/TestExecutionService.java backend/src/main/java/com/shichuang/manage/product/TestExecutionController.java backend/src/test/java/com/shichuang/manage/product/TestExecutionIntegrationTest.java
git commit -m "feat(test): add manual test plans and rounds"
```

### Task 4: Defect Traceability and Main-Task Aggregation

**Files:**
- Modify: `backend/src/main/java/com/shichuang/manage/product/TestExecutionService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/TestExecutionMapper.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/WorkItemRelationService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/WorkItemCompletionService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/WorkItemStorageService.java`
- Modify: `backend/src/test/java/com/shichuang/manage/product/TestExecutionIntegrationTest.java`
- Modify: `backend/src/test/java/com/shichuang/manage/product/WorkItemCompletionIntegrationTest.java`
- Modify: `backend/src/test/java/com/shichuang/manage/product/WorkItemStorageIntegrationTest.java`

**Interfaces:**
- Produces `linkDefect(String resultId, LinkDefect input)` and `overview(String lineId, String workItemId)`.
- Reuses the existing `FOUND_DEFECT` work-item relation for child-task/defect linkage while storing the exact execution-result/defect relation in `t_product_test_execution_defect`.
- Extends completion reconciliation only for test main tasks; other category behavior remains unchanged.

- [ ] **Step 1: Add failing tests for multiple defects and aggregation**

```java
@Test
void oneFailedResultLinksMultipleDefectsWithoutDuplicates() {
    linkDefect(resultId, new LinkDefect(defectA, 0));
    linkDefect(resultId, new LinkDefect(defectB, 1));
    assertThrows(ResponseStatusException.class,
        () -> linkDefect(resultId, new LinkDefect(defectA, 2)));
    assertEquals(2, overview(mainTask).defectCount());
}

@Test
void mainTaskCompletesOnlyAfterRequiredChildrenAndLatestResultsQualify() {
    assertEquals("未通过", overview(mainTask).conclusion());
    finishRequiredChildren();
    closeP0P1Defects();
    assertEquals("有条件通过", overview(mainTask).conclusion());
}
```

- [ ] **Step 2: Run tests and verify missing aggregation behavior**

Run: `mvn -f backend/pom.xml -Dtest=TestExecutionIntegrationTest,WorkItemCompletionIntegrationTest test`

Expected: FAIL on result-defect linkage and test-main completion assertions.

- [ ] **Step 3: Implement atomic defect linking**

Validate result is failed, execution is editable, defect belongs to the same tenant/product line/requirement, and both revisions are current. In one transaction, insert the exact result link and create/reuse `FOUND_DEFECT` from executable child task to defect. Duplicate exact links return 409 rather than silently multiplying counts.

- [ ] **Step 4: Enforce test main-task creation boundaries**

In `WorkItemStorageService.create`, require every root `test` work item to carry a valid `requirementId`; derive and verify its product line and version against that requirement. Continue inheriting those identities for child work items and reject attempts to override them. Add focused storage tests for missing requirement, cross-line requirement, mismatched version, and valid child inheritance. Do not change creation rules for requirement, design, dev, or bug categories.

- [ ] **Step 5: Implement computed overview**

Aggregate direct and indirect children by `parent_work_item_id`, distinct case IDs, latest ended round per executable child, result counts, distinct defect IDs, defect status/priority, and summed hours. Return explicit blockers such as `REQUIRED_CHILD_INCOMPLETE`, `UNEXECUTED_CASES`, and `OPEN_BLOCKING_DEFECTS`.

- [ ] **Step 6: Restrict automatic main-task completion**

Only test-category root work items use the new aggregate gate. Complete when required children are successful, latest effective rounds contain no `NOT_EXECUTED`, and no open P0/P1 defect exists. Return `CONDITIONAL_PASS` for remaining nonblocking defects. Never reopen a completed task because of a later online defect.

- [ ] **Step 7: Run regression tests**

Run:

```powershell
mvn -f backend/pom.xml -Dtest=TestExecutionIntegrationTest,WorkItemCompletionIntegrationTest,WorkItemRelationIntegrationTest,WorkItemStorageIntegrationTest test
```

Expected: PASS, including existing P0/P1 blocking behavior and lower-priority nonblocking behavior.

- [ ] **Step 8: Commit aggregation changes**

```powershell
git add backend/src/main/java/com/shichuang/manage/product/TestExecutionService.java backend/src/main/java/com/shichuang/manage/product/TestExecutionMapper.java backend/src/main/java/com/shichuang/manage/product/WorkItemRelationService.java backend/src/main/java/com/shichuang/manage/product/WorkItemCompletionService.java backend/src/main/java/com/shichuang/manage/product/WorkItemStorageService.java backend/src/test/java/com/shichuang/manage/product/TestExecutionIntegrationTest.java backend/src/test/java/com/shichuang/manage/product/WorkItemCompletionIntegrationTest.java backend/src/test/java/com/shichuang/manage/product/WorkItemStorageIntegrationTest.java
git commit -m "feat(test): aggregate execution and defect outcomes"
```

### Task 5: Frontend Test-Domain Contracts and Repository

**Files:**
- Create: `src/types/testManagement.ts`
- Modify: `src/services/productRepository.ts`
- Modify: `src/services/productRepository.test.ts`

**Interfaces:**
- Produces `TestCase`, `TestCaseStep`, `TestCaseDirectory`, `TestPlan`, `TestExecution`, `TestExecutionCase`, `TestTaskOverview`, and request input types.
- Extends `productRepository` with `testCaseDirectories`, `testCases`, `testCaseDetail`, `createTestCase`, `updateTestCase`, `setTestCaseEnabled`, `testPlan`, `saveTestPlan`, `testExecutions`, `createTestExecution`, `testExecutionDetail`, `saveTestResult`, `endTestExecution`, `linkTestResultDefect`, and `testTaskOverview`.

- [ ] **Step 1: Write failing repository tests**

```ts
it('sends failed-only execution creation through the API layer', async () => {
  await productRepository.createTestExecution('WI-1', {
    requestId: 'round-2', scopeType: 'FAILED_ONLY', testCaseIds: [],
    name: '第二轮回归', environment: '测试环境', buildVersion: 'V1.2.0-build.38'
  })
  expect(apiRequest).toHaveBeenCalledWith('/api/work-items/WI-1/test-executions', expect.objectContaining({ method: 'POST' }))
})
```

- [ ] **Step 2: Run repository tests and confirm failure**

Run: `bun run test -- src/services/productRepository.test.ts`

Expected: FAIL because test-domain methods and types are absent.

- [ ] **Step 3: Add exact TypeScript contracts**

```ts
export type TestResultStatus = 'NOT_EXECUTED' | 'PASSED' | 'FAILED'
export type TestExecutionScope = 'ALL' | 'FAILED_ONLY' | 'CUSTOM'
export interface TestCaseStep { id?: string; sort: number; action: string; expectedResult: string }
export interface TestCase {
  id: string; code: string; productLineId: string; directoryId: string;
  sourceRequirementId?: string | null; title: string; precondition?: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3'; ownerId: string; ownerName: string;
  enabled: boolean; revision: number; steps: TestCaseStep[];
}
```

Define response types once in `testManagement.ts`; do not duplicate shapes inside components.

- [ ] **Step 4: Implement repository methods through `apiRequest`**

Keep all HTTP access in `productRepository.ts`. Encode query filters with `URLSearchParams`, send revision in write bodies, and preserve existing `ApiResponse` unwrapping behavior.

- [ ] **Step 5: Run focused frontend tests**

Run: `bun run test -- src/services/productRepository.test.ts`

Expected: PASS for paths, methods, query encoding, and bodies.

- [ ] **Step 6: Commit frontend contracts**

```powershell
git add src/types/testManagement.ts src/services/productRepository.ts src/services/productRepository.test.ts
git commit -m "feat(test): add frontend test domain contracts"
```

### Task 6: Test Case Library UI

**Files:**
- Create: `src/components/product/TestCaseLibraryView.tsx`
- Create: `src/components/product/TestCaseEditorDrawer.tsx`
- Create: `src/components/product/TestCaseLibraryView.test.tsx`
- Modify: `src/components/product/TestAndDefectView.tsx`
- Modify: `src/components/product/TestAndDefectView.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- `TestCaseLibraryView` consumes `productLineFilter` and repository methods from Task 5.
- `TestCaseEditorDrawer` consumes `{ open, productLineId, initialCase?, sourceRequirementId?, onClose, onSaved }`.
- `TestAndDefectView` adds only the `case-library` tab between current test and defect tabs.

- [ ] **Step 1: Write failing tab and case-library component tests**

```tsx
it('adds the case library without changing the defect tab', async () => {
  render(<TestAndDefectView productLineFilter="line-1" />)
  expect(screen.getByRole('tab', { name: '测试任务' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: '用例库' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: '缺陷管理' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: '缺陷管理' }))
  expect(screen.getByText('缺陷管理统一工作项页面')).toBeInTheDocument()
})
```

Also test product-line-required creation, root/subdirectory creation, directory filtering, loading, empty, API error/retry, drawer validation, ordered step add/remove, disabled delete for the first required row, save loading, and stale-revision feedback.

- [ ] **Step 2: Run tests and confirm missing UI failure**

Run: `bun run test -- src/components/product/TestAndDefectView.test.tsx src/components/product/TestCaseLibraryView.test.tsx`

Expected: FAIL because the library components do not exist.

- [ ] **Step 3: Implement the three-column library workspace**

Use Ant Design `Tree`, `Table`, `Input`, `Select`, `Tag`, `Button`, `Drawer`, `Form`, and `Switch`. Keep the functional directory at a stable width, table horizontally scrollable, and optional overview inspector collapsible. Provide an icon button beside the directory tree to create a root or child directory through `SaveDirectory`; renaming and deletion remain out of scope. Load queries with React Query keys containing product line and filters.

- [ ] **Step 4: Implement the editor drawer**

Use `Form.List` for ordered steps with required `操作步骤` and `预期结果`. Resolve owners from the existing team employee source and submit `ownerId`. Preserve form values on save failure. Use an explicit disabled state when no product line is selected.

- [ ] **Step 5: Add scoped token-based styling**

Add only `.test-case-library-*` selectors and CSS variables already defined in `src/index.css`. Cover normal, hover/focus, loading, disabled/error, empty, long-title truncation, and narrow viewport horizontal scrolling. Do not introduce literal colors or new global Ant Design overrides.

- [ ] **Step 6: Run component tests and typecheck**

Run:

```powershell
bun run test -- src/components/product/TestAndDefectView.test.tsx src/components/product/TestCaseLibraryView.test.tsx
bun run lint
```

Expected: PASS with all three tabs and case CRUD states covered.

- [ ] **Step 7: Commit the case-library UI**

```powershell
git add src/components/product/TestCaseLibraryView.tsx src/components/product/TestCaseEditorDrawer.tsx src/components/product/TestCaseLibraryView.test.tsx src/components/product/TestAndDefectView.tsx src/components/product/TestAndDefectView.test.tsx src/index.css
git commit -m "feat(test): add test case library workspace"
```

### Task 7: Test Task Creation, Detail, Plan, and Execution UI

**Files:**
- Create: `src/components/product/TestTaskWorkspace.tsx`
- Create: `src/components/product/TestPlanPanel.tsx`
- Create: `src/components/product/TestExecutionWorkspace.tsx`
- Create: `src/components/product/TestExecutionResults.tsx`
- Create: `src/components/product/TestTaskWorkspace.test.tsx`
- Create: `src/components/product/TestExecutionWorkspace.test.tsx`
- Modify: `src/components/product/RequirementTasksView.tsx`
- Modify: `src/components/product/TestAndDefectView.tsx`
- Modify: `src/index.css`

**Interfaces:**
- `RequirementTasksView` gains optional props `renderDetail?: (context: WorkItemDetailContext) => React.ReactNode` and `createPolicy?: WorkItemCreatePolicy`; default behavior for all non-test pages remains byte-for-byte equivalent in behavior.
- `TestTaskWorkspace` wraps `RequirementTasksView` for `taskKind="test"` and supplies the test-specific create policy and detail renderer.
- `TestPlanPanel` consumes one executable child work item and lets users select same-line cases.
- `TestExecutionWorkspace` consumes one execution ID and saves per-case results.

- [ ] **Step 1: Write failing tests for task role-specific behavior**

Test that a root test task requires a requirement, inherits and locks product line/version, a child inherits source fields, `用例编写` shows `关联用例` only, executable child shows `测试计划 / 执行记录 / 关联缺陷`, and root task shows `基本信息 / 子任务 / 汇总结果 / 关联缺陷` without editable source fields.

```tsx
it('renders an issued test main task as an aggregate container', async () => {
  render(<TestTaskWorkspace productLineFilter="line-1" />)
  await openTask('TEST-001')
  expect(screen.getByRole('tab', { name: '汇总结果' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '编辑所属需求' })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Write failing execution interaction tests**

Cover selecting all/failed/custom scopes, disabled round creation for an empty plan, selecting pass/fail, required actual result on failure, evidence display, multiple linked defects, duplicate-link feedback, save-and-next, ended-round read-only state, and API error recovery.

- [ ] **Step 3: Run focused tests and confirm failure**

Run: `bun run test -- src/components/product/TestTaskWorkspace.test.tsx src/components/product/TestExecutionWorkspace.test.tsx`

Expected: FAIL because test-specific workspace components are absent.

- [ ] **Step 4: Add narrow extension points to `RequirementTasksView`**

Extract only the detail body and create-field policy needed by the test workspace. Do not rewrite list filtering, grouping, pagination, status controls, business tasks, design tasks, dev tasks, or bug tasks. Keep existing props and defaults compatible with all current callers and contract tests.

- [ ] **Step 5: Implement test-specific creation and detail routing**

For root creation, require `requirementId`, then derive product line/version and render them read-only. For child creation, inherit parent identities and limit subtype choices to the product line's enabled test types. Classify by subtype name exactly as approved: `用例编写` is non-executable; `测试任务`, `测试验收`, `安全测试`, and `回归测试` are executable.

- [ ] **Step 6: Implement plan selection and new-case handoff**

Render selected count, table, latest result, `选择用例`, and `新建用例`. The picker only loads enabled cases from the same product line. Opening the editor passes the current requirement as `sourceRequirementId`; saving automatically selects the new case but does not start an execution.

- [ ] **Step 7: Implement multi-round execution workspace**

Use the approved three-region layout: stable case list, central steps/result form, and secondary defect/activity context. Use Ant Design segmented controls or buttons for `通过` and `失败`, require actual result only for failure, show evidence and linked defects, and save before moving to the next case. Round creation exposes exactly `全部用例`, `失败用例回归`, and `自定义范围`.

- [ ] **Step 8: Implement result and main-summary views**

Render per-round counts and selected-round results in child details. Render computed child progress, distinct cases, latest result totals, defect distribution, conclusion, and blocker reasons in root details. Defect names are links that open the existing defect detail path; do not duplicate defect editing.

- [ ] **Step 9: Add token-based responsive styling and states**

Keep fixed min/max widths for case list and inspector, preserve a scrollable central region, and prevent status text from resizing rows. Add loading skeletons, empty plans, empty executions, error/retry panels, disabled ended-round controls, focus rings, and long-text truncation with full-value tooltips.

- [ ] **Step 10: Run frontend regression suite**

Run:

```powershell
bun run test -- src/components/product/TestTaskWorkspace.test.tsx src/components/product/TestExecutionWorkspace.test.tsx src/components/product/TestAndDefectView.test.tsx src/components/product/RequirementTasksView.contract.test.ts src/services/productRepository.test.ts
bun run lint
bun run build
```

Expected: PASS without changing the behavior of non-test work-item pages or the defect tab.

- [ ] **Step 11: Commit the task and execution UI**

```powershell
git add src/components/product/TestTaskWorkspace.tsx src/components/product/TestPlanPanel.tsx src/components/product/TestExecutionWorkspace.tsx src/components/product/TestExecutionResults.tsx src/components/product/TestTaskWorkspace.test.tsx src/components/product/TestExecutionWorkspace.test.tsx src/components/product/RequirementTasksView.tsx src/components/product/TestAndDefectView.tsx src/index.css
git commit -m "feat(test): add task planning and execution workspace"
```

### Task 8: PRD Registration, Full Verification, and Browser Acceptance

**Files:**
- Modify: `docs/prd/V1.0.0.md`
- Modify: `.enterprise-app-factory/prd/V1.0.0/registry.json`
- Test: all focused frontend and backend suites from Tasks 1-7

**Interfaces:**
- Adds the next non-renumbered requirement and change IDs under the existing product-management requirement in PRD and registry.
- Produces a local feature checkpoint only after all verification succeeds.

- [ ] **Step 1: Update the numbered PRD requirement in place**

Document the product goal, roles, preconditions, main flow, page feedback, validations, state, exceptions, compatibility impact, affected visible fields, and observable acceptance for the test case and execution flow. Keep implementation details, API paths, source files, table names, and test commands out of the PRD.

- [ ] **Step 2: Register the acceptance and change identifiers**

Add the next `1.1.x` acceptance ID and a new dated change entry without renumbering history. Ensure registry goal/scope/pages match the PRD text.

- [ ] **Step 3: Validate the PRD**

Run: `python "C:\Users\Administrator\.codex\plugins\cache\team-codex\stringplugin\0.1.44+codex.20260904073000\scripts\manage_prd.py" --project "D:\project\manager_admin" validate`

Expected: validation succeeds with no missing registry references.

- [ ] **Step 4: Run complete relevant backend checks**

Run:

```powershell
mvn -f backend/pom.xml test
mvn -f backend/pom.xml package -DskipTests
```

Expected: all tests pass and the backend package builds.

- [ ] **Step 5: Run complete frontend checks**

Run:

```powershell
bun run test
bun run lint
bun run build
```

Expected: all Vitest tests pass, TypeScript reports no errors, and Vite builds production assets.

- [ ] **Step 6: Reuse or start managed local services**

First run:

```powershell
python "C:\Users\Administrator\.codex\plugins\cache\team-codex\stringplugin\0.1.44+codex.20260904073000\scripts\local_services.py" --project "D:\project\manager_admin" status --json
```

Reuse live matching frontend/backend services. If absent, start through the manager with stable names `frontend` and `backend`; do not launch duplicate ports outside the registry.

- [ ] **Step 7: Perform browser acceptance at exactly 1920x1080**

Verify the actual webpage viewport dimensions, log in as the existing super administrator, then execute:

```text
测试与缺陷 → 用例库 → 新建两条用例
测试任务 → 打开主任务 → 创建用例编写和测试执行子任务
测试执行子任务 → 测试计划 → 引用两条用例
第一轮执行 → 一条通过、一条失败 → 失败结果关联两个缺陷
第二轮回归 → 选择失败用例回归 → 通过
主任务 → 汇总结果和关联缺陷跳转
```

Capture screenshots for case library, editor drawer, plan, active execution, multi-defect result, multi-round result, and root summary. Verify normal, hover/focus, loading, disabled/error, and empty states without overlap.

- [ ] **Step 8: Inspect persistence and audit without exposing secrets**

Use the resolved local development environment without printing credentials. Confirm cases, steps, plan links, execution snapshots, results, evidence metadata, defect links, revisions, soft-delete flags, and audit timestamps persist after refresh.

- [ ] **Step 9: Verify the final checkpoint scope**

Run `git status --short` and confirm the remaining intended changes are the PRD and registry only. Earlier task commits must already contain their scoped source and test files. Do not stage generated build output, screenshots, temporary prompts, logs, or unrelated user changes.

- [ ] **Step 10: Create the local feature checkpoint**

Run the stringplugin checkpoint script with every feature directory/path named explicitly; it commits the remaining PRD and registry changes and records the local checkpoint without pushing:

```powershell
python "C:\Users\Administrator\.codex\plugins\cache\team-codex\stringplugin\0.1.44+codex.20260904073000\scripts\feature_checkpoint.py" --project "D:\project\manager_admin" create --requirement "1.1.43" --summary "新增测试用例库与人工执行闭环" --path "backend/src/main/resources/db/migration" --path "backend/src/main/java/com/shichuang/manage/product" --path "backend/src/test/java/com/shichuang/manage/product" --path "src/components/product" --path "src/services" --path "src/types" --path "src/index.css" --path "docs/prd/V1.0.0.md" --path ".enterprise-app-factory/prd/V1.0.0/registry.json"
```

Expected: one local checkpoint commit is recorded only after all tests and browser acceptance pass; nothing is pushed automatically.
