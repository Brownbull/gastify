"""Add scans.transaction_id (durable scan -> transaction link for the poll fallback).

Lets GET /scans/{id} expose the result transaction to the mobile progress poll
fallback without relying on the in-process event snapshot (D66 / ADR D62 Path A).

Revision ID: 026
Revises: 025
Create Date: 2026-05-30
"""

import sqlalchemy as sa

from alembic import op

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "scans",
        sa.Column("transaction_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_scans_transaction_id_transactions",
        "scans",
        "transactions",
        ["transaction_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_scans_transaction_id", "scans", ["transaction_id"])


def downgrade() -> None:
    op.drop_index("ix_scans_transaction_id", table_name="scans")
    op.drop_constraint("fk_scans_transaction_id_transactions", "scans", type_="foreignkey")
    op.drop_column("scans", "transaction_id")
