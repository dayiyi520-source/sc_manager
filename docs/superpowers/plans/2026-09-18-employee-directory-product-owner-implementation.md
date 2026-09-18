# Employee Directory and Product Owner Identity Implementation Plan

> Implement the approved employee-directory, product-line owner identity, and iteration-form changes in small verified increments. Preserve unrelated generated output under `backend/target`.

**Goal:** Make Team Organization the persistent employee source, use stable user IDs for product-line responsibility assignments, and complete the requested iteration list, form copy, and date constraints.

**Architecture:** Keep `t_sys_user` as the tenant employee directory. Only Lin Zhihao retains credentials and the administrator role; directory-only employees have no username or password. Add a system-admin employee-management boundary, expose a read-only active-employee candidate boundary to product features, and migrate product-line relationships from names to user IDs while continuing to return resolved names for display.

**Stack:** React 19, TypeScript, Ant Design, React Query-compatible API services, Java 17, Spring Boot 3.5, JdbcTemplate, MySQL/Flyway, JUnit/MockMvc, Vitest/Testing Library.

---

## Task 1: Persist the Employee Directory

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260918.1__employee_directory_and_product_line_owner_ids.sql`
- Create: `backend/src/main/java/com/shichuang/manage/team/TeamMemberContract.java`
- Create: `backend/src/main/java/com/shichuang/manage/team/TeamMemberController.java`
- Create: `backend/src/main/java/com/shichuang/manage/team/TeamMemberService.java`
- Create: `backend/src/main/java/com/shichuang/manage/team/TeamMemberMapper.java`
- Create: `backend/src/test/java/com/shichuang/manage/team/TeamMemberControllerIntegrationTest.java`
- Modify: `backend/src/main/java/com/shichuang/manage/auth/AuthMapper.java`

1. Add failing integration tests for administrator-only list/create/update/disable, accountless creation, approved-department validation, optimistic concurrency, tenant isolation, and protection against disabling Lin Zhihao.
2. Add the migration that permits accountless directory users, persists phone/email, normalizes local users and departments, removes non-admin login capability, revokes non-admin sessions, and adds product-line responsibility user-ID columns with safe unique-name backfill.
3. Implement stable DTO records, tenant-scoped mapper queries, service validation, and OpenAPI controller endpoints.
4. Restrict development account lookup to records with a real username.
5. Run the focused backend integration test.

## Task 2: Enforce Product-Line User Identity

**Files:**
- Modify: `backend/src/main/java/com/shichuang/manage/product/ProductLineController.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/ProductLineService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/ProductLineMapper.java`
- Modify: `backend/src/test/java/com/shichuang/manage/product/ProductLineControllerIntegrationTest.java`

1. Replace name-based test payloads with user IDs and add failing cases for inactive users, automatic owner membership, member-only key owners, and removing assigned owners.
2. Return resolved owner IDs and names by joining the tenant user directory.
3. Validate primary owner activity and key-owner membership transactionally.
4. Require `userId` for product-line member additions and resolve member names server-side.
5. Prevent removal or disabling paths from leaving active responsibility assignments invalid.
6. Run product-line and version-date backend tests.

## Task 3: Connect Team Organization to Real Data

**Files:**
- Create: `src/services/teamRepository.ts`
- Modify: `src/types/index.ts`
- Rewrite: `src/components/team/TeamOrgView.tsx`
- Create: `src/components/team/TeamOrgView.test.tsx`

1. Add failing frontend tests for loading, persisted rows, approved departments, add/edit requests, disable confirmation, error/retry, and actual department counts.
2. Implement typed API operations and an employee model with version/status fields.
3. Replace local seed arrays with backend data and preserve the existing work-focused visual language.
4. Implement normal, hover/focus, saving/loading, disabled/error, and empty states without fabricated fallbacks.
5. Run the focused Team Organization test.

## Task 4: Use the Directory Across Product-Line Workflows

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/services/productRepository.ts`
- Modify: `src/context/AppContext.tsx`
- Modify: `src/components/product/ProductLinesView.tsx`
- Modify: `src/components/product/ProductLineDetailView.tsx`
- Modify: `src/components/product/ManageMembersModal.tsx`
- Add or modify focused tests under `src/components/product/`

1. Add failing tests that assert user-ID payloads and reject name-only relationships.
2. Load active employee candidates through the API layer.
3. Make product-line owner creation a required single user-ID selection.
4. Make member additions select employee IDs from Team Organization.
5. Limit the three key-owner selectors to current product-line members and submit their user IDs.
6. Preserve resolved display names and provide clear unresolved-history feedback.
7. Run focused product-line frontend tests.

## Task 5: Complete Iteration List and Form Behavior

**Files:**
- Modify: `src/components/product/VersionIterationView.tsx`
- Modify: `src/components/product/CreateVersionModal.tsx`
- Modify: `src/components/product/VersionIterationView.test.tsx`
- Create: `src/components/product/CreateVersionModal.test.tsx`
- Modify: `backend/src/test/java/com/shichuang/manage/product/ProductVersionDatesTest.java`

1. Add failing tests for the product-line column position, required product-line state, exact release-note placeholder, disabled end dates, same-day validity, and clearing an invalid existing end date.
2. Insert the product-line column immediately after the date range with stable truncation.
3. Render an explicit required product-line field in create mode.
4. Add the approved multiline placeholder in create and edit modes.
5. Link date pickers with `disabledDate` and clear invalid end dates with user feedback while retaining backend validation.
6. Run focused iteration tests.

## Task 6: Update Product Requirements

**Files:**
- Modify: `docs/prd/V1.0.0.md`
- Modify through the PRD workflow: `.enterprise-app-factory/prd/V1.0.0/registry.json` only if the tool requires registry metadata changes.

1. Update the existing product-line and organization requirement sections in place.
2. Describe roles, preconditions, employee-directory scope, field changes, flows, feedback, validation, exceptions, compatibility impact, and observable acceptance without technical implementation details.
3. Validate the PRD with the project PRD tool.

## Task 7: Full Verification and Local Checkpoint

1. Check managed local-service status before starting or restarting services.
2. Run focused then full backend tests and package verification.
3. Run focused then full frontend tests, typecheck/lint, and production build.
4. Start or reuse MySQL, backend, and frontend through the project service manager.
5. Verify at a `1920x1080` webpage viewport: Team Organization persistence, owner/member selectors, key-owner scoping, iteration column, placeholder, and linked dates.
6. Inspect the final diff for secrets, debug logs, unrelated files, and generated output.
7. Create the required local feature checkpoint with every changed source, migration, test, PRD, spec, and plan path. Do not push.
