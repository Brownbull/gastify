#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV_FILE="${GASTIFY_BACKEND_ENV_FILE:-${ROOT_DIR}/backend/.env.local}"

if [[ -f "${BACKEND_ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${BACKEND_ENV_FILE}"
  set +a
fi

export GASTIFY_ENVIRONMENT=local
export GASTIFY_SCAN_PROVIDER=mock
export GASTIFY_DATABASE_URL="${GASTIFY_DATABASE_URL:-sqlite+aiosqlite:///${ROOT_DIR}/.tmp/local/gastify.db}"
export GASTIFY_SCAN_STORAGE_DIR="${GASTIFY_SCAN_STORAGE_DIR:-${ROOT_DIR}/.tmp/local/scans}"
export GASTIFY_CORS_ORIGINS="${GASTIFY_CORS_ORIGINS:-[\"http://localhost:5173\",\"http://localhost:5174\"]}"

cd "${ROOT_DIR}/backend"
uv run python ../scripts/dev/bootstrap-local-db.py
uv run python ../scripts/dev/smoke-local.py
