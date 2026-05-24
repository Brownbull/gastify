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

# Seed before opening the gallery-driven golden flow.
bash "${ROOT_DIR}/tests/mobile/scripts/seed-scan-fixture.sh" happy

# Keep the localhost Metro dev-client reachable from the USB-attached S23 when
# the gate is run from WSL with a locally hosted Expo server.
# shellcheck source=tests/mobile/scripts/android-tooling.sh
source "${ROOT_DIR}/tests/mobile/scripts/android-tooling.sh"
export_android_tooling
ADB_BIN_RESOLVED="$(resolve_adb_bin || true)"
if [[ -n "${ADB_BIN_RESOLVED}" ]]; then
  "${ADB_BIN_RESOLVED}" reverse tcp:8081 tcp:8081 >/dev/null || true
fi

cd "${ROOT_DIR}/mobile"

export MAESTRO_DEVICE_ID="${MAESTRO_DEVICE_ID:-RFCW90N4BYP}"
export MAESTRO_REINSTALL_DRIVER="${MAESTRO_REINSTALL_DRIVER:-false}"
export MAESTRO_VERBOSE="${MAESTRO_VERBOSE:-true}"
export GASTIFY_RESULT_ENV="${GASTIFY_RESULT_ENV:-${GASTIFY_ARTIFACT_ENV:-staging-e2e}}"
export EXPO_PUBLIC_APP_ENV="${EXPO_PUBLIC_APP_ENV:-staging-e2e}"
export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-${GASTIFY_STAGING_E2E_API_BASE_URL}}"
export GASTIFY_MOBILE_RUN_ID="${GASTIFY_MOBILE_RUN_ID:-$(date -u '+%Y%m%dT%H%M%SZ')-staging-e2e-s23-phase5-gate}"
export GASTIFY_ENVIRONMENT="${GASTIFY_ENVIRONMENT:-staging-e2e}"
export GASTIFY_SCAN_PROVIDER="${GASTIFY_SCAN_PROVIDER:-fixture}"
export GASTIFY_MOBILE_BUILD_ID="${GASTIFY_MOBILE_BUILD_ID:-dev-client}"
export GASTIFY_SCAN_TEST_CASE_ID="${GASTIFY_SCAN_TEST_CASE_ID:-happy}"

npm run maestro:phase5:golden:active
npm run maestro:scan-upload:review:active
npm run maestro:scan-upload:failure:active
npm run maestro:camera-permission-denied:active
