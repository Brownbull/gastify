"""User date-format preference (manual-entry hardening, Phase 2).

Revision ID: 040
Revises: 039
Create Date: 2026-06-11

The manual-entry date field shows its expected format as a placeholder; the format
(day-first vs month-first) is a per-user setting. Default dd/MM/yyyy (Chilean
convention).
"""

import sqlalchemy as sa

from alembic import op

revision = "040"
down_revision = "039"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("date_format", sa.String(), nullable=False, server_default="dd/MM/yyyy"),
    )


def downgrade() -> None:
    op.drop_column("users", "date_format")
