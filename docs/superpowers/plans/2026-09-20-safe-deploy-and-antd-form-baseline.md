# Safe Deployment And Ant Design Form Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute these tasks inline in order. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve server business data during normal releases, repair the known Flyway checksum mismatch once, and restore Ant Design-owned form states across the product, workbench, OKR, and assistance workspaces.

**Architecture:** The deployment script has a safe default path that uploads only frontend and backend artifacts and lets Flyway migrate the existing database. Full database replacement remains available only through an explicit `--replace-database` flag. Global CSS continues to style native legacy fields while excluding Ant Design controls and their internal input elements; component states come from `ConfigProvider` tokens.

**Tech Stack:** Bash, Spring Boot 3.5, Flyway, MySQL, React 19, Ant Design 5, Vitest.

**Spec:** User-approved in-chat design and `docs/prd/V1.0.0.md` requirement 1.1.

## Global Constraints

- Normal deployment must not drop, recreate, or import the server database.
- Database replacement requires the exact `--replace-database` flag and a pre-switch backup.
- Never print or commit credentials from `.enterprise-app-factory/secrets/runtime.env`.
- Applied Flyway migration files remain immutable after this repair; later schema changes use new versioned migrations.
- Ant Design controls own hover, focus, disabled, error, and placeholder states.
- Native legacy controls retain the existing token-based compatibility baseline.

---

### Task 1: Publish The Current Git Baseline

**Files:** None.

**Interfaces:**
- Consumes: local `shichuang-admin` and remote `github/shichuang-admin`.
- Produces: a common GitHub baseline containing the 8 verified local commits.

- [x] Fetch `github/shichuang-admin` and verify the local branch is not behind.
- [x] Push `HEAD:shichuang-admin` to the `github` remote.
- [x] Verify local and remote commit IDs match.

### Task 2: Make Code-Only Deployment The Default

**Files:**
- Modify: `scripts/deploy-production.sh`
- Modify: `docs/deployment/production.md`
- Modify: `docs/prd/V1.0.0.md`
- Modify: `.enterprise-app-factory/prd/V1.0.0/registry.json`
- Create: `scripts/tests/deploy-production-contract.ps1`

**Interfaces:**
- Consumes: optional CLI argument `--replace-database`.
- Produces: default application-only release and explicit full database replacement mode.

- [x] Add a contract test that fails while the default path still requires source database variables or uploads `database.sql.gz`.
- [x] Parse only `--replace-database`; reject all unknown arguments.
- [x] Require Docker, gzip, and source database variables only in replacement mode.
- [x] Upload and require `database.sql.gz` only in replacement mode.
- [x] Always back up the remote database, but only drop/import it in replacement mode.
- [x] Document default deployment, explicit replacement, rollback, and data preservation acceptance.
- [ ] Run the deployment contract test and PRD validator.
- [ ] Commit the deployment safety change.

### Task 3: Repair And Verify The Test Server

**Files:** No secret-bearing files are changed.

**Interfaces:**
- Consumes: the server environment at `/opt/manage-admin/backend/.env`.
- Produces: a validated Flyway history and a code-only release on `103.236.98.125`.

- [ ] Run deployment preparation and remote database preflight.
- [ ] Verify `V1.0.26` still has checksum `2000797143` and the retired legacy tables are absent.
- [ ] Update only that successful history row to checksum `-1182548249` and verify exactly one row changed.
- [ ] Record table and selected business-row counts before deployment.
- [ ] Run the canonical deployment script without `--replace-database`.
- [ ] Verify health, public routes, Flyway `20260920.1`, and unchanged pre-existing business-row counts.
- [ ] Update the deployment runbook with the verified date and release evidence.
- [ ] Commit and push the verified runbook.

### Task 4: Restore Ant Design Form Ownership

**Files:**
- Modify: `src/index.css`
- Modify: `src/main.tsx`
- Modify: `src/styles/antd-override.css`
- Modify: `src/theme-contract.test.ts`
- Modify: `docs/prd/V1.0.0.md`
- Modify: `.enterprise-app-factory/prd/V1.0.0/registry.json`

**Interfaces:**
- Consumes: AIEDIT design tokens and Ant Design component tokens.
- Produces: consistent native-control compatibility and Ant Design-owned component states.

- [ ] Add failing contract assertions that global native selectors exclude `.ant-input` and Ant internal inputs.
- [ ] Narrow light and global native selectors without removing legacy control styling.
- [ ] Configure Input component hover, active, error, and disabled tokens in `ConfigProvider`.
- [ ] Remove redundant Ant Input state overrides while retaining intentional dimensions.
- [ ] Run focused theme tests, TypeScript validation, and production build.
- [ ] Validate the PRD and commit the UI baseline change.

### Task 5: Browser Regression And Final Publish

**Files:** Only defect fixes discovered by regression may be added to Task 4 files.

**Interfaces:**
- Consumes: local frontend `3011` and backend `8080`.
- Produces: verified 1920x1080 behavior and a synchronized GitHub branch.

- [ ] Set and verify the browser viewport at exactly 1920x1080.
- [ ] Check product management, My Work, OKR/performance, and assistance fields in normal, hover/focus, disabled, and error states.
- [ ] Confirm no text overlap, clipped focus ring, or double border.
- [ ] Push the final commits to `github/shichuang-admin` and verify zero commit divergence.
