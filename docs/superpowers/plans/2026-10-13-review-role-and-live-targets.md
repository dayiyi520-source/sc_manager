# Review role and live targets Implementation Plan

**Goal:** Correct review creation state, use live monthly goals, count evidence, preserve universal backfill access, and separate employee/supervisor/boss templates.

**Architecture:** Derive review targets from the same persisted records as monthly goals. Reconcile refreshed targets with in-progress content. Select templates using organization root and reporting relationships; manager templates remain explicitly unconfigured until their product fields are defined.

**Tech Stack:** Existing React 19, TypeScript, Ant Design, Octicons, React Query and Vitest; no new dependencies.

**Spec:** User-confirmed five-point request on 2026-10-13 and requirement 1.1.33 in docs/prd/V1.0.0.md.

## Global Constraints
- Preserve unrelated working-tree changes and historical saved records.
- Use existing design tokens and Ant Design official default Empty.
- Reuse existing record API; do not invent role permissions or manager template fields.
- New/copy forms start pending; only saved records have draft/returned state.
- Validate cross-month weeks, refreshed/removed goals, failed evidence requests and duplicate submission.

## Tasks
- [x] Add regression tests for real personal A, role selection, editor states, refreshed titles/progress, evidence counts and universal backfill.
- [x] Implement monthly-record review projection and shared draft reconciliation; replace old upstream-KR projection in useOriginalOkr.
- [x] Bind weekly/monthly status to saved record state and add explicit manager weekly template gates; monthly entry remains available.
- [x] Count filtered evidence for both tabs; expand backfill discovery with configured months and owned historical records.
- [x] Update requirement 1.1.33 in place; run focused tests, typecheck, build and PRD validation.
- [ ] Create a local checkpoint only if validation passes and all selected paths belong to this feature. Existing PRD and main view contain unrelated user work.

## Validation record
- Focused review/target/role/evidence/history regression: 15 files, 115 tests passed; final editor recheck passed 17 tests including the additional stale-confirmation test (116 distinct cases covered across the runs).
- Final Typecheck and Vite production build passed; build retains existing bundle-size warnings.
- Verified browser viewport 1920×1080; employee new form shows pending, evidence tabs show real counts, boss uses an independent template boundary.
- PRD validation was already failing before implementation and still reports the same existing forbidden-phrase match and registry/document count mismatch.
- No feature checkpoint: PRD validation is blocked and shared main view/PRD contain unrelated ongoing changes; do not stage or commit those changes.
