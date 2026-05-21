"""Add persisted scan review signals.

Revision ID: 013
Revises: 012
Create Date: 2026-05-20
"""

import sqlalchemy as sa

from alembic import op

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("scan_review_level", sa.String(), nullable=False, server_default="none"),
    )
    op.add_column(
        "transactions",
        sa.Column(
            "scan_review_signals",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )
    op.create_check_constraint(
        "ck_transactions_scan_review_level",
        "transactions",
        "scan_review_level IN ('none', 'warning', 'needs_review')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_transactions_scan_review_level", "transactions", type_="check")
    op.drop_column("transactions", "scan_review_signals")
    op.drop_column("transactions", "scan_review_level")
