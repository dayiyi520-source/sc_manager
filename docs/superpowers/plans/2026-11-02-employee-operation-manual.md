# Employee Operation Manual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a code-verified Chinese operation manual for the seven requested business areas and common user questions.

**Architecture:** Deliver one Markdown handbook under `docs/user-guides/`. Organize around real employee workflows, citing current menu labels, entry points, actions, validation, statuses, and permission boundaries; keep implementation details and unsupported promises out of the user-facing guide.

**Tech Stack:** Markdown documentation; React/TypeScript application source as the behavior reference.

**Spec:** User-approved scope in the conversation dated 2026-11-02.

## Global Constraints

- Preserve unrelated local changes, especially `src/data/mockOkrState.json`.
- Describe only behavior verified in current project code.
- Keep the guide concise enough to scan, with procedures and practical FAQs.
- Do not modify application code or dependencies.

---

### Task 1: Verify employee workflows

**Files:** Read current workbench, OKR, review, collaboration, product line, iteration, and task/work-item views.

- [x] Verify navigation names and main workflow/status boundaries from current code.
- [x] Record relevant roles, required fields, and common validation failures.

### Task 2: Write employee handbook

**Files:** Create `docs/user-guides/员工操作手册.md`.

- [x] Add orientation and navigation notes, the seven requested chapters, and common questions.
- [x] Explain steps in user-facing language; distinguish permissions and state-dependent actions.

### Task 3: Review handbook

**Files:** `docs/user-guides/员工操作手册.md`.

- [x] Cross-check each procedural claim against source.
- [x] Check headings, Markdown links, terminology, and spelling; code tests are not applicable to this documentation-only change.
