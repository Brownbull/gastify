#!/usr/bin/env bash
set -euo pipefail
# A.20: Run all k6 performance baseline scenarios against the target environment.
# Usage: BASE_URL=https://app.gastify.cl AUTH_TOKEN=<token> ./run-baseline.sh

: "${BASE_URL:?BASE_URL required}"
: "${AUTH_TOKEN:?AUTH_TOKEN required}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/../../docs/rebuild/perf"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
MONTH=$(date -u +"%Y-%m")

echo "=== Gastify Performance Baseline ==="
echo "Target: $BASE_URL"
echo "Timestamp: $TIMESTAMP"
echo ""

if ! command -v k6 &> /dev/null; then
  echo "ERROR: k6 not installed. Install from https://k6.io/docs/get-started/installation/"
  exit 1
fi

SCENARIOS=(
  "dashboard-cold-load"
  "scan-submission"
  "monthly-view-load"
  "statement-reconciliation"
  "list-pagination"
  "dsr-endpoints"
)

RESULTS="{\"captured_at\": \"$TIMESTAMP\", \"target\": \"$BASE_URL\", \"scenarios\": {}}"

for scenario in "${SCENARIOS[@]}"; do
  SCRIPT="$SCRIPT_DIR/scenarios/${scenario}.js"
  if [ ! -f "$SCRIPT" ]; then
    echo "SKIP: $SCRIPT not found"
    continue
  fi
  echo "--- Running: $scenario ---"
  k6 run --out json="$OUTPUT_DIR/${scenario}-raw.json" \
    -e BASE_URL="$BASE_URL" \
    -e AUTH_TOKEN="$AUTH_TOKEN" \
    "$SCRIPT" || echo "WARN: $scenario completed with errors"
  echo ""
done

echo "=== Baseline Complete ==="
echo "Raw output: $OUTPUT_DIR/*-raw.json"
echo "Aggregate to: $OUTPUT_DIR/baseline-${MONTH}.json"
