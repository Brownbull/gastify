"""P83: share_count on transactions + heal sources stranded locked-forever.

Revision ID: 039
Revises: 038
Create Date: 2026-06-11

Deleting a group removed its copies but never reset ``is_shared`` on the personal
SOURCE rows — D74's content lock persisted with NO surviving copy, so owners
permanently lost editing on those transactions.

The correct "any live copy left?" check is cross-scope and therefore impossible at
runtime under FORCE RLS (it binds the table owner and SECURITY DEFINER functions too),
so the live-copy count is DENORMALIZED: ``share_count`` is maintained by the share
endpoint (+1) and group deletion (−1), with ``is_shared == share_count > 0``.

The backfill below also HEALS existing strands: any source flagged shared with zero
live copies is unlocked. FORCE is lifted only for the duration of the backfill (the
migrator owns the table; everyone else stays policy-bound throughout).
"""

import sqlalchemy as sa

from alembic import op

revision = "039"
down_revision = "038"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("share_count", sa.Integer(), nullable=False, server_default="0"),
    )
    is_pg = op.get_bind().dialect.name == "postgresql"
    if is_pg:
        op.execute("ALTER TABLE transactions NO FORCE ROW LEVEL SECURITY")
    try:
        # Sources only (copies carry shared_from_transaction_id and are never sources).
        op.execute(
            "UPDATE transactions SET share_count = ("
            " SELECT count(*) FROM transactions c"
            " WHERE c.shared_from_transaction_id = transactions.id)"
            " WHERE shared_from_transaction_id IS NULL"
        )
        # Heal: is_shared now strictly mirrors the live-copy count (unlocks strands).
        op.execute(
            "UPDATE transactions SET is_shared = (share_count > 0)"
            " WHERE shared_from_transaction_id IS NULL"
        )
    finally:
        if is_pg:
            op.execute("ALTER TABLE transactions FORCE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_column("transactions", "share_count")
