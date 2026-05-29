# Disaster Recovery Runbook

> Backup, restore, and recovery procedures for the Gastify production stack
> (Railway: Postgres + API + SPA). Rehearse before launch (cutover drill — deferred).

## What must survive a disaster

| Asset | Store | Criticality |
|-------|-------|-------------|
| Transactions + items + consents + audit events | Postgres (production) | CRITICAL — financial + compliance record |
| Receipt images | scan storage volume | HIGH — re-derivable only by re-scan |
| Migration state | `alembic_version` in Postgres | CRITICAL — schema integrity |
| Secrets (Firebase, Gemini key, METRICS_API_KEY) | Railway env / secret manager | CRITICAL — rotate, never in repo |

## Backups
- **Postgres:** Railway managed daily snapshots; additionally take an on-demand `pg_dump` before any migration deploy or cutover. Verify the dump restores into a scratch DB monthly.
- **Receipt images:** the scan-storage volume should be snapshotted with the same cadence; images are regenerable only by user re-scan, so treat as HIGH not CRITICAL.
- Retention purges (`run_retention.py`) reduce backup size over time — expected.

## Restore procedure
1. Provision a fresh Postgres; restore the latest verified snapshot (or `pg_dump`).
2. Confirm `alembic_version` head matches the deployed API image; if behind, `alembic upgrade head`.
3. Restore the scan-storage volume snapshot.
4. Re-point the API service `DATABASE_URL` / storage path; restart.
5. Run `scripts/staging/check-backend-ready.sh <url>` (GET /health/ready) — must be green.
6. Smoke: sign in, list transactions, open one, run a scan (or fixture), check `/metrics`.

## RTO / RPO targets (MVP)
- **RPO:** ≤ 24h (daily snapshot) — acceptable for MVP; tighten with PITR at Enterprise.
- **RTO:** ≤ 4h (provision + restore + verify).

## Rollback (bad deploy, not data loss)
- Keep the previous Railway deploy; roll back the **API before the SPA** (API contract is the dependency).
- If a migration is the culprit, restore the pre-deploy `pg_dump` (down-migrations are best-effort; some — e.g. enum ADD VALUE — are no-ops).

## Deferred (operational)
- Full cutover/restore drill against a production-like environment — run during the launch staging session.
- Point-in-time recovery (PITR) configuration.
