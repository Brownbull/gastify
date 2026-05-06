#!/bin/bash
# RALPH cost tracker — outer-loop MAX_USD_PER_DAY enforcement
# Reads per-instance progress.txt cost lines and pauses all instances on cap.
#
# Usage:
#   ./ralph-cost-tracker.sh check   — exit 0 if under cap, exit 1 if over
#   ./ralph-cost-tracker.sh report  — print daily cost summary

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAX_USD_PER_DAY="${MAX_USD_PER_DAY:-20}"
TODAY=$(date -u +%Y-%m-%d)

RALPH_INSTANCES=(
  "$SCRIPT_DIR/ralph-atoms-molecules"
  "$SCRIPT_DIR/ralph-features-dashboard"
  "$SCRIPT_DIR/ralph-features-history"
  "$SCRIPT_DIR/ralph-features-analytics"
  "$SCRIPT_DIR/ralph-features-items"
  "$SCRIPT_DIR/ralph-features-scan"
  "$SCRIPT_DIR/ralph-features-settings"
)

sum_daily_cost() {
  local total=0
  for instance_dir in "${RALPH_INSTANCES[@]}"; do
    local progress="$instance_dir/progress.txt"
    if [ -f "$progress" ]; then
      # Extract cost_usd lines from today's entries
      # Format: ## [YYYY-MM-DD HH:MM] - ... - cost_usd: $X.XX
      # or:     - cost_usd: $X.XX
      local instance_cost
      instance_cost=$(grep "$TODAY" "$progress" 2>/dev/null \
        | grep -oP 'cost_usd:\s*\$(\d+\.?\d*)' \
        | grep -oP '\d+\.?\d*' \
        | paste -sd+ - \
        | bc 2>/dev/null || echo "0")
      total=$(echo "$total + ${instance_cost:-0}" | bc 2>/dev/null || echo "$total")
    fi
  done
  echo "$total"
}

case "${1:-check}" in
  check)
    DAILY_COST=$(sum_daily_cost)
    if [ "$(echo "$DAILY_COST >= $MAX_USD_PER_DAY" | bc 2>/dev/null)" = "1" ]; then
      echo "RALPH daily cost cap exceeded: \$$DAILY_COST / \$$MAX_USD_PER_DAY (UTC $TODAY)"
      exit 1
    fi
    echo "RALPH daily cost OK: \$$DAILY_COST / \$$MAX_USD_PER_DAY (UTC $TODAY)"
    exit 0
    ;;
  report)
    echo "=== RALPH Daily Cost Report — $TODAY ==="
    echo "Cap: \$$MAX_USD_PER_DAY/day"
    echo ""
    GRAND_TOTAL=0
    for instance_dir in "${RALPH_INSTANCES[@]}"; do
      local_name=$(basename "$instance_dir")
      progress="$instance_dir/progress.txt"
      if [ -f "$progress" ]; then
        cost=$(grep "$TODAY" "$progress" 2>/dev/null \
          | grep -oP 'cost_usd:\s*\$(\d+\.?\d*)' \
          | grep -oP '\d+\.?\d*' \
          | paste -sd+ - \
          | bc 2>/dev/null || echo "0")
        iters=$(grep "$TODAY" "$progress" 2>/dev/null \
          | grep -c "Iteration" || echo "0")
        echo "  $local_name: \$${cost:-0.00} ($iters iterations)"
        GRAND_TOTAL=$(echo "$GRAND_TOTAL + ${cost:-0}" | bc 2>/dev/null || echo "$GRAND_TOTAL")
      else
        echo "  $local_name: no progress.txt"
      fi
    done
    echo ""
    echo "  TOTAL: \$$GRAND_TOTAL / \$$MAX_USD_PER_DAY"
    REMAINING=$(echo "$MAX_USD_PER_DAY - $GRAND_TOTAL" | bc 2>/dev/null || echo "?")
    echo "  Remaining: \$$REMAINING"
    ;;
  *)
    echo "Usage: $0 {check|report}"
    exit 1
    ;;
esac
