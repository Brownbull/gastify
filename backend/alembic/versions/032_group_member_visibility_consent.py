"""5e consent-gated detail (D73): group member_visibility_enabled + member shares_detail.

Two opt-in boolean flags backing the consent-gated member-detail feature:
- ownership_scopes.member_visibility_enabled — an admin turns this on to request
  that members expose their individual shared transactions in the group list.
- ownership_scope_members.shares_detail — each member's per-member opt-in consent
  (default decline). The group transactions list shows a member's rows only when
  the group flag is on AND that member has opted in (or the row is the viewer's
  own). Aggregates ignore both flags.

Both default false (privacy-first), so existing groups keep the 5d aggregates-only
behaviour until an admin enables visibility and members accept.

Revision ID: 032
Revises: 031
Create Date: 2026-06-04
"""

import sqlalchemy as sa

from alembic import op

revision = "032"
down_revision = "031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ownership_scopes",
        sa.Column(
            "member_visibility_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "ownership_scope_members",
        sa.Column("shares_detail", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("ownership_scope_members", "shares_detail")
    op.drop_column("ownership_scopes", "member_visibility_enabled")
