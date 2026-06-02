# Runbook — Database Role Split (RLS enforcement, P43 / Gustify D32 parity)

## Why

PostgreSQL **row-level security only applies to non-superuser, non-`BYPASSRLS`
roles** — and table **owners** also bypass RLS unless the table has `FORCE ROW
LEVEL SECURITY`. The app historically connected as the `postgres` superuser, so
every RLS policy on scope-bound tables was **silently inert** in production.
Tenant isolation still held (the app filters every query by `ownership_scope_id`
and sets `app.ownership_scope_id` per request), but RLS — the intended
defense-in-depth barrier — did nothing, and any bug/injection ran with DB
god-mode.

The fix uses **two dedicated NON-superuser roles** + a **startup guard**:

| Role | Privilege | Used by | RLS applies? |
|---|---|---|---|
| **`gastify_migrator`** | NON-superuser, **owns** the tables, `CREATE` on schema | `alembic upgrade head` (`GASTIFY_MIGRATION_DATABASE_URL`) | bypasses as owner — fine, migrations need DDL |
| **`gastify_app`** | NON-superuser, **non-owner**, table CRUD only | runtime uvicorn (`GASTIFY_DATABASE_URL`) | **yes** ✓ |

The `postgres` superuser is used **once, operationally**, to provision these two
roles — then never by the app at runtime or migration time.

### The durable guard (the "can never silently regress" part)

`app/db.py::assert_least_privilege_role()` runs in the FastAPI lifespan. On a
deployed Postgres it queries `pg_roles` for the connected role and **raises —
refusing to boot — if the runtime role is superuser or has BYPASSRLS**. So a
future misconfiguration (e.g. `GASTIFY_DATABASE_URL` pointed back at `postgres`)
fails loudly at startup instead of silently disabling RLS. A healthy `/healthz`
is proof the runtime connects as a least-privilege role. Skipped on local +
SQLite (no roles).

## One-time provisioning (run as the current superuser, per environment)

Generate passwords with `python -c "import secrets; print(secrets.token_urlsafe(32))"`.
**Never print or commit them — store only in Railway service variables.**

```sql
-- 1) Two non-superuser roles
CREATE ROLE gastify_migrator LOGIN PASSWORD '<mig-pw>'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE ROLE gastify_app LOGIN PASSWORD '<app-pw>'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

-- 2) Schema privileges
GRANT CREATE, USAGE ON SCHEMA public TO gastify_migrator;
GRANT USAGE ON SCHEMA public TO gastify_app;

-- 3) Transfer ownership of ALL app objects (incl. alembic_version) to the migrator.
--    REASSIGN OWNED moves everything the current owner owns in this database.
REASSIGN OWNED BY postgres TO gastify_migrator;
--    (If the current owner is a different role, swap 'postgres' accordingly.
--     On Railway the bootstrap role is typically 'postgres'.)

-- 4) Runtime CRUD grants for the app role (current + future tables/sequences)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gastify_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gastify_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gastify_migrator IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gastify_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gastify_migrator IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO gastify_app;
```

Because `gastify_app` is a **non-owner**, the existing RLS policies apply to it
**without** needing `FORCE RLS`. (The tables already use `FORCE ROW LEVEL
SECURITY`, which is what lets `gastify_migrator` — the owner — still be subject to
policy during migration FK-validation; see the migration note below.)

## Repoint Railway variables (per API service) + redeploy

```
GASTIFY_DATABASE_URL           = postgresql://gastify_app:<app-pw>@<host>:5432/<db>
GASTIFY_MIGRATION_DATABASE_URL = postgresql://gastify_migrator:<mig-pw>@<host>:5432/<db>
```

Redeploy. On boot: alembic runs as `gastify_migrator`, the runtime starts as
`gastify_app`, and the lifespan guard verifies the runtime role can't bypass RLS
(or the boot fails).

## Migration note (a real bug the superuser was masking)

Some migrations add/validate foreign keys on tables that already have `FORCE ROW
LEVEL SECURITY`. The validation scan evaluates the RLS policy, which reads
`current_setting('app.ownership_scope_id')` — **unset during DDL**. A superuser
silently skipped this (it bypasses RLS); the non-bypassing `gastify_migrator`
hit `unrecognized configuration parameter`. `alembic/env.py` now sets a
placeholder `app.ownership_scope_id` for the migration session so policy
evaluation has a value. (This is why migrating as the superuser was dangerous —
it hid the interaction.)

## Verify after deploy

```bash
scripts/staging/check-backend-ready.sh <api-url>   # status=ok, migration_status=current
#   A 200 from /healthz means the RLS boot guard passed.

# Live connection is the least-privilege role:
#   SELECT usename, rolsuper, rolbypassrls
#   FROM pg_stat_activity JOIN pg_roles ON rolname = usename
#   WHERE datname = current_database();    -- app conn = gastify_app, both FALSE

# RLS is actively enforced (not inert) — re-run the P32 mechanism test against a
# throwaway PG: backend/tests/test_rls_postgres.py (cross-tenant read blocked).
```

## Rollback

Point `GASTIFY_DATABASE_URL` back at the superuser and unset
`GASTIFY_MIGRATION_DATABASE_URL`. **But** the startup guard will then **refuse to
boot** (superuser bypasses RLS) — which is the guard working as designed. To roll
back fully you must also bypass the guard, so prefer fixing forward. No schema or
data changes are involved — this is purely a connection-role change.
