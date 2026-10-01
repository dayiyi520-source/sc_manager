# Assistance, Test Reports, and Version Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename work orders as assistance items, split test and defect navigation, expose version test reports under test tasks, and deliver persistent version reviews.

**Architecture:** Preserve internal work-order identifiers for compatibility while changing all user-visible terminology. Reuse the existing `VersionTestReportPanel` behind a shared product/version context selector, route defects directly to the unified bug work-item view, and implement version reviews as a new tenant-scoped Spring Boot domain with a dedicated migration and React repository/view.

**Tech Stack:** React 19, TypeScript 5.8, Ant Design, React Query, Vitest, Spring Boot 3.5, Java 17, JdbcTemplate, MySQL/Flyway, JUnit 5.

**Spec:** `docs/superpowers/specs/2026-09-20-assistance-test-review-navigation-design.md`

## Global Constraints

- Product review, product planning, and automation rules remain unchanged.
- User-facing wording uses “协助事项 / 发起协助 / 事项列表 / 事项”; internal routes, type names, and database compatibility identifiers remain unchanged.
- New UI uses existing Design Tokens and Ant Design controls with normal, hover/focus, loading/active, and disabled/error states.
- Frontend pages call repository methods only; production writes never use frontend mock data.
- Backend follows Controller → Service → Mapper → Database and validates tenant, permission, state, version, and soft deletion.
- Every business table change has a versioned SQL migration.
- Update `docs/prd/V1.0.0.md` in the same implementation and validate it.

---

### Task 1: Navigation Split and Assistance Terminology

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/context/AppContext.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/workbench/RequirementPoolView.tsx`
- Modify: user-facing work-order labels found under `src/components/**`
- Test: `src/context/Navigation.test.ts`
- Test: `src/components/workbench/RequirementPoolView.test.tsx`
- Test: `src/components/product/TestAndDefectView.test.tsx`

**Interfaces:**
- Produces menu IDs `prod_test_tasks`, `prod_bugs`, and `prod_version_reviews`.
- Produces `prod_test_tasks -> TestAndDefectView`, `prod_bugs -> RequirementTasksView(taskKind="bug")`, and `prod_version_reviews -> VersionReviewView` routing.
- Keeps `/api/requirements`, `RequirementTask`, and `wb_work_order` internal identifiers unchanged.

- [ ] **Step 1: Write failing navigation and copy tests**

Assert `MENU_GROUPS` contains `协助事项`, `测试任务`, `缺陷管理`, and `版本评审`; assert the workbench tabs render `发起协助` and `事项列表`; assert the test workspace no longer renders a defect Tab.

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```powershell
pnpm exec vitest run src/context/Navigation.test.ts src/components/workbench/RequirementPoolView.test.tsx src/components/product/TestAndDefectView.test.tsx --testTimeout=10000
```

Expected: assertions fail on old menu names and old defect Tab.

- [ ] **Step 3: Implement menu routes and visible terminology**

Add `'prod_version_reviews'` to `SubMenuId`, add separate menu entries in the established product order, route `prod_bugs` directly to:

```tsx
<RequirementTasksView productLineFilter={productLineFilter} itemLabel="缺陷管理" taskKind="bug" />
```

Route `prod_test_tasks` to the revised test workspace. Replace user-visible work-order wording without renaming API paths or domain types.

- [ ] **Step 4: Run focused tests**

Expected: menu, terminology, and defect separation tests pass.

- [ ] **Step 5: Commit the independently working navigation change**

```powershell
git add src/types/index.ts src/context/AppContext.tsx src/App.tsx src/components src/context/Navigation.test.ts
git commit -m "feat(product): split test and defect navigation"
```

### Task 2: Test Report Tab with Product and Version Context

**Files:**
- Create: `src/components/product/ProductVersionScope.tsx`
- Create: `src/components/product/VersionTestReportWorkspace.tsx`
- Create: `src/components/product/VersionTestReportWorkspace.test.tsx`
- Modify: `src/components/product/TestAndDefectView.tsx`
- Modify: `src/components/product/TestAndDefectView.test.tsx`

**Interfaces:**
- `ProductVersionScope` consumes `ProductLine[]`, selected product-line ID, selected version ID, and change callbacks.
- `VersionTestReportWorkspace` consumes optional `productLineFilter?: string` and renders `VersionTestReportPanel` only when both IDs resolve.
- Existing `VersionTestReportPanel({ productLineId, versionId, versionName })` remains unchanged and continues serving version details.

- [ ] **Step 1: Write failing workspace tests**

Cover product-line selection, version options derived from the selected line, clearing an invalid version after line changes, no-version disabled state, and rendering the report panel with exact IDs.

- [ ] **Step 2: Run the new tests and verify failure**

Expected: module imports fail because the workspace and selector do not exist.

- [ ] **Step 3: Implement shared context and test report workspace**

Use Ant Design `Select`, `Alert`, and `Empty`. Do not fetch duplicate product-line data; consume `productLines` from `useApp()`. Render:

```tsx
<VersionTestReportPanel
  productLineId={selectedLine.id}
  versionId={selectedVersion.id}
  versionName={selectedVersion.name}
/>
```

only for a valid selected pair.

- [ ] **Step 4: Replace the defect Tab with the test report Tab**

The final Tab keys are `test`, `case-library`, and `test-reports`.

- [ ] **Step 5: Run test workspace and existing version report tests**

Expected: all focused tests pass and the existing version-detail report behavior remains unchanged.

- [ ] **Step 6: Commit the report workspace**

```powershell
git add src/components/product/ProductVersionScope.tsx src/components/product/VersionTestReportWorkspace.tsx src/components/product/VersionTestReportWorkspace.test.tsx src/components/product/TestAndDefectView.tsx src/components/product/TestAndDefectView.test.tsx
git commit -m "feat(product): expose reports in test tasks"
```

### Task 3: Persistent Version Review Backend

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260920.1__version_reviews.sql`
- Create: `backend/src/main/java/com/shichuang/manage/product/VersionReviewDefinition.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/VersionReviewController.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/VersionReviewService.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/VersionReviewMapper.java`
- Create: `backend/src/test/java/com/shichuang/manage/product/VersionReviewIntegrationTest.java`

**Interfaces:**
- Base endpoint: `/api/product-lines/{lineId}/versions/{versionId}/reviews`.
- `SaveReview` fields: `reviewDate`, `participantIds`, `conclusion`, `summary`, `risks`, `releaseRecommendation`, `revision`.
- Endpoints: list, detail, create draft, update draft, and `POST /{reviewId}/submit` with `{ revision }`.
- Returned review fields include IDs, participant objects, conclusion, text fields, `DRAFT|SUBMITTED`, creator/updater names, timestamps, and revision.

- [ ] **Step 1: Write failing integration tests**

Cover creating and updating a draft, submitting and reading it, submitted-record immutability, blank required submission fields, inactive participant rejection, cross-version access rejection, stale revision conflict, and tenant isolation.

- [ ] **Step 2: Run the integration test and verify schema/class failure**

Run:

```powershell
backend/../.tools/apache-maven-3.9.11/bin/mvn.cmd -f backend/pom.xml -Dtest=VersionReviewIntegrationTest test
```

Expected: compilation or migration-backed table failure before implementation.

- [ ] **Step 3: Add the migration**

Create `t_product_version_review` using `id_`, `tenant_id_`, `product_line_id_`, `version_id_`, `review_date_`, JSON `participant_ids_`, `conclusion_`, `summary_`, `risks_`, `release_recommendation_`, `status_`, audit fields, `delete_flag_`, and `version_`. Add tenant/product/version/status/date and tenant/creator/status indexes.

- [ ] **Step 4: Implement definition, mapper, service, and controller**

Use `WorkItemAccess.check(lineId, write)` for product-line authorization. Validate version ownership in the mapper, resolve every participant against active tenant employees, enforce `DRAFT -> SUBMITTED`, and update with `WHERE version_=? AND delete_flag_=0`.

- [ ] **Step 5: Run focused and full backend tests**

Expected: `VersionReviewIntegrationTest` and the full Maven suite pass.

- [ ] **Step 6: Commit backend persistence**

```powershell
git add backend/src/main/resources/db/migration/V20260920.1__version_reviews.sql backend/src/main/java/com/shichuang/manage/product/VersionReview*.java backend/src/test/java/com/shichuang/manage/product/VersionReviewIntegrationTest.java
git commit -m "feat(product): persist version reviews"
```

### Task 4: Version Review Frontend

**Files:**
- Modify: `src/types/testManagement.ts`
- Modify: `src/services/productRepository.ts`
- Modify: `src/services/productRepository.test.ts`
- Create: `src/components/product/VersionReviewView.tsx`
- Create: `src/components/product/VersionReviewView.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `VersionReviewStatus = 'DRAFT' | 'SUBMITTED'`.
- Repository methods: `versionReviews`, `versionReview`, `createVersionReview`, `updateVersionReview`, and `submitVersionReview` under the endpoint from Task 3.
- `VersionReviewView` uses `ProductVersionScope`, `requirementRepository.employees()`, and repository methods only.

- [ ] **Step 1: Write failing repository contract tests**

Assert exact encoded line/version/review routes, methods, and JSON bodies for list, create, update, and submit.

- [ ] **Step 2: Write failing UI tests**

Cover no-version empty state, creating a draft, editing a draft, submission validation, successful submit becoming read-only, and failed saves retaining field values.

- [ ] **Step 3: Implement TypeScript contracts and repository methods**

Keep API payload field names identical to Task 3. Do not add a second HTTP client.

- [ ] **Step 4: Implement the version review page**

Use Ant Design `Table`, `Drawer`, `Form`, `DatePicker`, `Select`, `Input.TextArea`, `Button`, `Alert`, and `Tag`. Disable save/submit while requests are active; show submitted records read-only; preserve form state on error.

- [ ] **Step 5: Add lazy route and menu integration**

Load `VersionReviewView` only for `prod_version_reviews` and include the product-line filter bar only when it materially applies; the view owns its version selection.

- [ ] **Step 6: Run repository and UI tests**

Expected: all new tests pass.

- [ ] **Step 7: Commit the frontend review feature**

```powershell
git add src/types/testManagement.ts src/services/productRepository.ts src/services/productRepository.test.ts src/components/product/VersionReviewView.tsx src/components/product/VersionReviewView.test.tsx src/App.tsx
git commit -m "feat(product): add version review workspace"
```

### Task 5: PRD, Regression, and Feature Checkpoint

**Files:**
- Modify: `docs/prd/V1.0.0.md`
- Inspect only: `.enterprise-app-factory/prd/V1.0.0/registry.json`

**Interfaces:**
- PRD updates requirement `1.1` for navigation/test/version-review behavior and requirement `1.2` for assistance terminology.
- PRD contains business behavior only; it excludes API routes, database names, source paths, and commands.

- [ ] **Step 1: Update numbered PRD sections in place**

Add affected page fields, role and state rules, error behavior, compatibility impact, and observable acceptance criteria without changing product review or automation rules.

- [ ] **Step 2: Validate PRD**

Run `manage_prd.py --project D:\project\manager_admin validate` and expect success.

- [ ] **Step 3: Run frontend checks**

Run focused Vitest suites, `pnpm run lint`, and `pnpm run build`. Record unrelated pre-existing failures separately and do not modify unrelated tests.

- [ ] **Step 4: Run backend checks**

Run the full Maven test suite and expect zero failures.

- [ ] **Step 5: Inspect scope and formatting**

Run `git diff --check`, scan changed files for debug logging, and confirm no product review, product planning, or automation-rule source file changed.

- [ ] **Step 6: Create the local feature checkpoint**

Use `feature_checkpoint.py create --requirement 1.1` with every changed implementation and PRD path. Exclude existing config, generated target files, and unrelated user edits.
