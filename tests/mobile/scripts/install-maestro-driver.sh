#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${ROOT_DIR}"

# shellcheck source=tests/mobile/scripts/android-tooling.sh
source "${ROOT_DIR}/tests/mobile/scripts/android-tooling.sh"
export_android_tooling

MAESTRO_CLIENT_JAR="${MAESTRO_CLIENT_JAR:-${HOME}/.maestro/lib/maestro-client.jar}"
DRIVER_CACHE_DIR="${DRIVER_CACHE_DIR:-${HOME}/.cache/gastify/maestro-driver}"

if [[ ! -f "${MAESTRO_CLIENT_JAR}" ]]; then
  echo "Maestro client jar not found at ${MAESTRO_CLIENT_JAR}." >&2
  exit 127
fi

ADB_BIN_RESOLVED="$(resolve_adb_bin || true)"
if [[ -z "${ADB_BIN_RESOLVED}" ]]; then
  echo "Android Debug Bridge is not available. Connect the Samsung S23 and check mobile/ANDROID_E2E_SETUP.md." >&2
  exit 127
fi

mkdir -p "${DRIVER_CACHE_DIR}"
unzip -o "${MAESTRO_CLIENT_JAR}" maestro-app.apk maestro-server.apk -d "${DRIVER_CACHE_DIR}" >/dev/null

"${ADB_BIN_RESOLVED}" install -r "${DRIVER_CACHE_DIR}/maestro-app.apk"
"${ADB_BIN_RESOLVED}" install -r "${DRIVER_CACHE_DIR}/maestro-server.apk"

"${ADB_BIN_RESOLVED}" shell pm list packages --user 0 | grep 'dev.mobile.maestro'
"${ADB_BIN_RESOLVED}" shell cmd package list instrumentation | grep 'dev.mobile.maestro'

echo "Maestro Android driver packages installed."
