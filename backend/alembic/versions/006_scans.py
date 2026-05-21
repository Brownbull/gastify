"""Create scans table for receipt scan jobs.

Revision ID: 006
Revises: 005
Create Date: 2026-05-07
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None

_STATUS_VALUES = (
    "submitted",
    "processing",
    "extracted",
    "categorized",
    "completed",
    "failed",
    "needs_review",
)


def upgrade() -> None:
    scan_status = postgresql.ENUM(*_STATUS_VALUES, name="scan_status", create_type=False)
    scan_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "scans",
        sa.Column(
            "id",
            sa.Uuid(),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "ownership_scope_id",
            sa.Uuid(),
            sa.ForeignKey("ownership_scopes.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "status",
            scan_status,
            nullable=False,
            server_default="submitted",
        ),
        sa.Column("image_path", sa.Text(), nullable=False),
        sa.Column("thumbnail_path", sa.Text(), nullable=True),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("content_type", sa.String(50), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.CheckConstraint("file_size_bytes >= 0", name="ck_scans_file_size_bytes_gte0"),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_code", sa.String(50), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("scans")
    sa.Enum(name="scan_status").drop(op.get_bind(), checkfirst=True)
