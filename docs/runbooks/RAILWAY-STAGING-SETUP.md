# Railway Staging Setup

Railway is the default host for the staging API, staging SPA, and
Postgres databases. Vercel/CDN remains a fallback only if Railway SPA routing,
headers, custom domain/TLS, or baseline performance cannot be made acceptable.

## Services

Create these Railway services:

1. `gastify-postgres-staging`
2. `gastify-postgres-staging-e2e`
3. `gastify-api-staging`
4. `gastify-api-staging-e2e`
5. `gastify-web-staging`

Use separate Postgres databases or schemas for `staging` and
`staging-e2e`. Fixture E2E data must not share the live Gemini staging
database.

## Backend Deploy

Backend service config lives at `backend/railway.toml`. The start command runs
Alembic before Uvicorn:

```text
PYTHONPATH=/app alembic upgrade head && PYTHONPATH=/app uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Deploy backend services from the repo root with the backend directory as the
archive root. Without `--path-as-root`, Railway can package the monorepo root
and infer the wrong service type.

```bash
npx -y @railway/cli@latest up ./backend --path-as-root --service gastify-api-staging --detach --ci
npx -y @railway/cli@latest up ./backend --path-as-root --service gastify-api-staging-e2e --detach --ci
```

Railway readiness must use:

```text
/api/v1/health/ready
```

Ready means database connected and Alembic migration head current for deployed
lanes.

## Branch-Backed Deploys

`origin/staging` is the durable integration branch. Configure
`gastify-api-staging` and `gastify-api-staging-e2e` in Railway Service Settings:

- Source: GitHub repository `Brownbull/gastify`
- Branch: `staging`
- Root directory: `/backend`
- Config file path: `/backend/railway.toml`
- Autodeploy: enabled
- Wait for CI: enabled

Railway should deploy these services only after the GitHub Actions workflow for
the staging push passes. If GitHub autodeploy is unavailable, use the CLI
fallback from the repo root:

```bash
railway up ./backend --path-as-root --environment staging --service gastify-api-staging --detach --ci
railway up ./backend --path-as-root --environment staging --service gastify-api-staging-e2e --detach --ci
```

Do not use `railway environment config --json` as a discovery shortcut in logs
or review artifacts; it can include service variables. Until the Railway CLI
source-config dot paths are validated in a non-secret-safe way, set Source,
Branch, Root directory, Autodeploy, and Wait for CI through Railway Service
Settings and use the CLI only for the fallback deploy commands above.

Record whether the proof used autodeploy or fallback CLI in `.kdbp/LEDGER.md`.

## Staging API Environment

```text
GASTIFY_ENVIRONMENT=staging
GASTIFY_SCAN_PROVIDER=gemini
GASTIFY_DATABASE_URL=<staging Railway Postgres URL>
GASTIFY_FIREBASE_PROJECT_ID=<staging Firebase project>
GASTIFY_FIREBASE_CREDENTIALS_JSON=<sealed staging service account JSON>
GASTIFY_CORS_ORIGINS=["https://<railway-web-domain>","http://localhost:5173","http://localhost:5174"]
GASTIFY_GEMINI_MODEL=gemini-2.5-flash-lite
GOOGLE_API_KEY=<staging Gemini key>
GASTIFY_SCAN_TEST_CONTROLS_ENABLED=false
# When temporarily enabling staging test-case controls:
# GASTIFY_SCAN_TEST_CONTROLS_ENABLED=true
# GASTIFY_SCAN_TEST_ALLOWED_EMAILS=["<disposable-staging-user@example.test>"]
```

## Deterministic E2E API Environment

```text
GASTIFY_ENVIRONMENT=staging-e2e
GASTIFY_SCAN_PROVIDER=fixture
GASTIFY_DATABASE_URL=<isolated e2e Railway Postgres URL>
GASTIFY_FIREBASE_PROJECT_ID=<staging Firebase project>
GASTIFY_FIREBASE_CREDENTIALS_JSON=<sealed staging service account JSON>
GASTIFY_CORS_ORIGINS=["https://<railway-web-domain>","http://localhost:5173","http://localhost:5174"]
GASTIFY_GEMINI_MODEL=gemini-2.5-flash-lite
GASTIFY_E2E_SCAN_EVENT_DELAY_MS=600
GASTIFY_SCAN_TEST_CONTROLS_ENABLED=false
```

## Web Service

The web service uses `web/nixpacks.toml` and `web/Caddyfile` for Vite static
hosting with SPA fallback routing. Railway's SPA routing guide is the reference
for this Caddy fallback pattern:

```text
https://docs.railway.com/guides/spa-routing-configuration
```

Set:

```text
VITE_API_BASE_URL=https://<gastify-api-staging-domain>
VITE_FIREBASE_API_KEY=<staging Firebase web api key>
VITE_FIREBASE_AUTH_DOMAIN=<staging Firebase auth domain>
VITE_FIREBASE_PROJECT_ID=<staging Firebase project>
VITE_FIREBASE_STORAGE_BUCKET=<staging Firebase storage bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<staging Firebase sender id>
VITE_FIREBASE_APP_ID=<staging Firebase app id>
```

## Readiness Check

```bash
bash scripts/staging/check-backend-ready.sh https://<gastify-api-staging-domain>
bash scripts/staging/check-backend-ready.sh https://<gastify-api-staging-e2e-domain>
```

## Hobby-Plan Idle State

> To fully drop the staging lanes (delete environments, zero their cost) and
> restore them later, use [`RAILWAY-STAGING-TEARDOWN.md`](RAILWAY-STAGING-TEARDOWN.md).
> The idle state below only stops stateless compute; Postgres keeps billing.

When no staging test run is active, keep only the two Postgres services running
and stop the stateless deployments:

```bash
npx -y @railway/cli@latest down --service gastify-api-staging --yes
npx -y @railway/cli@latest down --service gastify-api-staging-e2e --yes
npx -y @railway/cli@latest down --service gastify-web-staging --yes
```

Before testing, redeploy the stopped services:

```bash
railway up ./backend --path-as-root --environment staging --service gastify-api-staging --detach --ci
railway up ./backend --path-as-root --environment staging --service gastify-api-staging-e2e --detach --ci
railway up ./web --path-as-root --environment staging --service gastify-web-staging --detach --ci
```

Then run the readiness checks above. A stopped stateless service can show a
non-green deployment status in Railway even though it has zero running replicas;
the important idle-state check is `running=0` for API/web and `running=1` for
both Postgres services.
