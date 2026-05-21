# Production Checklist

Production is documented and guarded now, but not provisioned before staging
evidence is green.

## Required Runtime

```text
GASTIFY_ENVIRONMENT=production
GASTIFY_SCAN_PROVIDER=gemini
GASTIFY_E2E_AUTH_ENABLED=false
GASTIFY_DATABASE_URL=<production Railway Postgres URL>
GASTIFY_FIREBASE_PROJECT_ID=<production Firebase project>
GASTIFY_FIREBASE_CREDENTIALS_JSON=<sealed production service account JSON>
GASTIFY_GEMINI_MODEL=gemini-2.5-flash-lite
GOOGLE_API_KEY=<production Gemini key>
```

Production startup must fail if any of these are configured:

- `GASTIFY_SCAN_PROVIDER=mock`
- `GASTIFY_SCAN_PROVIDER=fixture`
- `GASTIFY_E2E_SCAN_FIXTURES_ENABLED=true`
- `GASTIFY_E2E_AUTH_ENABLED=true`
- `GASTIFY_SCAN_TEST_CONTROLS_ENABLED=true`
- SQLite database URLs

## Before Provisioning

- `staging-e2e` S23 deterministic happy/review/failure/camera-permission
  flows are green and logged.
- `staging` live Gemini smoke is green and logged.
- Railway web smoke passes: deep-link refresh, CORS, headers, asset caching,
  API calls, and scan progress streaming.
- Multiuser isolation and concurrent scan event isolation are green.
- `.kdbp/LEDGER.md` records artifact paths and unresolved risks.

## Production Readiness

After provisioning, the first production gate is readiness only:

```bash
bash scripts/staging/check-backend-ready.sh https://<production-api-domain>
```

Do not run real receipt journey smoke in production until staging is green
and a separate launch/cutover plan approves production test data handling.

## Rollback Notes

- Keep the previous deploy available in Railway before switching traffic.
- Roll back the API before rolling back the SPA if API compatibility breaks.
- Do not point production clients at `staging` or `staging-e2e`.
- If readiness reports a migration mismatch, stop promotion and inspect the
  Alembic head before retrying.
