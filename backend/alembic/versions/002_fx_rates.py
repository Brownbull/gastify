"""Add fx_rates table — write-once FX cache per (date, from, to).

Revision ID: 002
Revises: 001
Create Date: 2026-05-06
"""

import sqlalchemy as sa

from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fx_rates",
        sa.Column("rate_date", sa.Date(), nullable=False),
        sa.Column(
            "from_currency",
            sa.String(3),
            sa.ForeignKey("currencies.code"),
            nullable=False,
        ),
        sa.Column(
            "to_currency",
            sa.String(3),
            sa.ForeignKey("currencies.code"),
            nullable=False,
        ),
        sa.Column("rate", sa.Numeric(18, 8), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("rate_date", "from_currency", "to_currency"),
        sa.CheckConstraint("rate > 0", name="ck_fx_rates_positive"),
    )

    op.create_index("idx_fx_rates_from", "fx_rates", ["from_currency"])
    op.create_index("idx_fx_rates_to", "fx_rates", ["to_currency"])


def downgrade() -> None:
    op.drop_table("fx_rates")
