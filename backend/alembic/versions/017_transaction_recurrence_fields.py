"""Add transaction recurrence and fixed-term fields.

Revision ID: 017
Revises: 016
Create Date: 2026-05-26
"""

import sqlalchemy as sa

from alembic import op

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("recurrence_kind", sa.String(), nullable=False, server_default="none"),
    )
    op.add_column("transactions", sa.Column("recurrence_interval", sa.String(), nullable=True))
    op.add_column("transactions", sa.Column("term_current", sa.Integer(), nullable=True))
    op.add_column("transactions", sa.Column("term_total", sa.Integer(), nullable=True))
    op.add_column("transactions", sa.Column("recurrence_label", sa.Text(), nullable=True))
    op.add_column(
        "transactions",
        sa.Column("recurrence_source", sa.String(), nullable=False, server_default="none"),
    )
    op.add_column(
        "transactions",
        sa.Column("recurrence_confidence", sa.Numeric(3, 2), nullable=True),
    )
    op.add_column(
        "transactions",
        sa.Column("recurrence_user_edited_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_check_constraint(
        "ck_transactions_recurrence_kind",
        "transactions",
        "recurrence_kind IN ('none', 'fixed_term', 'recurring', 'unknown')",
    )
    op.create_check_constraint(
        "ck_transactions_recurrence_interval",
        "transactions",
        "recurrence_interval IS NULL OR recurrence_interval IN "
        "('monthly', 'weekly', 'biweekly', 'annual', 'custom', 'unknown')",
    )
    op.create_check_constraint(
        "ck_transactions_recurrence_source",
        "transactions",
        "recurrence_source IN ('statement', 'receipt', 'user', 'inferred', 'none')",
    )
    op.create_check_constraint(
        "ck_transactions_term_current_gte1",
        "transactions",
        "term_current IS NULL OR term_current >= 1",
    )
    op.create_check_constraint(
        "ck_transactions_term_total_gte1",
        "transactions",
        "term_total IS NULL OR term_total >= 1",
    )
    op.create_check_constraint(
        "ck_transactions_term_current_lte_total",
        "transactions",
        "term_current IS NULL OR term_total IS NULL OR term_current <= term_total",
    )
    op.create_check_constraint(
        "ck_transactions_fixed_term_total_present",
        "transactions",
        "recurrence_kind != 'fixed_term' OR term_total IS NOT NULL",
    )
    op.create_check_constraint(
        "ck_transactions_recurrence_confidence_range",
        "transactions",
        "recurrence_confidence IS NULL OR "
        "(recurrence_confidence >= 0 AND recurrence_confidence <= 1)",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_transactions_recurrence_confidence_range",
        "transactions",
        type_="check",
    )
    op.drop_constraint(
        "ck_transactions_fixed_term_total_present",
        "transactions",
        type_="check",
    )
    op.drop_constraint("ck_transactions_term_current_lte_total", "transactions", type_="check")
    op.drop_constraint("ck_transactions_term_total_gte1", "transactions", type_="check")
    op.drop_constraint("ck_transactions_term_current_gte1", "transactions", type_="check")
    op.drop_constraint("ck_transactions_recurrence_source", "transactions", type_="check")
    op.drop_constraint("ck_transactions_recurrence_interval", "transactions", type_="check")
    op.drop_constraint("ck_transactions_recurrence_kind", "transactions", type_="check")
    op.drop_column("transactions", "recurrence_user_edited_at")
    op.drop_column("transactions", "recurrence_confidence")
    op.drop_column("transactions", "recurrence_source")
    op.drop_column("transactions", "recurrence_label")
    op.drop_column("transactions", "term_total")
    op.drop_column("transactions", "term_current")
    op.drop_column("transactions", "recurrence_interval")
    op.drop_column("transactions", "recurrence_kind")
