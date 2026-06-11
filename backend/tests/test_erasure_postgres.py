"""PostgreSQL erasure regression test (P70) — the full personal-surface hard-delete.

The sqlite suite proves erasure completeness logically; this locks the same flow on REAL
Postgres (FK ordering, dialect behavior) — the Phase-1 bug class where sqlite-green
erasure code misbehaved on PG. Builds the actual ORM schema on the CI Postgres
(create_all/drop_all), seeds parent→child chains across the personal surface, runs
delete_user_personal_data, and asserts every table is observably empty.

SKIPPED unless GASTIFY_TEST_PG_DSN is set (CI provides it).
"""

from __future__ import annotations

import os
import uuid
from datetime import UTC, date, datetime

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import Base
from app.models.credit import CreditBalance
from app.models.mapping import MerchantMapping
from app.models.notification import Notification
from app.models.reference import Currency
from app.models.scan import Scan, ScanStatus
from app.models.statement import CardAlias, Statement, StatementLine
from app.models.transaction import Transaction, TransactionItem
from app.models.user import MobilePushToken, OwnershipScope, OwnershipScopeMember, User
from app.services.consent import delete_user_personal_data

PG_DSN = os.getenv("GASTIFY_TEST_PG_DSN")
pytestmark = pytest.mark.skipif(
    not PG_DSN, reason="GASTIFY_TEST_PG_DSN not set — PG erasure regression test skipped."
)


def _sqlalchemy_dsn() -> str:
    assert PG_DSN is not None
    return PG_DSN.replace("postgresql://", "postgresql+asyncpg://", 1)


@pytest.mark.asyncio
async def test_erasure_hard_deletes_the_full_surface_on_postgres() -> None:
    engine = create_async_engine(_sqlalchemy_dsn())
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    scope_id = uuid.uuid4()
    now = datetime.now(UTC)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with factory() as db:
            # Reference rows the personal tables FK onto (fresh schema has none).
            db.add(Currency(code="CLP", exponent=0))
            db.add(OwnershipScope(id=scope_id, scope_type="individual"))
            await db.flush()
            user = User(
                firebase_uid=f"pg-erase-{scope_id.hex[:8]}",
                email="pg-erase@test.local",
                display_name="PG Erase",
                ownership_scope_id=scope_id,
            )
            db.add(user)
            await db.flush()
            db.add(OwnershipScopeMember(ownership_scope_id=scope_id, user_id=user.id, role="owner"))
            # Parent → child chains across the personal surface.
            txn = Transaction(
                ownership_scope_id=scope_id,
                merchant="Jumbo",
                transaction_date=date(2026, 5, 1),
                total_minor=1000,
                currency="CLP",
            )
            db.add(txn)
            await db.flush()
            db.add(TransactionItem(transaction_id=txn.id, name="Pan", total_price_minor=1000))
            db.add(CardAlias(ownership_scope_id=scope_id, name="Visa *1234"))
            stmt = Statement(
                ownership_scope_id=scope_id,
                original_filename="s.pdf",
                file_path="/tmp/pg-erase.pdf",
                file_sha256="0" * 64,
                file_size_bytes=10,
                currency="CLP",
            )
            db.add(stmt)
            await db.flush()
            db.add(
                StatementLine(
                    statement_id=stmt.id,
                    source_order=1,
                    description="line",
                    amount_minor=1000,
                    currency="CLP",
                )
            )
            db.add(
                Scan(
                    ownership_scope_id=scope_id,
                    status=ScanStatus.COMPLETED,
                    image_path="/tmp/pg-erase.jpg",
                    original_filename="r.jpg",
                    content_type="image/jpeg",
                    file_size_bytes=10,
                    submitted_at=now,
                )
            )
            db.add(
                Notification(
                    ownership_scope_id=scope_id, user_id=user.id, kind="scan_complete", title="t"
                )
            )
            db.add(
                MerchantMapping(
                    ownership_scope_id=scope_id, original_merchant="JUMBO", target_merchant="Jumbo"
                )
            )
            db.add(CreditBalance(ownership_scope_id=scope_id))
            db.add(
                MobilePushToken(
                    ownership_scope_id=scope_id,
                    user_id=user.id,
                    token="ExponentPushToken[pg]",
                    platform="android",
                )
            )
            await db.commit()

            counts = await delete_user_personal_data(db, ownership_scope_id=scope_id)
            await db.commit()

        assert counts["transactions"] == 1
        assert counts["mobile_push_tokens"] == 1

        async with factory() as db:
            for model in (
                Transaction,
                CardAlias,
                Statement,
                Scan,
                Notification,
                MerchantMapping,
                CreditBalance,
                MobilePushToken,
            ):
                n = await db.scalar(
                    select(func.count())
                    .select_from(model)
                    .where(model.ownership_scope_id == scope_id)
                )
                assert n == 0, f"{model.__tablename__} not erased on Postgres"
            # Children go with their parents (FK order proven by no IntegrityError).
            items = await db.scalar(select(func.count()).select_from(TransactionItem))
            lines = await db.scalar(select(func.count()).select_from(StatementLine))
            assert items == 0 and lines == 0
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()
