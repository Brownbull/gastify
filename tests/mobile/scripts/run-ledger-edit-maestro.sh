#!/usr/bin/env bash
# P84 runner: seed → ledger-edit Maestro flow → cleanup (always, via trap).
set -euo pipefail

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
export GASTIFY_MOBILE_RUN_ID="${GASTIFY_MOBILE_RUN_ID:-$(date -u '+%Y%m%dT%H%M%SZ')-${GASTIFY_RESULT_ENV}-s23-ledger-edit}"

FLOW="tests/mobile/maestro/p4-phase3-ledger-edit-active.yaml"

cleanup() {
  "${ROOT_DIR}/tests/mobile/scripts/seed-ledger-edit-txn.sh" cleanup || true
}
trap cleanup EXIT

"${ROOT_DIR}/tests/mobile/scripts/seed-ledger-edit-txn.sh" seed

if [[ "${GASTIFY_E2E_FORCE_RESTART:-true}" =~ ^(1|true|TRUE|yes|YES)$ ]]; then
  "${ADB_BIN_RESOLVED}" shell am force-stop "${APP_ID}" >/dev/null 2>&1 || true
  "${ADB_BIN_RESOLVED}" shell monkey -p "${APP_ID}" 1 >/dev/null 2>&1 || true
  sleep "${GASTIFY_E2E_APP_LAUNCH_WAIT_S:-2}"
fi

"${ADB_BIN_RESOLVED}" reverse tcp:8000 tcp:8000 >/dev/null || true
"${ADB_BIN_RESOLVED}" reverse tcp:8081 tcp:8081 >/dev/null || true

export MAESTRO_REINSTALL_DRIVER="${MAESTRO_REINSTALL_DRIVER:-false}"
"${ROOT_DIR}/tests/mobile/scripts/run-maestro.sh" "${FLOW}"
