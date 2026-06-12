"""group_stat_tombstones.ownership_scope_id → ON DELETE CASCADE (D95).

Revision ID: 041
Revises: 040

Found by the two-user runtime hardening e2e: deleting a group that had ever been
left with ``delete_shared=true`` 500'd — its tombstone rows FK-blocked the scope
delete, and the app role CANNOT delete them (036 made the table append-only by
giving the runtime role no DELETE policy). Referential actions are exempt from
RLS, so an FK CASCADE is the one sanctioned path: tombstones only ever vanish
together with their whole group, whose stats they existed to void. The durable
proof of the member's deletion request is the ``dsr_group_leave_delete`` audit
event, which now lives in the leaver's PERSONAL scope (D95) and survives.
"""

from alembic import op

revision = "041"
down_revision = "040"
branch_labels = None
depends_on = None

_FK = "group_stat_tombstones_ownership_scope_id_fkey"


def upgrade() -> None:
    op.drop_constraint(_FK, "group_stat_tombstones", type_="foreignkey")
    op.create_foreign_key(
        _FK,
        "group_stat_tombstones",
        "ownership_scopes",
        ["ownership_scope_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(_FK, "group_stat_tombstones", type_="foreignkey")
    op.create_foreign_key(
        _FK,
        "group_stat_tombstones",
        "ownership_scopes",
        ["ownership_scope_id"],
        ["id"],
    )
