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
- `sshpass` is available when password-based SSH is used.
- Deployment values are loaded from `.enterprise-app-factory/secrets/runtime.env` or exported environment variables.
- Docker, `gzip`, and the `SOURCE_DB_*` variables are required only for an explicitly requested complete database replacement.
- The server already has MySQL client tools, the dedicated Nginx route file `/www/server/panel/vhost/nginx/routes/manage-admin.conf`, and the service environment file `/opt/manage-admin/backend/.env`.

Deploy:

```bash
scripts/deploy-production.sh
```

The default command builds and uploads the frontend and backend, verifies the dedicated Nginx route, backs up the current server database and application files, switches only the application files, lets Flyway migrate the existing database, and verifies the internal and public endpoints. It does not import local business data or modify the site root or `/tongren/` routes.

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

Last successful deploy: 2026-09-19

Verified deployment:

- Frontend, backend, complete database schema, template data, and existing local data were synchronized.
- Production database contains 47 tables and 58 Flyway records; the latest migration is `20260919.4`.
- Browser navigation and refresh preserve the `/manage-admin/` prefix.
- Existing root and `/tongren/` routes remain unchanged
- Backup: `/opt/manage-admin/backups/20260918222947/`
