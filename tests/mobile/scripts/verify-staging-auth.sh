#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MOBILE_DIR="${ROOT_DIR}/mobile"
ENV_FILE="${MOBILE_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Fill mobile/.env before verifying staging auth." >&2
  exit 2
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

required=(
  EXPO_PUBLIC_E2E_AUTH_EMAIL
  EXPO_PUBLIC_E2E_AUTH_PASSWORD
  EXPO_PUBLIC_E2E_AUTH_MODE
)

for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing ${key} in ${ENV_FILE}." >&2
    exit 2
  fi
done

if [[ "${EXPO_PUBLIC_E2E_AUTH_MODE}" != "staging" ]]; then
  echo "Refusing non-staging auth mode: ${EXPO_PUBLIC_E2E_AUTH_MODE}" >&2
  exit 2
fi

if [[ ! -f "${MOBILE_DIR}/google-services.json" ]]; then
  echo "Missing ${MOBILE_DIR}/google-services.json." >&2
  exit 2
fi

api_key="$(
  node -e "
    const cfg = require('${MOBILE_DIR}/google-services.json');
    const key = cfg.client?.[0]?.api_key?.[0]?.current_key;
    if (!key) process.exit(1);
    console.log(key);
  "
)"

request_body="$(
  node -e "
    console.log(JSON.stringify({
      email: process.env.EXPO_PUBLIC_E2E_AUTH_EMAIL,
      password: process.env.EXPO_PUBLIC_E2E_AUTH_PASSWORD,
      returnSecureToken: true
    }));
  "
)"

response="$(
  curl -sS \
    -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${api_key}" \
    -H "Content-Type: application/json" \
    --data-binary "${request_body}"
)"

printf "%s" "${response}" | node -e "
  let data = '';
  process.stdin.on('data', (chunk) => data += chunk);
  process.stdin.on('end', () => {
    const result = JSON.parse(data);
    if (result.idToken && result.localId) {
      console.log('Firebase staging email/password sign-in: OK');
      console.log('email=' + process.env.EXPO_PUBLIC_E2E_AUTH_EMAIL);
      console.log('uid=' + result.localId);
      return;
    }

    console.error('Firebase staging email/password sign-in: FAILED');
    console.error(result.error?.message || data);
    process.exit(1);
  });
"
