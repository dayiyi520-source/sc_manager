# Collaboration Owner and Task Menu Implementation Plan

**Goal:** Preserve the current collaboration owner on return and completion, remove the completion-owner display, and expose development/testing creation from the related-task menu.

**Architecture:** Keep existing collaboration state transitions and creation-context components. Update the local workflow adapter so return/completion do not mutate the current owner; route the new menu entries through the existing `RequirementTasksView` with the source collaboration context. Update the V1.0.0 behavior rules in place.

**Tech Stack:** React, TypeScript, existing Ant Design components, Vitest.

**Spec:** Caller request and clarification on 2026-10-16; V1.0.0 PRD requirements 1.1.12, 1.2.34 and 1.2.45.

## Tasks
- [ ] Add regression tests for return and completion owner preservation, completion modal, and embedded development/testing creation.
- [ ] Update collaboration transition mock, completion form, and related-task menu routing.
- [ ] Update V1.0.0 requirements in place and run PRD validation.
- [ ] Run focused tests, source typecheck, build and diff checks.
