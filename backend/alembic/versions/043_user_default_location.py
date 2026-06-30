"""User default location (scan-location reconciliation fallback).

Revision ID: 043
Revises: 042
Create Date: 2026-06-29

Adds a per-user default purchase location (ISO alpha-2 country + city). The scan
pipeline reconciles a receipt's extracted location against this default: when the
receipt has no determinable country/city, the user's default is used (see
app/services/locations.py). Both nullable — a user need not configure one.
"""

import sqlalchemy as sa

from alembic import op

revision = "043"
down_revision = "042"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("default_country", sa.String(length=2), nullable=True))
    op.add_column("users", sa.Column("default_city", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "default_city")
    op.drop_column("users", "default_country")
