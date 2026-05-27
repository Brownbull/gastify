#!/usr/bin/env bash
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

SOURCE_PDF="${GASTIFY_STATEMENT_FIXTURE_PDF:-${ROOT_DIR}/prompt-testing/test-cases/statements/private/cmr/cmr202503.pdf}"
DEST_NAME="${GASTIFY_STATEMENT_FIXTURE_FILENAME:-gastify-statement-e2e.pdf}"
DEST_DIR="${GASTIFY_STATEMENT_DEVICE_DIR:-/sdcard/Download/GastifyE2E}"
DEST_PATH="${DEST_DIR}/${DEST_NAME}"

if [[ ! -f "${SOURCE_PDF}" ]]; then
  echo "Statement fixture PDF not found: ${SOURCE_PDF}" >&2
  echo "Set GASTIFY_STATEMENT_FIXTURE_PDF to a private local PDF fixture." >&2
  exit 2
fi

"${ADB_BIN_RESOLVED}" shell "mkdir -p '${DEST_DIR}'" >/dev/null
"${ADB_BIN_RESOLVED}" push "${SOURCE_PDF}" "${DEST_PATH}" >/dev/null
"${ADB_BIN_RESOLVED}" shell am broadcast \
  -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
  -d "file://${DEST_PATH}" >/dev/null 2>&1 || true

echo "Seeded statement fixture at ${DEST_PATH}"
