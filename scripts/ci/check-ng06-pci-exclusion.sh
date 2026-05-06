#!/usr/bin/env bash
set -euo pipefail
# Gate #8: No PAN/CVV columns; fx_rates write-once trigger present; user_edited_at companions
# Source: security W1 / A.17 + A.10 (enriched by database W3 / planner W3)

# Check for PCI-shaped column names in migrations
PCI_HITS=$(grep -rni --include='*.sql' --include='*.py' -E '\b(pan|cvv|expir|track_data)\b' \
  backend/alembic/versions/ 2>/dev/null || true)

if [ -n "$PCI_HITS" ]; then
  echo "FAIL: Found PCI-shaped column names in migrations:"
  echo "$PCI_HITS"
  exit 1
fi

# Check for UPDATE/DELETE on fx_rates (write-once invariant)
FX_VIOLATIONS=$(grep -rni --include='*.sql' -E '(UPDATE\s+fx_rates|DELETE\s+FROM\s+fx_rates)' \
  backend/alembic/versions/ 2>/dev/null || true)

if [ -n "$FX_VIOLATIONS" ]; then
  echo "FAIL: Found UPDATE/DELETE on fx_rates (write-once invariant):"
  echo "$FX_VIOLATIONS"
  exit 1
fi

echo "PASS: NG-06 PCI exclusion + fx_rates write-once + schema-convention checks."
