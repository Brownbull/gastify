"""Add plan_tier to credit_balances (schema-level monetization plumbing).

Revision ID: 025
Revises: 024
Create Date: 2026-05-29
"""

import sqlalchemy as sa

from alembic import op

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "credit_balances",
        sa.Column(
            "plan_tier",
            sa.String(),
            nullable=False,
            server_default="free",
        ),
    )
    op.create_check_constraint(
        "ck_credit_balances_plan_tier",
        "credit_balances",
        "plan_tier IN ('free', 'basic', 'pro')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_credit_balances_plan_tier", "credit_balances", type_="check")
    op.drop_column("credit_balances", "plan_tier")
