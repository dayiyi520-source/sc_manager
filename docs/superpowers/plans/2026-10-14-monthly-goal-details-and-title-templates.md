# Monthly goal details and title templates Implementation Plan

**Goal:** Support multiple product versions/projects per supervisor KR, combine KR and individual O title configuration, remove visible A numbering.
**Architecture:** Keep existing React forms and settings API; store optional department objective title templates in OkrSettings. Product detail rows identify a product/version pair; delivery rows retain project/product pairing. Preserve historical records. Employee detail selection and automatic completion remain a proposal pending business decisions.
**Tech Stack:** Existing React, TypeScript, Ant Design, Vitest; no dependency changes.
**Spec:** User adjustments of 2026-10-14 and PRD requirement 1.1.33.

## Global Constraints
- Existing design tokens, Octicons and official Ant Design Empty.
- No production deployment, new service, or secret output.
- Retain KR and O numbering; remove only visible A numbering.

## Tasks
- [x] Extend product detail editing with add/remove version rows, pair validation, legacy compatibility, and focused tests.
- [x] Replace department multi-O demo with individual title configuration in combined settings; persist and select titles in supervisor forms.
- [x] Remove visible A numbering from creation, list and detail; verify layout.
- [x] Update numbered PRD section; run focused tests, typecheck/build and PRD validation; checkpoint only if all relevant checks pass.

Validation: 155/161 regression tests pass; all six remaining failures also reproduce with HEAD's original main component and test. Dedicated feature suites pass. Typecheck and production build pass (existing large-chunk warnings). PRD validation retains baseline banned-word and empty-registry count errors; no checkpoint created because required validation is not fully green. Browser checked combined settings and O title editing at verified 1920x1080; temporary browser inputs were discarded. Settings persistence is verified against the existing local mock API, not an external production service. Employee detail selection and completion aggregation are not implemented in this scope.

Generic KR verification: department content/result can be submitted without a business object or detail rows; blank results are rejected.
