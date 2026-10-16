# Monthly Progress Implementation Plan

**Goal:** Expose objective history and show monthly trend and department hour comparisons.

**Architecture:** Reuse the existing modal and callback. Share a compact overview, keep weighted calculations in a focused helper, and persist trend and metrics snapshots inside the existing review payload.

**Tech Stack:** React 19, TypeScript, existing Ant Design and Octicons, Vitest.

**Spec:** Approved conversation on 2026-10-16 and the matching numbered requirements in `docs/prd/V1.0.0.md`.

## Constraints
- Preserve user changes and existing theme; no new production dependencies.
- One-line ellipsis title; no explanatory trend labels; monthly point is hollow/dashed.
- Actual submitted weekly records only; no arbitrary three-week limit or missing-point zero fills.
- Use existing hierarchical weights. Missing overtime remains unavailable, never inferred.
- Preserve submitted review snapshots and existing visibility permissions.

## Tasks
- [x] Inspect model, project rules, styling and tests; synchronize configuration.
- [x] Wire list O progress to scoped history, add single-line secondary title, test callback and scope.
- [x] Add weighted trend helper, shared overview and monthly snapshot; wire personal/department editor and read-only displays.
- [x] Add authorized department evidence comparison, count zero-hour members and reject partial averages.
- [x] Update matching product rules without overwriting earlier PRD changes.
- [x] Verify unit/integration tests, typecheck/build and visual layout; document pre-existing validation blockers.

## Verification
- Run focused history, month, weekly integration and service tests.
- Run TypeScript and Vite production build.
- Validate PRD; distinguish pre-existing registry/document issues from introduced text.
- Check existing service registry before any preview, use 1920x1080 viewport.
- No checkpoint while touched files contain unrelated user changes or verification is blocked.

## Verification results
- Focused tests: 76 passed, 0 failed (8 files).
- Expanded regression: 24 passed, 8 failed. Isolated pre-change source comparison reproduced the same 8 failures (historical copy/backfill and supervisor tests).
- Production build passed with existing chunk-size warning.
- PRD validation remains blocked by existing prohibited wording and an empty requirement registry; both existed before this change.
- Browser: 1920x1080 verified; actual O history click and title styling inspected; monthly normal/loading/error presentation inspected on an explicit test-data-only component page.
- No business test data was saved. Existing unrelated working changes remain untouched.
- Temporary preview/baseline cleanup was rejected by command policy; task-prefixed temporary files remain in .tools and are not part of the product implementation.
- No local checkpoint: shared touched PRD has unrelated existing user changes and repository-wide validation is not clean.
- Final source-only TypeScript check passed (exit 0), covering src, Vite configuration and scripts; temporary baseline copies excluded.
