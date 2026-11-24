#!/usr/bin/env bash
set -euo pipefail
# EAF_DEPLOY_SCRIPT_STATUS=verified
# Last verified: 2026-11-24; release 20261124T025637Z; source f34a03be4a6664b420f3978dcc1c888ae843f421.
# Static Mock site: /sc-manager-frontend/ and namespace /sc-manager-frontend/api/.
# Existing application deployment /manage-admin/ remains separate; no database replacement.
PUBLIC_PATH="sc-manager-frontend"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec python3 "${ROOT_DIR}/scripts/deploy_frontend_mock.py" --project "${ROOT_DIR}" "$@"
