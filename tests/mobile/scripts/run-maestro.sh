#!/usr/bin/env bash
set -euo pipefail

FLOW="${1:-tests/mobile/maestro/p4-phase1-smoke.yaml}"
ARCHIVE_PREVIOUS="false"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${ROOT_DIR}"

# shellcheck source=tests/mobile/scripts/android-tooling.sh
source "${ROOT_DIR}/tests/mobile/scripts/android-tooling.sh"
export_android_tooling

if [[ "${FLOW}" == "--archive" ]]; then
  ARCHIVE_PREVIOUS="true"
  FLOW="tests/mobile/maestro/p4-phase1-smoke.yaml"
elif [[ "${2:-}" == "--archive" ]]; then
  ARCHIVE_PREVIOUS="true"
fi

MAESTRO_BIN="${MAESTRO_BIN:-$(command -v maestro || true)}"
if [[ -z "${MAESTRO_BIN}" && -x "${HOME}/.maestro/bin/maestro" ]]; then
  MAESTRO_BIN="${HOME}/.maestro/bin/maestro"
fi

if [[ -z "${MAESTRO_BIN}" ]]; then
  echo "maestro CLI is not installed or not on PATH." >&2
  exit 127
fi

ADB_BIN_RESOLVED="$(resolve_adb_bin || true)"
if [[ -z "${ADB_BIN_RESOLVED}" ]]; then
  echo "Android Debug Bridge is not available. Connect the Samsung S23 and check mobile/ANDROID_E2E_SETUP.md." >&2
  exit 127
fi

if grep -qi microsoft /proc/version 2>/dev/null; then
  ADB_REALPATH="$(realpath "${ADB_BIN_RESOLVED}" 2>/dev/null || printf "%s" "${ADB_BIN_RESOLVED}")"
  if [[ "${ADB_BIN_RESOLVED}" == *.exe || "${ADB_REALPATH}" == "${ROOT_DIR}/tests/mobile/bin/adb" ]]; then
    echo "ADB resolves to the Windows/WSL wrapper, but Maestro is running in WSL. Run ADB + Maestro together on Windows, or attach the S23 into WSL with usbipd-win and use native Linux adb." >&2
    exit 1
  fi
fi

if ! "${ADB_BIN_RESOLVED}" devices | awk 'NR > 1 && $2 == "device" { found = 1 } END { exit found ? 0 : 1 }'; then
  echo "No authorized Android device is visible to ADB. Enable USB debugging on the Samsung S23, approve the prompt, then rerun adb devices." >&2
  exit 1
fi

FLOW_NAME="$(basename "${FLOW}" .yaml)"
RESULT_ENV="${GASTIFY_RESULT_ENV:-${GASTIFY_ARTIFACT_ENV:-${EXPO_PUBLIC_APP_ENV:-local}}}"
RESULT_ROOT="${GASTIFY_MOBILE_RESULTS_ROOT:-${GASTIFY_MOBILE_ARTIFACT_ROOT:-tests/mobile/results}}"
STAGE_ID="${GASTIFY_MOBILE_STAGE_ID:-${GASTIFY_MOBILE_RUN_STAGE_ID:-}}"
ATTEMPT_ID="${GASTIFY_MOBILE_ATTEMPT_ID:-${GASTIFY_MOBILE_RUN_ATTEMPT_ID:-}}"
if [[ -n "${STAGE_ID}" ]]; then
  RUN_ID="${STAGE_ID}"
  ATTEMPT_ID="${ATTEMPT_ID:-$(date -u '+%Y%m%dT%H%M%SZ')}"
  RUN_DIR="${RESULT_ROOT}/runs/${RESULT_ENV}/${STAGE_ID}"
  ATTEMPT_DIR="${RUN_DIR}/attempts/${ATTEMPT_ID}"
  RESULT_DIR="${ATTEMPT_DIR}/${FLOW_NAME}"
  RESULT_LAYOUT="mobile-stage-run-folder-v1"
  FLOW_MANIFEST_GLOB="attempts/${ATTEMPT_ID}/*/manifest.json"
else
  RUN_ID="${GASTIFY_MOBILE_RUN_ID:-$(date -u '+%Y%m%dT%H%M%SZ')-${RESULT_ENV}-${FLOW_NAME}}"
  ATTEMPT_DIR=""
  RESULT_DIR="${RESULT_ROOT}/runs/${RESULT_ENV}/${RUN_ID}/${FLOW_NAME}"
  RUN_DIR="${RESULT_ROOT}/runs/${RESULT_ENV}/${RUN_ID}"
  RESULT_LAYOUT="mobile-run-folder-v1"
  FLOW_MANIFEST_GLOB="*/manifest.json"
fi
LATEST_ENV_DIR="${RESULT_ROOT}/latest/${RESULT_ENV}"
LATEST_DIR="${LATEST_ENV_DIR}/${FLOW_NAME}"
GIT_REV="$(git rev-parse --short HEAD 2>/dev/null || true)"
GIT_DIRTY_COUNT="$(git status --short 2>/dev/null | wc -l | tr -d ' ')"

if [[ "${ARCHIVE_PREVIOUS}" == "true" ]]; then
  echo "--archive is no longer required; durable results are written to ${RUN_DIR}."
fi

rm -rf "${RESULT_DIR}"
mkdir -p "${RESULT_DIR}" "${LATEST_ENV_DIR}"

json_escape() {
  printf "%s" "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

write_run_manifest() {
  local attempt_count
  local flow_count
  if [[ -n "${STAGE_ID}" ]]; then
    flow_count="$(find "${ATTEMPT_DIR}" -mindepth 2 -maxdepth 2 -name manifest.json 2>/dev/null | wc -l | tr -d ' ')"
    attempt_count="$(find "${RUN_DIR}/attempts" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')"
  else
    flow_count="$(find "${RUN_DIR}" -mindepth 2 -maxdepth 2 -name manifest.json 2>/dev/null | wc -l | tr -d ' ')"
    attempt_count="0"
  fi
  cat >"${RUN_DIR}/run-manifest.json" <<JSON
{
  "schema": "mobile-e2e-run-manifest.v2",
  "result_layout": "$(json_escape "${RESULT_LAYOUT}")",
  "run_id": "$(json_escape "${RUN_ID}")",
  "stage_id": "$(json_escape "${STAGE_ID}")",
  "latest_attempt_id": "$(json_escape "${ATTEMPT_ID}")",
  "result_environment": "$(json_escape "${RESULT_ENV}")",
  "run_dir": "$(json_escape "${RUN_DIR}")",
  "current_attempt_dir": "$(json_escape "${ATTEMPT_DIR}")",
  "updated_at": "$(date -Iseconds)",
  "device_id": "$(json_escape "${MAESTRO_DEVICE_ID:-${MAESTRO_UDID:-}}")",
  "app_env": "$(json_escape "${EXPO_PUBLIC_APP_ENV:-}")",
  "api_base_url": "$(json_escape "${EXPO_PUBLIC_API_BASE_URL:-}")",
  "backend_environment": "$(json_escape "${GASTIFY_ENVIRONMENT:-}")",
  "scan_provider": "$(json_escape "${GASTIFY_SCAN_PROVIDER:-}")",
  "build_id": "$(json_escape "${GASTIFY_MOBILE_BUILD_ID:-}")",
  "git_rev": "$(json_escape "${GIT_REV}")",
  "git_dirty_file_count": ${GIT_DIRTY_COUNT:-0},
  "flow_manifest_glob": "$(json_escape "${FLOW_MANIFEST_GLOB}")",
  "flow_manifest_count": ${flow_count:-0},
  "attempt_count": ${attempt_count:-0}
}
JSON
}

sync_latest() {
  rm -rf "${LATEST_DIR}"
  mkdir -p "${LATEST_ENV_DIR}"
  cp -a "${RESULT_DIR}" "${LATEST_DIR}"
  cp "${RUN_DIR}/run-manifest.json" "${LATEST_ENV_DIR}/run-manifest.json"
  printf "%s\n" "${RUN_ID}" >"${LATEST_ENV_DIR}/CURRENT_RUN.txt"
  if [[ -n "${STAGE_ID}" ]]; then
    printf "%s\n" "${STAGE_ID}" >"${LATEST_ENV_DIR}/CURRENT_STAGE.txt"
    printf "%s\n" "${ATTEMPT_ID}" >"${LATEST_ENV_DIR}/CURRENT_ATTEMPT.txt"
  fi
}

write_manifest() {
  local result_status="$1"
  local exit_code="$2"
  cat >"${RESULT_DIR}/manifest.json" <<JSON
{
  "schema": "mobile-e2e-flow-manifest.v3",
  "result_layout": "$(json_escape "${RESULT_LAYOUT}")",
  "run_id": "$(json_escape "${RUN_ID}")",
  "stage_id": "$(json_escape "${STAGE_ID}")",
  "attempt_id": "$(json_escape "${ATTEMPT_ID}")",
  "result_environment": "${RESULT_ENV}",
  "flow": "${FLOW}",
  "flow_name": "${FLOW_NAME}",
  "generated_at": "$(date -Iseconds)",
  "run_dir": "$(json_escape "${RUN_DIR}")",
  "attempt_dir": "$(json_escape "${ATTEMPT_DIR}")",
  "result_dir": "$(json_escape "${RESULT_DIR}")",
  "latest_dir": "$(json_escape "${LATEST_DIR}")",
  "device_id": "${MAESTRO_DEVICE_ID:-${MAESTRO_UDID:-}}",
  "app_env": "${EXPO_PUBLIC_APP_ENV:-}",
  "api_base_url": "${EXPO_PUBLIC_API_BASE_URL:-}",
  "backend_environment": "${GASTIFY_ENVIRONMENT:-}",
  "scan_provider": "${GASTIFY_SCAN_PROVIDER:-}",
  "build_id": "${GASTIFY_MOBILE_BUILD_ID:-}",
  "test_case_id": "${GASTIFY_SCAN_TEST_CASE_ID:-}",
  "git_rev": "$(json_escape "${GIT_REV}")",
  "git_dirty_file_count": ${GIT_DIRTY_COUNT:-0},
  "result_status": "${result_status}",
  "exit_code": ${exit_code}
}
JSON
  write_run_manifest
  sync_latest
}

write_failure_manifest() {
  local exit_code="$?"
  if [[ "${exit_code}" -ne 0 && ! -f "${RESULT_DIR}/manifest.json" ]]; then
    write_manifest "failed" "${exit_code}"
  fi
}
trap write_failure_manifest EXIT

write_run_manifest

MAESTRO_GLOBAL_ARGS=()
case "${MAESTRO_VERBOSE:-false}" in
  1|true|TRUE|yes|YES)
    MAESTRO_GLOBAL_ARGS+=(--verbose)
    ;;
esac
if [[ -n "${MAESTRO_DEVICE_ID:-${MAESTRO_UDID:-}}" ]]; then
  MAESTRO_GLOBAL_ARGS+=(--device "${MAESTRO_DEVICE_ID:-${MAESTRO_UDID:-}}")
fi

MAESTRO_TEST_ARGS=(
  test
  --platform android
  --test-output-dir="${RESULT_DIR}"
  --debug-output="${RESULT_DIR}"
  --format html
  --output="${RESULT_DIR}/report.html"
)

case "${MAESTRO_REINSTALL_DRIVER:-true}" in
  0|false|FALSE|no|NO)
    MAESTRO_TEST_ARGS+=(--no-reinstall-driver)
    ;;
esac

MAESTRO_CLI_NO_ANALYTICS=1 \
MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true \
"${MAESTRO_BIN}" "${MAESTRO_GLOBAL_ARGS[@]}" "${MAESTRO_TEST_ARGS[@]}" \
  "${FLOW}"

write_manifest "passed" 0

echo "Mobile E2E results written to ${RESULT_DIR}"
echo "Latest mirror updated at ${LATEST_DIR}"
