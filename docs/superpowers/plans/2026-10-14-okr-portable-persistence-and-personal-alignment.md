# Goal card and portable Mock delivery

User-approved scope: restore card width, show personal action, supervisor self-personal alignment to department goals, persist goals/reviews, clear Lin Zhihao historical reviews, and commit this session.

- [x] Restore original grid column widths with the 56px add rail.
- [x] Display assigned/autonomous personal actions in card view.
- [x] Share department alignment scope across selector and persistence validation.
- [x] Persist all goal/review mutations and settings to the committed Mock state, with atomic writes and revision conflicts.
- [x] Migrate existing local records/template settings, clear only legacy boss reviews, and retain new file-backed reviews.
- [x] Verify fresh-browser restoration, rollback, conflict protection, roles and UI in 1920x1080.
- [x] Update in-place PRD rules and stage only session-owned paths for a local commit.

Portable data: src/data/mockOkrState.json. Development and Vite preview expose a local same-origin Mock endpoint. Static hosting requires that endpoint to persist writes; copying/synchronizing the current data file is required between separate computers. No production deployment or remote push is requested.
