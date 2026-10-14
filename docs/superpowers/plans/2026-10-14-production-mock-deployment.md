# Production Mock deployment

User authorized deployment to the existing sc-manager-frontend site and update of current Mock datasets.

1. Inspect canonical deployment and reserved project paths; resolve runtime credentials without logging them.
2. Correct production Mock endpoint paths and provide a least-privilege same-origin file service on the project's existing API namespace.
3. Package current Okr/review/settings and research/product-template snapshots with hashes; preserve goals and provide Nginx/service/data backups.
4. Verify endpoint routing, file persistence/conflicts, TypeScript and build; commit reviewed deployment changes.
5. Build an isolated source snapshot, deploy through the canonical script, verify public routes and write/read persistence, and record the release/rollback locations.

Completed: deployed release 20261014T103653Z, source f93390a. Public routes, write/read persistence, stale-write conflicts, and source snapshot equality verified. Backup and rollback metadata are recorded in the production runbook.
