"""Recreate RLS policies with missing_ok current_setting (fail-safe, P43/D67).

Every scope-isolation policy read current_setting('app.ownership_scope_id')
WITHOUT the missing_ok flag, so it RAISES "unrecognized configuration parameter"
whenever the GUC is unset. Under the superuser this never fired (RLS bypassed);
under the least-privilege runtime role it does — and the app loses the
transaction-local GUC across any mid-request commit(), so commit-then-read
endpoints 500.

Switch every policy to current_setting('app.ownership_scope_id', true), which
returns NULL instead of raising when unset. NULL never equals a scope id, so an
unset GUC yields ZERO visible rows (fail-safe) instead of a crash. Normal
requests are unaffected — the app sets the GUC per request, and a companion
change (app/db.py) re-establishes it at every transaction begin so the value
survives mid-request commits.

Revision ID: 027
Revises: 026
Create Date: 2026-06-02
"""

from alembic import op

revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None

# Direct-form policies: ownership_scope_id = current_setting(...)::uuid
_DIRECT_TABLES = (
    "audit_events",
    "card_aliases",
    "category_mappings",
    "consent_records",
    "credit_balances",
    "merchant_mappings",
    "ownership_scope_members",
    "statement_reconciliation_runs",
    "statements",
    "transaction_item_flags",
    "transactions",
)

# Subquery-form policies: child keyed through a scope-bound parent.
# (table, fk_column, parent_table)  — transaction_items/images go via transactions;
# statement_lines via statements; verdicts via statement_reconciliation_runs.
_SUBQUERY_POLICIES = (
    ("statement_lines", "statement_id", "statements"),
    ("statement_reconciliation_verdicts", "run_id", "statement_reconciliation_runs"),
    ("transaction_images", "transaction_id", "transactions"),
    ("transaction_items", "transaction_id", "transactions"),
)

_OLD = "current_setting('app.ownership_scope_id')"
# missing_ok (returns NULL when unset) + NULLIF('' -> NULL) so a GUC that was set
# then RESET to '' (e.g. after sign-out, or a recycled pooled connection) is also
# treated as "no scope" rather than erroring on ''::uuid. NULL never matches a
# scope id, so either state yields zero rows (fail-safe).
_NEW = "NULLIF(current_setting('app.ownership_scope_id', true), '')"


def _recreate_direct(table: str, setting: str) -> None:
    op.execute(f"DROP POLICY IF EXISTS {table}_scope_isolation ON {table}")
    op.execute(
        f"""
        CREATE POLICY {table}_scope_isolation ON {table}
            USING (ownership_scope_id = ({setting})::uuid)
            WITH CHECK (ownership_scope_id = ({setting})::uuid)
        """
    )


def _recreate_subquery(table: str, fk: str, parent: str, setting: str) -> None:
    op.execute(f"DROP POLICY IF EXISTS {table}_scope_isolation ON {table}")
    op.execute(
        f"""
        CREATE POLICY {table}_scope_isolation ON {table}
            USING (
                {fk} IN (
                    SELECT id FROM {parent}
                    WHERE ownership_scope_id = ({setting})::uuid
                )
            )
            WITH CHECK (
                {fk} IN (
                    SELECT id FROM {parent}
                    WHERE ownership_scope_id = ({setting})::uuid
                )
            )
        """
    )


def upgrade() -> None:
    for table in _DIRECT_TABLES:
        _recreate_direct(table, _NEW)
    for table, fk, parent in _SUBQUERY_POLICIES:
        _recreate_subquery(table, fk, parent, _NEW)


def downgrade() -> None:
    for table in _DIRECT_TABLES:
        _recreate_direct(table, _OLD)
    for table, fk, parent in _SUBQUERY_POLICIES:
        _recreate_subquery(table, fk, parent, _OLD)
