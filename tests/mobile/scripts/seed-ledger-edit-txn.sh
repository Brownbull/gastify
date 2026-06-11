#!/usr/bin/env bash
# Seed (and clean up) the self-owned target row for the ledger-edit Maestro flow (P84).
#
# The flow used to target a fixed fixture merchant; golden-journey runs rename fixture
# rows and demo data pushes old rows below the scroll horizon, so the target starved.
# This seeds a uniquely-named manual transaction WITH ITEMS dated TODAY — it lands at
# the top of the ledger, no scrolling required — and cleanup removes the row plus any
# merchant mapping the flow's rename taught.
#
# Usage: seed-ledger-edit-txn.sh [seed|cleanup]
# Env:   GASTIFY_MOBILE_ENV_FILE (default mobile/.env) must provide
#        EXPO_PUBLIC_E2E_AUTH_EMAIL / EXPO_PUBLIC_E2E_AUTH_PASSWORD (the user the
#        device flow signs in as) and EXPO_PUBLIC_API_BASE_URL. Credentials are
#        never echoed.
set -euo pipefail

MODE="${1:-seed}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MOBILE_DIR="${ROOT_DIR}/mobile"
ENV_FILE="${GASTIFY_MOBILE_ENV_FILE:-${MOBILE_DIR}/.env}"
STATE_FILE="${ROOT_DIR}/tests/mobile/results/.seed-ledger-edit.json"

SEED_MERCHANT="S23 Edit Seed"
RENAMED_MERCHANT="S23 Ledger Edit R12"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE} (set GASTIFY_MOBILE_ENV_FILE)." >&2
  exit 2
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

for key in EXPO_PUBLIC_E2E_AUTH_EMAIL EXPO_PUBLIC_E2E_AUTH_PASSWORD EXPO_PUBLIC_API_BASE_URL; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing ${key} in ${ENV_FILE}." >&2
    exit 2
  fi
done

API_BASE="${EXPO_PUBLIC_API_BASE_URL%/}"

api_key="$(
  node -e "
    const cfg = require('${MOBILE_DIR}/google-services.json');
    const key = cfg.client?.[0]?.api_key?.[0]?.current_key;
    if (!key) process.exit(1);
    console.log(key);
  "
)"

id_token="$(
  curl -sS -X POST \
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${api_key}" \
    -H "Content-Type: application/json" \
    --data-binary "$(node -e '
      console.log(JSON.stringify({
        email: process.env.EXPO_PUBLIC_E2E_AUTH_EMAIL,
        password: process.env.EXPO_PUBLIC_E2E_AUTH_PASSWORD,
        returnSecureToken: true,
      }));
    ')" | node -e '
      let data = "";
      process.stdin.on("data", (c) => (data += c));
      process.stdin.on("end", () => {
        const r = JSON.parse(data);
        if (!r.idToken) { console.error("sign-in failed: " + (r.error?.message || "unknown")); process.exit(1); }
        console.log(r.idToken);
      });
    '
)"

auth_curl() {
  curl -sS -H "Authorization: Bearer ${id_token}" -H "Content-Type: application/json" "$@"
}

case "${MODE}" in
  seed)
    today="$(date -I)"
    body="$(node -e "
      console.log(JSON.stringify({
        transaction_date: '${today}',
        merchant: '${SEED_MERCHANT}',
        total_minor: 5000,
        currency: 'CLP',
        receipt_type: 'manual',
        items: [
          { name: 'Seed Item Uno', qty: 1, total_price_minor: 3000, sort_order: 0 },
          { name: 'Seed Item Dos', qty: 2, total_price_minor: 2000, sort_order: 1 },
        ],
      }));
    ")"
    response="$(auth_curl -X POST "${API_BASE}/api/v1/transactions" --data-binary "${body}")"
    txn_id="$(printf '%s' "${response}" | node -e '
      let data = "";
      process.stdin.on("data", (c) => (data += c));
      process.stdin.on("end", () => {
        const r = JSON.parse(data);
        if (!r.id) { console.error("create failed: " + data); process.exit(1); }
        console.log(r.id);
      });
    ')"
    mkdir -p "$(dirname "${STATE_FILE}")"
    printf '{"transaction_id":"%s","seeded_at":"%s"}\n' "${txn_id}" "${today}" > "${STATE_FILE}"
    echo "Seeded '${SEED_MERCHANT}' (${today}) id=${txn_id}"
    ;;

  cleanup)
    if [[ -f "${STATE_FILE}" ]]; then
      txn_id="$(node -e "console.log(require('${STATE_FILE}').transaction_id || '')")"
      if [[ -n "${txn_id}" ]]; then
        status="$(auth_curl -o /dev/null -w '%{http_code}' -X DELETE "${API_BASE}/api/v1/transactions/${txn_id}")"
        echo "Deleted seed transaction ${txn_id} (HTTP ${status})"
      fi
      rm -f "${STATE_FILE}"
    else
      echo "No state file — nothing seeded, checking mappings only."
    fi
    # The flow's merchant rename teaches a mapping; unlearn it so reruns stay clean.
    auth_curl "${API_BASE}/api/v1/mappings" | SEED_MERCHANT="${SEED_MERCHANT}" RENAMED_MERCHANT="${RENAMED_MERCHANT}" node -e '
      let data = "";
      process.stdin.on("data", (c) => (data += c));
      process.stdin.on("end", () => {
        const r = JSON.parse(data);
        const targets = [process.env.SEED_MERCHANT, process.env.RENAMED_MERCHANT].map((s) => s.toLowerCase());
        const hits = (r.merchants || []).filter((m) =>
          targets.includes((m.original_merchant || "").toLowerCase()) ||
          targets.includes((m.target_merchant || "").toLowerCase()));
        console.log(hits.map((m) => m.id).join("\n"));
      });
    ' | while read -r mapping_id; do
      [[ -z "${mapping_id}" ]] && continue
      status="$(auth_curl -o /dev/null -w '%{http_code}' -X DELETE "${API_BASE}/api/v1/mappings/merchant/${mapping_id}")"
      echo "Unlearned merchant mapping ${mapping_id} (HTTP ${status})"
    done
    ;;

  *)
    echo "Usage: $0 [seed|cleanup]" >&2
    exit 2
    ;;
esac
