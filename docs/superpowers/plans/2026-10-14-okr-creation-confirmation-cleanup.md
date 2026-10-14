# OKR creation and confirmation cleanup implementation plan

**Goal:** Keep review flow on the list, make confirmation panels readable, remove objective-copy feature, and split a supervisor's own personal versus department creation.
**Architecture:** Preserve owner ID while adding an explicit creation level to the form and lifecycle validation. Use scope-specific add entry points and the existing objective persistence. Remove only objective-copy code, not review-copy code.
**Tech Stack:** React, Ant Design, TypeScript, Vitest, existing mock OKR repository.
**Spec:** User-approved eight changes, 2026-10-14.

- [x] Implement supervisor self-personal/department creation with correct owner, level and scope return; test access and persistence.
- [x] Return to list after personal review submit; move pending badge and metrics layout; separate change card and objective card.
- [x] Remove A1 in difference UI, company KR alignment trailing icons and personal action delete button.
- [x] Remove objective-copy entry points, dialog and dedicated code/tests, preserving review copy.
- [x] Update PRD and run focused tests/typecheck/build; no checkpoint when PRD validation or mixed ownership fails.

Verification: focused tests passed; TypeScript and production build passed. PRD validator blocked by existing technical wording and registry count mismatch. Two legacy edit tests still expect the removed A1 action input. No checkpoint created due to mixed ownership and PRD validation failure.

Final session verification: dependency runtime recovered; 162 relevant tests passed, TypeScript and production build passed. Legacy detail tests now follow the menu entry and the legacy title input is preserved. Browser component layout verified at 1920x1080. PRD baseline technical wording and registry count issues remain.
