"""Card alias visuals + default method (icon, color, is_default).

Presentational identification for card aliases (a fin-* pixel-icon name + accent
hex) plus a single default payment method per ownership scope, preselected when
registering a transaction. No PCI data — still alias-only.

Revision ID: 044
Revises: 043
Create Date: 2026-06-30
"""

import sqlalchemy as sa

from alembic import op

revision = "044"
down_revision = "043"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("card_aliases", sa.Column("icon", sa.Text(), nullable=True))
    op.add_column("card_aliases", sa.Column("color", sa.Text(), nullable=True))
    op.add_column(
        "card_aliases",
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("card_aliases", "is_default")
    op.drop_column("card_aliases", "color")
    op.drop_column("card_aliases", "icon")
