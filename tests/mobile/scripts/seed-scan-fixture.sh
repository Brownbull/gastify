#!/usr/bin/env bash
set -euo pipefail

CASE="${1:-all}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
FIXTURE_DIR="${ROOT_DIR}/tests/mobile/fixtures/receipts"
DEVICE_DIR="${GASTIFY_E2E_DEVICE_RECEIPT_DIR:-/sdcard/Pictures/GastifyE2E}"

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
  exit 1
fi

case "${CASE}" in
  happy) FILES=("gastify-e2e-happy.jpg") ;;
  review|low-confidence) FILES=("gastify-e2e-review.jpg") ;;
  failure|failed) FILES=("gastify-e2e-failure.jpg") ;;
  all) FILES=("gastify-e2e-happy.jpg" "gastify-e2e-review.jpg" "gastify-e2e-failure.jpg") ;;
  *)
    echo "Usage: $0 [happy|review|failure|all]" >&2
    exit 2
    ;;
esac

"${ADB_BIN_RESOLVED}" shell "mkdir -p '${DEVICE_DIR}'"
"${ADB_BIN_RESOLVED}" shell "rm -f '${DEVICE_DIR}'/gastify-e2e-*.jpg"
# Drop stale MediaStore rows for the just-deleted fixtures, otherwise the photo
# picker keeps showing phantom thumbnails for files that no longer exist on disk
# — which makes the "first thumbnail" tap (point 16%,50%) select the WRONG
# fixture when flows run back-to-back. (MEDIA_SCANNER_SCAN_FILE only indexes a
# file that EXISTS; it does not retract deletions.)
"${ADB_BIN_RESOLVED}" shell "content delete --uri content://media/external/images/media --where \"_data LIKE '%/gastify-e2e-%'\"" >/dev/null 2>&1 || true

for file in "${FILES[@]}"; do
  local_path="${FIXTURE_DIR}/${file}"
  if [[ ! -f "${local_path}" ]]; then
    echo "Missing fixture ${local_path}" >&2
    exit 1
  fi
  remote_path="${DEVICE_DIR}/${file}"
  "${ADB_BIN_RESOLVED}" push "${local_path}" "${remote_path}" >/dev/null
  "${ADB_BIN_RESOLVED}" shell touch "${remote_path}" >/dev/null || true
  "${ADB_BIN_RESOLVED}" shell am broadcast \
    -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
    -d "file://${remote_path}" >/dev/null || true
  echo "Seeded ${remote_path}"
done
