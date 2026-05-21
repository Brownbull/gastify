"""Add four-level taxonomy store hierarchy and refresh category seeds.

Revision ID: 010
Revises: 009
Create Date: 2026-05-19
"""

import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from app.reference.categories import V4_ITEM_CATEGORY_TAXONOMY, V4_STORE_CATEGORY_TAXONOMY

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None

_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def _store_cid(key: str) -> str:
    return str(uuid.uuid5(_NS, f"gastify.v4.store.{key}"))


def _item_cid(key: str) -> str:
    return str(uuid.uuid5(_NS, f"gastify.v4.{key}"))


def upgrade() -> None:
    op.add_column("store_categories", sa.Column("level", sa.SmallInteger(), nullable=True))
    op.add_column("store_categories", sa.Column("parent_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_store_categories_parent_id",
        "store_categories",
        "store_categories",
        ["parent_id"],
        ["id"],
    )
    op.execute(sa.text("UPDATE store_categories SET level = 2 WHERE level IS NULL"))
    op.alter_column("store_categories", "level", nullable=False, server_default="2")
    op.alter_column("item_categories", "level", server_default="4")

    conn = op.get_bind()
    upsert_store = sa.text(
        "INSERT INTO store_categories"
        " (id, key, level, parent_id, display_labels, is_sensitive, sort_order)"
        " VALUES (:id, :key, :level, :parent_id, :labels, :sensitive, :sort_order)"
        " ON CONFLICT (key) DO UPDATE SET"
        " level = EXCLUDED.level,"
        " parent_id = EXCLUDED.parent_id,"
        " display_labels = EXCLUDED.display_labels,"
        " is_sensitive = EXCLUDED.is_sensitive,"
        " sort_order = EXCLUDED.sort_order"
    ).bindparams(sa.bindparam("labels", type_=postgresql.JSONB()))
    for category in V4_STORE_CATEGORY_TAXONOMY:
        conn.execute(
            upsert_store,
            {
                "id": _store_cid(category.key),
                "key": category.key,
                "level": category.level,
                "parent_id": (_store_cid(category.parent_key) if category.parent_key else None),
                "labels": dict(category.display_labels),
                "sensitive": category.is_sensitive,
                "sort_order": category.sort_order,
            },
        )

    upsert_item = sa.text(
        "INSERT INTO item_categories"
        " (id, key, level, parent_id, display_labels, is_sensitive, sort_order)"
        " VALUES (:id, :key, :level, :parent_id, :labels, :sensitive, :sort_order)"
        " ON CONFLICT (key) DO UPDATE SET"
        " level = EXCLUDED.level,"
        " parent_id = EXCLUDED.parent_id,"
        " display_labels = EXCLUDED.display_labels,"
        " is_sensitive = EXCLUDED.is_sensitive,"
        " sort_order = EXCLUDED.sort_order"
    ).bindparams(sa.bindparam("labels", type_=postgresql.JSONB()))
    for category in V4_ITEM_CATEGORY_TAXONOMY:
        conn.execute(
            upsert_item,
            {
                "id": _item_cid(category.key),
                "key": category.key,
                "level": category.level,
                "parent_id": (_item_cid(category.parent_key) if category.parent_key else None),
                "labels": dict(category.display_labels),
                "sensitive": category.is_sensitive,
                "sort_order": category.sort_order,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    for category in reversed(V4_STORE_CATEGORY_TAXONOMY):
        conn.execute(
            sa.text("DELETE FROM store_categories WHERE key = :key"), {"key": category.key}
        )

    for category in reversed(V4_ITEM_CATEGORY_TAXONOMY):
        conn.execute(sa.text("DELETE FROM item_categories WHERE key = :key"), {"key": category.key})

    op.drop_constraint("fk_store_categories_parent_id", "store_categories", type_="foreignkey")
    op.drop_column("store_categories", "parent_id")
    op.drop_column("store_categories", "level")
    op.alter_column("item_categories", "level", server_default="1")
