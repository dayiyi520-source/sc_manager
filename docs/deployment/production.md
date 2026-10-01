# Production Deployment Runbook

Status: verified

Canonical deployment script:

```bash
scripts/deploy-production.sh
```

Production endpoint:

- Web: `https://cp.stringedu.com/manage-admin/`
- Frontend route: `/manage-admin/`
- API route: `/manage-admin/api/`
- Backend service: `manage-admin.service` on port `18082`
- Database: `eaf_manage_admin`

Prerequisites:

- Node.js/npm, Java 17/Maven, `ssh`, `scp`, `curl`, and `tar` are available locally.
- On Windows Git Bash, the script excludes `VITE_BASE_PATH` and `VITE_API_BASE_URL` from MSYS path conversion so the configured Nginx subpath is preserved in the generated HTML.
- `sshpass` is available when password-based SSH is used.
- Deployment values are loaded from `.enterprise-app-factory/secrets/runtime.env` or exported environment variables.
- Docker, `gzip`, and the `SOURCE_DB_*` variables are required only for an explicitly requested complete database replacement.
- The server already has MySQL client tools, the dedicated Nginx route file `/www/server/panel/vhost/nginx/routes/manage-admin.conf`, and the service environment file `/opt/manage-admin/backend/.env`.

Deploy:

```bash
scripts/deploy-production.sh
```

The default command builds and uploads the frontend and backend, verifies the dedicated Nginx route, backs up the current server database and application files, switches only the application files, lets Flyway migrate the existing database, and verifies the internal and public endpoints. It does not import local business data or modify the site root or `/tongren/` routes.

Before upload and again after the public switch, deployment verifies that the generated HTML references `/manage-admin/assets/` and rejects root `/assets/` references. The public check uses the release ID as a cache-busting query parameter. It also verifies direct access to the product defect page so a wrong frontend base path cannot be reported as a successful release.

Complete database replacement is exceptional and must be explicit:

```bash
scripts/deploy-production.sh --replace-database
```

Replacement mode additionally requires Docker, `gzip`, `SOURCE_DB_HOST`, `SOURCE_DB_PORT`, `SOURCE_DB_NAME`, `SOURCE_DB_USERNAME`, and `SOURCE_DB_PASSWORD`. It exports the complete source database and replaces the server database only after the remote backup succeeds.

Rollback:

- Failed default deployments restore the frontend and backend JAR before restarting `manage-admin.service`; the existing database is not replaced.
- Failed database-replacement deployments additionally restore the database snapshot from `/opt/manage-admin/backups/<release-id>/`.
- For a manual rollback, stop `manage-admin.service`, restore the three artifacts from the selected backup directory, then start the service and verify the health, frontend, and API endpoints.
- Do not delete another project's Nginx route, release, database, or backup while reclaiming disk space.

Rules:

- Use the canonical deployment script for production deployments.
- Use the default application-only mode for routine releases. Database replacement requires an explicit data synchronization decision.
- Do not hard-code server passwords, database passwords, tokens, or access keys.
- Load deployment values from `.enterprise-app-factory/secrets/runtime.env` or existing environment variables.
- After a deployment succeeds, update this runbook with the verified command, required preconditions, rollback notes, and last success date.

Last successful deploy: 2026-09-30

Latest complete local-data release:

- Release `20260930022759` deployed commit `cddf849` to the existing `/manage-admin/` and `/manage-admin/api/` routes. Because the local secret file and `sshpass` were unavailable, the verified deployment script's build, backup, upload, switch, and verification sequence was performed manually. Do not interpret this as a successful end-to-end run of `scripts/deploy-production.sh --replace-database`.
- The complete local `eaf_project_f194fd0628` snapshot was first imported into a temporary database on the MySQL 8.0 server to verify compatibility, then used to replace only `eaf_manage_admin` after the production database, frontend, and JAR were backed up at `/opt/manage-admin/backups/20260930022759/`. The previous frontend directory is also retained at `/opt/manage-admin/frontend/dist.pre-20260930022759/`.
- After switching, the production database contained 63 tables, 92 successful Flyway migrations with no failed records, 163 work items, 9 products, and 15 versions. The backend health, Nginx configuration, public frontend, direct business route, entry JavaScript, and authentication API were checked. The local data scripts were not rerun during deployment; the published data is the local database snapshot at export time.
- This replacement intentionally supersedes production changes made after the previous release. To restore the old production data and application, stop `manage-admin.service`, restore the database dump and application artifacts from the backup directory, then restart and recheck the health and dedicated routes. The application database account cannot create a staging database; database replacement requires separately supplied administrator credentials without storing them in the repository.

Latest verified demo release:

- Release `20260927134948` deployed the current working tree in application-only mode to the existing `/manage-admin/` route on `103.236.98.125`; the server database was preserved. The remote release step was run from the canonical script's extracted remote block after the local password adapter failed to forward standard input. It completed with an application and database backup at `/opt/manage-admin/backups/20260927134948/`.
- The backend is active and healthy, Nginx configuration passed, Flyway applied `20260927.1`, and the public entry, direct business route, and authentication endpoint returned successfully. A read-only Chen Yuzhang perspective check found no actionable item in the current demo data: the root objective is still `pending_review` and its KR has no assignee ID. This release alone does not close that specific business acceptance scenario.
- Release `20260927131638` deployed local commit `363ff03` to the existing `/manage-admin/` route on `103.236.98.125` in application-only mode. The server database was not replaced.
- The canonical script built and uploaded the application, but its remote backup step exceeded the SSH wrapper's timeout. The uploaded artifacts were switched manually only after a separate compressed database backup and frontend/JAR backups succeeded. The script itself did not report completion for this release.
- The backend service is active, Nginx configuration is valid, the public entry page and JavaScript asset return 200, direct defect-page navigation returns 200, and the public development-account API returns 200.
- Flyway completed through `20260926.2`; 53 tables and no failed Flyway records were observed after deployment. This confirms schema migration, not business-level browser acceptance.
- Backup: `/opt/manage-admin/backups/20260927131638/` (database, frontend, and JAR). The uploaded package remains in `/opt/manage-admin/incoming/20260927131638/`.
- Before the next release, fix or accommodate the canonical script's remote backup timeout. The local full test suites failed before this demo deployment; do not treat this release as a clean automated-test pass.

Latest verified application release:

- Release `20260923120029` deployed commit `0ec3c09`, including the assistance business-parameter adjustments and the goal/performance copy updates, in the default application-only mode.
- The existing production database was preserved; the deployment created a database and application backup before switching files.
- Backend health, the internal frontend and authentication endpoints, the public frontend and authentication routes, service state, and Nginx configuration all passed.
- The public index references `/manage-admin/assets/`, and the deployed entry JavaScript returned successfully.
- Backup: `/opt/manage-admin/backups/20260923120029/`.

Latest verified repair:

- Frontend-only release `20260921092314` repaired production assets that were incorrectly built against root `/assets/` URLs.
- The public index now references `/manage-admin/assets/`; all six entry JavaScript and CSS resources, the direct product defect page, and the development-account API returned successfully.
- The backend JAR, backend service, and database were not changed during this repair.
- Frontend backup: `/opt/manage-admin/backups/20260921092314/frontend.tar.gz`.

Verified deployment:

- Release `20260920161403` used the default application-only mode; no local business data was imported.
- The production database contains 49 tables and 59 successful Flyway records; the latest migration is `20260920.1`.
- The two added tables belong to version reviews. All 46 pre-existing business tables retained exactly the same row counts across the deployment.
- The repaired `V1.0.26` history entry uses checksum `-1182548249`; no other migration history row was changed.
- Browser navigation and refresh preserve the `/manage-admin/` prefix.
- The frontend, development-account API, backend health endpoint, service state, and Nginx configuration were verified after the switch.
- Existing root and `/tongren/` routes remain unchanged.
- Backup: `/opt/manage-admin/backups/20260920161403/`
