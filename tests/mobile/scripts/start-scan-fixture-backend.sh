#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
MOBILE_ENV="${ROOT_DIR}/mobile/.env"

if [[ -f "${MOBILE_ENV}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${MOBILE_ENV}"
  set +a
fi

# shellcheck source=tests/mobile/scripts/android-tooling.sh
source "${ROOT_DIR}/tests/mobile/scripts/android-tooling.sh"
export_android_tooling

if [[ "${GASTIFY_ENVIRONMENT:-staging-e2e}" == "production" ]]; then
  echo "Refusing to start scan fixture backend with GASTIFY_ENVIRONMENT=production." >&2
  exit 2
fi

if [[ -z "${GASTIFY_DATABASE_URL:-}" ]]; then
  echo "GASTIFY_DATABASE_URL is required and must point at local/staging Postgres." >&2
  exit 2
fi

if [[ "${GASTIFY_DATABASE_URL}" == sqlite* ]]; then
  echo "SQLite is not accepted for the physical scan E2E gate; use local/staging Postgres." >&2
  exit 2
fi

if [[ -z "${GASTIFY_FIREBASE_CREDENTIALS_PATH:-}" ]]; then
  echo "GASTIFY_FIREBASE_CREDENTIALS_PATH is required for staging token verification." >&2
  exit 2
fi

export GASTIFY_ENVIRONMENT="${GASTIFY_ENVIRONMENT:-staging-e2e}"
export GASTIFY_SCAN_PROVIDER=fixture
export GASTIFY_E2E_SCAN_FIXTURES_ENABLED=true
export GASTIFY_E2E_SCAN_EVENT_DELAY_MS="${GASTIFY_E2E_SCAN_EVENT_DELAY_MS:-600}"
export GASTIFY_SCAN_STORAGE_DIR="${GASTIFY_SCAN_STORAGE_DIR:-${ROOT_DIR}/.tmp/e2e-scan-storage}"

mkdir -p "${GASTIFY_SCAN_STORAGE_DIR}"

ADB_BIN_RESOLVED="$(resolve_adb_bin || true)"
if [[ -n "${ADB_BIN_RESOLVED}" ]]; then
  "${ADB_BIN_RESOLVED}" reverse tcp:8000 tcp:8000 >/dev/null || true
fi

cd "${BACKEND_DIR}"
uv run alembic upgrade head

exec uv run uvicorn app.main:app \
  --host "${GASTIFY_E2E_BACKEND_HOST:-0.0.0.0}" \
  --port "${GASTIFY_E2E_BACKEND_PORT:-8000}"
