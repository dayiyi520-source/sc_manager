#!/usr/bin/env bash
set -euo pipefail

# EAF_DEPLOY_SCRIPT_STATUS=draft
# stringplugin production deployment script.
# Replace this draft with the verified production deployment commands after the first successful deploy.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.enterprise-app-factory/secrets/runtime.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

cat >&2 <<'EOF'
scripts/deploy-production.sh is still a draft.
Run the first production deployment carefully, then replace this file with the verified repeatable commands.
Do not hard-code passwords; read deployment secrets from .enterprise-app-factory/secrets/runtime.env or environment variables.
EOF
exit 2
