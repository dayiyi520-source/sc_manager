# Supervisor KR selection style implementation plan

**Goal:** Select one product/project and multiple children in a scoped picker, then edit independent detail rows. Employee and weekly review flows remain unchanged.
**Architecture:** Reuse OkrKrDetail name/version as parent/child pairs and existing settings/catalog props. Add a bounded picker component and preserve retained row IDs, stages and dates. No API, dependency, or progress changes.
**Spec:** User request of 2026-10-14, PRD 1.1.33.3.

- [x] Add parent plus multi-child picker; reuse it to edit existing selections; empty catalogs, cancel and disabled states.
- [x] Integrate supervisor product/delivery forms; render identity columns read-only and independent editable stages/dates; allow removing newly added rows.
- [x] Verify pairs and retained metadata, multi-project multi-product and template switch behavior.
- [x] Update PRD in place; typecheck/build/tests and browser inspection at 1920x1080. Existing PRD registry validation failures prevent a checkpoint.

Follow-up seven UI adjustments: KR picker is a dropdown beside the add button; the empty table displays a locked placeholder; supervisor list hides duplicate execution action rows; alignment popover opens linked details; sidebar order and department filtering are restored; confirmation changes collapse by default; application review modal is above editor. Focused tests: 59/59 pass. Broad tests: 96/101 pass, five legacy assertions fail on historical labels/removed scope names. Typecheck/build pass. PRD validation retains its baseline forbidden-word and empty-registry errors. Temporary browser fixture was removed.
