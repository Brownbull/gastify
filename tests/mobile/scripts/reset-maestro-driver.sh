#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${ROOT_DIR}"

# shellcheck source=tests/mobile/scripts/android-tooling.sh
source "${ROOT_DIR}/tests/mobile/scripts/android-tooling.sh"
export_android_tooling

ADB_BIN_RESOLVED="$(resolve_adb_bin || true)"
if [[ -z "${ADB_BIN_RESOLVED}" ]]; then
  echo "Android Debug Bridge is not available. Connect the Samsung S23 and check mobile/ANDROID_E2E_SETUP.md." >&2
  exit 127
fi

"${ADB_BIN_RESOLVED}" uninstall dev.mobile.maestro.test >/dev/null 2>&1 || true
"${ADB_BIN_RESOLVED}" uninstall dev.mobile.maestro >/dev/null 2>&1 || true

if "${ADB_BIN_RESOLVED}" shell pm list packages --user 0 | grep -q 'dev.mobile.maestro'; then
  echo "Maestro driver packages are still present after reset:" >&2
  "${ADB_BIN_RESOLVED}" shell pm list packages --user 0 | grep 'dev.mobile.maestro' >&2
  exit 1
fi

echo "Maestro Android driver packages reset."
