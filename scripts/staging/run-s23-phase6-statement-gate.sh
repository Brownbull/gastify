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

DEFAULT_STAGE_ID="$(date -u '+%Y%m%d')-phase6-s23-statement-gate"

if [[ "${GASTIFY_SKIP_STATEMENT_BACKEND_FIXTURE_GATE:-false}" != "true" ]]; then
  (
    cd "${ROOT_DIR}/backend"
    uv run python ../scripts/staging/run-statement-fixture-gate.py \
      --api-base-url "${GASTIFY_STAGING_E2E_API_BASE_URL}" \
      --stage-id "${GASTIFY_MOBILE_STAGE_ID:-${GASTIFY_MOBILE_RUN_STAGE_ID:-${DEFAULT_STAGE_ID}}}" \
      --seed-fixture-transactions \
      --seed-20-day-receipt-history \
      --require-three-buckets
  )
fi

if [[ -z "${GASTIFY_STATEMENT_FIXTURE_PDF:-}" ]]; then
  UNIQUE_FIXTURE_DIR="${ROOT_DIR}/.tmp/mobile-statement-fixtures"
  UNIQUE_FIXTURE_PATH="${UNIQUE_FIXTURE_DIR}/$(date -u '+%Y%m%dT%H%M%SZ')-gastify-statement-e2e.pdf"
  mkdir -p "${UNIQUE_FIXTURE_DIR}"
  (
    cd "${ROOT_DIR}/backend"
    uv run python - "${UNIQUE_FIXTURE_PATH}" <<'PY'
import sys
from pathlib import Path

from pypdf import PdfWriter

path = Path(sys.argv[1])
writer = PdfWriter()
writer.add_blank_page(width=144, height=144)
writer.add_metadata({"/Title": f"Gastify S23 statement fixture {path.stem}"})
with path.open("wb") as handle:
    writer.write(handle)
PY
  )
  export GASTIFY_STATEMENT_FIXTURE_PDF="${UNIQUE_FIXTURE_PATH}"
fi

bash "${ROOT_DIR}/tests/mobile/scripts/seed-statement-fixture.sh"

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

DEFAULT_ATTEMPT_ID="$(date -u '+%H%M%SZ')"

if [[ -z "${GASTIFY_MOBILE_STAGE_ID:-${GASTIFY_MOBILE_RUN_STAGE_ID:-}}" && "${GASTIFY_MOBILE_RUN_ID:-}" =~ ^(.+)-r([0-9]+)$ ]]; then
  export GASTIFY_MOBILE_STAGE_ID="${BASH_REMATCH[1]}"
  export GASTIFY_MOBILE_ATTEMPT_ID="r${BASH_REMATCH[2]}"
else
  export GASTIFY_MOBILE_STAGE_ID="${GASTIFY_MOBILE_STAGE_ID:-${GASTIFY_MOBILE_RUN_STAGE_ID:-${DEFAULT_STAGE_ID}}}"
  export GASTIFY_MOBILE_ATTEMPT_ID="${GASTIFY_MOBILE_ATTEMPT_ID:-${GASTIFY_MOBILE_RUN_ATTEMPT_ID:-${DEFAULT_ATTEMPT_ID}}}"
fi

export MAESTRO_DEVICE_ID="${MAESTRO_DEVICE_ID:-RFCW90N4BYP}"
export MAESTRO_REINSTALL_DRIVER="${MAESTRO_REINSTALL_DRIVER:-false}"
export MAESTRO_VERBOSE="${MAESTRO_VERBOSE:-true}"
export GASTIFY_RESULT_ENV="${GASTIFY_RESULT_ENV:-${GASTIFY_ARTIFACT_ENV:-staging-e2e}}"
export EXPO_PUBLIC_APP_ENV="${EXPO_PUBLIC_APP_ENV:-staging-e2e}"
export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-${GASTIFY_STAGING_E2E_API_BASE_URL}}"
export GASTIFY_MOBILE_RUN_ID="${GASTIFY_MOBILE_STAGE_ID}"
export GASTIFY_ENVIRONMENT="${GASTIFY_ENVIRONMENT:-staging-e2e}"
export GASTIFY_SCAN_PROVIDER="${GASTIFY_SCAN_PROVIDER:-fixture}"
export GASTIFY_STATEMENT_PROVIDER="${GASTIFY_STATEMENT_PROVIDER:-fixture}"
export GASTIFY_MOBILE_BUILD_ID="${GASTIFY_MOBILE_BUILD_ID:-dev-client}"

npm run maestro:statement:active
