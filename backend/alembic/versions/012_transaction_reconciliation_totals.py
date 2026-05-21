"""Add transaction reconciliation totals.

Revision ID: 012
Revises: 011
Create Date: 2026-05-20
"""

import sqlalchemy as sa

from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("gross_total_minor", sa.BigInteger(), nullable=True))
    op.add_column(
        "transactions",
        sa.Column("reconstructed_total_minor", sa.BigInteger(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("transactions", "reconstructed_total_minor")
    op.drop_column("transactions", "gross_total_minor")
