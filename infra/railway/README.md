# Railway Staging Environment

Gastify uses Railway as the default staging and production hosting target:
Postgres, API, fixture API, and the static SPA.

## Services

| Service | Purpose | Required mode |
|---|---|---|
| `gastify-postgres-staging` | Managed Postgres for real staging smoke | Postgres |
| `gastify-postgres-staging-e2e` | Isolated Postgres for deterministic fixture tests | Postgres |
| `gastify-api-staging` | Normal API for web/mobile smoke and live Gemini | `GASTIFY_ENVIRONMENT=staging`, `GASTIFY_SCAN_PROVIDER=gemini` |
| `gastify-api-staging-e2e` | Deterministic API for S23 Maestro fixture gate | `GASTIFY_ENVIRONMENT=staging-e2e`, `GASTIFY_SCAN_PROVIDER=fixture` |
| `gastify-web-staging` | Vite SPA hosted by Caddy on Railway | `VITE_API_BASE_URL=<staging API URL>` |

## Backend Variables

Set these on both API services with environment-specific values:

```text
# DB role split (RLS enforcement, P43) — see docs/runbooks/db-role-split.md.
# Runtime uses the NON-superuser gastify_app role; bootstrap + migrations use admin.
GASTIFY_DATABASE_URL=postgresql://gastify_app:<app-pw>@<pg-host>:5432/<db>
GASTIFY_DATABASE_ADMIN_URL=<Railway Postgres SUPERUSER URL>
GASTIFY_APP_DB_ROLE=gastify_app
GASTIFY_APP_DB_PASSWORD=<app-pw>
GASTIFY_FIREBASE_PROJECT_ID=<staging Firebase project>
GASTIFY_FIREBASE_CREDENTIALS_JSON=<sealed staging service account JSON>
GASTIFY_CORS_ORIGINS=["https://<railway-spa-domain>","http://localhost:5173","http://localhost:5174"]
GASTIFY_SCAN_STORAGE_DIR=/data/scans
GASTIFY_DEBUG=false
```

Only the fixture API sets:

```text
GASTIFY_ENVIRONMENT=staging-e2e
GASTIFY_SCAN_PROVIDER=fixture
GASTIFY_E2E_SCAN_EVENT_DELAY_MS=600
```

The normal staging API sets:

```text
GASTIFY_ENVIRONMENT=staging
GASTIFY_SCAN_PROVIDER=gemini
GOOGLE_API_KEY=<staging Gemini key>
```

## Web Variables

```text
VITE_API_BASE_URL=https://<gastify-api-staging-domain>
VITE_FIREBASE_API_KEY=<staging Firebase web api key>
VITE_FIREBASE_AUTH_DOMAIN=<staging Firebase auth domain>
VITE_FIREBASE_PROJECT_ID=<staging Firebase project>
VITE_FIREBASE_STORAGE_BUCKET=<staging Firebase storage bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<staging Firebase sender id>
VITE_FIREBASE_APP_ID=<staging Firebase app id>
```

## Required Proof

1. `scripts/staging/run-migrations.sh` succeeds against both staging databases.
2. `scripts/staging/check-backend-ready.sh <api-url>` returns `status=ok` and `migration_status=current`.
3. Railway-hosted SPA refreshes nested routes through `web/Caddyfile` fallback.
4. S23 deterministic fixture gate passes against `gastify-api-staging-e2e`.
5. One live Gemini smoke passes against `gastify-api-staging`.

## Fallback Trigger

Move only the SPA to Vercel/CDN if Railway static hosting fails any of these
baseline checks: nested-route refresh, custom domain/TLS, cache headers, or
acceptable app-open latency. Backend and Postgres remain on Railway unless the
database or volume model becomes the blocker.
