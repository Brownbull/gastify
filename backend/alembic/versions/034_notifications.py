"""Add per-user personal-scope-bound notifications table + deny-by-default RLS.

Revision ID: 034
Revises: 033
Create Date: 2026-06-05

User-global in-app notification feed (Phase 7, D78). Rows are bound to the
caller's PERSONAL ownership_scope and filtered by user_id; the table is
RLS-isolated like every other scope-bound table, using the migration-027
fail-safe GUC form (NULLIF + missing_ok) so an unset/empty scope yields zero
rows rather than erroring under the least-privilege runtime role (P43/D67).
No GRANT statement: the migration runs as gastify_migrator (table owner) and
ALTER DEFAULT PRIVILEGES already grants CRUD to gastify_app (db-role-split
runbook; 003/015/022 emit none).
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "034"
down_revision = "033"
branch_labels = None
depends_on = None

# Fail-safe scope expression (migration 027 / D67-P43): missing_ok current_setting
# + NULLIF('' -> NULL) so an unset/RESET GUC yields NULL -> zero rows, never errors.
_SCOPE = "NULLIF(current_setting('app.ownership_scope_id', true), '')"


def upgrade() -> None:
    op.create_table(
        "notifications",
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
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("data", postgresql.JSONB(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "kind IN ('scan_complete', 'scan_needs_review', 'statement_reconciled')",
            name="ck_notifications_kind",
        ),
    )
    op.create_index("ix_notifications_ownership_scope_id", "notifications", ["ownership_scope_id"])
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index(
        "idx_notifications_user_read_created",
        "notifications",
        ["user_id", "read_at", "created_at"],
    )

    # Deny-by-default RLS. FORCE so even the table owner (gastify_migrator) is
    # policy-bound. Direct-form policy (notifications carries its own
    # ownership_scope_id), 027 fail-safe GUC expression.
    op.execute("ALTER TABLE notifications ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE notifications FORCE ROW LEVEL SECURITY")
    op.execute(
        f"""
        CREATE POLICY notifications_scope_isolation ON notifications
            USING (ownership_scope_id = ({_SCOPE})::uuid)
            WITH CHECK (ownership_scope_id = ({_SCOPE})::uuid)
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS notifications_scope_isolation ON notifications")
    op.drop_index("idx_notifications_user_read_created", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_index("ix_notifications_ownership_scope_id", table_name="notifications")
    op.drop_table("notifications")
