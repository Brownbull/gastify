#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESULT_DIR="${ROOT_DIR}/.tmp/local/ui-smoke"
MOBILE_ENV_FILES=()
if [[ -n "${GASTIFY_MOBILE_ENV_FILE:-}" ]]; then
  MOBILE_ENV_FILES+=("${GASTIFY_MOBILE_ENV_FILE}")
fi
MOBILE_ENV_FILES+=("${ROOT_DIR}/mobile/.env.local" "${ROOT_DIR}/mobile/.env")
mkdir -p "${RESULT_DIR}"

load_dotenv_key() {
  local key="$1"
  local value

  if [[ -n "${!key:-}" ]]; then
    return 0
  fi

  for env_file in "${MOBILE_ENV_FILES[@]}"; do
    if [[ ! -f "${env_file}" ]]; then
      continue
    fi

    value="$(grep -E "^${key}=" "${env_file}" | tail -n 1 | cut -d= -f2- || true)"
    if [[ -n "${value}" ]]; then
      export "${key}=${value}"
      return 0
    fi
  done
}

for key in \
  EXPO_PUBLIC_API_BASE_URL \
  EXPO_PUBLIC_E2E_AUTH_ENABLED \
  EXPO_PUBLIC_E2E_AUTH_MODE \
  EXPO_PUBLIC_E2E_AUTH_EMAIL \
  EXPO_PUBLIC_E2E_AUTH_PASSWORD \
  EXPO_DEV_CLIENT_URL \
  GASTIFY_FIREBASE_PROJECT_ID \
  GASTIFY_FIREBASE_CREDENTIALS_PATH \
  GOOGLE_APPLICATION_CREDENTIALS; do
  load_dotenv_key "${key}"
done

CASE_ARG="${1:-happy}"

case "${CASE_ARG}" in
  all) CASES=(happy review failure) ;;
  happy|review|failure|camera-denied) CASES=("${CASE_ARG}") ;;
  *)
    echo "Usage: $0 [happy|review|failure|camera-denied|all]" >&2
    exit 2
    ;;
esac

export GASTIFY_ENVIRONMENT=local
export GASTIFY_SCAN_PROVIDER=mock
export GASTIFY_RESULT_ENV=local
export GASTIFY_MOBILE_RUN_ID="${GASTIFY_MOBILE_RUN_ID:-$(date -u '+%Y%m%dT%H%M%SZ')-local-s23-ui-smoke-${CASE_ARG}}"
export GASTIFY_E2E_SCAN_EVENT_DELAY_MS="${GASTIFY_E2E_SCAN_EVENT_DELAY_MS:-600}"
export GASTIFY_DATABASE_URL="${GASTIFY_DATABASE_URL:-sqlite+aiosqlite:///${ROOT_DIR}/.tmp/local/gastify.db}"
export GASTIFY_SCAN_STORAGE_DIR="${GASTIFY_SCAN_STORAGE_DIR:-${ROOT_DIR}/.tmp/local/scans}"
export GASTIFY_CORS_ORIGINS="${GASTIFY_CORS_ORIGINS:-[\"http://localhost:5173\",\"http://localhost:5174\"]}"
export MAESTRO_DEVICE_ID="${MAESTRO_DEVICE_ID:-RFCW90N4BYP}"
export MAESTRO_REINSTALL_DRIVER="${MAESTRO_REINSTALL_DRIVER:-false}"
export MAESTRO_VERBOSE="${MAESTRO_VERBOSE:-true}"
export GASTIFY_E2E_FORCE_RESTART="${GASTIFY_E2E_FORCE_RESTART:-false}"

api_base="${EXPO_PUBLIC_API_BASE_URL:-http://localhost:8000}"
case "${api_base}" in
  http://localhost:8000|http://127.0.0.1:8000)
    ;;
  *)
    if [[ "${GASTIFY_ALLOW_NONLOCAL_MOBILE_API:-false}" =~ ^(1|true|TRUE|yes|YES)$ ]]; then
      echo "WARN: EXPO_PUBLIC_API_BASE_URL is not local: ${api_base}" >&2
    else
      echo "EXPO_PUBLIC_API_BASE_URL must be http://localhost:8000 or http://127.0.0.1:8000 for local UI smoke." >&2
      echo "Current value: ${api_base}" >&2
      exit 2
    fi
    ;;
esac

if [[ "${EXPO_PUBLIC_E2E_AUTH_ENABLED:-}" != "true" ]]; then
  echo "EXPO_PUBLIC_E2E_AUTH_ENABLED=true is required for local S23 Maestro sign-in." >&2
  exit 2
fi

for key in EXPO_PUBLIC_E2E_AUTH_EMAIL EXPO_PUBLIC_E2E_AUTH_PASSWORD; do
  if [[ -z "${!key:-}" ]]; then
    echo "${key} is required for local S23 Maestro sign-in." >&2
    exit 2
  fi
done

if [[ -z "${GASTIFY_FIREBASE_CREDENTIALS_PATH:-}" && -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  echo "GASTIFY_FIREBASE_CREDENTIALS_PATH or GOOGLE_APPLICATION_CREDENTIALS is required." >&2
  echo "Local mobile upload auth needs Firebase Admin credentials to verify the staging Firebase token." >&2
  exit 2
fi

credentials_path="${GASTIFY_FIREBASE_CREDENTIALS_PATH:-${GOOGLE_APPLICATION_CREDENTIALS:-}}"
if [[ ! -f "${credentials_path}" ]]; then
  echo "Firebase Admin credentials file is not readable at ${credentials_path}." >&2
  exit 2
fi

# shellcheck source=tests/mobile/scripts/android-tooling.sh
source "${ROOT_DIR}/tests/mobile/scripts/android-tooling.sh"
export_android_tooling

ADB_BIN_RESOLVED="$(resolve_adb_bin || true)"
if [[ -z "${ADB_BIN_RESOLVED}" ]]; then
  echo "Android Debug Bridge is not available." >&2
  exit 127
fi

if ! "${ADB_BIN_RESOLVED}" devices | awk 'NR > 1 && $2 == "device" { found = 1 } END { exit found ? 0 : 1 }'; then
  echo "No authorized Android device is visible to ADB." >&2
  echo "Attach the S23 to WSL with usbipd or run ADB + Maestro on the same host side." >&2
  exit 1
fi

BACKEND_STARTED=false
BACKEND_PID=""

if ! curl -fsS "http://127.0.0.1:8000/api/v1/health/ready" >/dev/null 2>&1; then
  BACKEND_STARTED=true
  (
    cd "${ROOT_DIR}/backend"
    uv run python ../scripts/dev/bootstrap-local-db.py
    exec uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
  ) >"${RESULT_DIR}/backend.log" 2>&1 &
  BACKEND_PID="$!"
fi

cleanup() {
  if [[ "${BACKEND_STARTED}" == "true" && -n "${BACKEND_PID}" ]]; then
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

for _ in {1..40}; do
  if curl -fsS "http://127.0.0.1:8000/api/v1/health/ready" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

curl -fsS "http://127.0.0.1:8000/api/v1/health/ready" | tee "${RESULT_DIR}/ready.json"

"${ADB_BIN_RESOLVED}" reverse tcp:8000 tcp:8000 >/dev/null
"${ADB_BIN_RESOLVED}" reverse tcp:8081 tcp:8081 >/dev/null || true

if [[ ! "${GASTIFY_SKIP_OPEN_DEV_CLIENT:-false}" =~ ^(1|true|TRUE|yes|YES)$ ]]; then
  if [[ -z "${EXPO_DEV_CLIENT_URL:-}" ]]; then
    cat >&2 <<'EOF'
EXPO_DEV_CLIENT_URL is required for the local S23 UI smoke.

Start Metro for the installed development build, then export the printed exp+gastify-mobile://... URL:

  cd mobile
  npm run start:dev-client -- --host tunnel
  export EXPO_DEV_CLIENT_URL='exp+gastify-mobile://...'
  cd ..
  bash scripts/dev/run-s23-local-ui-smoke.sh happy

Set GASTIFY_SKIP_OPEN_DEV_CLIENT=true only when the app is already running the correct local bundle.
EOF
    exit 2
  fi

  CLEAR_APP_STATE="${CLEAR_APP_STATE:-false}" "${ROOT_DIR}/tests/mobile/scripts/open-dev-client.sh"
  sleep "${GASTIFY_E2E_APP_LAUNCH_WAIT_S:-5}"
fi

for case_name in "${CASES[@]}"; do
  if [[ "${case_name}" == "camera-denied" ]]; then
    npm_script="maestro:camera-permission-denied:active"
  else
    npm_script="maestro:scan-upload:${case_name}:active"
  fi
  (
    cd "${ROOT_DIR}/mobile"
    npm run "${npm_script}"
  )
done

cat >"${RESULT_DIR}/latest.json" <<JSON
{
  "ran_at": "$(date -Iseconds)",
  "backend": "local",
  "api_base_url": "${api_base}",
  "device_id": "${MAESTRO_DEVICE_ID}",
  "cases": [$(printf '"%s",' "${CASES[@]}" | sed 's/,$//')],
  "maestro_run_id": "${GASTIFY_MOBILE_RUN_ID}",
  "maestro_results": "tests/mobile/results/runs/local/${GASTIFY_MOBILE_RUN_ID}/"
}
JSON

echo "Local S23 UI smoke results: ${RESULT_DIR}/latest.json"
