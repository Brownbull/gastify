#!/usr/bin/env bash
set -euo pipefail

# Clears all groups owned/joined by the disposable web e2e users (A + B) on the
# deployed staging-e2e backend, so a Playwright group proof starts under the
# 5-group cap. Reads the gitignored web/.env.staging-e2e (no secrets in this file).
# Mirrors the cleanup half of tests/mobile/scripts/setup-multiuser-group.sh but uses
# the WEB Firebase key (Referer-gated) + the VITE_* creds.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENVF="${ROOT_DIR}/web/.env.staging-e2e"

env_get() { grep -E "^$1=" "${ENVF}" | cut -d= -f2- | tr -d "\"'\r"; }
API="$(env_get VITE_API_BASE_URL)"
KEY="$(env_get VITE_FIREBASE_API_KEY)"
EMAIL_A="$(env_get VITE_E2E_AUTH_EMAIL)"; PASS_A="$(env_get VITE_E2E_AUTH_PASSWORD)"
EMAIL_B="$(env_get VITE_E2E_AUTH_EMAIL_B)"; PASS_B="$(env_get VITE_E2E_AUTH_PASSWORD_B)"

token() {
  curl -s --max-time 20 \
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}" \
    -H 'Content-Type: application/json' -H 'Referer: http://localhost:5173' \
    -d "{\"email\":\"$1\",\"password\":\"$2\",\"returnSecureToken\":true}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('idToken',''))"
}

clean_user() {
  local label="$1" tok="$2"
  [[ -n "${tok}" ]] || { echo "  ${label}: auth failed" >&2; return 1; }
  local ids
  ids="$(curl -s --max-time 20 "${API}/api/v1/groups" -H "Authorization: Bearer ${tok}" \
          | python3 -c "import sys,json;[print(x['id']) for x in json.load(sys.stdin)]" 2>/dev/null || true)"
  local n=0
  for g in ${ids}; do
    curl -s -o /dev/null -X DELETE --max-time 20 "${API}/api/v1/groups/${g}" -H "Authorization: Bearer ${tok}" || true
    n=$((n + 1))
  done
  echo "  ${label}: cleared ${n} group(s)"
}

echo "Cleaning e2e groups on ${API}"
clean_user "A" "$(token "${EMAIL_A}" "${PASS_A}")"
if [[ -n "${EMAIL_B}" && -n "${PASS_B}" ]]; then
  clean_user "B" "$(token "${EMAIL_B}" "${PASS_B}")"
fi
echo "done"
