#!/usr/bin/env bash
set -euo pipefail
# EAF_DEPLOY_SCRIPT_STATUS=verified
# Last verified: 2026-10-20; release 20261020T043907Z; source dd5b728.
# Static Mock site: /sc-manager-frontend/ and namespace /sc-manager-frontend/api/.
# Existing application deployment /manage-admin/ remains separate; no database replacement.
PUBLIC_PATH="sc-manager-frontend"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec python "${ROOT_DIR}/scripts/deploy_frontend_mock.py" --project "${ROOT_DIR}" "$@"
