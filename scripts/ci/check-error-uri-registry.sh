#!/usr/bin/env bash
set -euo pipefail
# Gate #6: New errors/<slug> URIs in the registered set (15 slugs)
# Source: communication W1 / A.13 error-taxonomy

REGISTRY="docs/rebuild/api/CROSS-CUTTING.md"

if [ ! -f "$REGISTRY" ]; then
  echo "FAIL: A.13 cross-cutting doc not found at $REGISTRY"
  exit 1
fi

# Registered slugs (15)
SLUGS=(
  "validation.field" "validation.body"
  "auth.unauthenticated" "auth.forbidden" "auth.token_expired"
  "rate_limit.exceeded"
  "idempotency.conflict" "idempotency.in_flight"
  "domain.scan.credit_insufficient" "domain.scan.requires_review" "domain.scan.failed"
  "domain.user_edit_protected" "domain.cohort.k_floor"
  "infra.upstream_unavailable" "infra.maintenance"
)

# Check that backend code only uses registered slugs
UNREGISTERED=$(grep -rn --include='*.py' 'gastify.app/errors/' backend/app/ 2>/dev/null \
  | grep -oP 'errors/\K[a-z._]+' \
  | sort -u \
  | while read -r slug; do
    found=false
    for s in "${SLUGS[@]}"; do
      if [ "$slug" = "$s" ]; then found=true; break; fi
    done
    if ! $found; then echo "$slug"; fi
  done || true)

if [ -n "$UNREGISTERED" ]; then
  echo "FAIL: Found unregistered error slugs:"
  echo "$UNREGISTERED"
  exit 1
fi

echo "PASS: All error-URI slugs are in the registered set."
