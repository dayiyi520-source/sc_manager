# Department objective templates implementation plan

Goal: One editable O template owns department, title, guidance, enabled state and supported KR types.
Architecture: Reuse settings persistence; migrate legacy department type assignments only when a title lacks KR types. Keep legacy settings for compatibility. Objective drafts store template identity and type snapshot so edited titles and historical objectives retain the relationship.

- [x] Add template contract, legacy normalization, fixed product stages and validation tests.
- [x] Replace two configuration cards with department filtered table and a single editor drawer; validate before applying a row, preserve failed-save drafts.
- [x] Bind objective KR choices to selected O template; keep existing KR content on incompatible switches, preserve delivery data integration.
- [x] Update matching PRD section and run focused tests, typecheck and build.

## Batch modal follow-up
- [x] Replace drawer with a department scoped, editable O/KR row table in a modal; support add/remove and multiselect KR.
- [x] Submit each batch and confirmed deletion directly through the existing settings repository; remove the OKR template tab save button only.
- [x] Verify batch validation, failed-save retention, duplicate submission lock, deletion, existing settings isolation and persistence.
