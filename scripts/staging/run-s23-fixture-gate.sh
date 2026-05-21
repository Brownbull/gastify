#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -z "${GASTIFY_STAGING_E2E_API_BASE_URL:-}" ]]; then
  echo "GASTIFY_STAGING_E2E_API_BASE_URL is required." >&2
  echo "Build/start the mobile app with EXPO_PUBLIC_API_BASE_URL pointing at that URL." >&2
  exit 2
fi

bash "${ROOT_DIR}/scripts/staging/check-backend-ready.sh" \
  "${GASTIFY_STAGING_E2E_API_BASE_URL}"

cd "${ROOT_DIR}/mobile"

export MAESTRO_DEVICE_ID="${MAESTRO_DEVICE_ID:-RFCW90N4BYP}"
export MAESTRO_REINSTALL_DRIVER="${MAESTRO_REINSTALL_DRIVER:-false}"
export MAESTRO_VERBOSE="${MAESTRO_VERBOSE:-true}"
export GASTIFY_RESULT_ENV="${GASTIFY_RESULT_ENV:-${GASTIFY_ARTIFACT_ENV:-staging-e2e}}"
export EXPO_PUBLIC_APP_ENV="${EXPO_PUBLIC_APP_ENV:-staging-e2e}"
export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-${GASTIFY_STAGING_E2E_API_BASE_URL}}"
export GASTIFY_MOBILE_RUN_ID="${GASTIFY_MOBILE_RUN_ID:-$(date -u '+%Y%m%dT%H%M%SZ')-staging-e2e-s23-fixture-phase2}"
export GASTIFY_ENVIRONMENT="${GASTIFY_ENVIRONMENT:-staging-e2e}"
export GASTIFY_SCAN_PROVIDER="${GASTIFY_SCAN_PROVIDER:-fixture}"
export GASTIFY_MOBILE_BUILD_ID="${GASTIFY_MOBILE_BUILD_ID:-dev-client}"

npm run maestro:scan-upload:happy:active
npm run maestro:scan-upload:review:active
npm run maestro:scan-upload:failure:active
npm run maestro:camera-permission-denied:active
