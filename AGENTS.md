<!-- ENTERPRISE_APP_FACTORY_START -->
# stringplugin Project Rules

Last synced: 2026-09-02

This project uses the stringplugin team plugin. Follow these rules before creating or changing code in this repository.

## Startup

- Sync team configuration before implementation with `python3 scripts/sync_config.py --project <project-root>` from the plugin root.
- Read `.enterprise-app-factory/config/current-config.json` before choosing stack, paths, naming, or generation behavior.
- Resolve secrets with `python3 scripts/resolve_secrets.py --project <project-root> --environment dev` when `secretManagement.secretRefs` is configured.
- Before starting or creating any local frontend, backend, mock, or documentation service, run `python3 .enterprise-app-factory/bin/local_services.py --project <project-root> status --json` and reuse any matching live service.
- Manage version PRD contexts with `python3 scripts/manage_version.py --project <project-root> init --version V1.0.0`, `new --version Vx.y.z`, `switch --version Vx.y.z`, `archive --version Vx.y.z`, and `status`.
- Do not print, commit, document, or copy values from `.enterprise-app-factory/secrets/runtime.env`.

## Version State

- Current version: `V1.0.0`.
- Latest code branch: `master`.
- Version mode: `latest-code-version-context`.
- Current PRD path: `docs/prd/V1.0.0.md`.
- Version state source: `.enterprise-app-factory/project.json`.
- If the project has no version state yet, initialize it before major feature work with `python3 scripts/manage_version.py --project <project-root> init --version V1.0.0`.
- For a new iteration, run `python3 scripts/manage_version.py --project <project-root> new --version Vx.y.z`; this creates a new PRD context without switching or replacing the latest code branch.
- To work on an older requirement, run `python3 scripts/manage_version.py --project <project-root> switch --version Vx.y.z`; only the active PRD and registry change, while code stays on the latest branch.
- After a version is completed and all changes are committed, run `python3 scripts/manage_version.py --project <project-root> archive --version Vx.y.z` to preserve its historical code as an immutable `version/Vx.y.z` Git tag.
- Shared databases, deployed services, and external secrets are not versioned by this PRD context.

## Local Feature Checkpoints

- After a feature and its PRD update are complete and verified, create one local checkpoint with `python3 scripts/feature_checkpoint.py --project <project-root> create --requirement <requirement-number> --summary <summary> --path <changed-path>`.
- Pass every file or directory changed for that feature with repeated `--path`; the script commits only those paths and refuses unrelated staged changes.
- Checkpoints are local commits only. Never push them automatically. The local record is `.enterprise-app-factory/checkpoints.local.json` and is excluded through `.git/info/exclude`.
- To undo one completed feature, use `python3 scripts/feature_checkpoint.py --project <project-root> revert --checkpoint <checkpoint-id>`; this uses `git revert` and preserves history.
- Do not create a checkpoint when verification failed, when feature ownership is unclear, or when selected paths contain unrelated user changes.

## Local Services

- Local service state is shared across conversations through `.enterprise-app-factory/runtime/services.json`; the runtime directory is local-only and Git-ignored.
- Never guess a new port or start a duplicate service before checking the shared registry with `python3 .enterprise-app-factory/bin/local_services.py --project <project-root> status --json`.
- Start a service through `python3 .enterprise-app-factory/bin/local_services.py --project <project-root> start --name <service-name> --port <preferred-port> --url http://127.0.0.1:{port} --cwd <relative-directory> -- <command-with-{port}>`; the manager reuses a live matching service and selects the next free port only when needed.
- Use stable names such as `frontend`, `backend`, `mock-api`, or a module-qualified name when the project legitimately runs several services of one kind.
- If a service was started outside the manager, register it with `register --name <service-name> --port <port> --pid <pid>` before reporting or reusing it.
- Stop managed services with `stop --name <service-name>` so the process and shared registration are cleaned together. Stale PID or port records are removed automatically by `status` and `start`.
- Never store access tokens, passwords, secret-bearing commands, or environment values in the local service registry.

## Browser Preview

- For every browser-based page preview, interaction inspection, or page-size-dependent validation, set the webpage viewport to exactly `1920x1080` before evaluating the page.
- Treat `1920x1080` as the default for every browser session and page. Use another viewport only when the user explicitly requests a different size for that task.
- Verify the webpage viewport width and height after setting it. Do not treat the operating-system display resolution or the browser's outer window dimensions as the webpage viewport.
- This is an operational preview default, not a requirement to make the application layout fixed-width. Preserve responsive behavior and the target project's existing frontend conventions.

## Project Paths

- Frontend root: `frontend`.
- Backend root: `backend`.
- Database root: `database`.
- PRD path: `docs/prd/V1.0.0.md`.
- PRD registry: `.enterprise-app-factory/prd/V1.0.0/registry.json`.
- API prefix: `/api`.

## Implementation Standards

- Before frontend work, read `.enterprise-app-factory/standards/WEB_SPEC.md`. It only governs Vue syntax and use of the bundled public components and tools.
- Backend language and runtime: `Java 17`.
- Backend framework: `Spring Boot 3.5.x`.
- Backend build tool: `Maven`.
- Distributed-service baseline: `Spring Cloud 2025.0.2` and `Spring Cloud Alibaba 2025.0.0.0` when the project uses Spring Cloud.
- Persistence baseline: `MyBatis-Plus 3.5.15`, `MySQL 9.3`, `Druid 1.2.27`, and dynamic-datasource `4.5.0` when dynamic datasources are required.
- JSON, authentication, API documentation, and configuration baselines: `Fastjson2 2.0.60`, `JWT 0.9.1 + Redis Token`, `OpenAPI 3`, and `Nacos`.
- New backend code must use the configured backend stack above. Preserve compatible conventions in an established project; do not silently switch languages, frameworks, build tools, or Java versions.
- Use the Jakarta EE namespace. Use OpenAPI 3 annotations (`@Tag` and `@Operation`) for new HTTP APIs.
- Keep backend configuration in Nacos where the project uses it, and prefix new application properties with `string.*`.
- Use the standard structure `controller`, `service`/`service/impl`, `mapper`, `model/entity`, `model/dto`, `model/vo`, `enums`, `constants`, `config`, `properties`, and optional `converter`; keep Mapper XML under `src/main/resources/mapper/<module>/`.
- Enforce the call direction `Controller -> Service -> Mapper -> Database`. Controllers only handle HTTP input, permission declarations, and response assembly; they must not contain SQL, transactions, complex business logic, or direct low-level Redis, datasource, or file operations.
- Services own business validation, transactions, data rules after authorization, remote-call orchestration, and DTO/Entity/VO conversion. Services must not depend on servlet request/response objects or other web-layer details.
- Mappers only handle persistence and necessary custom SQL. They must not call remote services, produce page-facing messages, or manually manage connections, sessions, or transaction boundaries.
- Entities describe database mappings and must not be used as cross-service contracts. DTOs carry request input; VOs return only required fields and must exclude secrets, internal state, and complete tokens. Keep object conversion out of controllers.
- Keep classes single-purpose and split complex queries, external calls, and conversions into testable methods.
- Use table names in `t_<domain>_<name>` form and underscore-suffixed columns such as `name_` and `sort_`. Use explicit `@TableName` and `@TableField` mappings.
- Use `id_` string UUID identifiers, `tenant_id_` for tenant isolation, `create_by_`/`update_by_` and `create_time_`/`update_time_` for audit fields, and `delete_flag_` for soft deletion unless the established project schema requires compatibility.
- Add indexes for tenant filters, common queries, uniqueness, and sorting. Every business-table change must include a versioned SQL migration; never rely on an undocumented manual production change.
- Deletes, state changes, and bulk updates must define idempotency, concurrency, and audit behavior.
- Use `LambdaQueryWrapper` or type-safe XML parameters for queries; do not use string column names in `QueryWrapper`. Mapper XML namespaces must match the Mapper interface's fully qualified name.
- Avoid N+1 writes. Prefer a real batch operation, and validate batch size, duplicate IDs, permission scope, and partial-failure behavior.
- Before updates, validate ID, tenant, state, and editability; never trust a complete row object supplied by the frontend. Handle missing data with explicit business semantics instead of allowing NPEs.
- Business exceptions are handled by the project's global exception mechanism; do not catch them in the Service layer merely to convert them into response objects.
- These backend rules do not require `string-tool-service`, `string-framework-service`, any `tool-*` module, shared parent POM, or String-specific base classes and response/exception types. Reuse them only when the target project already depends on them or the user explicitly requests them.
- The bundled frontend framework is `@string/string-framework-v3` `1.0.83` at `.enterprise-app-factory/vendor/string-framework-v3`.
- Bootstrap automatically declares and installs `@string/string-framework-v3: file:../.enterprise-app-factory/vendor/string-framework-v3` when the frontend package is under `frontend`. If package.json does not exist yet, create the frontend package and rerun bootstrap.
- Register PC components through `componentPlugin` from `@string/string-framework-v3/components/pc.js`; do not import the package root as a component registry.
- New Vue code uses Vue 3, JavaScript, Composition API, and `<script setup>` unless the target module already uses another established syntax.
- Reuse matching components and tools from `@string/string-framework-v3`; verify actual exports before use and do not invent component names, parameters, or import paths.
- The plugin does not impose frontend directory, routing, state-management, layout, styling, API, permission, interaction-state, testing, build, release, or naming rules. Follow the user's current requirements and the target project's established conventions for those concerns.
- Do not add backend constraints beyond the configured technical baseline and the code rules listed above. In particular, do not turn optional public components or String-specific base classes into mandatory dependencies.
- Do not invent API fields, routes, permission keys, dependencies, or framework versions. Inspect the existing business-domain contracts and ask only when a missing choice materially changes the result.
- Complete relevant project checks before delivery; do not claim validation that was not run.
- Generated application config must reference environment variables such as `ALIYUN_DB_HOST`, `ALIYUN_DB_USERNAME`, and `ALIYUN_DB_PASSWORD`; never hard-code credentials.
- Generated deployment scripts must reference environment variables such as `DEPLOY_SERVER_HOST`, `DEPLOY_SERVER_SSH_USER`, `DEPLOY_SERVER_SSH_PASSWORD`, `DEPLOY_WEB_ROOT`, `DEPLOY_RELEASE_ROOT`, and `DEPLOY_BACKEND_ROOT`; never hard-code server credentials.
- Preserve existing project conventions when modifying an established codebase.

## Aliyun Runtime Information

- Database platform: `Aliyun RDS`; database type: `MySQL`.
- Deployment server platform: `Aliyun ECS`.
- Secret reference definitions are stored in `.enterprise-app-factory/config/current-config.json`.
- Resolved server and database values are stored locally in `.enterprise-app-factory/secrets/runtime.env`.
- The local runtime file is the persistent source for actual host, port, database name, username, password, SSH account, and deployment paths. Load it when connecting or deploying; never copy its values into this file.
- Required Aliyun variable references:
- `ALIYUN_DB_HOST` -> `aliyun/rds/default/host`.
- `ALIYUN_DB_NAME` -> `aliyun/rds/default/database`.
- `ALIYUN_DB_PASSWORD` -> `aliyun/rds/default/adminPassword`.
- `ALIYUN_DB_PORT` -> `aliyun/rds/default/port`.
- `ALIYUN_DB_USERNAME` -> `aliyun/rds/default/adminUsername`.
- `DEPLOY_BACKEND_ROOT` -> `aliyun/ecs/default/backendRoot`.
- `DEPLOY_RELEASE_ROOT` -> `aliyun/ecs/default/releaseRoot`.
- `DEPLOY_SERVER_HOST` -> `aliyun/ecs/default/host`.
- `DEPLOY_SERVER_SSH_PASSWORD` -> `aliyun/ecs/default/sshPassword`.
- `DEPLOY_SERVER_SSH_PORT` -> `aliyun/ecs/default/sshPort`.
- `DEPLOY_SERVER_SSH_USER` -> `aliyun/ecs/default/sshUser`.
- `DEPLOY_WEB_ROOT` -> `aliyun/ecs/default/webRoot`.

## Production Deployment

- Canonical production deployment script: `scripts/deploy-production.sh`.
- Deployment runbook: `docs/deployment/production.md`.
- Before deploying online, inspect and reuse the canonical deployment script instead of inventing a new deploy flow in the current chat.
- If the canonical script is marked `EAF_DEPLOY_SCRIPT_STATUS=draft`, do not treat it as ready. Perform the first deploy carefully, then replace the draft with the verified repeatable commands after the deploy succeeds.
- Before running a production deploy, run `python3 scripts/prepare_deployment.py --project <project-root> --environment prod` from the plugin root to resolve secrets and classify first deploy versus repeat deploy.
- Deployment preparation must pass the remote database preflight before any release is switched: verify network reachability, application login, and target database existence from the deployment server.
- This team configuration explicitly uses `ALIYUN_DB_ADMIN_USERNAME` and `ALIYUN_DB_ADMIN_PASSWORD` as application database credentials. These values may be MySQL `root`; treat them as high-privilege runtime secrets and never print or commit them.
- Database preflight uses the configured administrator credentials for the application connection. Automatic database creation remains limited to `ecs-local-mysql` with `mode=provision`; Aliyun RDS is verify-only by default.
- Every production project must use its own Nginx subpath. Use only the `frontendPath` and `apiPath` returned by `prepare_deployment.py`; never reuse the server root `/api/` or another project's route.
- Nginx route preflight checks the effective server configuration and atomically records project ownership. A route conflict is a deployment blocker; do not overwrite, delete, or repurpose the conflicting location.
- Keep the assigned Nginx route stable in the canonical deployment script and runbook across later conversations and redeployments.
- The stable route identity is stored in `.enterprise-app-factory/deployment/nginx-route.json` and should be committed with the project. Do not regenerate its project ID or slug to bypass a conflict.
- Each project database identity is stored in `.enterprise-app-factory/deployment/database.json`; commit its non-secret `databaseName` and reuse it across every deployment.
- A draft deployment script means the first deployment must be completed and recorded; it is not by itself a reason to stop the deployment request.
- A missing public domain is not a blocker. Use the resolved server host as the initial public address and verify the actual reachable URL after deployment.
- After a successful production deploy, update the canonical script and runbook with the verified command, prerequisites, rollback notes, and last success date.
- Deployment scripts must load secrets from `.enterprise-app-factory/secrets/runtime.env` or environment variables; never hard-code server passwords, database passwords, tokens, or access keys.

## PRD Rules

- Every code change made through stringplugin must update `docs/prd/V1.0.0.md` in the same turn.
- Use the `prd-writer` workflow and follow the team PRD writing specification `PM-SPEC-PRD-V1.0.0`.
- PRD content is for product, business, QA, and project communication; it describes requirements and functional logic, not technical implementation.
- PRD content must be precise, concise, and consistent. Avoid vague wording such as `about`, `related`, or `probably`.
- Update the matching numbered requirement section in place. Do not append unstructured change notes to the document tail.
- Each requirement must cover its goal and boundary, roles, preconditions, flow, page feedback, validation, state, exceptions, impact, and observable acceptance.
- When a requirement introduces or changes user-visible page fields, include only the affected fields with their page, display name, presentation, business purpose, and change type; do not repeat untouched fields.
- Preserve module, requirement, acceptance, and change sequences such as `1`, `1.1`, `1.1.1`, and `20260714-01`. Do not renumber history.
- Before changing a requirement, read the current PRD and registry. If ownership or impact is ambiguous, ask the user to confirm the proposed module map first.
- Do not include API paths, request/response parameters, database tables or fields, SQL, source file paths, implementation notes, environment variables, local URLs, route paths, build commands, selectors, or test framework code in the PRD.
- Record compatibility impact whenever a change affects existing user behavior, business process, permissions, or visible page logic.
- Run `python3 scripts/manage_prd.py --project <project-root> validate` after each PRD update. Use deep PRD review only when requested.

## Security

- Gitee stores only configuration and `secretRefs`, never real passwords or access tokens.
- Do not commit `.enterprise-app-factory/secrets/runtime.env`, local secret JSON files, server passwords, database passwords, or personal tokens.
<!-- ENTERPRISE_APP_FACTORY_END -->

## 前端视觉规范

前端页面与组件必须遵循 `docs/AIEDIT_UI_DESIGN_SPECIFICATION.md`。该文档是本项目的视觉基线,优先级高于历史页面中的旧色值和旧组件样式;新增或修改界面时复用其中的 Token、排版、间距、圆角、状态和响应式规则。
