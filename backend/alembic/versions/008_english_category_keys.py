"""Normalize V4 category keys to English PascalCase.

Revision ID: 008
Revises: 007
Create Date: 2026-05-18
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from app.reference.categories import (
    SPANISH_TO_ENGLISH_CATEGORY_KEYS,
    V4_ITEM_CATEGORY_TAXONOMY,
)

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    rename = sa.text(
        "UPDATE item_categories SET key = :new_key "
        "WHERE key = :old_key "
        "AND NOT EXISTS (SELECT 1 FROM item_categories WHERE key = :new_key)"
    )
    for old_key, new_key in SPANISH_TO_ENGLISH_CATEGORY_KEYS.items():
        conn.execute(rename, {"old_key": old_key, "new_key": new_key})

    update_metadata = sa.text(
        "UPDATE item_categories "
        "SET level = :level, display_labels = :labels, "
        "is_sensitive = :sensitive, sort_order = :sort_order "
        "WHERE key = :key"
    ).bindparams(sa.bindparam("labels", type_=postgresql.JSONB()))
    for category in V4_ITEM_CATEGORY_TAXONOMY:
        conn.execute(
            update_metadata,
            {
                "key": category.key,
                "level": category.level,
                "labels": dict(category.display_labels),
                "sensitive": category.is_sensitive,
                "sort_order": category.sort_order,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    reverse = {new_key: old_key for old_key, new_key in SPANISH_TO_ENGLISH_CATEGORY_KEYS.items()}
    rename = sa.text(
        "UPDATE item_categories SET key = :old_key "
        "WHERE key = :new_key "
        "AND NOT EXISTS (SELECT 1 FROM item_categories WHERE key = :old_key)"
    )
    for new_key, old_key in reverse.items():
        conn.execute(rename, {"new_key": new_key, "old_key": old_key})
