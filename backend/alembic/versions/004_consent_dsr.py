"""Add consent_records, processing_register, audit_events tables + RLS.

Revision ID: 004
Revises: 003
Create Date: 2026-05-06
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- consent_records ---
    op.create_table(
        "consent_records",
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
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("purpose", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="granted"),
        sa.Column("legal_basis", sa.String(), nullable=False, server_default="consent"),
        sa.Column("jurisdiction", sa.String(), nullable=False),
        sa.Column(
            "granted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consent_version", sa.String(), nullable=False, server_default="1.0"),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
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
        sa.UniqueConstraint("user_id", "purpose", name="uq_consent_user_purpose"),
    )

    # --- processing_register (GDPR Art 30) ---
    op.create_table(
        "processing_register",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("purpose", sa.String(), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("legal_basis", sa.String(), nullable=False),
        sa.Column("data_categories", sa.Text(), nullable=False),
        sa.Column("recipients", sa.Text(), nullable=False),
        sa.Column("retention_period", sa.String(), nullable=False),
        sa.Column("jurisdictions", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
    )

    # --- audit_events (append-only at Ent tier) ---
    op.create_table(
        "audit_events",
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
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("resource_type", sa.String(), nullable=True),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # --- RLS on consent_records (scope-bound) ---
    op.execute("ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE consent_records FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY consent_records_scope_isolation ON consent_records
        USING (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
        WITH CHECK (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
    """)

    # --- RLS on audit_events (scope-bound) ---
    op.execute("ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE audit_events FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY audit_events_scope_isolation ON audit_events
        USING (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
        WITH CHECK (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
    """)

    # --- Seed processing register (5 processing activities) ---
    _cols = (
        "purpose, description, legal_basis, data_categories,"
        " recipients, retention_period, jurisdictions, is_active"
    )
    op.execute(f"""
        INSERT INTO processing_register ({_cols})
        VALUES
            ('receipt_scanning',
             'AI-powered receipt image processing for expense extraction',
             'contract',
             'receipt images, transaction amounts, merchant names, item details',
             'Gemini AI (Google Cloud), internal processing',
             'duration of account + 7 years',
             'CL,EU,CA,US-CA',
             true),
            ('analytics',
             'Usage analytics and spending trend analysis',
             'legitimate_interest',
             'transaction history, spending patterns, category distributions',
             'internal processing only',
             'duration of account + 1 year',
             'CL,EU,CA,US-CA',
             true),
            ('marketing',
             'Marketing communications and promotional offers',
             'consent',
             'email address, display name, locale preference',
             'internal processing only',
             'until consent revoked',
             'CL,EU,CA,US-CA',
             true),
            ('data_sharing',
             'Sharing anonymized or aggregated data with third parties',
             'consent',
             'anonymized transaction data, aggregated spending patterns',
             'third-party analytics partners',
             'until consent revoked',
             'CL,EU,CA,US-CA',
             true),
            ('ai_training',
             'Using anonymized data to improve AI receipt scanning accuracy',
             'consent',
             'anonymized receipt images, extracted text patterns',
             'internal ML pipeline',
             'until consent revoked or data anonymized',
             'CL,EU,CA,US-CA',
             true)
    """)


def downgrade() -> None:
    # Drop RLS policies
    op.execute("DROP POLICY IF EXISTS audit_events_scope_isolation ON audit_events")
    op.execute("ALTER TABLE audit_events DISABLE ROW LEVEL SECURITY")

    op.execute("DROP POLICY IF EXISTS consent_records_scope_isolation ON consent_records")
    op.execute("ALTER TABLE consent_records DISABLE ROW LEVEL SECURITY")

    # Drop tables (reverse order)
    op.drop_table("audit_events")
    op.drop_table("processing_register")
    op.drop_table("consent_records")
