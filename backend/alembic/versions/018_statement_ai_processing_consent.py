"""Add statement AI processing consent audit field.

Revision ID: 018
Revises: 017
Create Date: 2026-05-26
"""

import sqlalchemy as sa

from alembic import op

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "statements",
        sa.Column(
            "ai_processing_consent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("statements", "ai_processing_consent")
