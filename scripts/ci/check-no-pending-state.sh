#!/usr/bin/env bash
set -euo pipefail
# Gate #1: No pendingHistoryFilters / analyticsInitialState / scrollPositions reads in frontend/src/**
# Source: transactions W1 / A.2

PATTERNS="pendingHistoryFilters|analyticsInitialState|scrollPositions"
HITS=$(grep -rn --include='*.ts' --include='*.tsx' -E "$PATTERNS" frontend/src/ 2>/dev/null || true)

if [ -n "$HITS" ]; then
  echo "FAIL: Found deprecated navigation store state reads:"
  echo "$HITS"
  exit 1
fi

echo "PASS: No pending state reads found in frontend/src/"
