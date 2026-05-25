"""Add same-scope composite FK constraints for statement tables.

Adds composite foreign keys so that statements can only reference
card aliases within the same ownership scope, and reconciliation runs
can only reference statements within the same scope.  The original
simple FKs stay for ORM relationship resolution; the composite FKs
add database-level scope enforcement.

Revision ID: 016
Revises: 015
Create Date: 2026-05-25
"""

from alembic import op

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_statements_id_scope",
        "statements",
        ["id", "ownership_scope_id"],
    )

    op.create_foreign_key(
        "fk_statements_card_alias_scope",
        "statements",
        "card_aliases",
        ["card_alias_id", "ownership_scope_id"],
        ["id", "ownership_scope_id"],
        ondelete="RESTRICT",
    )

    op.create_foreign_key(
        "fk_recon_runs_statement_scope",
        "statement_reconciliation_runs",
        "statements",
        ["statement_id", "ownership_scope_id"],
        ["id", "ownership_scope_id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_recon_runs_statement_scope",
        "statement_reconciliation_runs",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_statements_card_alias_scope",
        "statements",
        type_="foreignkey",
    )
    op.drop_constraint("uq_statements_id_scope", "statements", type_="unique")
