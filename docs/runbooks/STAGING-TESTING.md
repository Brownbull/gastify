# Staging Testing

Staging is the proof gate for runtime behavior. Local evidence is not
enough for changed user journeys.

## Env Files

Use environment-specific files for mobile and backend commands:

- backend local template: `backend/.env.local.example`;
- backend staging template: `backend/.env.staging.example`;
- backend deterministic fixture template: `backend/.env.staging-e2e.example`;
- mobile local template: `mobile/.env.local.example`;
- mobile staging template: `mobile/.env.staging.example`;
- mobile deterministic fixture template: `mobile/.env.staging-e2e.example`;
- web templates: `web/.env.local.example`, `web/.env.staging.example`,
  `web/.env.staging-e2e.example`, and `web/.env.production.example`;
- override mobile script loading with `GASTIFY_MOBILE_ENV_FILE=/path/to/file`.

Production uses the production templates and must not enable mock, fixture,
SQLite, E2E auth, or scan test controls.

Copied files such as `backend/.env.staging`, `mobile/.env.staging-e2e`, and
`web/.env.staging` are ignored by git. Paste secrets only into copied files or
Railway variables, never into `*.example`.

## Seed And Reset

Seed only disposable staging identities:

```bash
cd backend
GASTIFY_ENVIRONMENT=staging \
  GASTIFY_DATABASE_URL=<staging-postgres-url> \
  uv run python ../scripts/staging/seed-staging.py --execute --reset
```

Use `GASTIFY_ENVIRONMENT=staging-e2e` and the isolated E2E Postgres URL for
fixture runs. The script refuses production and SQLite.

## Deterministic S23 Gate

Build/open the mobile app with:

```text
EXPO_PUBLIC_APP_ENV=staging-e2e
EXPO_PUBLIC_API_BASE_URL=https://<gastify-api-staging-e2e-domain>
EXPO_PUBLIC_E2E_AUTH_ENABLED=true
```

Run:

```bash
export GASTIFY_STAGING_E2E_API_BASE_URL=https://<gastify-api-staging-e2e-domain>
export MAESTRO_DEVICE_ID=RFCW90N4BYP
bash scripts/staging/run-s23-fixture-gate.sh
```

Required results:

- `tests/mobile/results/latest/staging-e2e/p4-phase2-scan-upload-happy-active/`
- `tests/mobile/results/latest/staging-e2e/p4-phase2-scan-upload-review-active/`
- `tests/mobile/results/latest/staging-e2e/p4-phase2-scan-upload-failure-active/`
- `tests/mobile/results/latest/staging-e2e/p4-phase2-camera-permission-denied-active/`

## Live Gemini Smoke

After deterministic E2E passes, build/open the mobile app with:

```text
EXPO_PUBLIC_APP_ENV=staging
EXPO_PUBLIC_API_BASE_URL=https://<gastify-api-staging-domain>
```

Run one real receipt through the same S23 gallery path with fixture/mock off.
Capture upload, progress, result screenshots, and backend logs proving the
Gemini provider path ran. This is confidence evidence; deterministic fixture
E2E remains the hard gate.

## Multiuser And Deployed Behavior

Run these checks before closing user-facing, DB, auth, realtime, upload, or
media phases:

- two seeded users cannot see each other's scans or transactions;
- concurrent scan uploads emit isolated WebSocket/SSE events;
- duplicate/cache/idempotency behavior is stable;
- unknown merchant/review state reaches the UI;
- deterministic failure reaches retry/error affordances;
- Railway SPA loads, refreshes nested routes, calls the API, streams scan
  progress, and returns expected security/cache headers.

Log commands, device/browser targets, service URLs, DB targets, provider mode,
screenshots/reports/logs, and pass/fail results in `.kdbp/LEDGER.md`.
