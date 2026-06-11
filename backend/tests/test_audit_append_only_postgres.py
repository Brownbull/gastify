"""PostgreSQL proof of the audit_events governed-mutations trigger (P78, migration 038).

Replicates the 038 DDL under a non-superuser owner + app role (mirrors
test_retention_postgres.py) and proves, on real Postgres:
  1. a rogue UPDATE (rewriting event_type/details) is REJECTED;
  2. a rogue DELETE by the app role is REJECTED;
  3. the governed PII-scrub UPDATE (ip_address → NULL, nothing else) SUCCEEDS;
  4. the governed purge DELETE (via the owner-run definer) SUCCEEDS.

SKIPPED unless GASTIFY_TEST_PG_DSN is set; CI provisions Postgres.
Keep the DDL in sync with migration 038.
"""

from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime, timedelta

import asyncpg
import pytest

ADMIN_DSN = os.getenv("GASTIFY_TEST_PG_DSN")
pytestmark = pytest.mark.skipif(
    not ADMIN_DSN, reason="GASTIFY_TEST_PG_DSN not set — PG trigger tests skipped."
)

_OWNER = "gastify_aud_owner"
_APP = "gastify_aud_app"
_PW = "aud_test_pw"  # noqa: S105 — throwaway test role

_SETUP = f"""
DROP TABLE IF EXISTS audit_events CASCADE;
CREATE TABLE audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id uuid NOT NULL,
    user_id uuid,
    event_type text NOT NULL,
    resource_type text,
    resource_id uuid,
    details text,
    ip_address text,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_events OWNER TO {_OWNER};
"""

# Mirror migration 038 exactly.
_FN = """
CREATE OR REPLACE FUNCTION audit_events_governed_mutations()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.ip_address IS NULL
           AND NEW.id = OLD.id
           AND NEW.ownership_scope_id = OLD.ownership_scope_id
           AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
           AND NEW.event_type = OLD.event_type
           AND NEW.resource_type IS NOT DISTINCT FROM OLD.resource_type
           AND NEW.resource_id IS NOT DISTINCT FROM OLD.resource_id
           AND NEW.details IS NOT DISTINCT FROM OLD.details
           AND NEW.created_at = OLD.created_at THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'audit_events is append-only: only the PII scrub UPDATE is permitted';
    END IF;
    IF current_user = (SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid = TG_RELID)
       OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolsuper) THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'audit_events is append-only: DELETE is reserved for the retention purge';
END;
$$;
"""
_TRG = """
CREATE TRIGGER audit_events_governed_mutations
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION audit_events_governed_mutations();
"""
# The owner-run purge definer (mirrors 037) — proves the governed DELETE path.
_PURGE = """
CREATE OR REPLACE FUNCTION app_purge_expired_audit_events(p_cutoff timestamptz)
RETURNS bigint LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE v bigint;
BEGIN
    DELETE FROM audit_events
     WHERE created_at < p_cutoff AND event_type NOT LIKE 'dsr~_%' ESCAPE '~';
    GET DIAGNOSTICS v = ROW_COUNT;
    RETURN v;
END;
$$;
"""

_TEARDOWN = (
    "DROP TABLE IF EXISTS audit_events CASCADE;"
    " DROP FUNCTION IF EXISTS audit_events_governed_mutations();"
    " DROP FUNCTION IF EXISTS app_purge_expired_audit_events(timestamptz);"
)


async def _connect_admin() -> asyncpg.Connection:
    assert ADMIN_DSN is not None
    try:
        return await asyncpg.connect(ADMIN_DSN, timeout=5)
    except Exception:  # pragma: no cover - environment guard
        pytest.skip("Postgres not reachable at GASTIFY_TEST_PG_DSN.")


async def _setup(admin: asyncpg.Connection) -> str:
    for role in (_OWNER, _APP):
        await admin.execute(
            f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}')"
            f" THEN CREATE ROLE {role} NOSUPERUSER; END IF; END$$;"
        )
    await admin.execute(f"ALTER ROLE {_APP} LOGIN PASSWORD '{_PW}'")
    await admin.execute(_SETUP)
    for ddl in (_FN, _TRG, _PURGE):
        await admin.execute(ddl)
    await admin.execute(
        f"ALTER FUNCTION app_purge_expired_audit_events(timestamptz) OWNER TO {_OWNER}"
    )
    await admin.execute(
        "REVOKE ALL ON FUNCTION app_purge_expired_audit_events(timestamptz) FROM PUBLIC"
    )
    await admin.execute(
        f"GRANT EXECUTE ON FUNCTION app_purge_expired_audit_events(timestamptz) TO {_APP}"
    )
    await admin.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON audit_events TO {_APP}")
    parts = await admin.fetchrow("SELECT current_setting('port') p, current_database() d")
    host = ADMIN_DSN.split("@")[-1].split("/")[0].split(":")[0]
    return f"postgresql://{_APP}:{_PW}@{host}:{parts['p']}/{parts['d']}"


@pytest.mark.asyncio
async def test_governed_mutations_only() -> None:
    admin = await _connect_admin()
    now = datetime.now(UTC)
    try:
        app_dsn = await _setup(admin)
        sid = uuid.uuid4()
        await admin.execute(
            "INSERT INTO audit_events (id, ownership_scope_id, event_type, ip_address,"
            " created_at) VALUES ($1, $2, 'consent_granted', '1.2.3.4', $3)",
            sid,
            uuid.uuid4(),
            now - timedelta(days=365 * 7),
        )
        app = await asyncpg.connect(app_dsn, timeout=5)
        try:
            # 1. Rogue UPDATE (history rewrite) → rejected.
            with pytest.raises(asyncpg.RaiseError, match="append-only"):
                await app.execute(
                    "UPDATE audit_events SET event_type='nothing_happened' WHERE id=$1", sid
                )
            # 2. Rogue DELETE by the app role → rejected.
            with pytest.raises(asyncpg.RaiseError, match="retention purge"):
                await app.execute("DELETE FROM audit_events WHERE id=$1", sid)
            # 3. The governed PII scrub → succeeds.
            await app.execute("UPDATE audit_events SET ip_address=NULL WHERE id=$1", sid)
            ip = await app.fetchval("SELECT ip_address FROM audit_events WHERE id=$1", sid)
            assert ip is None
            # 4. The governed purge (owner-run definer) → succeeds, row gone.
            purged = await app.fetchval(
                "SELECT app_purge_expired_audit_events($1)", now - timedelta(days=365 * 6)
            )
            assert purged == 1
        finally:
            await app.close()
        assert await admin.fetchval("SELECT count(*) FROM audit_events") == 0
    finally:
        await admin.execute(_TEARDOWN)
        await admin.execute(f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {_APP}")  # noqa: S608
        await admin.close()
