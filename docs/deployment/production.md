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

- Docker, Node.js/npm, Java 17/Maven, `ssh`, `scp`, `curl`, `tar`, and `gzip` are available locally.
- `sshpass` is available when password-based SSH is used.
- Deployment and source database values are loaded from `.enterprise-app-factory/secrets/runtime.env` or exported environment variables.
- The source database variables are `SOURCE_DB_HOST`, `SOURCE_DB_PORT`, `SOURCE_DB_NAME`, `SOURCE_DB_USERNAME`, and `SOURCE_DB_PASSWORD`.
- When the database is only reachable from a Docker network, set `SOURCE_DB_DOCKER_NETWORK`; when its hostname differs inside Docker, set `SOURCE_DB_DOCKER_HOST`.
- The server already has MySQL client tools, the dedicated Nginx route file `/www/server/panel/vhost/nginx/routes/manage-admin.conf`, and the service environment file `/opt/manage-admin/backend/.env`.

Deploy:

```bash
scripts/deploy-production.sh
```

The script builds the frontend with the production base path, packages the backend, exports the complete local database, verifies the dedicated Nginx route, creates a timestamped production backup, replaces the database and application files, and verifies the internal and public endpoints. It does not modify the site root or `/tongren/` routes.

Rollback:

- Failed deployments automatically restore the frontend, backend JAR, and database snapshot from `/opt/manage-admin/backups/<release-id>/` before restarting `manage-admin.service`.
- For a manual rollback, stop `manage-admin.service`, restore the three artifacts from the selected backup directory, then start the service and verify the health, frontend, and API endpoints.
- Do not delete another project's Nginx route, release, database, or backup while reclaiming disk space.

Rules:

- Use the canonical deployment script for production deployments.
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
