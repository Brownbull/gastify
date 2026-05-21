#!/usr/bin/env python3
"""Create and seed the local SQLite database.

This is intentionally not an Alembic path. Local exists for quick UI/API
iteration with the mock scan provider; staging/prod evidence still runs on
Postgres migrations.
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
LOCAL_DB = ROOT_DIR / ".tmp" / "local" / "gastify.db"
LOCAL_DB.parent.mkdir(parents=True, exist_ok=True)

os.environ.setdefault("GASTIFY_ENVIRONMENT", "local")
os.environ.setdefault("GASTIFY_SCAN_PROVIDER", "mock")
os.environ.setdefault("GASTIFY_DATABASE_URL", f"sqlite+aiosqlite:///{LOCAL_DB}")
os.environ.setdefault("GASTIFY_SCAN_STORAGE_DIR", str(ROOT_DIR / ".tmp" / "local" / "scans"))

sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import delete, update  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

from app.db import Base  # noqa: E402
from app.models import *  # noqa: F401,F403,E402
from app.models.consent import ProcessingRegister  # noqa: E402
from app.models.credit import CreditBalance  # noqa: E402
from app.models.reference import Currency, ItemCategory, StoreCategory  # noqa: E402
from app.models.transaction import TransactionItem  # noqa: E402
from app.models.user import OwnershipScope, OwnershipScopeMember, User  # noqa: E402
from app.reference.categories import V4_ITEM_CATEGORY_TAXONOMY, V4_STORE_CATEGORY_TAXONOMY  # noqa: E402

LOCAL_SCOPE_ID = uuid.UUID("10000000-0000-0000-0000-000000000001")
LOCAL_USER_ID = uuid.UUID("10000000-0000-0000-0000-000000000002")
LOCAL_MEMBER_ID = uuid.UUID("10000000-0000-0000-0000-000000000003")
LOCAL_CREDIT_ID = uuid.UUID("10000000-0000-0000-0000-000000000004")
LEGACY_LOCAL_CATEGORY_KEYS = {
    "Supermercado": "Pantry",
    "Panaderia": "BreadPastry",
    "Miscelaneo": "OtherItem",
}


def _stable_uuid(name: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"gastify.local.{name}")


def _strip_sqlite_incompatible_defaults() -> None:
    for table in Base.metadata.sorted_tables:
        for column in table.columns:
            server_default = column.server_default
            if (
                server_default is not None
                and hasattr(server_default, "arg")
                and "gen_random_uuid" in str(server_default.arg)
            ):
                column.server_default = None


async def main() -> None:
    database_url = os.environ["GASTIFY_DATABASE_URL"]
    engine = create_async_engine(database_url, echo=False)
    _strip_sqlite_incompatible_defaults()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        for currency in [
            Currency(
                code="CLP",
                exponent=0,
                display_labels={"en": "Chilean peso", "es": "Peso chileno"},
            ),
            Currency(
                code="USD",
                exponent=2,
                display_labels={"en": "US dollar", "es": "Dolar estadounidense"},
            ),
            Currency(code="EUR", exponent=2, display_labels={"en": "Euro", "es": "Euro"}),
        ]:
            await session.merge(currency)

        for category in V4_ITEM_CATEGORY_TAXONOMY:
            await session.merge(
                ItemCategory(
                    id=_stable_uuid(f"item-category.{category.key}"),
                    key=category.key,
                    level=category.level,
                    parent_id=(
                        _stable_uuid(f"item-category.{category.parent_key}")
                        if category.parent_key
                        else None
                    ),
                    display_labels=dict(category.display_labels),
                    is_sensitive=category.is_sensitive,
                    sort_order=category.sort_order,
                )
            )

        for legacy_key, canonical_key in LEGACY_LOCAL_CATEGORY_KEYS.items():
            await session.execute(
                update(TransactionItem)
                .where(
                    TransactionItem.item_category_id == _stable_uuid(f"item-category.{legacy_key}")
                )
                .values(item_category_id=_stable_uuid(f"item-category.{canonical_key}"))
            )
        await session.execute(
            delete(ItemCategory).where(ItemCategory.key.in_(LEGACY_LOCAL_CATEGORY_KEYS))
        )

        for category in V4_STORE_CATEGORY_TAXONOMY:
            await session.merge(
                StoreCategory(
                    id=_stable_uuid(f"store-category.{category.key}"),
                    key=category.key,
                    level=category.level,
                    parent_id=(
                        _stable_uuid(f"store-category.{category.parent_key}")
                        if category.parent_key
                        else None
                    ),
                    display_labels=dict(category.display_labels),
                    is_sensitive=category.is_sensitive,
                    sort_order=category.sort_order,
                )
            )

        for purpose, legal_basis in [
            ("receipt_scanning", "contract"),
            ("analytics", "legitimate_interest"),
            ("marketing", "consent"),
        ]:
            await session.merge(
                ProcessingRegister(
                    id=_stable_uuid(f"processing.{purpose}"),
                    purpose=purpose,
                    description=f"Local {purpose} processing",
                    legal_basis=legal_basis,
                    data_categories="local test data",
                    recipients="internal",
                    retention_period="local only",
                    jurisdictions="LOCAL",
                    is_active=True,
                )
            )

        await session.merge(OwnershipScope(id=LOCAL_SCOPE_ID, scope_type="individual"))
        await session.merge(
            User(
                id=LOCAL_USER_ID,
                firebase_uid="local-user",
                email="local@gastify.test",
                display_name="Local User",
                ownership_scope_id=LOCAL_SCOPE_ID,
                default_currency="CLP",
                locale="en",
            )
        )
        await session.merge(
            OwnershipScopeMember(
                id=LOCAL_MEMBER_ID,
                ownership_scope_id=LOCAL_SCOPE_ID,
                user_id=LOCAL_USER_ID,
                role="owner",
            )
        )
        await session.merge(
            CreditBalance(
                id=LOCAL_CREDIT_ID,
                ownership_scope_id=LOCAL_SCOPE_ID,
                scan_credits=50,
            )
        )
        await session.commit()

    await engine.dispose()
    print(f"Local database ready: {database_url}")
    print(f"Scan storage: {os.environ['GASTIFY_SCAN_STORAGE_DIR']}")


if __name__ == "__main__":
    asyncio.run(main())
