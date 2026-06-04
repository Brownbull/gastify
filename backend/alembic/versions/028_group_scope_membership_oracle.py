"""Phase 5 Groups: widen scope_type for 'group', add ownership_scopes.name, and
add the SECURITY DEFINER membership oracle that authorizes a scope-swap (D70).

A group is an OwnershipScope with scope_type='group' (the CHECK only allowed
'individual'/'household' before) and a human-readable name. Per-group analytics
(D69) swaps the RLS GUC `app.ownership_scope_id` to the group scope — but ONLY
after proving the caller is a member, and the members table is itself RLS-gated
on that same GUC (003/027), so under the caller's PERSONAL scope a plain
membership SELECT returns zero rows for a group they legitimately belong to (the
chicken-and-egg).

`app_is_scope_member(p_user_id, p_scope_id)` resolves it WITHOUT widening any
policy (D3): it momentarily sets the GUC to the target scope for its own EXISTS
read, then RESTORES the caller's prior GUC, and returns a single boolean (never
row data). It is SECURITY DEFINER with a pinned search_path and EXECUTE granted
only to the runtime role — the only D3-safe check, since Postgres has no
`app.user_id` GUC to key a policy on and FORCE ROW LEVEL SECURITY binds even the
table owner. The deliberate scope-swap (auth/deps.py) is made unreachable until
this returns true (validate-then-swap, never swap-then-check).

Revision ID: 028
Revises: 027
Create Date: 2026-06-03
"""

import sqlalchemy as sa

from alembic import op

revision = "028"
down_revision = "027"
branch_labels = None
depends_on = None

# Keep this DDL shape in sync with backend/tests/test_group_isolation.py, which
# replicates it under a non-superuser owner role to prove the security property
# (mirrors how test_rls_postgres.py replicates the RLS policy shape inline).
_CREATE_ORACLE = """
CREATE OR REPLACE FUNCTION app_is_scope_member(p_user_id uuid, p_scope_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_prev text;
    v_found boolean;
BEGIN
    IF p_user_id IS NULL OR p_scope_id IS NULL THEN
        RETURN false;
    END IF;
    -- Save the caller's current scope, elevate to the TARGET scope for this
    -- read only (transaction-local), then RESTORE — so the validation never
    -- leaves the session pointing at a scope the caller hasn't been proven a
    -- member of. The EXISTS sees the one member row because the GUC == target.
    -- VOLATILE (not STABLE): set_config is an observable side effect, so the
    -- planner must never fold/cache this call.
    v_prev := current_setting('app.ownership_scope_id', true);
    PERFORM set_config('app.ownership_scope_id', p_scope_id::text, true);
    SELECT EXISTS (
        SELECT 1 FROM ownership_scope_members
        WHERE user_id = p_user_id AND ownership_scope_id = p_scope_id
    ) INTO v_found;
    -- Restore: COALESCE(NULL -> '') is intentional and safe because every RLS
    -- policy (since migration 027) wraps the cast as NULLIF(current_setting(...
    -- , true), '')::uuid, so an empty GUC maps to NULL -> zero visible rows
    -- (fail-safe), never a cast error. This restore is load-bearing on 027.
    PERFORM set_config('app.ownership_scope_id', COALESCE(v_prev, ''), true);
    RETURN v_found;
END;
$$;
"""

_DROP_ORACLE = "DROP FUNCTION IF EXISTS app_is_scope_member(uuid, uuid)"

# Lock down + deterministically own the oracle. EXECUTE is restricted to the
# runtime role; ownership is pinned to gastify_migrator so the SECURITY DEFINER
# context is a NON-superuser even if the migration is ever run as a superuser by
# mistake (a superuser-owned DEFINER would bypass FORCE RLS). Both role checks
# are guarded so this is a no-op where the role isn't provisioned (CI throwaway
# DBs), and the role names are fixed literals (no injection surface).
_GRANT_EXECUTE = """
DO $$
BEGIN
    REVOKE ALL ON FUNCTION app_is_scope_member(uuid, uuid) FROM PUBLIC;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gastify_app') THEN
        GRANT EXECUTE ON FUNCTION app_is_scope_member(uuid, uuid) TO gastify_app;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gastify_migrator') THEN
        ALTER FUNCTION app_is_scope_member(uuid, uuid) OWNER TO gastify_migrator;
    END IF;
END$$;
"""


def upgrade() -> None:
    # 1. Widen scope_type to allow 'group'.
    op.drop_constraint("ck_ownership_scopes_type", "ownership_scopes", type_="check")
    op.create_check_constraint(
        "ck_ownership_scopes_type",
        "ownership_scopes",
        "scope_type IN ('individual', 'household', 'group')",
    )
    # 2. Human-readable group name (NULL for personal scopes).
    op.add_column("ownership_scopes", sa.Column("name", sa.Text(), nullable=True))
    # 3. The membership oracle + least-privilege EXECUTE grant.
    op.execute(_CREATE_ORACLE)
    op.execute(_GRANT_EXECUTE)


def downgrade() -> None:
    op.execute(_DROP_ORACLE)
    op.drop_column("ownership_scopes", "name")
    op.drop_constraint("ck_ownership_scopes_type", "ownership_scopes", type_="check")
    # Refuse to narrow the CHECK while 'group' rows exist — re-adding the old
    # constraint would otherwise fail mid-migration AND silently imply group data
    # is safe to strand. Fail loud instead (data-safety).
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM ownership_scopes WHERE scope_type = 'group') THEN
                RAISE EXCEPTION
                    'Cannot downgrade 028: % group scope(s) exist; migrate/remove them first',
                    (SELECT count(*) FROM ownership_scopes WHERE scope_type = 'group');
            END IF;
        END$$;
        """
    )
    op.create_check_constraint(
        "ck_ownership_scopes_type",
        "ownership_scopes",
        "scope_type IN ('individual', 'household')",
    )
