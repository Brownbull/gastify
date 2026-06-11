"""Enforce audit_events' append-only-except-governed-mutations invariant at the DB.

Revision ID: 038
Revises: 037
Create Date: 2026-06-11

P78: the table was COMMENTED append-only but nothing enforced it. The honest invariant
(documented in schema/RLS.md) is "append-only EXCEPT two governed mutations":

  1. the DSR PII scrub — an UPDATE that nulls ip_address and changes NOTHING else
     (`scrub_user_audit_trail`, runs as the app role inside the erasure flow);
  2. the retention TTL purge — a DELETE running as the table OWNER (the migration-037
     SECURITY DEFINER `app_purge_expired_audit_events` executes as gastify_migrator).

This trigger enforces exactly that: any other UPDATE is rejected; any DELETE by a role
that is neither the table owner nor a superuser is rejected (a superuser could drop the
trigger anyway, so excluding it buys no integrity and would break operational cleanup).
Mirrors the migration-036 tombstone append-only pattern.

Keep in sync with backend/tests/test_audit_append_only_postgres.py (replica proof).
"""

from alembic import op

revision = "038"
down_revision = "037"
branch_labels = None
depends_on = None

_CREATE_FN = """
CREATE OR REPLACE FUNCTION audit_events_governed_mutations()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Governed mutation 1: the PII scrub — ip_address -> NULL, nothing else moves.
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
    -- Governed mutation 2: the retention purge — runs as the table owner (the 037
    -- SECURITY DEFINER executes as gastify_migrator). Superusers pass (they could drop
    -- this trigger regardless; blocking them only breaks operational cleanup).
    IF current_user = (SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid = TG_RELID)
       OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolsuper) THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'audit_events is append-only: DELETE is reserved for the retention purge';
END;
$$;
"""

_CREATE_TRIGGER = """
CREATE TRIGGER audit_events_governed_mutations
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION audit_events_governed_mutations();
"""


def upgrade() -> None:
    op.execute(_CREATE_FN)
    op.execute(_CREATE_TRIGGER)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS audit_events_governed_mutations ON audit_events")
    op.execute("DROP FUNCTION IF EXISTS audit_events_governed_mutations()")
