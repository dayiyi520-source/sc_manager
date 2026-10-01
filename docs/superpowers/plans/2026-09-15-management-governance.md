# Management Governance Implementation Plan

> **For agentic workers:** Execute tasks in order and verify each task before continuing.

**Goal:** Move task APIs to Service/Mapper boundaries, standardize pagination, centralize AIEDIT theme tokens, and load heavy editor/chart dependencies by route.

**Architecture:** Controllers become HTTP-only adapters. Services own validation, authorization, transactions, and `PageResult`; mappers own tenant-scoped SQL. Frontend theme tokens are defined once and consumed by Ant Design and Tailwind, while route-level lazy imports keep TinyMCE, Recharts, and related code out of the initial bundle.

**Tech Stack:** Java 17, Spring Boot 3.5, JdbcTemplate/MyBatis conventions, React 19, Ant Design 6, TanStack Query, Vite, Tailwind CSS.

**Spec:** `docs/AIEDIT_UI_DESIGN_SPECIFICATION.md` and `docs/management-backend-development-spec.md`

## Global Constraints

- Preserve existing routes and response compatibility except for adding pagination metadata.
- Every query and mutation must enforce tenant scope and server-side authorization.
- Remote empty results remain empty; local demo data is only used in explicit local mode.
- Do not add `lucide-react`, hard-code new colors, or expose secrets.

---

### Task 1: Task Service and Mapper Boundary

**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/product/TaskAliasService.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/TaskAliasMapper.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/DesignTaskService.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/BusinessTaskService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/TaskAliasController.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/DesignTaskController.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/BusinessTaskController.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/TaskApiIntegrationTest.java`

**Interfaces:** Services expose `PageResult<Map<String,Object>> list(String type,int page,int pageSize,...)`, detail, create, and update methods; controllers call only these methods.

- [x] Extract each controller SQL statement into tenant-scoped mapper methods.
- [x] Add service validation, `AuthorizationService.requireRead/requireWrite`, optimistic version handling, and transaction boundaries.
- [x] Keep route paths and JSON field names unchanged.
- [ ] Add integration coverage for tenant isolation, unauthorized writes, missing records, and stale versions.

### Task 2: Unified Pagination

**Files:**
- Modify: task services/controllers and `backend/src/main/java/com/shichuang/manage/product/RequirementService.java`
- Modify: `src/services/productRepository.ts`, `src/services/requirementRepository.ts`
- Modify: task list views under `src/components/product/`
- Test: repository and integration pagination tests

- [x] Normalize `page >= 1`, `1 <= pageSize <= 100`, and return `PageResult` for requirement, design, bug, dev, and business task lists.
- [ ] Add count queries with identical tenant/filter predicates.
- [ ] Pass pagination parameters from repositories and reset page when filters change.
- [ ] Render loading, empty, error, and retry states without local-data substitution.

### Task 3: AIEDIT Theme Token Integration

**Files:**
- Create: `src/theme/tokens.ts`
- Modify: `src/main.tsx`, `src/index.css`, `src/styles/antd-override.css`
- Modify/Create: `tailwind.config.js` or `@theme` token entry used by the current Tailwind setup
- Test: `src/theme-contract.test.ts`

- [x] Define semantic surface, text, border, brand, and status tokens in one typed object.
- [x] Map tokens through Ant Design `ConfigProvider` dark/light algorithms and component tokens.
- [x] Map the same values to Tailwind theme variables and replace new hard-coded colors.
- [ ] Verify button, input, table, modal, disabled, hover, and error states in both themes.

### Task 4: Route-Level Dependency Splitting

**Files:**
- Modify: `src/main.tsx` and route definitions
- Modify: components importing TinyMCE, Recharts, marked, or large editor helpers
- Modify: `vite.config.ts` if manual chunks are needed
- Test: build output and route smoke tests

- [x] Replace eager imports with `React.lazy`/dynamic imports for editor, chart, and rich-text routes.
- [ ] Add route-level loading and error boundaries with retry.
- [ ] Ensure editor/chart components are not imported by the application shell.
- [ ] Run production build and inspect generated chunks for separation.

### Task 5: Verification and PRD Update

**Files:**
- Modify: `docs/prd/V1.0.0.md`

- [x] Run Maven compile and relevant integration tests.
- [x] Run frontend typecheck, build, and Vitest.
- [x] Run `git diff --check`.
- [x] Update the matching PRD acceptance rows for service boundaries, pagination, tokens, and route loading.
