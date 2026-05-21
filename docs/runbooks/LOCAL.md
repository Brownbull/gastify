# Local Runtime

`local` is the ephemeral developer loop: SQLite, local file storage, and the
mock scan provider. It is intentionally cheap and deterministic. It never proves
Postgres migrations, RLS, concurrency, WebSocket isolation under deployment, or
Gemini behavior.

## Start

```bash
bash scripts/dev/start-local.sh
```

Optional local env files:

- backend: copy `backend/.env.local.example` to `backend/.env.local`;
- mobile: copy `mobile/.env.local.example` to `mobile/.env.local`.

Set `GASTIFY_BACKEND_ENV_FILE` or `GASTIFY_MOBILE_ENV_FILE` when you need a
different local file.

The script sets:

```text
GASTIFY_ENVIRONMENT=local
GASTIFY_SCAN_PROVIDER=mock
GASTIFY_DATABASE_URL=sqlite+aiosqlite:///.tmp/local/gastify.db
GASTIFY_SCAN_STORAGE_DIR=.tmp/local/scans
```

The backend refuses `local` unless the provider is `mock` and the database
URL is SQLite.

## Reset

Delete the local scratch directory, then restart:

```bash
rm -rf .tmp/local
bash scripts/dev/start-local.sh
```

`.tmp/` is ignored and should not be committed.

## Mock Receipts

Mock scan selection is filename-based:

| Filename contains | Result |
|---|---|
| `failure`, `failed`, `invalid` | deterministic failure |
| `review`, `unknown`, `low-confidence` | unknown merchant / review |
| anything else | happy path |

## Local Checks

Use local to prove mechanical behavior before promoting to staging:

```bash
cd backend && uv run pytest
cd mobile && npm run typecheck && npm test -- --runInBand
cd web && npm run build
```

Record local evidence as development evidence only. It cannot close Exec/Review
for upload, realtime, auth, DB, native, file/media, or user-facing journey
changes.

## API Smoke

Run the local API smoke after code changes that touch scan upload or scan
worker behavior:

```bash
bash scripts/dev/smoke-local.sh
```

This bootstraps SQLite, overrides Firebase auth only inside the local ASGI test
process, uploads happy/review/failure mock receipts through `POST /api/v1/scans`,
and writes proof to:

```text
.tmp/local/smoke/latest.json
```

The expected results are:

- happy upload: HTTP 201 and final scan status `completed`;
- review upload: HTTP 201 and final scan status `completed` with merchant
  `Unknown`;
- failure upload: HTTP 201 and final scan status `failed`.

## S23 Local UI Smoke

The physical S23 can also exercise the local backend. This is heavier than
the API smoke but useful for local screenshots before promoting to Railway.

Prerequisites:

- Samsung S23 visible to the same-host ADB used by Maestro;
- E2E-capable development build installed/openable;
- Metro running for that development build, with `EXPO_DEV_CLIENT_URL` exported
  from the printed `exp+gastify-mobile://...` URL;
- app bundle/config pointing at `http://127.0.0.1:8000` or `localhost:8000`;
- `EXPO_PUBLIC_E2E_AUTH_ENABLED=true` build/config using the disposable staging
  user;
- backend Firebase Admin credentials via `GASTIFY_FIREBASE_CREDENTIALS_PATH` or
  `GOOGLE_APPLICATION_CREDENTIALS` so the local backend can verify the staging
  Firebase token.

Recommended shell configuration:

```bash
export EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
export EXPO_PUBLIC_E2E_AUTH_ENABLED=true
export EXPO_PUBLIC_E2E_AUTH_MODE=staging
export EXPO_PUBLIC_E2E_AUTH_EMAIL=<staging-e2e-user-email>
export EXPO_PUBLIC_E2E_AUTH_PASSWORD=<staging-e2e-user-password>
export EXPO_DEV_CLIENT_URL=<exp+gastify-mobile-url-from-npm-run-start-dev-client>
export GASTIFY_FIREBASE_CREDENTIALS_PATH=/secure/path/staging-admin.json
```

The wrapper opens the dev-client URL before Maestro starts. Set
`GASTIFY_SKIP_OPEN_DEV_CLIENT=true` only when the app is already foregrounded
with the correct local bundle.

Run one case:

```bash
bash scripts/dev/run-s23-local-ui-smoke.sh happy
```

Run happy/review/failure:

```bash
bash scripts/dev/run-s23-local-ui-smoke.sh all
```

The wrapper starts local if needed, configures `adb reverse tcp:8000
tcp:8000` and `tcp:8081 tcp:8081`, opens the dev client, seeds the gallery
fixture, and delegates to the existing Maestro flows. Artifacts land in:

```text
tests/mobile/results/latest/local/p4-phase2-scan-upload-*-active/
.tmp/local/ui-smoke/
```
