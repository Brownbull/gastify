"""Add receipt and item discount fields.

Revision ID: 009
Revises: 008
Create Date: 2026-05-18
"""

import sqlalchemy as sa

from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("discount_total_minor", sa.BigInteger(), nullable=True),
    )
    op.add_column(
        "transaction_items",
        sa.Column("discount_minor", sa.BigInteger(), nullable=True),
    )
    op.add_column(
        "transaction_items",
        sa.Column("discount_label", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("transaction_items", "discount_label")
    op.drop_column("transaction_items", "discount_minor")
    op.drop_column("transactions", "discount_total_minor")
