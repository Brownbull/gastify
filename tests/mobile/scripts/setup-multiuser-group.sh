#!/usr/bin/env bash
set -euo pipefail

# Provisions a TWO-USER shared group on the deployed staging-e2e backend so the S23
# multi-user Maestro proof (p5-phase5-multiuser-active.yaml) can verify that user B,
# signed in on the real device, sees user A's shared transaction.
#
# Single device → one session at a time, so this does the cross-user SETUP via the
# API (user A creates the group, shares a transaction, invites B who joins, enables
# member visibility + opts in), then the device flow signs in as B and verifies the
# render. The same A + B accounts are used on web + Android (no platform-exclusive
# users). Idempotent: clears both users' groups first.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${ROOT_DIR}"

API="${GASTIFY_API_BASE:-https://gastify-api-staging-e2e-staging-e2e.up.railway.app}"
GROUP="${MULTIUSER_GROUP_NAME:-S23 MultiU}"
ENVF="mobile/.env"
KEY="$(python3 -c "import json;print(json.load(open('mobile/google-services.json'))['client'][0]['api_key'][0]['current_key'])")"

env_get() { grep -E "^$1=" "${ENVF}" | cut -d= -f2- | tr -d "\"'\r"; }
EMAIL_A="$(env_get GASTIFY_MOBILE_E2E_EMAIL)"; PASS_A="$(env_get GASTIFY_MOBILE_E2E_PASSWORD)"
EMAIL_B="$(env_get GASTIFY_MOBILE_E2E_EMAIL_B)"; PASS_B="$(env_get GASTIFY_MOBILE_E2E_PASSWORD_B)"
if [[ -z "${EMAIL_B}" || -z "${PASS_B}" ]]; then
  echo "User B not configured (GASTIFY_MOBILE_E2E_EMAIL_B/PASSWORD_B in mobile/.env)." >&2
  exit 2
fi

token() {
  curl -s --max-time 20 \
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}" \
    -H 'Content-Type: application/json' -H "X-Android-Package: com.gastify.mobile" \
    -d "{\"email\":\"$1\",\"password\":\"$2\",\"returnSecureToken\":true}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('idToken',''))"
}
TA="$(token "${EMAIL_A}" "${PASS_A}")"; TB="$(token "${EMAIL_B}" "${PASS_B}")"
[[ -n "${TA}" && -n "${TB}" ]] || { echo "Firebase auth failed for A and/or B." >&2; exit 1; }

# Clear both users' groups (idempotent re-runs).
for T in "${TA}" "${TB}"; do
  for g in $(curl -s --max-time 20 "${API}/api/v1/groups" -H "Authorization: Bearer ${T}" \
              | python3 -c "import sys,json;[print(x['id']) for x in json.load(sys.stdin)]" 2>/dev/null); do
    curl -s -o /dev/null -X DELETE --max-time 20 "${API}/api/v1/groups/${g}" -H "Authorization: Bearer ${T}"
  done
done

# A creates the group.
GID="$(curl -s --max-time 20 -X POST "${API}/api/v1/groups" -H "Authorization: Bearer ${TA}" \
        -H 'Content-Type: application/json' -d "{\"name\":\"${GROUP}\"}" \
        | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")"

# A shares their first personal transaction into the group.
TXN="$(curl -s --max-time 20 "${API}/api/v1/transactions?limit=1" -H "Authorization: Bearer ${TA}" \
        | python3 -c "import sys,json;d=(json.load(sys.stdin).get('data') or []);print(d[0]['id'] if d else '')")"
[[ -n "${TXN}" ]] || { echo "User A has no personal transactions to share." >&2; exit 1; }
curl -s -o /dev/null --max-time 20 -X POST "${API}/api/v1/groups/${GID}/share" \
  -H "Authorization: Bearer ${TA}" -H 'Content-Type: application/json' \
  -d "{\"transaction_id\":\"${TXN}\"}"

# A invites; B joins.
TOK="$(curl -s --max-time 20 -X POST "${API}/api/v1/groups/${GID}/invite" -H "Authorization: Bearer ${TA}" \
        | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")"
curl -s -o /dev/null --max-time 20 -X POST "${API}/api/v1/invites/${TOK}/join" -H "Authorization: Bearer ${TB}"

# A enables member visibility + opts their own detail in (so A's row is visible to B).
curl -s -o /dev/null --max-time 20 -X PATCH "${API}/api/v1/groups/${GID}/visibility" \
  -H "Authorization: Bearer ${TA}" -H 'Content-Type: application/json' -d '{"enabled":true}'
curl -s -o /dev/null --max-time 20 -X POST "${API}/api/v1/groups/${GID}/consent" \
  -H "Authorization: Bearer ${TA}" -H 'Content-Type: application/json' -d '{"shares_detail":true}'

echo "Multi-user group '${GROUP}' ready (${GID}): A shared 1 txn, B joined, visibility+consent on."
