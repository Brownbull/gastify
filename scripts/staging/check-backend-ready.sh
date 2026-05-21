#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${GASTIFY_STAGING_API_BASE_URL:-}}"

if [[ -z "${BASE_URL}" ]]; then
  echo "Usage: $0 <api-base-url>" >&2
  echo "Or set GASTIFY_STAGING_API_BASE_URL." >&2
  exit 2
fi

BASE_URL="${BASE_URL%/}"
BODY="$(curl -fsS "${BASE_URL}/api/v1/health/ready")"

node -e "
const body = JSON.parse(process.argv[1]);
if (body.status !== 'ok') {
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}
if (body.migration_status && body.migration_status !== 'current' && body.migration_status !== 'not_configured') {
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(body, null, 2));
" "${BODY}"
