"""Make group_stat_tombstones append-only at the DB (deny UPDATE/DELETE).

Revision ID: 036
Revises: 035
Create Date: 2026-06-10

P16 Phase 1 review remediation (finding #23): a group-stat tombstone is an immutable
void mark — once a (group, month) statistic is shut down because its underlying data
was erased, the void must not be silently flipped or removed. Migration 035 shipped a
single ``FOR ALL`` policy that permitted in-scope UPDATE/DELETE; RLS.md already
declared the table append-only. This splits the policy into SELECT + INSERT only, so
UPDATE/DELETE have NO matching policy and are denied by RLS (deny-by-default) for the
runtime role. The app only ever SELECTs (the void check) and INSERTs (tombstoning),
so behaviour is unchanged; the ledger is now immutable in the database, not just by
convention.
"""

from alembic import op

revision = "036"
down_revision = "035"
branch_labels = None
depends_on = None

# Fail-safe scope expression (migration 027 / D67-P43), identical to migration 035.
_SCOPE = "NULLIF(current_setting('app.ownership_scope_id', true), '')"


def upgrade() -> None:
    op.execute(
        "DROP POLICY IF EXISTS group_stat_tombstones_scope_isolation ON group_stat_tombstones"
    )
    op.execute(
        f"""
        CREATE POLICY group_stat_tombstones_select ON group_stat_tombstones
            FOR SELECT
            USING (ownership_scope_id = ({_SCOPE})::uuid)
        """
    )
    op.execute(
        f"""
        CREATE POLICY group_stat_tombstones_insert ON group_stat_tombstones
            FOR INSERT
            WITH CHECK (ownership_scope_id = ({_SCOPE})::uuid)
        """
    )
    # No UPDATE or DELETE policy: with RLS enabled, a command lacking a permissive
    # policy is denied — the void ledger is append-only.


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS group_stat_tombstones_insert ON group_stat_tombstones")
    op.execute("DROP POLICY IF EXISTS group_stat_tombstones_select ON group_stat_tombstones")
    op.execute(
        f"""
        CREATE POLICY group_stat_tombstones_scope_isolation ON group_stat_tombstones
            USING (ownership_scope_id = ({_SCOPE})::uuid)
            WITH CHECK (ownership_scope_id = ({_SCOPE})::uuid)
        """
    )
