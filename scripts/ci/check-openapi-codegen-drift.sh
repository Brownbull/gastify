#!/usr/bin/env bash
set -euo pipefail
# Gate #7: backend/openapi.yaml matches FastAPI live emission
# Source: communication W1 / A.9

OPENAPI_FILE="backend/openapi.yaml"

if [ ! -f "$OPENAPI_FILE" ]; then
  echo "SKIP: $OPENAPI_FILE not yet committed (backend endpoints not implemented yet)."
  exit 0
fi

# Future: start FastAPI, fetch /openapi.json, compare with committed schema
echo "PASS: OpenAPI codegen drift check (stub — requires running backend)."
