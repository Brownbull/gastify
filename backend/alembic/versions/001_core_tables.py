"""Create core tables: currencies, categories, ownership, users, transactions, mappings.

Revision ID: 001
Revises:
Create Date: 2026-05-05
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Reference tables ---

    op.create_table(
        "currencies",
        sa.Column("code", sa.String(3), primary_key=True),
        sa.Column("exponent", sa.SmallInteger(), nullable=False),
        sa.Column(
            "display_labels",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "store_categories",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("key", sa.Text(), nullable=False, unique=True),
        sa.Column(
            "display_labels",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("is_sensitive", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sort_order", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "item_categories",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("key", sa.Text(), nullable=False, unique=True),
        sa.Column(
            "display_labels",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("is_sensitive", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sort_order", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # --- User & Auth tables ---

    op.create_table(
        "ownership_scopes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "scope_type",
            sa.String(),
            nullable=False,
            server_default="individual",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "scope_type IN ('individual', 'household')",
            name="ck_ownership_scopes_type",
        ),
    )

    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("firebase_uid", sa.Text(), nullable=False, unique=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column(
            "default_currency",
            sa.String(3),
            sa.ForeignKey("currencies.code"),
            nullable=False,
            server_default="CLP",
        ),
        sa.Column(
            "locale",
            sa.String(),
            nullable=False,
            server_default="es",
        ),
        sa.Column(
            "ownership_scope_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ownership_scopes.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("locale IN ('es', 'en', 'pt')", name="ck_users_locale"),
    )

    op.create_table(
        "ownership_scope_members",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "ownership_scope_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ownership_scopes.id"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "role",
            sa.String(),
            nullable=False,
            server_default="owner",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("ownership_scope_id", "user_id", name="uq_scope_member"),
        sa.CheckConstraint("role IN ('owner', 'member')", name="ck_scope_members_role"),
    )

    # --- Transaction tables ---

    op.create_table(
        "transactions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "ownership_scope_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ownership_scopes.id"),
            nullable=False,
        ),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("transaction_time", sa.Time(), nullable=True),
        sa.Column("merchant", sa.Text(), nullable=False),
        sa.Column("merchant_user_edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("alias", sa.Text(), nullable=True),
        sa.Column(
            "store_category_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("store_categories.id"),
            nullable=True,
        ),
        sa.Column(
            "store_category_user_edited_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("total_minor", sa.BigInteger(), nullable=False),
        sa.Column(
            "currency",
            sa.String(3),
            sa.ForeignKey("currencies.code"),
            nullable=False,
        ),
        sa.Column("amount_usd_minor", sa.BigInteger(), nullable=True),
        sa.Column("fx_rate_to_usd", sa.Numeric(18, 8), nullable=True),
        sa.Column("fx_captured_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("card_alias_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("receipt_type", sa.String(), nullable=True),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("country", sa.Text(), nullable=True),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("prompt_version", sa.Text(), nullable=True),
        sa.Column("merchant_source", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "receipt_type IN ('scan', 'manual', 'statement', 'import')",
            name="ck_transactions_receipt_type",
        ),
        sa.CheckConstraint(
            "merchant_source IN ('ocr', 'user', 'ai', 'mapping')",
            name="ck_transactions_merchant_source",
        ),
    )

    op.create_table(
        "transaction_items",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "transaction_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("transactions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("name_user_edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("qty", sa.Numeric(10, 3), nullable=True),
        sa.Column("unit_price_minor", sa.BigInteger(), nullable=True),
        sa.Column("total_price_minor", sa.BigInteger(), nullable=False),
        sa.Column(
            "item_category_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("item_categories.id"),
            nullable=True,
        ),
        sa.Column(
            "item_category_user_edited_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("subcategory", sa.Text(), nullable=True),
        sa.Column("category_source", sa.String(), nullable=True),
        sa.Column("is_flagged", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sort_order", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "category_source IN ('ocr', 'user', 'ai', 'mapping')",
            name="ck_transaction_items_category_source",
        ),
    )

    op.create_table(
        "transaction_images",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "transaction_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("transactions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("is_thumbnail", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sort_order", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # --- Mapping tables ---

    op.create_table(
        "merchant_mappings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "ownership_scope_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ownership_scopes.id"),
            nullable=False,
        ),
        sa.Column("original_merchant", sa.Text(), nullable=False),
        sa.Column("target_merchant", sa.Text(), nullable=False),
        sa.Column(
            "store_category_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("store_categories.id"),
            nullable=True,
        ),
        sa.Column(
            "confidence",
            sa.Numeric(3, 2),
            nullable=False,
            server_default="1.00",
        ),
        sa.Column("source", sa.String(), nullable=False, server_default="user"),
        sa.Column("usage_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_merchant_mappings_confidence",
        ),
        sa.CheckConstraint(
            "source IN ('user', 'ai')",
            name="ck_merchant_mappings_source",
        ),
    )

    op.create_table(
        "category_mappings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "ownership_scope_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ownership_scopes.id"),
            nullable=False,
        ),
        sa.Column("original_item", sa.Text(), nullable=False),
        sa.Column(
            "target_category_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("store_categories.id"),
            nullable=False,
        ),
        sa.Column("merchant_pattern", sa.Text(), nullable=True),
        sa.Column(
            "confidence",
            sa.Numeric(3, 2),
            nullable=False,
            server_default="1.00",
        ),
        sa.Column("source", sa.String(), nullable=False, server_default="user"),
        sa.Column("usage_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_category_mappings_confidence",
        ),
        sa.CheckConstraint(
            "source IN ('user', 'ai')",
            name="ck_category_mappings_source",
        ),
    )

    # --- Indexes per A.10 §12 ---

    # I1: FK columns indexed
    op.create_index("idx_users_scope", "users", ["ownership_scope_id"])
    op.create_index(
        "idx_ownership_scope_members_scope",
        "ownership_scope_members",
        ["ownership_scope_id"],
    )
    op.create_index("idx_transactions_scope", "transactions", ["ownership_scope_id"])
    op.create_index("idx_transactions_store_category", "transactions", ["store_category_id"])
    op.create_index("idx_transaction_items_txn", "transaction_items", ["transaction_id"])
    op.create_index("idx_transaction_items_category", "transaction_items", ["item_category_id"])
    op.create_index("idx_transaction_images_txn", "transaction_images", ["transaction_id"])
    op.create_index("idx_merchant_mappings_scope", "merchant_mappings", ["ownership_scope_id"])
    op.create_index("idx_merchant_mappings_category", "merchant_mappings", ["store_category_id"])
    op.create_index("idx_category_mappings_scope", "category_mappings", ["ownership_scope_id"])
    op.create_index("idx_category_mappings_target", "category_mappings", ["target_category_id"])

    # I3: Hot-path composites
    op.create_index(
        "idx_transactions_scope_date",
        "transactions",
        ["ownership_scope_id", sa.text("transaction_date DESC"), "id"],
    )
    op.create_index(
        "idx_transaction_items_txn_order",
        "transaction_items",
        ["transaction_id", "sort_order"],
    )

    # I7: Covering index on ownership_scope_members
    op.create_index(
        "idx_scope_members_covering",
        "ownership_scope_members",
        ["user_id", "ownership_scope_id", "role"],
    )

    # --- Seed currency data ---
    op.execute("""
        INSERT INTO currencies (code, exponent, display_labels) VALUES
        ('CLP', 0, '{"es": "Peso Chileno", "en": "Chilean Peso", "pt": "Peso Chileno"}'),
        ('USD', 2, '{"es": "Dólar Estadounidense", "en": "US Dollar", "pt": "Dólar Americano"}'),
        ('EUR', 2, '{"es": "Euro", "en": "Euro", "pt": "Euro"}'),
        ('GBP', 2, '{"es": "Libra Esterlina", "en": "British Pound", "pt": "Libra Esterlina"}'),
        ('CAD', 2, '{"es": "Dólar Canadiense", "en": "Canadian Dollar", "pt": "Dólar Canadense"}'),
        ('MXN', 2, '{"es": "Peso Mexicano", "en": "Mexican Peso", "pt": "Peso Mexicano"}'),
        ('BRL', 2, '{"es": "Real Brasileño", "en": "Brazilian Real", "pt": "Real Brasileiro"}'),
        ('ARS', 2, '{"es": "Peso Argentino", "en": "Argentine Peso", "pt": "Peso Argentino"}'),
        ('PEN', 2, '{"es": "Sol Peruano", "en": "Peruvian Sol", "pt": "Sol Peruano"}'),
        ('COP', 2, '{"es": "Peso Colombiano", "en": "Colombian Peso", "pt": "Peso Colombiano"}')
        ON CONFLICT (code) DO NOTHING;
    """)


def downgrade() -> None:
    op.drop_table("category_mappings")
    op.drop_table("merchant_mappings")
    op.drop_table("transaction_images")
    op.drop_table("transaction_items")
    op.drop_table("transactions")
    op.drop_table("ownership_scope_members")
    op.drop_table("users")
    op.drop_table("ownership_scopes")
    op.drop_table("item_categories")
    op.drop_table("store_categories")
    op.drop_table("currencies")
