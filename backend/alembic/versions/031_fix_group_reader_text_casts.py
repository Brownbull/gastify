"""Fix the group cross-scope readers' RETURNS TABLE type mismatch (D71).

app_user_groups (029) declares RETURNS TABLE(... member_role text ...), but
ownership_scope_members.role is String/varchar (migration 001), so PostgreSQL
raises `DatatypeMismatchError: Returned type character varying does not match
expected type text in column "member_role"` at RETURN QUERY — every /groups call
500s on a real (non-synthetic) schema. CREATE OR REPLACE both readers casting the
varchar/text columns explicitly (role::text + name::text, defensive) so the
returned types match the declared TABLE types. CREATE OR REPLACE preserves the
owner + ACL; the guarded grant/own block re-asserts them idempotently.

Revision ID: 031
Revises: 030
Create Date: 2026-06-04
"""

from alembic import op

revision = "031"
down_revision = "030"
branch_labels = None
depends_on = None

# Keep in sync with backend/tests/test_group_isolation.py (now uses a varchar role
# column so the harness reproduces the real-schema type checking).
_CREATE_USER_GROUPS = """
CREATE OR REPLACE FUNCTION app_user_groups(p_user_id uuid)
RETURNS TABLE(scope_id uuid, group_name text, member_role text, member_count integer)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN;
    END IF;
    RETURN QUERY
    SELECT s.id, s.name::text, m.role::text,
           (SELECT count(*)::integer FROM ownership_scope_members m2
            WHERE m2.ownership_scope_id = s.id)
    FROM ownership_scope_members m
    JOIN ownership_scopes s ON s.id = m.ownership_scope_id
    WHERE m.user_id = p_user_id AND s.scope_type = 'group'
    ORDER BY s.created_at;
END;
$$;
"""

_CREATE_INVITE_PREVIEW = """
CREATE OR REPLACE FUNCTION app_group_invite_preview(p_token text)
RETURNS TABLE(group_id uuid, group_name text, member_count integer, expires_at timestamptz)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF p_token IS NULL OR length(p_token) = 0 THEN
        RETURN;
    END IF;
    RETURN QUERY
    SELECT s.id, s.name::text,
           (SELECT count(*)::integer FROM ownership_scope_members m
            WHERE m.ownership_scope_id = s.id),
           s.invite_token_expires_at
    FROM ownership_scopes s
    WHERE s.invite_token = p_token AND s.scope_type = 'group';
END;
$$;
"""

# Pre-031 (029) bodies, for downgrade.
_OLD_USER_GROUPS = _CREATE_USER_GROUPS.replace("s.name::text, m.role::text", "s.name, m.role")
_OLD_INVITE_PREVIEW = _CREATE_INVITE_PREVIEW.replace("s.name::text", "s.name")

_GRANT_AND_OWN = """
DO $$
DECLARE
    fn text;
BEGIN
    FOREACH fn IN ARRAY ARRAY[
        'app_user_groups(uuid)', 'app_group_invite_preview(text)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gastify_app') THEN
            EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO gastify_app', fn);
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gastify_migrator') THEN
            EXECUTE format('ALTER FUNCTION %s OWNER TO gastify_migrator', fn);
        END IF;
    END LOOP;
END$$;
"""


def upgrade() -> None:
    op.execute(_CREATE_USER_GROUPS)
    op.execute(_CREATE_INVITE_PREVIEW)
    op.execute(_GRANT_AND_OWN)


def downgrade() -> None:
    op.execute(_OLD_USER_GROUPS)
    op.execute(_OLD_INVITE_PREVIEW)
    op.execute(_GRANT_AND_OWN)
