"""Phase 5b Groups: cross-scope membership readers + admin role + invite-links (D71).

Listing the groups a user belongs to, and previewing/joining a group by invite
token, are user-centric reads ACROSS scopes the caller cannot yet see — the
single-GUC RLS model can't express them, and the 5a GUC-juggling oracle only
resolves an already-KNOWN scope. Per D71, relax `ownership_scope_members` to
`ENABLE` but NOT `FORCE` row-level security, so a fixed set of SECURITY DEFINER
functions OWNED BY gastify_migrator can read membership across scopes, while the
runtime role gastify_app (non-owner) stays fully RLS-isolated and every DATA
table keeps FORCE. No policy is widened (D3-safe); writes to members remain
scope-isolated for gastify_app.

Adds: the `admin` role (widened CHECK), invite-link columns on ownership_scopes,
and the `app_user_groups` + `app_group_invite_preview` readers.

Revision ID: 029
Revises: 028
Create Date: 2026-06-03
"""

import sqlalchemy as sa

from alembic import op

revision = "029"
down_revision = "028"
branch_labels = None
depends_on = None

# Cross-scope membership readers. Owner (gastify_migrator) bypasses the non-FORCE
# members policy, so these need no GUC-juggling. Each is parameterized + returns
# only membership facts / safe fields (never a row-data egress). Keep in sync with
# backend/tests/test_group_isolation.py.
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
    SELECT s.id, s.name, m.role,
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
    SELECT s.id, s.name,
           (SELECT count(*)::integer FROM ownership_scope_members m
            WHERE m.ownership_scope_id = s.id),
           s.invite_token_expires_at
    FROM ownership_scopes s
    WHERE s.invite_token = p_token AND s.scope_type = 'group';
END;
$$;
"""

# Lock down + deterministically own both readers (mirrors 028's guarded grant).
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

# One statement per op.execute — the asyncpg prepared-statement protocol rejects
# multiple commands in a single execute.
_DROP_FUNCTIONS = (
    "DROP FUNCTION IF EXISTS app_user_groups(uuid)",
    "DROP FUNCTION IF EXISTS app_group_invite_preview(text)",
)


def upgrade() -> None:
    # 1. Relax the members table: keep ENABLE (gastify_app isolated) but drop
    #    FORCE so the migrator-owned definer readers can read across scopes.
    op.execute("ALTER TABLE ownership_scope_members NO FORCE ROW LEVEL SECURITY")
    # 2. Widen the role CHECK to add 'admin'.
    op.drop_constraint("ck_scope_members_role", "ownership_scope_members", type_="check")
    op.create_check_constraint(
        "ck_scope_members_role",
        "ownership_scope_members",
        "role IN ('owner', 'admin', 'member')",
    )
    # 3. Invite-link columns on the group scope.
    op.add_column("ownership_scopes", sa.Column("invite_token", sa.Text(), nullable=True))
    op.add_column(
        "ownership_scopes",
        sa.Column("invite_token_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "uq_ownership_scopes_invite_token",
        "ownership_scopes",
        ["invite_token"],
        unique=True,
    )
    # 4. The cross-scope readers.
    op.execute(_CREATE_USER_GROUPS)
    op.execute(_CREATE_INVITE_PREVIEW)
    op.execute(_GRANT_AND_OWN)


def downgrade() -> None:
    for drop in _DROP_FUNCTIONS:
        op.execute(drop)
    op.drop_index("uq_ownership_scopes_invite_token", table_name="ownership_scopes")
    op.drop_column("ownership_scopes", "invite_token_expires_at")
    op.drop_column("ownership_scopes", "invite_token")
    # Refuse to narrow the role CHECK while 'admin' rows exist (data-safety).
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM ownership_scope_members WHERE role = 'admin') THEN
                RAISE EXCEPTION
                    'Cannot downgrade 029: % admin member(s) exist; demote them first',
                    (SELECT count(*) FROM ownership_scope_members WHERE role = 'admin');
            END IF;
        END$$;
        """
    )
    op.drop_constraint("ck_scope_members_role", "ownership_scope_members", type_="check")
    op.create_check_constraint(
        "ck_scope_members_role",
        "ownership_scope_members",
        "role IN ('owner', 'member')",
    )
    op.execute("ALTER TABLE ownership_scope_members FORCE ROW LEVEL SECURITY")
