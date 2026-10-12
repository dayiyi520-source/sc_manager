#!/usr/bin/env bash
set -euo pipefail
# EAF_DEPLOY_SCRIPT_STATUS=verified
# Static Mock site: /sc-manager-frontend/ and namespace /sc-manager-frontend/api/.
# Existing application deployment /manage-admin/ remains separate; no database replacement.
PUBLIC_PATH="sc-manager-frontend"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec python "${ROOT_DIR}/scripts/deploy_frontend_mock.py" --project "${ROOT_DIR}" "$@"
