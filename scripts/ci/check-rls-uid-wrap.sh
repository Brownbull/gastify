#!/usr/bin/env bash
set -euo pipefail
# Gate #2: Every auth.uid() / current_setting('app.*') in policy bodies wrapped as (SELECT ...)
# Source: database W2 / A.13 (f)

UNWRAPPED=$(grep -rn --include='*.sql' -E '(auth\.uid\(\)|current_setting\(.app\.)' backend/schema/ backend/alembic/versions/ 2>/dev/null \
  | grep -v '(SELECT' || true)

if [ -n "$UNWRAPPED" ]; then
  echo "FAIL: Found un-wrapped auth.uid() or current_setting() in RLS policies:"
  echo "$UNWRAPPED"
  echo "Wrap as (SELECT auth.uid()) per Supabase-canonical pattern."
  exit 1
fi

echo "PASS: All auth.uid() / current_setting() references properly wrapped."
