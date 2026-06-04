"""Phase 5c Groups: share-to-group provenance on transactions (D70).

Populating a group is a COPY: a personal transaction is read under the caller's
personal GUC and re-inserted under the (membership-validated) group GUC. The copy
needs two provenance columns so the group can attribute + dedupe shares:

- shared_by_user_id  → the contributor (transactions are scope-owned, not user-owned,
  so this is the only per-member attribution; backs Aportes + the 5e consent filter).
- shared_from_transaction_id → the source personal transaction id (plain uuid, NOT a
  cross-scope FK), so a re-share of the same source into the same group is a no-op
  (409) and a future "unshare" can find the copy.

Both NULL for normal personal/scanned transactions.

Revision ID: 030
Revises: 029
Create Date: 2026-06-04
"""

import sqlalchemy as sa

from alembic import op

revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("shared_by_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
    )
    op.add_column(
        "transactions",
        sa.Column("shared_from_transaction_id", sa.Uuid(), nullable=True),
    )
    # UNIQUE so a source can be shared into a given group at most once — this is the
    # race-safe backstop for the app-layer dedup check (concurrent shares -> 409).
    # NULL shared_from (every normal personal/scanned txn) is exempt: Postgres treats
    # NULLs as distinct, so they never collide.
    op.create_index(
        "uq_transactions_scope_shared_from",
        "transactions",
        ["ownership_scope_id", "shared_from_transaction_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_transactions_scope_shared_from", table_name="transactions")
    op.drop_column("transactions", "shared_from_transaction_id")
    op.drop_column("transactions", "shared_by_user_id")
