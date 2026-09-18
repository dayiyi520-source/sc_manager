# Product Line Work Item Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a product line create a complete work-item template in one transaction, support one default subtype per category, make task planned completion optional, and restore Ant Design's selected-date inner-circle appearance.

**Architecture:** Persist `is_default_` on product-line work-item types and enforce at most one active default with a generated unique key. A backend template factory owns the fixed subtype and four-state workflow definitions; `ProductLineService.create` orchestrates product line, membership, types, workflows, and publication in one transaction. React sends the template flag, edits default state through the existing APIs, and uses the returned default subtype when creating tasks.

**Tech Stack:** React 19, TypeScript 5.8, Ant Design 6, Vitest, Java 17, Spring Boot 3.5, Spring JDBC, MySQL/Flyway, JUnit 5.

**Spec:** `docs/superpowers/specs/2026-09-18-product-line-work-item-template-design.md`

## Global Constraints

- Keep the existing React/Ant Design and Spring Boot/JDBC conventions; add no dependency.
- Use existing design tokens and Ant Design component states; do not hardcode colors.
- Keep product line creation and template initialization atomic.
- Do not modify or commit `backend/target/**`.
- Update `docs/prd/V1.0.0.md` and its registry, then validate the PRD.

---

### Task 1: Persist and enforce the default work-item type

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260918.2__work_item_type_defaults.sql`
- Modify: `backend/src/main/java/com/shichuang/manage/product/ProductLineMapper.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/ProductLineService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/WorkItemDefinition.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/ProductLineControllerIntegrationTest.java`

**Interfaces:**
- Consumes: existing product-line work-item type CRUD endpoints.
- Produces: `isDefault` in type responses and `Boolean isDefault` in `CreateWorkItemType`.

- [ ] **Step 1: Add failing integration tests**

Cover creation with `isDefault=true`, replacement of a category's former default, clearing the switch, and clearing default when disabling or deleting a type. Assert every list response returns a boolean `isDefault`.

- [ ] **Step 2: Run focused backend test and confirm failure**

Run: `mvn -Dtest=ProductLineControllerIntegrationTest test`

Expected: assertions fail because `isDefault` and persistence do not exist.

- [ ] **Step 3: Add migration and mapper operations**

Add `is_default_ TINYINT NOT NULL DEFAULT 0` plus a generated nullable uniqueness key equivalent to:

```sql
CASE WHEN delete_flag_ = 0 AND enabled_ = 1 AND is_default_ = 1
THEN CONCAT(tenant_id_, ':', product_line_id_, ':', category_)
ELSE NULL END
```

Return `isDefault` from every type query. Before setting a type as default, clear the former default in the same tenant, line, and category. Disabling or deleting a type writes `is_default_=0`.

- [ ] **Step 4: Extend service validation and DTO**

Accept `isDefault` on create/update. Serialize conflicting default changes inside the transaction by locking the owning product-line row before clearing and setting defaults. Preserve the existing category-change restrictions for referenced types.

- [ ] **Step 5: Re-run focused test**

Run: `mvn -Dtest=ProductLineControllerIntegrationTest test`

Expected: PASS.

### Task 2: Create the complete template atomically

**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/product/WorkItemTemplate.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/ProductLineService.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/ProductLineControllerIntegrationTest.java`

**Interfaces:**
- Consumes: request field `initializeWorkItemTemplate`.
- Produces: 21 enabled types, five defaults, and one published four-state workflow per type.

- [ ] **Step 1: Add failing template integration tests**

Create one line with the flag enabled and assert the exact 21 names, one default in each category, four states (`待处理`, `处理中`, `已完成`, `已取消`) per published workflow, and the four allowed transitions. Create another line with the flag disabled and assert no types. Add a forced-invalid fixture path at the template factory unit boundary to prove transaction rollback leaves no product line.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `mvn -Dtest=ProductLineControllerIntegrationTest test`

Expected: template assertions fail.

- [ ] **Step 3: Implement the immutable template definition**

Define category/type records in `WorkItemTemplate` and build workflows with stable keys:

```java
states = List.of(pendingInitial, inProgress, completedSuccessful, cancelled);
transitions = List.of(start, complete, cancelPending, cancelInProgress);
```

Map category stages as requirement/design/dev/test/dev for requirement/design/dev/test/bug.

- [ ] **Step 4: Orchestrate initialization in product-line creation**

After the line and owner membership exist, loop through the fixed template and call the existing type/workflow save and publish services from the same `@Transactional` method. Treat missing `initializeWorkItemTemplate` as false for API compatibility.

- [ ] **Step 5: Re-run focused backend tests**

Run: `mvn -Dtest=ProductLineControllerIntegrationTest test`

Expected: PASS.

### Task 3: Wire the UI behavior and restore DatePicker selection

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/services/productRepository.ts`
- Modify: `src/context/AppContext.tsx`
- Modify: `src/components/product/ProductLinesView.tsx`
- Modify: `src/components/product/ProductLineDetailView.tsx`
- Modify: `src/components/product/RequirementTasksView.tsx`
- Modify: `src/main.tsx` or the narrowest conflicting stylesheet under `src/styles/`
- Test: `src/components/product/CreateVersionModal.test.tsx`
- Test: `src/components/product/RequirementTasksView.contract.test.ts`
- Create: `src/components/product/ProductLineWorkItemDefaults.test.tsx`

**Interfaces:**
- Consumes: `ProductLineWorkItemType.isDefault` and `ProductLine.initializeWorkItemTemplate`.
- Produces: template switch request, default-type edits, visible default tag, and default task subtype selection.

- [ ] **Step 1: Add failing frontend tests**

Assert product-line creation defaults the template switch on and submits `initializeWorkItemTemplate: true`; the type editor submits `isDefault`; the list renders `默认`; selecting a line chooses its enabled default type; and planned completion has no `required` marker. Add a CSS/theme contract assertion that selected DatePicker cells use Ant Design component tokens/classes without a broad reset overriding `.ant-picker-cell-inner`.

- [ ] **Step 2: Run focused frontend tests and confirm failure**

Run: `npm test -- --run src/components/product/CreateVersionModal.test.tsx src/components/product/RequirementTasksView.contract.test.ts src/components/product/ProductLineWorkItemDefaults.test.tsx`

Expected: new assertions fail.

- [ ] **Step 3: Extend types and repository contracts**

Add:

```ts
isDefault: boolean;
initializeWorkItemTemplate?: boolean;
```

Include `isDefault` in create/update work-item type bodies.

- [ ] **Step 4: Implement product-line and type switches**

Use Ant Design `Switch` with loading/disabled state while saving. Keep the template switch on by default and reset it after a successful create. Render an Ant Design `Tag` directly after the type name when `isDefault` is true.

- [ ] **Step 5: Implement default subtype selection and optional completion date**

When line/category changes and types load, select the enabled default if present; otherwise do not overwrite a still-valid user choice. Remove only the main task form's `required` presentation/validation for planned completion. Retain date-order checks.

- [ ] **Step 6: Restore Ant Design DatePicker selected-cell visuals**

Use ConfigProvider DatePicker component tokens where necessary and narrow any global selector that overrides Ant Design internal date-cell styles. Do not draw a custom circle.

- [ ] **Step 7: Run focused frontend tests**

Run: `npm test -- --run src/components/product/CreateVersionModal.test.tsx src/components/product/RequirementTasksView.contract.test.ts src/components/product/ProductLineWorkItemDefaults.test.tsx`

Expected: PASS.

### Task 4: Product documentation and end-to-end verification

**Files:**
- Modify: `docs/prd/V1.0.0.md`
- Modify: `.enterprise-app-factory/prd/V1.0.0/registry.json`

**Interfaces:**
- Consumes: implemented behavior from Tasks 1-3.
- Produces: validated requirement `1.1.41` and a local feature checkpoint.

- [ ] **Step 1: Update the numbered PRD requirement**

Add requirement `1.1.41` with the user-visible fields, default uniqueness rules, template contents, optional planned completion behavior, date picker feedback, errors, compatibility impact, and observable acceptance criteria. Do not include implementation paths, table names, API fields, or commands.

- [ ] **Step 2: Update registry and validate PRD**

Run from the plugin root:

```powershell
python scripts/manage_prd.py --project D:\project\manager_admin validate
```

Expected: validation succeeds.

- [ ] **Step 3: Run frontend verification**

Run: `npm run lint`

Run: `npm test`

Run: `npm run build`

Expected: all succeed.

- [ ] **Step 4: Run backend verification without polluting the checkpoint**

Run: `mvn test`

Expected: all tests succeed. Exclude all generated `backend/target/**` paths from review and checkpoint.

- [ ] **Step 5: Perform browser QA at 1920x1080**

Verify the exact webpage viewport, then inspect product-line creation, template switch states, work-item default tag and switch, main task creation without planned completion, and version DatePicker selected-date inner circle. Confirm no overlap and verify loading/error/disabled feedback.

- [ ] **Step 6: Create one local feature checkpoint**

Run `feature_checkpoint.py create` for requirement `1.1.41`, passing every changed source, migration, test, PRD, registry, spec, and plan path. Do not push.

