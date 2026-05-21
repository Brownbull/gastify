"""Add V4 item-category taxonomy: hierarchy columns + 86-category seed.

Revision ID: 007
Revises: 006
Create Date: 2026-05-07
"""

import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from app.reference.categories import V4_ITEM_CATEGORY_TAXONOMY

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None

_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def _cid(key: str) -> str:
    return str(uuid.uuid5(_NS, f"gastify.v4.{key}"))


_TAXONOMY = V4_ITEM_CATEGORY_TAXONOMY


def upgrade() -> None:
    op.add_column("item_categories", sa.Column("level", sa.SmallInteger(), nullable=True))
    op.add_column("item_categories", sa.Column("parent_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_item_categories_parent_id",
        "item_categories",
        "item_categories",
        ["parent_id"],
        ["id"],
    )

    op.execute(sa.text("UPDATE item_categories SET level = 1 WHERE level IS NULL"))
    op.alter_column("item_categories", "level", nullable=False, server_default="1")

    conn = op.get_bind()
    insert_category = sa.text(
        "INSERT INTO item_categories"
        " (id, key, level, parent_id, display_labels, is_sensitive, sort_order)"
        " VALUES (:id, :key, :level, :parent_id, :labels, :sensitive, :sort)"
    ).bindparams(sa.bindparam("labels", type_=postgresql.JSONB()))
    for category in _TAXONOMY:
        cat_id = _cid(category.key)
        parent_id = _cid(category.parent_key) if category.parent_key else None
        conn.execute(
            insert_category,
            {
                "id": cat_id,
                "key": category.key,
                "level": category.level,
                "parent_id": parent_id,
                "labels": dict(category.display_labels),
                "sensitive": category.is_sensitive,
                "sort": category.sort_order,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    for category in reversed(_TAXONOMY):
        conn.execute(
            sa.text("DELETE FROM item_categories WHERE key = :key"),
            {"key": category.key},
        )

    op.drop_constraint("fk_item_categories_parent_id", "item_categories", type_="foreignkey")
    op.drop_column("item_categories", "parent_id")
    op.drop_column("item_categories", "level")
