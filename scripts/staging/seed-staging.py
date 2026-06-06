#!/usr/bin/env python3
"""Seed/reset disposable staging users and reference rows.

The script intentionally refuses production and requires --execute for writes.
It seeds only deterministic staging identities; Firebase Auth users still
come from the staging Firebase project.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import uuid
from dataclasses import dataclass
from datetime import date

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

ALLOWED_ENVIRONMENTS = {"staging", "staging-e2e"}
NS = uuid.UUID("22797035-7ec1-4bb0-b141-9d70d9a7b18a")


@dataclass(frozen=True)
class SeedUser:
    key: str
    firebase_uid: str
    email: str
    display_name: str

    @property
    def scope_id(self) -> uuid.UUID:
        return uuid.uuid5(NS, f"{self.key}.scope")

    @property
    def user_id(self) -> uuid.UUID:
        return uuid.uuid5(NS, f"{self.key}.user")

    @property
    def member_id(self) -> uuid.UUID:
        return uuid.uuid5(NS, f"{self.key}.member")

    @property
    def credit_id(self) -> uuid.UUID:
        return uuid.uuid5(NS, f"{self.key}.credit")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed Gastify staging data.")
    parser.add_argument("--execute", action="store_true", help="Actually write data.")
    parser.add_argument("--reset", action="store_true", help="Delete seeded data before seeding.")
    return parser.parse_args()


def _seed_users() -> list[SeedUser]:
    return [
        SeedUser(
            key="user-a",
            firebase_uid=os.getenv("GASTIFY_STAGING_USER_A_UID", "staging-user-a"),
            email=os.getenv("GASTIFY_STAGING_USER_A_EMAIL", "staging-user-a@gastify.test"),
            display_name="Staging User A",
        ),
        SeedUser(
            key="user-b",
            firebase_uid=os.getenv("GASTIFY_STAGING_USER_B_UID", "staging-user-b"),
            email=os.getenv("GASTIFY_STAGING_USER_B_EMAIL", "staging-user-b@gastify.test"),
            display_name="Staging User B",
        ),
    ]


async def main() -> None:
    args = parse_args()
    environment = os.getenv("GASTIFY_ENVIRONMENT", "").strip().lower()
    database_url = os.getenv("GASTIFY_DATABASE_URL", "")

    if environment not in ALLOWED_ENVIRONMENTS:
        raise SystemExit(
            "Refusing to seed unless GASTIFY_ENVIRONMENT is staging or staging-e2e."
        )
    if not database_url:
        raise SystemExit("GASTIFY_DATABASE_URL is required.")
    if database_url.startswith("sqlite"):
        raise SystemExit("Staging seeding requires Postgres, not SQLite.")
    if not args.execute:
        print("Dry run only. Add --execute to seed staging data.")
        return

    engine = create_async_engine(database_url, echo=False)
    async with engine.begin() as conn:
        if args.reset:
            for user in _seed_users():
                await _reset_user(conn, user)

        await _seed_reference_data(conn)
        for user in _seed_users():
            await _seed_user(conn, user)

    await engine.dispose()
    print(f"Seeded staging data for {environment}. reset={args.reset}")


async def _reset_user(conn, user: SeedUser) -> None:  # type: ignore[no-untyped-def]
    await conn.execute(text("SET LOCAL app.ownership_scope_id = :scope_id"), {"scope_id": user.scope_id})
    await conn.execute(
        text(
            "DELETE FROM transaction_items WHERE transaction_id IN "
            "(SELECT id FROM transactions WHERE ownership_scope_id = :scope_id)"
        ),
        {"scope_id": user.scope_id},
    )
    await conn.execute(
        text(
            "DELETE FROM transaction_images WHERE transaction_id IN "
            "(SELECT id FROM transactions WHERE ownership_scope_id = :scope_id)"
        ),
        {"scope_id": user.scope_id},
    )
    for table in (
        "notifications",
        "scans",
        "transactions",
        "credit_balances",
        "consent_records",
        "audit_events",
        "ownership_scope_members",
    ):
        await conn.execute(
            text(f"DELETE FROM {table} WHERE ownership_scope_id = :scope_id"),
            {"scope_id": user.scope_id},
        )
    await conn.execute(text("DELETE FROM users WHERE id = :user_id"), {"user_id": user.user_id})
    await conn.execute(
        text("DELETE FROM ownership_scopes WHERE id = :scope_id"),
        {"scope_id": user.scope_id},
    )


async def _seed_reference_data(conn) -> None:  # type: ignore[no-untyped-def]
    await conn.execute(
        text(
            "INSERT INTO currencies (code, exponent, display_labels) VALUES "
            "('CLP', 0, '{\"es\":\"Peso Chileno\"}'::jsonb), "
            "('USD', 2, '{\"es\":\"Dolar estadounidense\"}'::jsonb) "
            "ON CONFLICT (code) DO NOTHING"
        )
    )
    await conn.execute(
        text(
            "INSERT INTO processing_register "
            "(id, purpose, description, legal_basis, data_categories, recipients, "
            "retention_period, jurisdictions, is_active) VALUES "
            "(:id, 'receipt_scanning', 'Staging receipt processing', 'contract', "
            "'receipt images, transaction data', 'internal', 'staging only', 'INT', true) "
            "ON CONFLICT (purpose) DO NOTHING"
        ),
        {"id": uuid.uuid5(NS, "processing.receipt_scanning")},
    )


async def _seed_user(conn, user: SeedUser) -> None:  # type: ignore[no-untyped-def]
    await conn.execute(
        text(
            "INSERT INTO ownership_scopes (id, scope_type) "
            "VALUES (:scope_id, 'individual') "
            "ON CONFLICT (id) DO NOTHING"
        ),
        {"scope_id": user.scope_id},
    )
    await conn.execute(text("SET LOCAL app.ownership_scope_id = :scope_id"), {"scope_id": user.scope_id})
    await conn.execute(
        text(
            "INSERT INTO users "
            "(id, firebase_uid, email, display_name, default_currency, locale, ownership_scope_id) "
            "VALUES (:user_id, :firebase_uid, :email, :display_name, 'CLP', 'es', :scope_id) "
            "ON CONFLICT (firebase_uid) DO UPDATE SET "
            "email = EXCLUDED.email, display_name = EXCLUDED.display_name"
        ),
        {
            "user_id": user.user_id,
            "firebase_uid": user.firebase_uid,
            "email": user.email,
            "display_name": user.display_name,
            "scope_id": user.scope_id,
        },
    )
    await conn.execute(
        text(
            "INSERT INTO ownership_scope_members (id, ownership_scope_id, user_id, role) "
            "VALUES (:member_id, :scope_id, :user_id, 'owner') "
            "ON CONFLICT (ownership_scope_id, user_id) DO NOTHING"
        ),
        {"member_id": user.member_id, "scope_id": user.scope_id, "user_id": user.user_id},
    )
    await conn.execute(
        text(
            "INSERT INTO credit_balances (id, ownership_scope_id, scan_credits) "
            "VALUES (:credit_id, :scope_id, 50) "
            "ON CONFLICT (ownership_scope_id) DO UPDATE SET scan_credits = 50"
        ),
        {"credit_id": user.credit_id, "scope_id": user.scope_id},
    )
    await conn.execute(
        text(
            "INSERT INTO transactions "
            "(id, ownership_scope_id, transaction_date, merchant, total_minor, currency) "
            "VALUES (:id, :scope_id, :transaction_date, :merchant, :total_minor, 'CLP') "
            "ON CONFLICT (id) DO NOTHING"
        ),
        {
            "id": uuid.uuid5(NS, f"{user.key}.transaction.seed"),
            "scope_id": user.scope_id,
            "transaction_date": date(2026, 5, 18),
            "merchant": f"{user.display_name} Seed Merchant",
            "total_minor": 12990,
        },
    )
    # Phase 7 (D78): one deterministic notification so the web/mobile notification
    # proofs have a stable row to list / mark-read / delete. Personal-scope-bound,
    # deep-linked to the seeded transaction. GUC is already set to user.scope_id.
    await conn.execute(
        text(
            "INSERT INTO notifications "
            "(id, ownership_scope_id, user_id, kind, title, body, data) "
            "VALUES (:id, :scope_id, :user_id, 'scan_complete', :title, :body, "
            ":data::jsonb) "
            "ON CONFLICT (id) DO NOTHING"
        ),
        {
            "id": uuid.uuid5(NS, f"{user.key}.notification.seed"),
            "scope_id": user.scope_id,
            "user_id": user.user_id,
            "title": "Boleta escaneada",
            "body": "Tu boleta de prueba se guardó.",
            "data": json.dumps(
                {"transaction_id": str(uuid.uuid5(NS, f"{user.key}.transaction.seed"))}
            ),
        },
    )


if __name__ == "__main__":
    asyncio.run(main())
