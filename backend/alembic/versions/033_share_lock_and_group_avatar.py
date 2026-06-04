"""D74 share-lock + D75 group avatar: transactions.is_shared + ownership_scopes.icon/color.

Three columns backing the comprehensive group-hardening work:
- transactions.is_shared (D74) — set True on a PERSONAL source once it is shared
  into any group. A shared source becomes CONTENT-LOCKED in update_transaction
  (merchant/category/items/amounts/currency/date immutable) so the group's snapshot
  copy stays honest. Tangential ops (card pairing, recurrence, personal flags) and
  delete remain allowed. Backfilled True for any source that already has a group
  copy, so existing shares lock on deploy.
- ownership_scopes.icon / color (D75) — group avatar (emoji + accent hex). NULL =
  client default. Owner/admin set them alongside rename.

All additive; is_shared defaults false (existing personal txns stay editable unless
already shared). icon/color are nullable (existing groups render the default avatar).

Revision ID: 033
Revises: 032
Create Date: 2026-06-04
"""

import sqlalchemy as sa

from alembic import op

revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None


_BACKFILL = """
    UPDATE transactions
    SET is_shared = true
    WHERE id IN (
        SELECT shared_from_transaction_id
        FROM transactions
        WHERE shared_from_transaction_id IS NOT NULL
    )
"""


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("is_shared", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("ownership_scopes", sa.Column("icon", sa.Text(), nullable=True))
    op.add_column("ownership_scopes", sa.Column("color", sa.Text(), nullable=True))

    # Backfill: lock every source that already has a group copy. A group copy is a
    # row whose shared_from_transaction_id points at the (personal) source — mark
    # those sources is_shared so prior shares enforce the content-lock on deploy.
    #
    # transactions is FORCE ROW LEVEL SECURITY and migrations run as the non-super
    # owner (gastify_migrator) with a placeholder GUC (all-zeros), so the
    # scope-isolation policy would filter this UPDATE to ZERO rows. Temporarily drop
    # FORCE — the owner then bypasses the policy for this one-shot backfill — and
    # restore it immediately after. (Owner-level ALTER, the same privilege 027 uses
    # to recreate policies.) Non-Postgres has no RLS, so just run the UPDATE.
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE transactions NO FORCE ROW LEVEL SECURITY")
        op.execute(_BACKFILL)
        op.execute("ALTER TABLE transactions FORCE ROW LEVEL SECURITY")
    else:
        op.execute(_BACKFILL)


def downgrade() -> None:
    op.drop_column("ownership_scopes", "color")
    op.drop_column("ownership_scopes", "icon")
    op.drop_column("transactions", "is_shared")
