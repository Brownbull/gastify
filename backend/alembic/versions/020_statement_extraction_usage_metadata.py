"""Persist statement extraction usage metadata.

Revision ID: 020
Revises: 019
Create Date: 2026-05-27
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("statements", sa.Column("extraction_input_mode", sa.String(50), nullable=True))
    op.add_column("statements", sa.Column("extraction_llm_input_tokens", sa.Integer(), nullable=True))
    op.add_column("statements", sa.Column("extraction_llm_output_tokens", sa.Integer(), nullable=True))
    op.add_column(
        "statements",
        sa.Column("extraction_llm_cost_usd", sa.Numeric(12, 9), nullable=True),
    )
    op.add_column("statements", sa.Column("extraction_fallback_reason", sa.Text(), nullable=True))
    op.add_column("statements", sa.Column("extraction_cache_status", sa.String(50), nullable=True))
    op.add_column(
        "statements",
        sa.Column(
            "extraction_routing_reasons",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "statements",
        sa.Column("extraction_evidence_row_count", sa.Integer(), nullable=True),
    )
    op.add_column(
        "statements",
        sa.Column("extraction_evidence_candidate_row_count", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("statements", "extraction_evidence_candidate_row_count")
    op.drop_column("statements", "extraction_evidence_row_count")
    op.drop_column("statements", "extraction_routing_reasons")
    op.drop_column("statements", "extraction_cache_status")
    op.drop_column("statements", "extraction_fallback_reason")
    op.drop_column("statements", "extraction_llm_cost_usd")
    op.drop_column("statements", "extraction_llm_output_tokens")
    op.drop_column("statements", "extraction_llm_input_tokens")
    op.drop_column("statements", "extraction_input_mode")
