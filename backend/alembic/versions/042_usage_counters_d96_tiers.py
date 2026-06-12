"""D96 tier/quota model: usage_counters table + free|premium tiers.

Revision ID: 042
Revises: 041

Monthly feature quotas (D96): free = 20 scans, no statements, no batch; premium
(CLP $5.000/mo) = 60 scans, 3 statements, 3 batch. Consumption lives in
usage_counters keyed (scope, feature, "YYYY-MM") — the month key rotates naturally,
so monthly recharge + no-rollover hold by construction (no reset job).

Also collapses the legacy basic/pro plan tiers (schema-level plumbing, never sold)
into premium and tightens the credit_balances check constraint.
"""

import sqlalchemy as sa

from alembic import op

revision = "042"
down_revision = "041"
branch_labels = None
depends_on = None

# Fail-safe scope expression (migration 027 / D67-P43).
_SCOPE = "NULLIF(current_setting('app.ownership_scope_id', true), '')"


def upgrade() -> None:
    op.create_table(
        "usage_counters",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "ownership_scope_id",
            sa.Uuid(),
            sa.ForeignKey("ownership_scopes.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("feature", sa.String(), nullable=False),
        sa.Column("period", sa.String(7), nullable=False),
        sa.Column("used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint(
            "ownership_scope_id", "feature", "period", name="uq_usage_counters_scope_feature_period"
        ),
        sa.CheckConstraint(
            "feature IN ('scan', 'statement', 'batch')", name="ck_usage_counters_feature"
        ),
        sa.CheckConstraint("used >= 0", name="ck_usage_counters_used_non_negative"),
    )
    op.execute("ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE usage_counters FORCE ROW LEVEL SECURITY")
    # SELECT + INSERT + UPDATE only (the app increments counters); no DELETE policy —
    # counters are consumption history, removed only with their scope (FK).
    op.execute(
        f"""
        CREATE POLICY usage_counters_select ON usage_counters
            FOR SELECT USING (ownership_scope_id = ({_SCOPE})::uuid)
        """
    )
    op.execute(
        f"""
        CREATE POLICY usage_counters_insert ON usage_counters
            FOR INSERT WITH CHECK (ownership_scope_id = ({_SCOPE})::uuid)
        """
    )
    op.execute(
        f"""
        CREATE POLICY usage_counters_update ON usage_counters
            FOR UPDATE USING (ownership_scope_id = ({_SCOPE})::uuid)
            WITH CHECK (ownership_scope_id = ({_SCOPE})::uuid)
        """
    )

    # Legacy basic/pro (never sold — schema plumbing) collapse into premium (D96).
    op.execute(
        "UPDATE credit_balances SET plan_tier = 'premium' WHERE plan_tier IN ('basic', 'pro')"
    )
    op.execute("ALTER TABLE credit_balances DROP CONSTRAINT IF EXISTS ck_credit_balances_plan_tier")
    op.execute(
        "ALTER TABLE credit_balances ADD CONSTRAINT ck_credit_balances_plan_tier "
        "CHECK (plan_tier IN ('free', 'premium'))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE credit_balances DROP CONSTRAINT IF EXISTS ck_credit_balances_plan_tier")
    op.execute(
        "ALTER TABLE credit_balances ADD CONSTRAINT ck_credit_balances_plan_tier "
        "CHECK (plan_tier IN ('free', 'basic', 'pro'))"
    )
    op.drop_table("usage_counters")
