"""PostgreSQL-executed retention-purge proof (P16 Phase 2, D90).

The SQLite suite cannot see the load-bearing failure: on real Postgres, audit_events is
RLS-isolated, so the retention runner — the least-privilege app role with NO scope GUC —
ran a global `DELETE FROM audit_events` that matched ZERO rows while reporting success.
Migration 037 fixes it by dropping FORCE (so the migrator-owned table owner bypasses) and
purging through a migrator-owned SECURITY DEFINER function the app role EXECUTEs.

These tests replicate that DDL under a non-superuser owner + a non-superuser app role
(mirrors test_group_isolation.py) and prove, under REAL row-level security:
  1. a DIRECT delete as the app role (no GUC) purges 0 rows — the bug, locked as a guard;
  2. the definer purge as the same app role deletes the expired non-DSR rows ACROSS
     scopes, while the dsr_* proof events + within-window rows survive.

SKIPPED unless GASTIFY_TEST_PG_DSN (asyncpg DSN of a SUPERUSER on a throwaway DB) is set;
CI provisions a Postgres service for this. Keep the DDL in sync with migration 037.
"""

from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime, timedelta

import asyncpg
import pytest

ADMIN_DSN = os.getenv("GASTIFY_TEST_PG_DSN")

pytestmark = pytest.mark.skipif(
    not ADMIN_DSN,
    reason="GASTIFY_TEST_PG_DSN not set — PostgreSQL-executed retention tests skipped.",
)

_OWNER_ROLE = "gastify_ret_owner"  # non-superuser owner (mirrors gastify_migrator)
_APP_ROLE = "gastify_ret_app"  # non-superuser runtime role (mirrors gastify_app)
_APP_PASSWORD = "ret_test_pw"  # noqa: S105 — throwaway test role password

# 027 fail-safe GUC form: unset/empty GUC -> NULL -> zero visible rows (never an error).
_SCOPE = "NULLIF(current_setting('app.ownership_scope_id', true), '')::uuid"

_SETUP_SQL = f"""
DROP TABLE IF EXISTS audit_events CASCADE;

CREATE TABLE audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id uuid NOT NULL,
    user_id uuid,
    event_type text NOT NULL,
    ip_address text,
    details text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Migration 037: ENABLE (not FORCE) so the table OWNER bypasses RLS for the definer,
-- while the non-owner app role stays isolated on direct access.
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_events_scope_isolation ON audit_events
    USING (ownership_scope_id = {_SCOPE})
    WITH CHECK (ownership_scope_id = {_SCOPE});

ALTER TABLE audit_events OWNER TO {_OWNER_ROLE};
"""

# Mirror migration 037's SECURITY DEFINER pair (dsr_* exempt via ESCAPE '~').
_CREATE_PURGE = """
CREATE OR REPLACE FUNCTION app_purge_expired_audit_events(p_cutoff timestamptz)
RETURNS bigint LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE v_count bigint;
BEGIN
    DELETE FROM audit_events
     WHERE created_at < p_cutoff AND event_type NOT LIKE 'dsr~_%' ESCAPE '~';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
"""
_CREATE_COUNT = """
CREATE OR REPLACE FUNCTION app_count_expired_audit_events(p_cutoff timestamptz)
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE v_count bigint;
BEGIN
    SELECT count(*) INTO v_count FROM audit_events
     WHERE created_at < p_cutoff AND event_type NOT LIKE 'dsr~_%' ESCAPE '~';
    RETURN v_count;
END;
$$;
"""

_FUNCTIONS = (
    "app_purge_expired_audit_events(timestamptz)",
    "app_count_expired_audit_events(timestamptz)",
)
_TEARDOWN_SQL = (
    "DROP TABLE IF EXISTS audit_events CASCADE;"
    " DROP FUNCTION IF EXISTS app_purge_expired_audit_events(timestamptz);"
    " DROP FUNCTION IF EXISTS app_count_expired_audit_events(timestamptz);"
)


async def _connect_admin() -> asyncpg.Connection:
    assert ADMIN_DSN is not None
    try:
        return await asyncpg.connect(ADMIN_DSN, timeout=5)
    except Exception:  # pragma: no cover - environment guard
        pytest.skip(f"Postgres not reachable at GASTIFY_TEST_PG_DSN ({ADMIN_DSN.split('@')[-1]}).")


async def _admin_setup(admin: asyncpg.Connection) -> str:
    for role in (_OWNER_ROLE, _APP_ROLE):
        await admin.execute(
            f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}')"
            f" THEN CREATE ROLE {role} NOSUPERUSER; END IF; END$$;"
        )
    await admin.execute(f"ALTER ROLE {_APP_ROLE} LOGIN PASSWORD '{_APP_PASSWORD}'")
    await admin.execute(_SETUP_SQL)
    for ddl in (_CREATE_PURGE, _CREATE_COUNT):
        await admin.execute(ddl)
    for fn in _FUNCTIONS:
        await admin.execute(f"ALTER FUNCTION {fn} OWNER TO {_OWNER_ROLE}")
        await admin.execute(f"REVOKE ALL ON FUNCTION {fn} FROM PUBLIC")
        await admin.execute(f"GRANT EXECUTE ON FUNCTION {fn} TO {_APP_ROLE}")
    await admin.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON audit_events TO {_APP_ROLE}")
    parts = await admin.fetchrow("SELECT current_setting('port') AS port, current_database() AS db")
    assert ADMIN_DSN is not None
    host = ADMIN_DSN.split("@")[-1].split("/")[0].split(":")[0]
    return f"postgresql://{_APP_ROLE}:{_APP_PASSWORD}@{host}:{parts['port']}/{parts['db']}"


async def _admin_teardown(admin: asyncpg.Connection) -> None:
    await admin.execute(_TEARDOWN_SQL)
    await admin.execute(f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {_APP_ROLE}")  # noqa: S608


async def _seed(
    admin: asyncpg.Connection, *, scope: uuid.UUID, event_type: str, created_at: datetime
) -> None:
    # Seed as the admin/superuser (RLS-exempt) so the fixtures land regardless of scope.
    await admin.execute(
        "INSERT INTO audit_events (ownership_scope_id, event_type, created_at) VALUES ($1, $2, $3)",
        scope,
        event_type,
        created_at,
    )


async def _admin_count(admin: asyncpg.Connection, **kw: str) -> int:
    if kw.get("event_type"):
        return await admin.fetchval(
            "SELECT count(*) FROM audit_events WHERE event_type = $1", kw["event_type"]
        )
    return await admin.fetchval("SELECT count(*) FROM audit_events")


@pytest.mark.asyncio
async def test_direct_audit_delete_under_app_role_purges_zero() -> None:
    """The bug, locked as a guard: a global DELETE as the non-owner app role with no GUC
    matches ZERO rows under RLS — which is why the pre-037 runner silently deleted nothing."""
    admin = await _connect_admin()
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=365 * 6)
    try:
        app_dsn = await _admin_setup(admin)
        await _seed(
            admin,
            scope=uuid.uuid4(),
            event_type="consent_granted",
            created_at=now - timedelta(days=365 * 7),
        )
        app = await asyncpg.connect(app_dsn, timeout=5)
        try:
            # No GUC set: the RLS policy compares against NULL -> 0 visible rows.
            deleted = await app.fetchval(
                "WITH d AS (DELETE FROM audit_events WHERE created_at < $1 RETURNING 1)"
                " SELECT count(*) FROM d",
                cutoff,
            )
            assert deleted == 0  # the silent-zero bug
        finally:
            await app.close()
        # The expired row is STILL THERE (a fresh admin/bypass view confirms).
        assert await _admin_count(admin) == 1
    finally:
        await _admin_teardown(admin)
        await admin.close()


@pytest.mark.asyncio
async def test_definer_purge_under_app_role_deletes_cross_scope_except_dsr() -> None:
    """Migration 037: the app role's call to the migrator-owned definer purges expired
    non-DSR events ACROSS scopes, while dsr_* proof events + within-window rows survive."""
    admin = await _connect_admin()
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=365 * 6)
    old = now - timedelta(days=365 * 7)
    try:
        app_dsn = await _admin_setup(admin)
        scope_a, scope_b = uuid.uuid4(), uuid.uuid4()
        await _seed(admin, scope=scope_a, event_type="consent_granted", created_at=old)  # purge
        await _seed(
            admin, scope=scope_b, event_type="consent_revoked", created_at=old
        )  # purge (other scope)
        await _seed(admin, scope=scope_a, event_type="dsr_erasure", created_at=old)  # EXEMPT
        await _seed(
            admin, scope=scope_a, event_type="consent_granted", created_at=now
        )  # within window
        app = await asyncpg.connect(app_dsn, timeout=5)
        try:
            # Same connection shape as the runner: app role, no GUC.
            counted = await app.fetchval("SELECT app_count_expired_audit_events($1)", cutoff)
            purged = await app.fetchval("SELECT app_purge_expired_audit_events($1)", cutoff)
            assert counted == 2 and purged == 2  # both expired non-dsr rows, both scopes
        finally:
            await app.close()
        # dsr_erasure proof + the within-window row survive; the 2 expired non-dsr are gone.
        assert await _admin_count(admin) == 2
        assert await _admin_count(admin, event_type="dsr_erasure") == 1
    finally:
        await _admin_teardown(admin)
        await admin.close()
