#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MOBILE_DIR="${ROOT_DIR}/mobile"
TMP_FILE="$(mktemp)"
trap 'rm -f "${TMP_FILE}"' EXIT

if [[ -n "${GASTIFY_MOBILE_ENV_FILE:-}" ]]; then
  if [[ ! -f "${GASTIFY_MOBILE_ENV_FILE}" ]]; then
    echo "GASTIFY_MOBILE_ENV_FILE is not readable: ${GASTIFY_MOBILE_ENV_FILE}" >&2
    exit 2
  fi
  set -a
  # shellcheck disable=SC1090
  source "${GASTIFY_MOBILE_ENV_FILE}"
  set +a
fi

(
  cd "${MOBILE_DIR}"
  npx expo config --type public --json >"${TMP_FILE}"
)

node -e "
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  if (config.extra && Object.prototype.hasOwnProperty.call(config.extra, 'e2eAuthPassword')) {
    config.extra.e2eAuthPassword = '[redacted]';
  }
  console.log(JSON.stringify(config, null, 2));
" "${TMP_FILE}"
