#!/usr/bin/env bash
set -euo pipefail

# EAF_DEPLOY_SCRIPT_STATUS=verified
# Verified on 2026-09-19 for the dedicated /manage-admin/ production route.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.enterprise-app-factory/secrets/runtime.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

required_commands=(docker gzip mvn npm ssh scp curl tar)
for command_name in "${required_commands[@]}"; do
  command -v "${command_name}" >/dev/null 2>&1 || {
    echo "Missing required command: ${command_name}" >&2
    exit 1
  }
done

required_variables=(
  DEPLOY_SERVER_HOST
  DEPLOY_SERVER_SSH_USER
  DEPLOY_SERVER_SSH_PORT
  SOURCE_DB_HOST
  SOURCE_DB_PORT
  SOURCE_DB_NAME
  SOURCE_DB_USERNAME
  SOURCE_DB_PASSWORD
)
for variable_name in "${required_variables[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "Missing required environment variable: ${variable_name}" >&2
    exit 1
  fi
done

if [[ -n "${DEPLOY_SERVER_SSH_PASSWORD:-}" ]]; then
  command -v sshpass >/dev/null 2>&1 || {
    echo "sshpass is required when DEPLOY_SERVER_SSH_PASSWORD is set" >&2
    exit 1
  }
fi

FRONTEND_PATH="/manage-admin/"
API_PATH="/manage-admin/api/"
PUBLIC_URL="${PUBLIC_URL:-https://cp.stringedu.com/manage-admin/}"
REMOTE_APP_ROOT="/opt/manage-admin"
REMOTE_INCOMING_ROOT="${REMOTE_APP_ROOT}/incoming"
REMOTE_SERVICE="manage-admin.service"
REMOTE_ROUTE_FILE="/www/server/panel/vhost/nginx/routes/manage-admin.conf"
RELEASE_ID="$(date +%Y%m%d%H%M%S)"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/manage-admin-deploy.XXXXXX")"

cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

SSH_OPTIONS=(
  -p "${DEPLOY_SERVER_SSH_PORT}"
  -o BatchMode=no
  -o ConnectTimeout=15
  -o StrictHostKeyChecking=accept-new
)
SCP_OPTIONS=(
  -P "${DEPLOY_SERVER_SSH_PORT}"
  -o BatchMode=no
  -o ConnectTimeout=15
  -o StrictHostKeyChecking=accept-new
)

run_ssh() {
  if [[ -n "${DEPLOY_SERVER_SSH_PASSWORD:-}" ]]; then
    SSHPASS="${DEPLOY_SERVER_SSH_PASSWORD}" sshpass -e ssh "${SSH_OPTIONS[@]}" \
      "${DEPLOY_SERVER_SSH_USER}@${DEPLOY_SERVER_HOST}" "$@"
  else
    ssh "${SSH_OPTIONS[@]}" "${DEPLOY_SERVER_SSH_USER}@${DEPLOY_SERVER_HOST}" "$@"
  fi
}

run_scp() {
  if [[ -n "${DEPLOY_SERVER_SSH_PASSWORD:-}" ]]; then
    SSHPASS="${DEPLOY_SERVER_SSH_PASSWORD}" sshpass -e scp "${SCP_OPTIONS[@]}" "$@"
  else
    scp "${SCP_OPTIONS[@]}" "$@"
  fi
}

echo "[1/6] Checking the dedicated production route"
run_ssh \
  "test -f '${REMOTE_ROUTE_FILE}' && grep -Fq '${FRONTEND_PATH}' '${REMOTE_ROUTE_FILE}' && grep -Fq '${API_PATH}' '${REMOTE_ROUTE_FILE}' && grep -Fq '18082' '${REMOTE_ROUTE_FILE}' && nginx -t"

echo "[2/6] Building frontend and backend"
(
  cd "${ROOT_DIR}"
  VITE_BASE_PATH="${FRONTEND_PATH}" VITE_API_BASE_URL="/manage-admin" npm run build
)
(
  cd "${ROOT_DIR}/backend"
  mvn -q -DskipTests package
)

FRONTEND_ARCHIVE="${WORK_DIR}/frontend.tar.gz"
BACKEND_JAR="${WORK_DIR}/app.jar"
DATABASE_DUMP="${WORK_DIR}/database.sql.gz"
tar -C "${ROOT_DIR}/dist" -czf "${FRONTEND_ARCHIVE}" .
cp "${ROOT_DIR}/backend/target/manage-admin-backend-1.0.0-SNAPSHOT.jar" "${BACKEND_JAR}"

echo "[3/6] Exporting the complete source database"
SOURCE_DB_DOCKER_HOST="${SOURCE_DB_DOCKER_HOST:-${SOURCE_DB_HOST}}"
SOURCE_DB_DOCKER_NETWORK="${SOURCE_DB_DOCKER_NETWORK:-}"
docker_network_args=()
if [[ -n "${SOURCE_DB_DOCKER_NETWORK}" ]]; then
  docker_network_args=(--network "${SOURCE_DB_DOCKER_NETWORK}")
fi
docker run --rm "${docker_network_args[@]}" \
  -e MYSQL_PWD="${SOURCE_DB_PASSWORD}" mysql:9.3 \
  mysqldump \
    --host="${SOURCE_DB_DOCKER_HOST}" \
    --port="${SOURCE_DB_PORT}" \
    --user="${SOURCE_DB_USERNAME}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --set-gtid-purged=OFF \
    --default-character-set=utf8mb4 \
    "${SOURCE_DB_NAME}" | gzip -9 >"${DATABASE_DUMP}"
gzip -t "${DATABASE_DUMP}"

echo "[4/6] Uploading release ${RELEASE_ID}"
REMOTE_RELEASE_DIR="${REMOTE_INCOMING_ROOT}/${RELEASE_ID}"
run_ssh "mkdir -p '${REMOTE_RELEASE_DIR}'"
run_scp \
  "${FRONTEND_ARCHIVE}" \
  "${BACKEND_JAR}" \
  "${DATABASE_DUMP}" \
  "${DEPLOY_SERVER_SSH_USER}@${DEPLOY_SERVER_HOST}:${REMOTE_RELEASE_DIR}/"

echo "[5/6] Backing up and switching the production release"
run_ssh \
  "RELEASE_ID='${RELEASE_ID}' REMOTE_APP_ROOT='${REMOTE_APP_ROOT}' REMOTE_INCOMING_ROOT='${REMOTE_INCOMING_ROOT}' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

service_name="manage-admin.service"
release_dir="${REMOTE_INCOMING_ROOT}/${RELEASE_ID}"
backup_dir="${REMOTE_APP_ROOT}/backups/${RELEASE_ID}"
env_file="${REMOTE_APP_ROOT}/backend/.env"
frontend_dir="${REMOTE_APP_ROOT}/frontend/dist"
backend_jar="${REMOTE_APP_ROOT}/backend/app.jar"
db_backup="${backup_dir}/database.sql.gz"
files_switched=false
database_replaced=false

[[ "${RELEASE_ID}" =~ ^[0-9]{14}$ ]] || { echo "Invalid release id" >&2; exit 1; }
[[ -f "${release_dir}/frontend.tar.gz" ]] || { echo "Missing frontend package" >&2; exit 1; }
[[ -f "${release_dir}/app.jar" ]] || { echo "Missing backend package" >&2; exit 1; }
[[ -f "${release_dir}/database.sql.gz" ]] || { echo "Missing database package" >&2; exit 1; }
[[ -f "${env_file}" ]] || { echo "Missing production environment file" >&2; exit 1; }
gzip -t "${release_dir}/database.sql.gz"

command -v mysql >/dev/null 2>&1 || { echo "Missing mysql client" >&2; exit 1; }
command -v mysqldump >/dev/null 2>&1 || { echo "Missing mysqldump client" >&2; exit 1; }

read_env_value() {
  sed -n "s/^${1}=//p" "${env_file}" | tail -n 1 | tr -d '\r'
}

db_url="$(read_env_value LOCAL_DB_URL)"
db_user="$(read_env_value LOCAL_DB_USERNAME)"
db_password="$(read_env_value LOCAL_DB_PASSWORD)"
if [[ -z "${db_user}" ]]; then db_user="$(read_env_value ALIYUN_DB_USERNAME)"; fi
if [[ -z "${db_password}" ]]; then db_password="$(read_env_value ALIYUN_DB_PASSWORD)"; fi
db_name="$(read_env_value ALIYUN_DB_NAME)"
if [[ -z "${db_name}" && -n "${db_url}" ]]; then
  db_name="${db_url%%\?*}"
  db_name="${db_name##*/}"
fi
db_host="127.0.0.1"
db_port="3306"
db_name="${db_name:-eaf_manage_admin}"
[[ -n "${db_user}" ]] || { echo "Missing database username in production environment" >&2; exit 1; }
[[ -n "${db_password}" ]] || { echo "Missing database password in production environment" >&2; exit 1; }
[[ "${db_name}" =~ ^[A-Za-z0-9_]+$ ]] || { echo "Invalid target database name" >&2; exit 1; }

mysql_client() {
  MYSQL_PWD="${db_password}" mysql \
    --host="${db_host}" --port="${db_port}" --user="${db_user}" "$@"
}

mysql_dump() {
  MYSQL_PWD="${db_password}" mysqldump \
    --host="${db_host}" --port="${db_port}" --user="${db_user}" \
    --single-transaction --routines --triggers --events --set-gtid-purged=OFF \
    --default-character-set=utf8mb4 "${db_name}"
}

rollback() {
  exit_code=$?
  trap - ERR
  echo "Deployment failed; restoring release ${RELEASE_ID}" >&2
  systemctl stop "${service_name}" || true
  if [[ "${database_replaced}" == true && -f "${db_backup}" ]]; then
    mysql_client -e "DROP DATABASE IF EXISTS \`${db_name}\`; CREATE DATABASE \`${db_name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;" || true
    gunzip -c "${db_backup}" | mysql_client "${db_name}" || true
  fi
  if [[ "${files_switched}" == true ]]; then
    rm -rf "${frontend_dir}"
    if [[ -f "${backup_dir}/frontend.tar.gz" ]]; then
      mkdir -p "${frontend_dir}"
      tar -xzf "${backup_dir}/frontend.tar.gz" -C "${frontend_dir}" || true
    fi
    if [[ -f "${backup_dir}/app.jar" ]]; then
      cp "${backup_dir}/app.jar" "${backend_jar}" || true
    fi
  fi
  systemctl start "${service_name}" || true
  exit "${exit_code}"
}
trap rollback ERR

mkdir -p "${backup_dir}" "${REMOTE_APP_ROOT}/frontend" "${REMOTE_APP_ROOT}/backend"
if [[ -d "${frontend_dir}" ]]; then
  tar -C "${frontend_dir}" -czf "${backup_dir}/frontend.tar.gz" .
fi
if [[ -f "${backend_jar}" ]]; then
  cp "${backend_jar}" "${backup_dir}/app.jar"
fi
mysql_dump | gzip -9 >"${db_backup}"
gzip -t "${db_backup}"

systemctl stop "${service_name}"
database_replaced=true
mysql_client -e "DROP DATABASE IF EXISTS \`${db_name}\`; CREATE DATABASE \`${db_name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
gunzip -c "${release_dir}/database.sql.gz" | mysql_client "${db_name}"

files_switched=true
rm -rf "${frontend_dir}"
mkdir -p "${frontend_dir}"
tar -xzf "${release_dir}/frontend.tar.gz" -C "${frontend_dir}"
cp "${release_dir}/app.jar" "${backend_jar}"
chown -R root:root "${REMOTE_APP_ROOT}/frontend" "${REMOTE_APP_ROOT}/backend"

systemctl start "${service_name}"
for attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:18082/actuator/health | grep -Fq '"status":"UP"'; then
    break
  fi
  if [[ "${attempt}" == 30 ]]; then
    echo "Backend health check timed out" >&2
    false
  fi
  sleep 2
done

curl --fail --silent --output /dev/null http://127.0.0.1/manage-admin/
curl --fail --silent --output /dev/null http://127.0.0.1/manage-admin/api/auth/dev-accounts
systemctl is-active --quiet "${service_name}"
nginx -t
trap - ERR
echo "Release ${RELEASE_ID} deployed; backup: ${backup_dir}"
REMOTE_SCRIPT

echo "[6/6] Verifying the public route"
curl --fail --silent --show-error --output /dev/null "${PUBLIC_URL}"
curl --fail --silent --show-error --output /dev/null "${PUBLIC_URL%/}/api/auth/dev-accounts"
echo "Deployment ${RELEASE_ID} completed: ${PUBLIC_URL}"
