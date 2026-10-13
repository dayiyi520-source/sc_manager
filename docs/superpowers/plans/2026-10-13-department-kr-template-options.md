# Department scope and multiple KR types implementation plan

**Goal:** Exclude current organization department from other-department scopes and enable per-KR selection of department-configured types.
**Spec:** User 2026-10-13 requirements 1 and 2; item 3 asks for advice only.
**Constraints:** Existing React/Ant Design, tokens, product/version data and API layer. Keep goal O templates separate from KR structures. Do not modify parallel review changes.

- [x] Use organization department consistently in navigation and main scope, including whitespace normalization and department/member sub-selection isolation.
- [x] Replace one-template-per-department validation with one-per-department-and-type; preserve legacy type configuration without hiding other applicable types.
- [x] Place KR template select before business object fields, constrain options, default/disable single option, preserve weight/assignees/A on switching and clear incompatible fields.
- [x] Test settings save, multi-type authoring, single type default, cross-department isolation and scope exclusion; update PRD.
- [x] Run typecheck, related tests, build and browser 1920×1080 verification; provide O-template configuration recommendation based on current template center.

Verification: 43 template/navigation tests and 5 department workspace cases passed; typecheck and build passed. 1920×1080 browser confirmed selector order, template switching and 12px muted subgroups. Existing PRD validator failures (字段类型 wording and empty registry count) remain; no checkpoint due mixed shared changes and failed PRD validation. Temporary QA harness removed.
