"""Add mobile push tokens.

Revision ID: 014
Revises: 013
Create Date: 2026-05-21
"""

import sqlalchemy as sa

from alembic import op

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mobile_push_tokens",
        sa.Column(
            "id",
            sa.Uuid(),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("ownership_scope_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False, server_default="expo"),
        sa.Column("platform", sa.String(), nullable=False),
        sa.Column("device_id", sa.Text(), nullable=True),
        sa.Column("app_environment", sa.String(), nullable=False, server_default="local"),
        sa.Column("app_version", sa.String(), nullable=True),
        sa.Column("permission_status", sa.String(), nullable=False, server_default="granted"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "registered_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["ownership_scope_id"], ["ownership_scopes.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "token", name="uq_mobile_push_user_token"),
    )
    op.create_index(
        "ix_mobile_push_tokens_scope_enabled",
        "mobile_push_tokens",
        ["ownership_scope_id", "enabled"],
    )


def downgrade() -> None:
    op.drop_index("ix_mobile_push_tokens_scope_enabled", table_name="mobile_push_tokens")
    op.drop_table("mobile_push_tokens")
