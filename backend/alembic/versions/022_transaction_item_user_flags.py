"""Add user-scoped transaction item flags.

Revision ID: 022
Revises: 021
Create Date: 2026-05-28
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "transaction_item_flags",
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
            "transaction_item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("transaction_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("flag_kind", sa.String(), nullable=False),
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
            "flag_kind IN ('urgency', 'special_case')",
            name="ck_transaction_item_flags_kind",
        ),
        sa.UniqueConstraint(
            "transaction_item_id",
            "user_id",
            "flag_kind",
            name="uq_transaction_item_flags_item_user_kind",
        ),
    )
    op.create_index(
        "idx_transaction_item_flags_scope_user_kind",
        "transaction_item_flags",
        ["ownership_scope_id", "user_id", "flag_kind"],
    )
    op.create_index(
        "ix_transaction_item_flags_transaction_item_id",
        "transaction_item_flags",
        ["transaction_item_id"],
    )
    op.create_index(
        "ix_transaction_item_flags_ownership_scope_id",
        "transaction_item_flags",
        ["ownership_scope_id"],
    )

    op.execute("ALTER TABLE transaction_item_flags ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE transaction_item_flags FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY transaction_item_flags_scope_isolation ON transaction_item_flags
        USING (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
        WITH CHECK (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
    """)


def downgrade() -> None:
    op.execute(
        "DROP POLICY IF EXISTS transaction_item_flags_scope_isolation ON transaction_item_flags"
    )
    op.drop_index(
        "ix_transaction_item_flags_ownership_scope_id", table_name="transaction_item_flags"
    )
    op.drop_index(
        "ix_transaction_item_flags_transaction_item_id", table_name="transaction_item_flags"
    )
    op.drop_index(
        "idx_transaction_item_flags_scope_user_kind",
        table_name="transaction_item_flags",
    )
    op.drop_table("transaction_item_flags")
