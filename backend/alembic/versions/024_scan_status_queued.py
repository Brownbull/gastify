"""Add 'queued' value to scan_status enum (quota graceful degradation).

Revision ID: 024
Revises: 023
Create Date: 2026-05-29
"""

from alembic import op

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block on older
    # PostgreSQL; use an autocommit block for portability.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE scan_status ADD VALUE IF NOT EXISTS 'queued'")


def downgrade() -> None:
    # PostgreSQL cannot drop a single enum value; leaving 'queued' in place on
    # downgrade is safe (no rows reference it once requeued/failed).
    pass
