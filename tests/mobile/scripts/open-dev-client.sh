#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${ROOT_DIR}"

# shellcheck source=tests/mobile/scripts/android-tooling.sh
source "${ROOT_DIR}/tests/mobile/scripts/android-tooling.sh"
export_android_tooling

APP_ID="${APP_ID:-com.gastify.mobile}"

if [[ -z "${EXPO_DEV_CLIENT_URL:-}" ]]; then
  echo "EXPO_DEV_CLIENT_URL is required. Copy the exp+gastify-mobile://... URL printed by npm run start:dev-client." >&2
  exit 2
fi

ADB_BIN_RESOLVED="$(resolve_adb_bin || true)"
if [[ -z "${ADB_BIN_RESOLVED}" ]]; then
  echo "Android Debug Bridge is not available. Connect the Samsung S23 and check mobile/ANDROID_E2E_SETUP.md." >&2
  exit 127
fi

if [[ "${CLEAR_APP_STATE:-false}" =~ ^(1|true|TRUE|yes|YES)$ ]]; then
  "${ADB_BIN_RESOLVED}" shell pm clear "${APP_ID}" >/dev/null
fi

"${ADB_BIN_RESOLVED}" shell am start \
  -a android.intent.action.VIEW \
  -d "${EXPO_DEV_CLIENT_URL}" \
  "${APP_ID}"

echo "Opened ${APP_ID} with Expo dev-client URL."
