"""Add credit_balances table + RLS policies on scope-bound tables.

Revision ID: 003
Revises: 002
Create Date: 2026-05-06
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Credit balances ---
    op.create_table(
        "credit_balances",
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
            unique=True,
        ),
        sa.Column(
            "scan_credits",
            sa.BigInteger(),
            nullable=False,
            server_default="50",
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
        sa.CheckConstraint("scan_credits >= 0", name="ck_credit_balances_non_negative"),
    )

    # Backfill credit balances for any existing ownership scopes
    op.execute(
        "INSERT INTO credit_balances"
        " (id, ownership_scope_id, scan_credits, created_at, updated_at) "
        "SELECT gen_random_uuid(), id, 50, now(), now() "
        "FROM ownership_scopes "
        "WHERE id NOT IN (SELECT ownership_scope_id FROM credit_balances)"
    )

    # --- RLS policies: deny-by-default on scope-bound tables ---
    # Per D3: Postgres RLS keyed off ownership_scope_id, defense-in-depth for SC-07/SC-08.
    #
    # The app connects as the same DB user that owns the tables, so we need
    # FORCE ROW LEVEL SECURITY to apply policies even to the table owner.
    # The app sets current_setting('app.ownership_scope_id') per-request via
    # SET LOCAL before any query.

    _rls_tables = [
        "transactions",
        "merchant_mappings",
        "category_mappings",
        "credit_balances",
    ]

    for table in _rls_tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY {table}_scope_isolation ON {table}
            USING (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
            WITH CHECK (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
        """)

    # ownership_scope_members: users can only see memberships for their own scope
    op.execute("ALTER TABLE ownership_scope_members ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE ownership_scope_members FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY ownership_scope_members_scope_isolation ON ownership_scope_members
        USING (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
        WITH CHECK (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
    """)

    # transaction_items and transaction_images: cascade via transaction ownership
    op.execute("ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE transaction_items FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY transaction_items_scope_isolation ON transaction_items
        USING (
            transaction_id IN (
                SELECT id FROM transactions
                WHERE ownership_scope_id = current_setting('app.ownership_scope_id')::uuid
            )
        )
        WITH CHECK (
            transaction_id IN (
                SELECT id FROM transactions
                WHERE ownership_scope_id = current_setting('app.ownership_scope_id')::uuid
            )
        )
    """)

    op.execute("ALTER TABLE transaction_images ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE transaction_images FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY transaction_images_scope_isolation ON transaction_images
        USING (
            transaction_id IN (
                SELECT id FROM transactions
                WHERE ownership_scope_id = current_setting('app.ownership_scope_id')::uuid
            )
        )
        WITH CHECK (
            transaction_id IN (
                SELECT id FROM transactions
                WHERE ownership_scope_id = current_setting('app.ownership_scope_id')::uuid
            )
        )
    """)


def downgrade() -> None:
    _rls_tables = [
        "transaction_images",
        "transaction_items",
        "ownership_scope_members",
        "credit_balances",
        "category_mappings",
        "merchant_mappings",
        "transactions",
    ]

    for table in _rls_tables:
        op.execute(f"DROP POLICY IF EXISTS {table}_scope_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    op.drop_table("credit_balances")
