"""Add statement reconciliation foundation.

Revision ID: 015
Revises: 014
Create Date: 2026-05-25
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None

_STATEMENT_STATUS = (
    "uploaded",
    "password_required",
    "password_invalid",
    "queued",
    "extracting",
    "extracted",
    "reconciling",
    "completed",
    "failed",
)
_STATEMENT_LINE_TYPE = (
    "charge",
    "payment",
    "interest",
    "fee",
    "insurance",
    "tax",
    "adjustment",
    "other",
)
_RECONCILIATION_RUN_STATUS = ("pending", "running", "completed", "failed")
_RECONCILIATION_VERDICT = (
    "matched",
    "statement_only",
    "receipt_only",
    "ambiguous",
    "failed",
)


def upgrade() -> None:
    statement_status = postgresql.ENUM(
        *_STATEMENT_STATUS,
        name="statement_status",
        create_type=False,
    )
    statement_line_type = postgresql.ENUM(
        *_STATEMENT_LINE_TYPE,
        name="statement_line_type",
        create_type=False,
    )
    reconciliation_run_status = postgresql.ENUM(
        *_RECONCILIATION_RUN_STATUS,
        name="statement_reconciliation_run_status",
        create_type=False,
    )
    reconciliation_verdict = postgresql.ENUM(
        *_RECONCILIATION_VERDICT,
        name="statement_reconciliation_verdict",
        create_type=False,
    )
    bind = op.get_bind()
    statement_status.create(bind, checkfirst=True)
    statement_line_type.create(bind, checkfirst=True)
    reconciliation_run_status.create(bind, checkfirst=True)
    reconciliation_verdict.create(bind, checkfirst=True)

    op.create_table(
        "card_aliases",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("ownership_scope_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["ownership_scope_id"], ["ownership_scopes.id"]),
        sa.CheckConstraint("length(trim(name)) > 0", name="ck_card_aliases_name_not_blank"),
        sa.UniqueConstraint("id", "ownership_scope_id", name="uq_card_aliases_id_scope"),
    )
    op.create_index(
        "ix_card_aliases_scope_archived",
        "card_aliases",
        ["ownership_scope_id", "archived_at"],
    )
    op.execute(
        """
        CREATE UNIQUE INDEX uq_card_aliases_scope_active_name_ci
        ON card_aliases (ownership_scope_id, lower(name))
        WHERE archived_at IS NULL
        """
    )

    op.create_table(
        "statements",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("ownership_scope_id", sa.Uuid(), nullable=False),
        sa.Column("card_alias_id", sa.Uuid(), nullable=True),
        sa.Column("status", statement_status, nullable=False, server_default="uploaded"),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("file_sha256", sa.String(64), nullable=False),
        sa.Column(
            "content_type",
            sa.String(100),
            nullable=False,
            server_default="application/pdf",
        ),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("issuer", sa.Text(), nullable=True),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("closing_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("total_debit_minor", sa.BigInteger(), nullable=True),
        sa.Column("total_credit_minor", sa.BigInteger(), nullable=True),
        sa.Column("payment_due_minor", sa.BigInteger(), nullable=True),
        sa.Column("pdf_status", sa.String(50), nullable=False, server_default="readable"),
        sa.Column("is_encrypted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("extraction_provider", sa.String(50), nullable=True),
        sa.Column("extraction_prompt_id", sa.Text(), nullable=True),
        sa.Column("extraction_model_name", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Numeric(4, 3), nullable=True),
        sa.Column("warnings", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("error_code", sa.String(50), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("extracted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reconciled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["ownership_scope_id"], ["ownership_scopes.id"]),
        sa.ForeignKeyConstraint(["card_alias_id"], ["card_aliases.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["currency"], ["currencies.code"]),
        sa.CheckConstraint("file_size_bytes >= 0", name="ck_statements_file_size_bytes_gte0"),
        sa.CheckConstraint(
            "page_count IS NULL OR page_count >= 0", name="ck_statements_page_count"
        ),
        sa.CheckConstraint(
            "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)",
            name="ck_statements_confidence_range",
        ),
        sa.CheckConstraint(
            "total_debit_minor IS NULL OR total_debit_minor >= 0",
            name="ck_statements_total_debit_gte0",
        ),
        sa.CheckConstraint(
            "total_credit_minor IS NULL OR total_credit_minor >= 0",
            name="ck_statements_total_credit_gte0",
        ),
        sa.CheckConstraint(
            "payment_due_minor IS NULL OR payment_due_minor >= 0",
            name="ck_statements_payment_due_gte0",
        ),
        sa.UniqueConstraint("ownership_scope_id", "file_sha256", name="uq_statements_scope_sha256"),
    )
    op.create_index("ix_statements_scope_status", "statements", ["ownership_scope_id", "status"])
    op.create_index(
        "ix_statements_scope_period",
        "statements",
        ["ownership_scope_id", "period_start", "period_end"],
    )

    op.create_table(
        "statement_lines",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("statement_id", sa.Uuid(), nullable=False),
        sa.Column("source_order", sa.SmallInteger(), nullable=False),
        sa.Column("line_date", sa.Date(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("amount_minor", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("line_type", statement_line_type, nullable=False, server_default="other"),
        sa.Column("installment", sa.Text(), nullable=True),
        sa.Column("original_currency", sa.String(3), nullable=True),
        sa.Column("original_amount_minor", sa.BigInteger(), nullable=True),
        sa.Column("card_alias_candidate", sa.Text(), nullable=True),
        sa.Column("category_key", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["statement_id"], ["statements.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["currency"], ["currencies.code"]),
        sa.CheckConstraint("source_order >= 1", name="ck_statement_lines_source_order_gte1"),
        sa.UniqueConstraint("statement_id", "source_order", name="uq_statement_lines_order"),
    )
    op.create_index(
        "ix_statement_lines_statement_date",
        "statement_lines",
        ["statement_id", "line_date"],
    )

    op.create_table(
        "statement_reconciliation_runs",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("ownership_scope_id", sa.Uuid(), nullable=False),
        sa.Column("statement_id", sa.Uuid(), nullable=False),
        sa.Column("status", reconciliation_run_status, nullable=False, server_default="pending"),
        sa.Column("total_statement_lines", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("matched_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("statement_only_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("receipt_only_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ambiguous_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("coverage_ratio", sa.Numeric(5, 4), nullable=True),
        sa.Column("error_code", sa.String(50), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["ownership_scope_id"], ["ownership_scopes.id"]),
        sa.ForeignKeyConstraint(["statement_id"], ["statements.id"], ondelete="CASCADE"),
        sa.CheckConstraint("total_statement_lines >= 0", name="ck_recon_runs_total_lines_gte0"),
        sa.CheckConstraint("matched_count >= 0", name="ck_recon_runs_matched_gte0"),
        sa.CheckConstraint(
            "statement_only_count >= 0",
            name="ck_recon_runs_statement_only_gte0",
        ),
        sa.CheckConstraint("receipt_only_count >= 0", name="ck_recon_runs_receipt_only_gte0"),
        sa.CheckConstraint("ambiguous_count >= 0", name="ck_recon_runs_ambiguous_gte0"),
        sa.CheckConstraint(
            "coverage_ratio IS NULL OR (coverage_ratio >= 0 AND coverage_ratio <= 1)",
            name="ck_recon_runs_coverage_ratio",
        ),
    )
    op.create_index(
        "ix_recon_runs_scope_statement",
        "statement_reconciliation_runs",
        ["ownership_scope_id", "statement_id"],
    )

    op.create_table(
        "statement_reconciliation_verdicts",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("statement_line_id", sa.Uuid(), nullable=True),
        sa.Column("receipt_transaction_id", sa.Uuid(), nullable=True),
        sa.Column("verdict", reconciliation_verdict, nullable=False),
        sa.Column("score", sa.Numeric(4, 3), nullable=True),
        sa.Column("reasons", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(
            ["run_id"], ["statement_reconciliation_runs.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["statement_line_id"], ["statement_lines.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["receipt_transaction_id"], ["transactions.id"], ondelete="SET NULL"
        ),
        sa.CheckConstraint(
            "score IS NULL OR (score >= 0 AND score <= 1)", name="ck_recon_verdicts_score"
        ),
        sa.CheckConstraint(
            "statement_line_id IS NOT NULL OR receipt_transaction_id IS NOT NULL",
            name="ck_recon_verdicts_has_source",
        ),
    )
    op.create_index(
        "ix_recon_verdicts_run_verdict",
        "statement_reconciliation_verdicts",
        ["run_id", "verdict"],
    )
    op.create_index(
        "ix_recon_verdicts_statement_line",
        "statement_reconciliation_verdicts",
        ["statement_line_id"],
    )
    op.create_index(
        "ix_recon_verdicts_receipt_transaction",
        "statement_reconciliation_verdicts",
        ["receipt_transaction_id"],
    )

    _enable_scope_rls()


def downgrade() -> None:
    for table in (
        "statement_reconciliation_verdicts",
        "statement_reconciliation_runs",
        "statement_lines",
        "statements",
        "card_aliases",
    ):
        op.execute(f"DROP POLICY IF EXISTS {table}_scope_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    op.drop_index(
        "ix_recon_verdicts_receipt_transaction", table_name="statement_reconciliation_verdicts"
    )
    op.drop_index(
        "ix_recon_verdicts_statement_line", table_name="statement_reconciliation_verdicts"
    )
    op.drop_index("ix_recon_verdicts_run_verdict", table_name="statement_reconciliation_verdicts")
    op.drop_table("statement_reconciliation_verdicts")
    op.drop_index("ix_recon_runs_scope_statement", table_name="statement_reconciliation_runs")
    op.drop_table("statement_reconciliation_runs")
    op.drop_index("ix_statement_lines_statement_date", table_name="statement_lines")
    op.drop_table("statement_lines")
    op.drop_index("ix_statements_scope_period", table_name="statements")
    op.drop_index("ix_statements_scope_status", table_name="statements")
    op.drop_table("statements")
    op.execute("DROP INDEX IF EXISTS uq_card_aliases_scope_active_name_ci")
    op.drop_index("ix_card_aliases_scope_archived", table_name="card_aliases")
    op.drop_table("card_aliases")

    sa.Enum(name="statement_reconciliation_verdict").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="statement_reconciliation_run_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="statement_line_type").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="statement_status").drop(op.get_bind(), checkfirst=True)


def _enable_scope_rls() -> None:
    for table in ("card_aliases", "statements", "statement_reconciliation_runs"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY {table}_scope_isolation ON {table}
            USING (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
            WITH CHECK (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
        """)

    op.execute("ALTER TABLE statement_lines ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE statement_lines FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY statement_lines_scope_isolation ON statement_lines
        USING (
            statement_id IN (
                SELECT id FROM statements
                WHERE ownership_scope_id = current_setting('app.ownership_scope_id')::uuid
            )
        )
        WITH CHECK (
            statement_id IN (
                SELECT id FROM statements
                WHERE ownership_scope_id = current_setting('app.ownership_scope_id')::uuid
            )
        )
    """)

    op.execute("ALTER TABLE statement_reconciliation_verdicts ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE statement_reconciliation_verdicts FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY statement_reconciliation_verdicts_scope_isolation
        ON statement_reconciliation_verdicts
        USING (
            run_id IN (
                SELECT id FROM statement_reconciliation_runs
                WHERE ownership_scope_id = current_setting('app.ownership_scope_id')::uuid
            )
        )
        WITH CHECK (
            run_id IN (
                SELECT id FROM statement_reconciliation_runs
                WHERE ownership_scope_id = current_setting('app.ownership_scope_id')::uuid
            )
        )
    """)
