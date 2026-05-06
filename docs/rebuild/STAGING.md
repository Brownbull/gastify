# Staging Environment Provisioning — A.21

Phase A prereq A.21. Defines the staging environment that mirrors production for pre-cutover validation. Without this, Phase E cutover is the first time the new stack sees prod-shape traffic, data volume, and secrets — three cliffs at once.

Cross-references: A.16 (backup cadence applies to staging), A.17 (CORS allow-list includes staging, secret segregation), A.18 (CI runs against staging for integration tests), A.20 (perf baseline replay target).

---

## Staging Components

### 1. Staging Postgres

| Property | Value |
|----------|-------|
| Provider | Same PaaS as prod (Railway / Supabase / Neon) |
| Instance | Separate from prod; same plan tier |
| Postgres version | Same major version as prod |
| Extensions | Same set (pg_cron, pgcrypto, etc.) |
| Backups | Managed, daily per A.16 |
| RLS roles | `app_user`, `app_etl`, `app_admin` per A.13 |
| PgBouncer | Session-mode per A.13 (RLS requires session-mode) |

**Seeding strategy (choose one):**

- **Option A — Anonymized prod export.** Use `app_etl` role to export prod data, anonymize PII (names → faker, emails → hash, receipt images → placeholder). Per `backend/runbooks/PII-IN-FLIGHT.md`: encrypted-FS working dir, `app_etl` operator audit row written for the export.
- **Option B — Synthetic dataset.** Generate rows matching prod row-count distribution per major table (`transactions` ~50k, `line_items` ~250k, `audit_events` ~100k, `fx_rates` ~2k, etc.). Faster to set up; less realistic for edge cases.

Recommendation: Option B for initial Phase A setup; Option A for Gate Cutover-Ready validation.

### 2. Staging Firebase Auth Project

| Property | Value |
|----------|-------|
| Project ID | `gastify-staging` (separate from `gastify-prod`) |
| Token issuer | Different from prod (tokens are not interchangeable) |
| Service-account JSON | Rotated independently per A.17 SECRETS.md |
| Test users | Pre-provisioned set for automated testing |

JIT-provisioning under `app_user` exercised on staging Day-1 to catch the duplicate-scope race before prod sees it.

### 3. Staging Frontend

| Property | Value |
|----------|-------|
| URL | `https://staging.gastify.cl` |
| CORS | Already in A.17 CORS allow-list |
| Build | Same CI pipeline as prod, deployed from `rebuild/main` |
| Feature flags | Independent flag set from prod (A.15) |

### 4. Staging Worker + Queue

Same shape as prod for streaming-event delivery. Validates:

- `scan_event` SSE delivery (web clients)
- `scan_event` WebSocket delivery (mobile clients)
- AsyncAPI contract end-to-end per A.9
- Two-stage worker pipeline per A.17

---

## Environment Configuration

### Secret Segregation

GitHub Actions uses separate secret sets per environment:

| Secret | Dev | Staging | Prod |
|--------|-----|---------|------|
| `DATABASE_URL` | local | staging PaaS | prod PaaS |
| `FIREBASE_SERVICE_ACCOUNT` | emulator | staging project | prod project |
| `GEMINI_API_KEY` | test key (rate-limited) | staging key | prod key |
| `FX_PROVIDER_KEY` | mock | staging key | prod key |
| `SENTRY_DSN` | dev project | staging project | prod project |

Secrets are NEVER shared between environments. Rotation cadences per A.17 SECRETS.md apply independently per environment.

### Railway Config-as-Code (if using Railway)

```toml
# railway.toml — staging service
[deploy]
startCommand = "uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 10

[variables]
ENVIRONMENT = "staging"
LOG_LEVEL = "debug"
CORS_ORIGINS = "https://staging.gastify.cl,http://localhost:5174"
```

---

## Pre-Cutover Drills on Staging

All drills must succeed before Gate Cutover-Ready can pass.

| Drill | Prereq | Success criteria |
|-------|--------|-----------------|
| Restore drill | A.16 | Restore from backup → `alembic check` + row-count parity + integration tests pass |
| Performance baseline replay | A.20 | All SC-bound flows within 20% of prod baseline |
| ETL dryrun | Phase E | 100% row-count parity + ≥99.9% sample deep-equality |
| Multi-jurisdiction smoke | A.17 / REQ-20 | CL/EU/US/CA-locale clients exercise consent + DSR endpoints |
| Secret-rotation drill | A.17 | Rotate each secret → no downtime → service healthy |

### Full ETL Dryrun

Pre-Gate-Cutover-Ready: full Firestore → Postgres ETL runs end-to-end on staging with an anonymized prod snapshot. Produces a parity report. Without this, Phase E.2 dual-write is the first time anyone has seen the ETL run end-to-end.

### 48-Hour Soak

Staging holds prod-shaped synthetic traffic continuously for ≥48 hours before cutover. Prevents cutover veto by absence-of-evidence — if staging can't sustain 48h of traffic, production can't either.

---

## Monitoring on Staging

- Sentry: separate staging project, same alert rules as prod
- Structured logging: same format as prod, shipped to staging log drain
- Database metrics: connection pool utilization, query latency P95, WAL lag
- Worker metrics: scan pipeline latency, queue depth, error rate

---

## Lifecycle

1. **Phase A:** Create staging environment doc (this file) + provision PaaS instances.
2. **Phase B–D:** Staging receives deployments from `rebuild/main` via CI.
3. **Phase E.1:** Pre-cutover drills run on staging.
4. **Phase E.2:** Dual-write period — staging mirrors prod configuration.
5. **Post-cutover:** Staging becomes the standard pre-prod environment (ongoing).
