#!/usr/bin/env bash
set -euo pipefail
# Gate #4: Four shared concerns cross-reference between A.13 and A.17
# Source: security W2 / A.17 four-concern table

A13="docs/rebuild/api/CROSS-CUTTING.md"
A17="backend/schema/SECURITY.md"

if [ ! -f "$A13" ] || [ ! -f "$A17" ]; then
  echo "FAIL: A.13 or A.17 file missing."
  exit 1
fi

CONCERNS=("Image-Prompt-Injection" "Idempotency" "RLS" "Erasure")

for concern in "${CONCERNS[@]}"; do
  if ! grep -qi "$concern" "$A13"; then
    echo "FAIL: A.13 missing concern: $concern"
    exit 1
  fi
  if ! grep -qi "$concern" "$A17"; then
    echo "FAIL: A.17 missing concern: $concern"
    exit 1
  fi
done

echo "PASS: All four A.13 ↔ A.17 shared concerns cross-referenced."
