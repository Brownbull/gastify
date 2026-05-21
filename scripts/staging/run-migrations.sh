#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -z "${GASTIFY_DATABASE_URL:-}" ]]; then
  echo "GASTIFY_DATABASE_URL is required." >&2
  exit 2
fi

case "${GASTIFY_ENVIRONMENT:-}" in
  staging|staging-e2e)
    ;;
  production)
    echo "This script is for staging only; use the production deploy runbook for prod." >&2
    exit 2
    ;;
  *)
    echo "Refusing migrations without GASTIFY_ENVIRONMENT=staging|staging-e2e." >&2
    exit 2
    ;;
esac

if [[ "${GASTIFY_DATABASE_URL}" == sqlite* ]]; then
  echo "Staging migrations require Postgres, not SQLite." >&2
  exit 2
fi

cd "${ROOT_DIR}/backend"
uv run alembic upgrade head
