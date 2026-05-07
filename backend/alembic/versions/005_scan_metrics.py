"""Add per-scan metric columns to transactions table.

Revision ID: 005
Revises: 004
Create Date: 2026-05-06
"""

import sqlalchemy as sa

from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None

_METRIC_COLS = [
    "llm_tokens_in",
    "llm_tokens_out",
    "llm_cost_usd",
    "scan_duration_ms",
    "llm_latency_ms",
    "queue_wait_ms",
    "thumbnail_gen_ms",
]


def upgrade() -> None:
    op.add_column("transactions", sa.Column("llm_tokens_in", sa.Integer(), nullable=True))
    op.add_column("transactions", sa.Column("llm_tokens_out", sa.Integer(), nullable=True))
    op.add_column(
        "transactions",
        sa.Column("llm_cost_usd", sa.Numeric(10, 6), nullable=True),
    )
    op.add_column("transactions", sa.Column("scan_duration_ms", sa.Integer(), nullable=True))
    op.add_column("transactions", sa.Column("llm_latency_ms", sa.Integer(), nullable=True))
    op.add_column("transactions", sa.Column("queue_wait_ms", sa.Integer(), nullable=True))
    op.add_column("transactions", sa.Column("thumbnail_gen_ms", sa.Integer(), nullable=True))

    for col in _METRIC_COLS:
        op.create_check_constraint(
            f"ck_transactions_{col}_gte0",
            "transactions",
            sa.text(f"{col} >= 0"),
        )


def downgrade() -> None:
    for col in reversed(_METRIC_COLS):
        op.drop_constraint(f"ck_transactions_{col}_gte0", "transactions", type_="check")

    op.drop_column("transactions", "thumbnail_gen_ms")
    op.drop_column("transactions", "queue_wait_ms")
    op.drop_column("transactions", "llm_latency_ms")
    op.drop_column("transactions", "scan_duration_ms")
    op.drop_column("transactions", "llm_cost_usd")
    op.drop_column("transactions", "llm_tokens_out")
    op.drop_column("transactions", "llm_tokens_in")
