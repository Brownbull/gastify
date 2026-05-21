"""Add mapping memory contract and store-category provenance.

Revision ID: 011
Revises: 010
Create Date: 2026-05-19
"""

import sqlalchemy as sa

from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("category_mappings", sa.Column("target_item", sa.Text(), nullable=True))
    op.drop_constraint(
        "category_mappings_target_category_id_fkey",
        "category_mappings",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "fk_category_mappings_target_category_id_item_categories",
        "category_mappings",
        "item_categories",
        ["target_category_id"],
        ["id"],
    )

    op.add_column(
        "transactions",
        sa.Column("store_category_source", sa.String(), nullable=True),
    )
    op.add_column(
        "transactions",
        sa.Column("store_category_confidence", sa.Numeric(3, 2), nullable=True),
    )
    op.add_column(
        "transactions",
        sa.Column("store_category_mapping_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_transactions_store_category_mapping_id",
        "transactions",
        "merchant_mappings",
        ["store_category_mapping_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_transactions_store_category_mapping_id",
        "transactions",
        type_="foreignkey",
    )
    op.drop_column("transactions", "store_category_mapping_id")
    op.drop_column("transactions", "store_category_confidence")
    op.drop_column("transactions", "store_category_source")

    op.drop_constraint(
        "fk_category_mappings_target_category_id_item_categories",
        "category_mappings",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "category_mappings_target_category_id_fkey",
        "category_mappings",
        "store_categories",
        ["target_category_id"],
        ["id"],
    )
    op.drop_column("category_mappings", "target_item")
