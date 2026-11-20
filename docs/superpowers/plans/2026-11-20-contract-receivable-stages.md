# Contract Receivable Stages Implementation Plan

**Goal:** Create one receivable plan per contract, display its contractual payment stages, and allocate each actual receipt to one or more stages.

**Architecture:** Snapshot contract stage terms into the local receivable plan when it is created. Store receipt allocations by stage on each receipt record, derive plan totals and completion from those allocations, and preserve the existing single-amount flow for non-contract receivables and legacy records.

**Tech Stack:** React 19, TypeScript, Ant Design, Vitest, browser local storage.

**Spec:** User-confirmed conversation requirements on November 20, 2026.

## Global Constraints

- Preserve the pure-frontend mock and browser-storage boundary.
- Keep non-contract receivable flows working.
- Keep old stored plans and receipt records readable without inventing stage allocations.
- Keep UI values on existing design tokens and the project form patterns.
- Update the matching project PRD requirement and run related checks.

---

### Task 1: Model and tests

**Files:** src/types/index.ts, src/components/comprehensive/FinanceManagementVisual.test.tsx

- [x] Add optional contractual stage snapshots to receivable plans and optional stage allocations to actual receipt records.
- [x] Test one plan stores all contract stages and total amount, without requiring a selected stage.
- [x] Test a single receipt can split money across multiple stages, partial receipts are supported, and over-allocation is rejected by per-stage input limits and validation.
- [x] Keep and verify the existing non-contract receivable test.

### Task 2: Receivable workflow UI

**Files:** src/components/comprehensive/PaymentCollectionManagementView.tsx

- [x] Replace the contract-stage selector with contract-derived project/customer and read-only stage summary.
- [x] Add plan detail view listing stage conditions, percentages, amounts, due dates and received balances.
- [x] Add stage allocation inputs to actual-receipt entry; persist allocations and derive overall plan status.
- [x] Preserve aggregate receipt entry for older plans without stage snapshots and other receivable types.

### Task 3: PRD and verification

**Files:** docs/prd/V1.0.0.md

- [x] Update project cash-management behavior and acceptance criteria in place.
- [x] Run targeted finance tests, TypeScript check, and production build.
