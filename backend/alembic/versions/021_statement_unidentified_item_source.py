"""Allow statement unidentified item category source.

Revision ID: 021
Revises: 020
Create Date: 2026-05-27
"""

from alembic import op

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_transaction_items_category_source",
        "transaction_items",
        type_="check",
    )
    op.create_check_constraint(
        "ck_transaction_items_category_source",
        "transaction_items",
        "category_source IN ('ocr', 'user', 'ai', 'mapping', 'statement_unidentified')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_transaction_items_category_source",
        "transaction_items",
        type_="check",
    )
    op.create_check_constraint(
        "ck_transaction_items_category_source",
        "transaction_items",
        "category_source IN ('ocr', 'user', 'ai', 'mapping')",
    )
