# OKR authoring and submission consistency Implementation Plan

**Goal:** Complete the seven requested OKR corrections while preserving existing roles, persistence and approval behavior.

**Architecture:** Reuse the existing forms, monthly targets and detail drawer. Share personal presentation and source matching; add a focused submission weight dialog and pass confirmed weights through existing save and submit operations.

**Tech Stack:** Existing React, TypeScript, Ant Design, Octicons and Vitest.

**Spec:** docs/prd/V1.0.0.md, existing OKR requirement 1.1.33; user request dated 2026-10-13.

## Constraints
- Existing design tokens, components, API contracts and mock persistence remain authoritative.
- Personal assigned targets display the inherited primary KR, its detail rows and only the owner's execution actions.
- Source links match both parent objective and KR plus the actual direct reporting relationship.
- Confirm supervisor O or personal primary KR weights before batch submission; final weight is the remaining percentage and read-only.
- Cancel and persistence failures preserve content. Invalid totals, missing sources and long text have explicit feedback.

## Tasks
- [x] Correct copy and align source text with the title; test assigned and autonomous forms.
- [x] Share personal presentation between list and detail; fix source identity and downstream indicators; test draft and submitted records.
- [x] Unify list metric columns and centered progress rendering; inspect at 1920×1080.
- [x] Implement weight confirmation and integrate new-form and saved-draft submission; test remainder, invalid inputs, cancellation and failure retention.
- [x] Update matching PRD requirement; run PRD validator, focused tests, typecheck and build; inspect browser behavior.
- [ ] Create local feature checkpoint after PRD validation passes. Blocked by pre-existing PRD issues: registry has no modules despite 11 document requirement headings; validator rejects existing business phrase 字段类型. Baseline comparison confirms this task introduces neither issue.
