#!/usr/bin/env bash
set -euo pipefail

CASE="${1:-happy}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# shellcheck source=tests/mobile/scripts/android-tooling.sh
source "${ROOT_DIR}/tests/mobile/scripts/android-tooling.sh"
export_android_tooling

ADB_BIN_RESOLVED="$(resolve_adb_bin || true)"
if [[ -z "${ADB_BIN_RESOLVED}" ]]; then
  echo "Android Debug Bridge is not available." >&2
  exit 127
fi

APP_ID="${APP_ID:-com.gastify.mobile}"
export GASTIFY_RESULT_ENV="${GASTIFY_RESULT_ENV:-${GASTIFY_ARTIFACT_ENV:-${EXPO_PUBLIC_APP_ENV:-local}}}"
export GASTIFY_MOBILE_RUN_ID="${GASTIFY_MOBILE_RUN_ID:-$(date -u '+%Y%m%dT%H%M%SZ')-${GASTIFY_RESULT_ENV}-s23-scan-${CASE}}"

if [[ "${GASTIFY_E2E_FORCE_RESTART:-false}" =~ ^(1|true|TRUE|yes|YES)$ ]]; then
  "${ADB_BIN_RESOLVED}" shell am force-stop "${APP_ID}" >/dev/null 2>&1 || true
  "${ADB_BIN_RESOLVED}" shell monkey -p "${APP_ID}" 1 >/dev/null 2>&1 || true
  sleep "${GASTIFY_E2E_APP_LAUNCH_WAIT_S:-2}"
fi

case "${CASE}" in
  happy)
    FLOW="tests/mobile/maestro/p4-phase2-scan-upload-happy-active.yaml"
    export GASTIFY_SCAN_TEST_CASE_ID="happy"
    "${ROOT_DIR}/tests/mobile/scripts/seed-scan-fixture.sh" happy
    ;;
  review|low-confidence)
    FLOW="tests/mobile/maestro/p4-phase2-scan-upload-review-active.yaml"
    export GASTIFY_SCAN_TEST_CASE_ID="review"
    "${ROOT_DIR}/tests/mobile/scripts/seed-scan-fixture.sh" review
    ;;
  failure|failed)
    FLOW="tests/mobile/maestro/p4-phase2-scan-upload-failure-active.yaml"
    export GASTIFY_SCAN_TEST_CASE_ID="failure"
    "${ROOT_DIR}/tests/mobile/scripts/seed-scan-fixture.sh" failure
    ;;
  camera-denied)
    FLOW="tests/mobile/maestro/p4-phase2-camera-permission-denied-active.yaml"
    export GASTIFY_SCAN_TEST_CASE_ID="camera-permission"
    "${ADB_BIN_RESOLVED}" shell pm revoke "${APP_ID}" android.permission.CAMERA >/dev/null 2>&1 || true
    "${ADB_BIN_RESOLVED}" shell appops set "${APP_ID}" CAMERA ignore >/dev/null 2>&1 || true
    ;;
  *)
    echo "Usage: $0 [happy|review|failure|camera-denied]" >&2
    exit 2
    ;;
esac

"${ADB_BIN_RESOLVED}" reverse tcp:8000 tcp:8000 >/dev/null || true
"${ADB_BIN_RESOLVED}" reverse tcp:8081 tcp:8081 >/dev/null || true

export MAESTRO_REINSTALL_DRIVER="${MAESTRO_REINSTALL_DRIVER:-false}"
"${ROOT_DIR}/tests/mobile/scripts/run-maestro.sh" "${FLOW}"
