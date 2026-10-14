# Monthly goal entries and title import

User scope: five UI adjustments approved by the explicit change request.

- [x] Remove standalone full-goal template entry, components, API wrapper and Mock route; preserve department O/KR settings.
- [x] Full-width centered list add entry and 56px card add rail stretching with neighboring cards.
- [x] Open goal detail only through the more menu; preserve read-only access and existing edit/delete permissions.
- [x] Remove personal action weight summary and display assigned KR weight/deadline as inherited read-only fields.
- [x] Department-filtered enabled O title import in the O input row, with empty/loading/disabled/incompatible handling.
- [x] Update PRD and relevant test expectations.

Validation: TypeScript passed. Initial component suite had 58 passing and two outdated assertions, now updated. Final component tests/build blocked by absent React JSX runtime files in the existing dependency installation. Offline frozen-lockfile restore did not repair them. Domain tests passed (13). PRD validator retains the existing technical wording/registry-count failures. Browser layout verification and final full test rerun remain required after dependency repair. No checkpoint due to failed verification and mixed changes.

Final session verification: dependency runtime recovered; 162 relevant tests passed, TypeScript and production build passed. Legacy detail tests now follow the menu entry and the legacy title input is preserved. Browser component layout verified at 1920x1080. PRD baseline technical wording and registry count issues remain.
