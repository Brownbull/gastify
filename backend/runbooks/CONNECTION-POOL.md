# Connection Pool Runbook

Referenced by A.13 §4 and A.17 §3. PgBouncer pool sizing and connection-mode discipline.

## Pool Configuration

| Role | Connection Mode | Pool Size | Purpose |
|------|----------------|-----------|---------|
| `app_user` | Session | 80% of `max_connections` | RLS-bound queries (session-mode required for `SET LOCAL` GUC) |
| `app_admin` | Session | 10% of `max_connections` | Break-glass / forensic (auto-audit row) |
| `app_etl` | Session | Reserved from headroom | Phase E migration scripts |
| `app_anon` / health | Transaction | Separate small pool | Health-check pings, reference-data reads |

**Example:** Postgres `max_connections = 100` → `app_user` pool = 80, `app_admin` pool = 10, headroom = 10.

## Why Session-Mode for `app_user`

RLS policies require `SET LOCAL app.current_scope_id = '...'` for GUC-based hot paths. `SET LOCAL` only persists within a transaction, but PgBouncer transaction-mode reassigns connections between statements — a `SET LOCAL` from user A could leak to user B. Session-mode ensures the connection is exclusive for the session lifetime.

## GUC Namespace Feasibility

The `app.*` namespace requires Postgres-side recognition:
- Railway managed Postgres: custom GUC classes accepted via `SET LOCAL` without `postgresql.conf` changes (Postgres 14+ default)
- Cloud SQL: may require verification (restricted `cloudsql.iam_authentication`)
- A.21 staging smoke test: connect under `app_user`, `SET LOCAL app.current_scope_id = '...'`, confirm `current_setting('app.current_scope_id', true)` returns the value

## Saturation Testing

A.20 performance baseline includes a connection-saturation scenario asserting pool sizing holds against expected concurrent-user count. A.21 staging mirrors prod pool-size config exactly.

## Implementation Status

- [x] SQLAlchemy async engine with pool_size=5, max_overflow=10 (dev defaults in `app/db.py`)
- [ ] PgBouncer configuration for production
- [ ] Session-mode enforcement for `app_user`
- [ ] GUC feasibility smoke test
- [ ] Connection-saturation load test
