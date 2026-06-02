#!/usr/bin/env bash
# Statement reconciliation e2e — seeds a receipt scan first so reconciliation
# has matching app transactions (the "Add transaction" assertion needs at least
# one statement-only row, and the "Matched" bucket needs at least one match).
#
# Idempotent: safe to re-run. Seeds the happy receipt fixture, runs the scan-
# upload flow (creates a Supermercado Jumbo transaction), THEN runs the statement
# reconciliation flow. The statement flow itself uploads the e2e PDF + reconciles.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${ROOT_DIR}"

# shellcheck source=tests/mobile/scripts/android-tooling.sh
source "${ROOT_DIR}/tests/mobile/scripts/android-tooling.sh"
export_android_tooling

ADB_BIN_RESOLVED="$(resolve_adb_bin || true)"
if [[ -z "${ADB_BIN_RESOLVED}" ]]; then
  echo "Android Debug Bridge is not available." >&2
  exit 127
fi

echo "=== STEP 1: seed receipt data (happy scan) for reconciliation matching ==="
bash "${ROOT_DIR}/tests/mobile/scripts/run-scan-upload-maestro.sh" happy
echo ""
echo "=== STEP 2: run statement reconciliation flow ==="
bash "${ROOT_DIR}/tests/mobile/scripts/run-maestro.sh" \
  tests/mobile/maestro/p5-phase6-statement-reconciliation-active.yaml
