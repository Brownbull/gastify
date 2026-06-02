# Runbook — Database Role Split (RLS enforcement, P43)

## Why

PostgreSQL **row-level security only applies to non-superuser, non-`BYPASSRLS`
roles**. The app historically connected to Postgres as the `postgres` superuser,
so every `... FORCE ROW LEVEL SECURITY` policy on scope-bound tables was
**silently inert** in production. Tenant isolation still held (the app also
filters every query by `ownership_scope_id` and sets the per-request GUC), but
RLS — the intended second barrier — was doing nothing.

The fix splits the database connection into two roles:

| Role | Privilege | Used by | RLS applies? |
|---|---|---|---|
| **admin** (`postgres`, the Railway owner) | superuser / table owner | startup **bootstrap** + `alembic upgrade head` | n/a (bypasses by design — migrations need DDL) |
| **app** (`gastify_app`) | non-superuser, `NOSUPERUSER NOBYPASSRLS`, table CRUD only | **uvicorn runtime** | **yes** ✓ |

Migrations keep using the privileged role (they create tables, policies, and own
the schema). The runtime uses the least-privilege `gastify_app`, so RLS becomes a
real defense-in-depth layer.

## How it works (automatic)

`backend/railway.toml` start command runs three steps in order:

```
python -m app.bootstrap_db   # idempotent: ensure gastify_app exists + grants
&& alembic upgrade head      # runs as admin (database_admin_url)
&& uvicorn app.main:app      # runs as gastify_app (database_url)
```

- `app/bootstrap_db.py` connects via `GASTIFY_DATABASE_ADMIN_URL` and ensures the
  `GASTIFY_APP_DB_ROLE` exists with `LOGIN NOSUPERUSER NOBYPASSRLS`, schema
  `USAGE`, table+sequence CRUD grants, and **default privileges** (so tables
  created by future migrations are auto-granted). It **refuses to continue** if
  the role somehow has superuser/bypassrls.
- `alembic/env.py` uses `database_admin_url` when set, else falls back to
  `database_url` (preserving the old single-URL behavior for local/dev/CI).

When `GASTIFY_DATABASE_ADMIN_URL` is **unset**, bootstrap is a no-op and
everything uses `GASTIFY_DATABASE_URL` (local SQLite, dev, CI — unchanged).

## Operator steps (per deployed environment)

For each API service (`gastify-api-staging`, `gastify-api-staging-e2e`,
`gastify-api-production` when it exists):

1. **Pick a strong password** for `gastify_app` (store it in the Railway
   variables only — never commit it).
2. Set these Railway service variables:
   ```
   GASTIFY_DATABASE_ADMIN_URL = <the current superuser URL>   # = today's GASTIFY_DATABASE_URL
   GASTIFY_APP_DB_ROLE        = gastify_app
   GASTIFY_APP_DB_PASSWORD    = <strong password>
   GASTIFY_DATABASE_URL       = postgresql://gastify_app:<strong password>@<same host>:5432/<same db>
   ```
   i.e. **move** today's superuser URL to `GASTIFY_DATABASE_ADMIN_URL`, and point
   `GASTIFY_DATABASE_URL` at the new `gastify_app` role on the same host/db.
3. **Redeploy.** On boot, `bootstrap_db` creates `gastify_app` (as the admin),
   migrations run, then the runtime connects as `gastify_app`.

> Order matters: `GASTIFY_DATABASE_ADMIN_URL` must be the superuser, because only
> it can create the `gastify_app` role and own the tables/policies. Do not point
> `GASTIFY_DATABASE_URL` at `gastify_app` *before* the admin URL is set, or the
> first boot can't provision the role.

## Verify after deploy

```bash
# 1) The app still works end-to-end (it's now on the least-privilege role):
scripts/staging/check-backend-ready.sh <api-url>          # status=ok, migration_status=current

# 2) RLS is actually enforced — the runtime role is non-superuser:
#    connect with the gastify_app DSN and check:
#    SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user;  -- must be FALSE
```

The mechanism is regression-tested in `backend/tests/test_rls_postgres.py` (RLS
isolates a non-superuser role; superusers bypass). Set `GASTIFY_TEST_PG_DSN` to a
throwaway Postgres to run it locally.

## Rollback

If anything misbehaves, set `GASTIFY_DATABASE_URL` back to the superuser URL and
unset `GASTIFY_DATABASE_ADMIN_URL`. The app reverts to the prior single-URL
behavior (RLS inert, but app-layer scoping still isolates tenants). No schema or
data changes are involved — this is purely a connection-role change.
