"""Persist statement line fallback evidence.

Revision ID: 019
Revises: 018
Create Date: 2026-05-27
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "statement_lines",
        sa.Column("row_type", sa.Text(), nullable=False, server_default="unknown"),
    )
    op.add_column(
        "statement_lines",
        sa.Column("amount_selection_reason", sa.Text(), nullable=True),
    )
    op.add_column(
        "statement_lines",
        sa.Column(
            "amount_candidates",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "statement_lines",
        sa.Column("ledger_ready", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "statement_lines",
        sa.Column("confidence", sa.Numeric(4, 3), nullable=True),
    )
    op.add_column(
        "statement_lines",
        sa.Column(
            "warnings",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "statement_lines",
        sa.Column("source_row_index", sa.Integer(), nullable=True),
    )
    op.add_column(
        "statement_lines",
        sa.Column("source_page", sa.Integer(), nullable=True),
    )
    op.add_column(
        "statement_lines",
        sa.Column(
            "field_provenance",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
    )


def downgrade() -> None:
    op.drop_column("statement_lines", "field_provenance")
    op.drop_column("statement_lines", "source_page")
    op.drop_column("statement_lines", "source_row_index")
    op.drop_column("statement_lines", "warnings")
    op.drop_column("statement_lines", "confidence")
    op.drop_column("statement_lines", "ledger_ready")
    op.drop_column("statement_lines", "amount_candidates")
    op.drop_column("statement_lines", "amount_selection_reason")
    op.drop_column("statement_lines", "row_type")
