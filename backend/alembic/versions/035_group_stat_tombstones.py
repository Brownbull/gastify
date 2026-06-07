"""Add group_stat_tombstones table + deny-by-default RLS.

Revision ID: 035
Revises: 034
Create Date: 2026-06-07

Group-stat tombstones (P16 Phase 1, D82): one row per (group scope, month) marks a
group-period statistic VOID after the data behind it was erased (account-delete) or
the member who shared it left the group and deleted their copies. The insights layer
checks for a tombstone BEFORE display and returns a void notice instead of the
numbers — voiding, never recomputing.

RLS-isolated like every scope-bound table, using the migration-027 fail-safe GUC
form (NULLIF + missing_ok) so an unset/empty scope yields zero rows rather than
erroring under the least-privilege runtime role (P43/D67). Reads run under the
group GUC the analytics scope-swap already sets; writes (erasure / group-leave-
delete) run under the same group GUC. No GRANT: the migration runs as the table
owner (gastify_migrator) and ALTER DEFAULT PRIVILEGES already grants CRUD to
gastify_app.
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "035"
down_revision = "034"
branch_labels = None
depends_on = None

# Fail-safe scope expression (migration 027 / D67-P43): missing_ok current_setting
# + NULLIF('' -> NULL) so an unset/RESET GUC yields NULL -> zero rows, never errors.
_SCOPE = "NULLIF(current_setting('app.ownership_scope_id', true), '')"


def upgrade() -> None:
    op.create_table(
        "group_stat_tombstones",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "ownership_scope_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ownership_scopes.id"),
            nullable=False,
        ),
        sa.Column("period", sa.String(length=7), nullable=False),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "reason IN ('account_deleted', 'member_removed_data')",
            name="ck_group_stat_tombstones_reason",
        ),
        sa.UniqueConstraint(
            "ownership_scope_id",
            "period",
            name="uq_group_stat_tombstones_scope_period",
        ),
    )
    op.create_index(
        "ix_group_stat_tombstones_ownership_scope_id",
        "group_stat_tombstones",
        ["ownership_scope_id"],
    )
    op.create_index(
        "idx_group_stat_tombstones_scope_period",
        "group_stat_tombstones",
        ["ownership_scope_id", "period"],
    )

    # Deny-by-default RLS. FORCE so even the table owner (gastify_migrator) is
    # policy-bound. Direct-form policy (the row carries its own ownership_scope_id),
    # 027 fail-safe GUC expression.
    op.execute("ALTER TABLE group_stat_tombstones ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE group_stat_tombstones FORCE ROW LEVEL SECURITY")
    op.execute(
        f"""
        CREATE POLICY group_stat_tombstones_scope_isolation ON group_stat_tombstones
            USING (ownership_scope_id = ({_SCOPE})::uuid)
            WITH CHECK (ownership_scope_id = ({_SCOPE})::uuid)
        """
    )


def downgrade() -> None:
    op.execute(
        "DROP POLICY IF EXISTS group_stat_tombstones_scope_isolation ON group_stat_tombstones"
    )
    op.drop_index("idx_group_stat_tombstones_scope_period", table_name="group_stat_tombstones")
    op.drop_index(
        "ix_group_stat_tombstones_ownership_scope_id", table_name="group_stat_tombstones"
    )
    op.drop_table("group_stat_tombstones")
