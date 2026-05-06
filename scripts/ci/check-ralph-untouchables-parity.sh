#!/usr/bin/env bash
set -euo pipefail
# Gate #5: Per-feature scripts/ralph-*/prompt.md Untouchables match Critical Files list
# Source: RALPH-viability W1 / Phase B
#
# Compares every scripts/ralph-*/prompt.md Untouchables section against the
# canonical list. Fails the build if any prompt.md is missing an entry.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# Canonical untouchables (from PLAN-FULL-PIVOT.md "Untouchable by RALPH" section)
CANONICAL=(
  "backend/**"
  "frontend/src/api-client/**"
  ".kdbp/**"
  "docs/rebuild/ux/reference-stories/**"
  "frontend/src/features/reports/utils/printUtils.ts"
  "tests/contract/generated/**"
  "shared/types/scan-events.ts"
  "scripts/migrate/**"
)

FAIL=0
CHECKED=0

# Per-feature RALPH iteration instances (registered set from PLAN-FULL-PIVOT.md)
RALPH_INSTANCES=(
  "scripts/ralph-atoms-molecules"
  "scripts/ralph-features-dashboard"
  "scripts/ralph-features-history"
  "scripts/ralph-features-analytics"
  "scripts/ralph-features-items"
  "scripts/ralph-features-scan"
  "scripts/ralph-features-settings"
)

for instance_dir in "${RALPH_INSTANCES[@]}"; do
  prompt_file="$instance_dir/prompt.md"
  if [ ! -f "$prompt_file" ]; then
    echo "WARN: $prompt_file not found — skipping"
    continue
  fi

  instance=$(basename "$instance_dir")
  CHECKED=$((CHECKED + 1))

  # Extract lines between ## Untouchables and the next ## heading
  untouchables_section=$(sed -n '/^## Untouchables/,/^## /p' "$prompt_file" | head -n -1)

  MISSING=()
  for entry in "${CANONICAL[@]}"; do
    if ! echo "$untouchables_section" | grep -qF "$entry"; then
      MISSING+=("$entry")
    fi
  done

  if [ ${#MISSING[@]} -gt 0 ]; then
    echo "FAIL: $instance/prompt.md missing untouchable entries:"
    for m in "${MISSING[@]}"; do
      echo "  - $m"
    done
    FAIL=1
  else
    echo "PASS: $instance/prompt.md — all ${#CANONICAL[@]} untouchables present"
  fi
done

if [ "$CHECKED" -eq 0 ]; then
  echo "SKIP: No per-feature RALPH instances found."
  exit 0
fi

echo ""
echo "Checked $CHECKED instances against ${#CANONICAL[@]} canonical untouchables."

if [ "$FAIL" -eq 1 ]; then
  echo "FAILED: Update Untouchables sections to match PLAN-FULL-PIVOT.md."
  exit 1
fi

echo "PASS: All RALPH instances have complete Untouchables lists."
