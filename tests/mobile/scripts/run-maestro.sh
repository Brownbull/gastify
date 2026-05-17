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
LATEST_DIR="tests/mobile/artifacts/latest/${FLOW_NAME}"
ARCHIVE_ROOT="tests/mobile/artifacts/archive"

if [[ "${ARCHIVE_PREVIOUS}" == "true" && -d "${LATEST_DIR}" ]]; then
  mkdir -p "${ARCHIVE_ROOT}"
  ARCHIVE_DIR="${ARCHIVE_ROOT}/$(date '+%Y-%m-%d_%H%M%S')-${FLOW_NAME}"
  mv "${LATEST_DIR}" "${ARCHIVE_DIR}"
  echo "Archived previous run to ${ARCHIVE_DIR}"
fi

rm -rf "${LATEST_DIR}"
mkdir -p "${LATEST_DIR}"

MAESTRO_GLOBAL_ARGS=()
case "${MAESTRO_VERBOSE:-false}" in
  1|true|TRUE|yes|YES)
    MAESTRO_GLOBAL_ARGS+=(--verbose)
    ;;
esac

MAESTRO_TEST_ARGS=(
  test
  --platform android
  --test-output-dir="${LATEST_DIR}"
  --debug-output="${LATEST_DIR}"
  --format html
  --output="${LATEST_DIR}/report.html"
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

echo "Mobile E2E artifacts written to ${LATEST_DIR}"
