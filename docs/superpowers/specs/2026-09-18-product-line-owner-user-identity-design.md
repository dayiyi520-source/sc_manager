# Product Line Owner Identity and Iteration Fields Design

Date: 2026-09-18
Status: Approved for implementation

## 1. Scope

This change makes product-line responsibility assignments use stable user identities, constrains the three key responsibility assignments to product-line members, and completes the requested iteration-list and version-form adjustments.

The existing Team Organization page is not part of this change. It currently uses component-local demonstration data and does not provide a persistent organization directory. The authoritative user source for this work is `t_sys_user` within the current tenant.

## 2. Product Decisions

- A product line has exactly one primary owner.
- The primary owner is required and can be selected from all enabled, non-deleted users in the current tenant.
- Product, technical, and test responsibility assignments are independent single-select fields.
- The three key responsibility assignments are optional until configured, but every selected person must be an active member of that product line.
- User IDs are the source of truth. Names are display values and must not be used for identity, authorization, uniqueness, or relationship validation.
- Creating a product line automatically adds its primary owner as an administrator member.
- Changing the primary owner automatically adds the new owner as an administrator member when needed. The previous owner remains a member until explicitly removed.
- A member assigned as the primary owner or any key owner cannot be removed until the responsibility is reassigned or cleared.

## 3. Data Model and Migration

Add four nullable user identity columns to the product-line table:

- primary owner user ID
- product/requirement owner user ID
- technical owner user ID
- test owner user ID

The primary owner is required for all newly created product lines. Existing rows may temporarily remain unresolved after migration when a safe match is impossible.

Backfill each identity only when the legacy name resolves to exactly one enabled, non-deleted user in the same tenant. Duplicate names, disabled users, deleted users, tenant mismatches, and missing users must remain unresolved instead of selecting an arbitrary account.

Legacy name columns remain temporarily for deployment compatibility and unresolved-record display fallback. New writes, membership checks, and responsibility validation use user IDs. API responses resolve the current display name from the user table, with an explicit unresolved display state when no valid user is linked.

Product-line members continue to store `user_id_` as their identity. New member writes require a valid same-tenant user ID; name-only member creation is no longer accepted by the product-line workflow.

## 4. API Contract

Provide a permission-protected product-domain user-candidate query that returns enabled users for the current tenant. Each option includes only the fields needed by selectors: user ID, name, department, account name, and role title.

Product-line create and update requests use:

- `ownerUserId`
- `requirementOwnerUserId`
- `techOwnerUserId`
- `testOwnerUserId`

Product-line responses expose those IDs plus the corresponding resolved display names for existing screens. Member responses expose member record ID, user ID, name, and product-line role.

The backend validates tenant, active status, soft deletion, product write permission, and product-line membership. A stale frontend candidate list cannot bypass these checks.

Version creation continues to use the selected product-line ID as its parent identity. Both frontend and backend reject a missing or inaccessible product line.

## 5. User Experience

### Product-Line Creation

The primary-owner selector loads the current tenant's effective users. It remains single-select and required. Options show the person's name with account or department context so duplicate names can be distinguished.

Loading, empty, error, and disabled states are explicit. The save action is unavailable while the user directory cannot be validated.

### Key Responsibility Configuration

The product, technical, and test owner selectors only list active product-line members with a valid user ID. Each selector remains single-select. If historical data cannot be resolved, the form displays that the assignment must be selected again instead of silently binding by name.

### Iteration List and Form

The iteration list adds an `所属产品线` column immediately after `起止时间`. Long names truncate in the cell and remain available through the native title tooltip.

The create-version form visibly marks the product line as required and blocks submission without it. Edit mode keeps the existing product line unchanged.

The create and edit forms use the approved multiline Markdown release-note example as the placeholder for `版本内容 / 发版说明范围`.

## 6. Failure and Concurrency Rules

- If the effective-user query fails, selectors show an error state and prevent an unvalidated save.
- If a user becomes disabled or deleted after options load, the backend rejects the submission without changing the product line.
- If a member is removed concurrently, assigning that user as a key owner fails with a refresh-and-retry message.
- Removing a currently assigned owner is rejected with a message identifying the responsibility that must first be changed.
- Ambiguous or missing historical names are not auto-linked and remain observable for manual correction.
- Long user, department, and product-line names must not resize table controls or obscure adjacent fields.

## 7. Verification

Backend integration tests cover tenant-scoped active-user candidates, ID-based creation and update, automatic owner membership, member-only key-owner validation, protected member removal, unresolved history, and required product-line version creation.

Frontend tests cover candidate loading/error states, ID payloads, member-scoped key-owner options, iteration column placement, required product-line feedback, and the exact release-note placeholder.

Run focused backend tests, frontend tests, lint, build, migration validation through application startup, and PRD validation before creating the local feature checkpoint.
