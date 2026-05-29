"""Add withdrawn_at to consent_records (user-withdrawal vs system-revocation).

Revision ID: 023
Revises: 022
Create Date: 2026-05-29
"""

import sqlalchemy as sa

from alembic import op

revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "consent_records",
        sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("consent_records", "withdrawn_at")
