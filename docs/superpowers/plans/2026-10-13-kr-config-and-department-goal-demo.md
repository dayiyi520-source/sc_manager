# KR multi-select configuration and department goal demo

**Scope:** One department configuration can select several KR types; each type retains independent stages/types. Add department goal template demonstration below KR templates, without goal-creation integration.
**Contracts:** UI groups existing flat OkrTemplate records by department set, saves the same records per selected type. No backend contract or dependency changes. Preserve saved entries if department directory mismatches, and retain explicit empty values for validation.

- [x] Group template rows into department + multi-select type controls, bind per-type values to form state and preserve legacy data.
- [x] Test save/reload with all three types and department mapping; keep duplicate-type validation.
- [x] Add local demo with department, template title, 4 O examples, ordering, required flag, weight, allowed KR types and preview. No API calls from demo.
- [x] Update PRD, run focused tests, typecheck/build, inspect browser at 1920×1080 and remove temporary QA harness. Shared changes and existing PRD failures preclude checkpoint.

Validation: 23 tests passed, including grouped save/remount and API persistence reads for all three types. Typecheck passed. Actual app at 1920×1080 displayed saved stages on refresh and department demo save/preview. Existing PRD validator wording and empty-registry errors remain; no checkpoint because checks and ownership constraints preclude it. No business goal data or production deployment changes.
