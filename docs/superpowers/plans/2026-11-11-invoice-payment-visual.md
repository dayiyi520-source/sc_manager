# Invoice And Payment Visual Alignment Implementation Plan

> **For agentic workers:** Execute each task locally, preserving unrelated work in the shared tree.

**Goal:** Make all invoice and payment list and entry surfaces visually consistent with the project's theme.

**Architecture:** Two page components share a narrowly scoped CSS surface. Existing business state and handlers stay in place; only UI classes, empty representations, and supporting accessibility are changed.

**Tech Stack:** React, TypeScript, Tailwind, Ant Design, Octicons, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-11-invoice-payment-visual-design.md`

## Tasks

- [x] Add representative tests for tabs, empty tables, tax-card hierarchy, dialogs, and existing submission flows.
- [x] Replace hardcoded colors with scoped theme-token classes across invoice views and dialogs.
- [x] Apply the same list, tabs, buttons, and form states to payment views and dialogs.
- [x] Update the matching PRD section; run focused tests, typecheck, build, and 1920x1080 browser checks. PRD validation remains blocked by existing banned wording and empty registry.
