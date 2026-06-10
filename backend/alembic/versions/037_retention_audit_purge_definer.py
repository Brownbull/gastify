"""Make the audit_events retention purge work cross-scope + exempt DSR proof events.

Revision ID: 037
Revises: 036
Create Date: 2026-06-10

P16 Phase 2 (Consent + Retention) validation found exit-signal-(d) DOUBLY broken on
Postgres: (1) the TTL purge was never scheduled (fixed by the retention GH workflow),
and (2) ``audit_events`` is ENABLE+FORCE ROW LEVEL SECURITY, so the retention runner —
the least-privilege ``gastify_app`` role with NO ``app.ownership_scope_id`` GUC set —
ran a global ``DELETE FROM audit_events`` that matched ZERO rows (027 fail-safe form:
unset GUC -> NULL -> no visible rows) while reporting success. The SQLite test suite
couldn't see it (no RLS). This is the exact Phase-1 trap class (D90).

Fix (mirrors D71's ownership_scope_members NO-FORCE + the 028 oracle): drop FORCE on
audit_events so the table OWNER (gastify_migrator, NON-superuser) bypasses RLS, and add
a migrator-owned SECURITY DEFINER purge/count pair that the runtime role EXECUTEs. The
app's DIRECT access to audit_events stays RLS-isolated (ENABLE still binds the non-owner
gastify_app); only the narrow definer functions can cross scopes — and they only ever
purge/count, never egress rows. The purge EXEMPTS ``dsr_*`` proof-of-processing events
(D4/D89): the erased user's data is gone, so the dsr_erasure event is the sole durable
proof an erasure was honored — it must outlive the generic ~6y operational window.

Keep this DDL shape in sync with backend/tests/test_retention_postgres.py (replicates
it under a non-superuser owner to prove the property, like test_group_isolation.py).
"""

from alembic import op

revision = "037"
down_revision = "036"
branch_labels = None
depends_on = None

# `~` is the LIKE ESCAPE char (avoids backslash ambiguity): `dsr~_%` matches the literal
# prefix `dsr_` so dsr_access/dsr_erasure/dsr_portability/dsr_rectification/
# dsr_group_leave_delete are all EXEMPT from the purge.
_CREATE_PURGE = """
CREATE OR REPLACE FUNCTION app_purge_expired_audit_events(p_cutoff timestamptz)
RETURNS bigint
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_count bigint;
BEGIN
    DELETE FROM audit_events
     WHERE created_at < p_cutoff
       AND event_type NOT LIKE 'dsr~_%' ESCAPE '~';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
"""

_CREATE_COUNT = """
CREATE OR REPLACE FUNCTION app_count_expired_audit_events(p_cutoff timestamptz)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_count bigint;
BEGIN
    SELECT count(*) INTO v_count
      FROM audit_events
     WHERE created_at < p_cutoff
       AND event_type NOT LIKE 'dsr~_%' ESCAPE '~';
    RETURN v_count;
END;
$$;
"""

# Lock down + deterministically own the functions (mirror migration 028): EXECUTE only
# to the runtime role; ownership pinned to gastify_migrator so the SECURITY DEFINER
# context is a NON-superuser. Guarded so it's a no-op where the roles aren't provisioned
# (CI throwaway DBs / single-role local).
_GRANT = """
DO $$
BEGIN
    REVOKE ALL ON FUNCTION app_purge_expired_audit_events(timestamptz) FROM PUBLIC;
    REVOKE ALL ON FUNCTION app_count_expired_audit_events(timestamptz) FROM PUBLIC;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gastify_app') THEN
        GRANT EXECUTE ON FUNCTION app_purge_expired_audit_events(timestamptz) TO gastify_app;
        GRANT EXECUTE ON FUNCTION app_count_expired_audit_events(timestamptz) TO gastify_app;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gastify_migrator') THEN
        ALTER FUNCTION app_purge_expired_audit_events(timestamptz) OWNER TO gastify_migrator;
        ALTER FUNCTION app_count_expired_audit_events(timestamptz) OWNER TO gastify_migrator;
    END IF;
END$$;
"""


def upgrade() -> None:
    # Drop FORCE so the table owner (gastify_migrator) bypasses RLS for the definer
    # functions; ENABLE stays, so the non-owner runtime role gastify_app is still
    # fully isolated on direct access (mirrors D71's ownership_scope_members).
    op.execute("ALTER TABLE audit_events NO FORCE ROW LEVEL SECURITY")
    op.execute(_CREATE_PURGE)
    op.execute(_CREATE_COUNT)
    op.execute(_GRANT)


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS app_purge_expired_audit_events(timestamptz)")
    op.execute("DROP FUNCTION IF EXISTS app_count_expired_audit_events(timestamptz)")
    op.execute("ALTER TABLE audit_events FORCE ROW LEVEL SECURITY")
