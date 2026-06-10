"""Erasure completeness + PII-free retention tests (P16 review remediation, D89/D82).

Account deletion is TOTAL: it must hard-delete EVERY personal-scope table the user
owns — not just transactions. The original T2 implementation only removed
transactions/items/images/flags, leaving statements, card aliases, scans,
notifications, mappings, and credit balances (personal financial PII) behind. It
also retained ip_address/user_agent on the consent + audit rows it keeps as proof,
contradicting D89's "PII-free" requirement. These tests pin both fixes.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.consent import AuditEvent, ConsentRecord
from app.models.credit import CreditBalance
from app.models.mapping import MerchantMapping
from app.models.notification import Notification
from app.models.scan import Scan
from app.models.statement import CardAlias, Statement, StatementLine
from app.models.transaction import Transaction
from app.models.user import MobilePushToken
from tests.conftest import TEST_SCOPE_ID, TEST_USER_ID


def _sf(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _seed_full_personal_footprint(engine) -> None:
    """One row in every PII-bearing personal-scope table, all under TEST_SCOPE_ID."""
    async with _sf(engine)() as s:
        txn = Transaction(
            ownership_scope_id=TEST_SCOPE_ID,
            transaction_date=date(2026, 1, 5),
            merchant="Farmacia",
            total_minor=15_000,
            currency="CLP",
        )
        s.add(txn)
        alias = CardAlias(ownership_scope_id=TEST_SCOPE_ID, name="Visa ****1234")
        s.add(alias)
        await s.flush()
        statement = Statement(
            ownership_scope_id=TEST_SCOPE_ID,
            card_alias_id=alias.id,
            original_filename="estado.pdf",
            file_path="/blob/estado.pdf",
            file_sha256="a" * 64,
            file_size_bytes=2048,
            currency="CLP",
        )
        s.add(statement)
        await s.flush()
        s.add(
            StatementLine(
                statement_id=statement.id,
                source_order=1,
                description="Compra supermercado",
                amount_minor=9_900,
                currency="CLP",
            )
        )
        s.add(
            Scan(
                ownership_scope_id=TEST_SCOPE_ID,
                image_path="/blob/receipt.jpg",
                original_filename="receipt.jpg",
                content_type="image/jpeg",
                file_size_bytes=1024,
            )
        )
        s.add(
            Notification(
                ownership_scope_id=TEST_SCOPE_ID,
                user_id=TEST_USER_ID,
                kind="scan_complete",
                title="Boleta lista",
            )
        )
        s.add(
            MerchantMapping(
                ownership_scope_id=TEST_SCOPE_ID,
                original_merchant="FCO CRUZ VERDE",
                target_merchant="Cruz Verde",
            )
        )
        s.add(CreditBalance(ownership_scope_id=TEST_SCOPE_ID))
        s.add(
            MobilePushToken(
                ownership_scope_id=TEST_SCOPE_ID,
                user_id=TEST_USER_ID,
                token="ExponentPushToken[xxx]",
                platform="android",
            )
        )
        # A consent record carrying PII (ip + user agent) + a prior audit event w/ IP.
        s.add(
            ConsentRecord(
                ownership_scope_id=TEST_SCOPE_ID,
                user_id=TEST_USER_ID,
                purpose="analytics",
                jurisdiction="CL",
                granted_at=datetime.now(UTC),
                ip_address="190.1.2.3",
                user_agent="Mozilla/5.0 (test)",
            )
        )
        s.add(
            AuditEvent(
                ownership_scope_id=TEST_SCOPE_ID,
                user_id=TEST_USER_ID,
                event_type="dsr_access",
                ip_address="190.1.2.3",
            )
        )
        await s.commit()


async def _count(engine, model, where) -> int:
    async with _sf(engine)() as s:
        return await s.scalar(select(func.count()).select_from(model).where(where)) or 0


@pytest.mark.asyncio
async def test_erasure_hard_deletes_the_whole_personal_footprint(client, engine):
    await _seed_full_personal_footprint(engine)

    resp = await client.post("/api/v1/privacy/erasure")
    assert resp.status_code == 200
    assert resp.json()["transactions_deleted"] == 1

    # Every PII-bearing personal-scope table is empty for the erased scope.
    assert await _count(engine, Transaction, Transaction.ownership_scope_id == TEST_SCOPE_ID) == 0
    assert await _count(engine, CardAlias, CardAlias.ownership_scope_id == TEST_SCOPE_ID) == 0
    assert await _count(engine, Statement, Statement.ownership_scope_id == TEST_SCOPE_ID) == 0
    assert await _count(engine, Scan, Scan.ownership_scope_id == TEST_SCOPE_ID) == 0
    assert await _count(engine, Notification, Notification.ownership_scope_id == TEST_SCOPE_ID) == 0
    assert (
        await _count(engine, MerchantMapping, MerchantMapping.ownership_scope_id == TEST_SCOPE_ID)
        == 0
    )
    assert (
        await _count(engine, CreditBalance, CreditBalance.ownership_scope_id == TEST_SCOPE_ID) == 0
    )
    assert (
        await _count(engine, MobilePushToken, MobilePushToken.ownership_scope_id == TEST_SCOPE_ID)
        == 0
    )
    # Statement lines cascade with their statement.
    async with _sf(engine)() as s:
        lines = await s.scalar(select(func.count()).select_from(StatementLine))
    assert lines == 0


@pytest.mark.asyncio
async def test_erasure_scrubs_retained_proof_rows_of_pii(client, engine):
    await _seed_full_personal_footprint(engine)
    await client.post("/api/v1/privacy/erasure")

    async with _sf(engine)() as s:
        # Consent records are RETAINED (revoked) but stripped of ip/user_agent.
        consents = (
            (await s.execute(select(ConsentRecord).where(ConsentRecord.user_id == TEST_USER_ID)))
            .scalars()
            .all()
        )
        assert consents  # retained as proof
        assert all(c.ip_address is None and c.user_agent is None for c in consents)

        # Audit events are RETAINED (D4 proof) but PII-free — including the new
        # dsr_erasure event, which must carry no request IP.
        events = (
            (
                await s.execute(
                    select(AuditEvent).where(AuditEvent.ownership_scope_id == TEST_SCOPE_ID)
                )
            )
            .scalars()
            .all()
        )
        assert any(e.event_type == "dsr_erasure" for e in events)
        assert all(e.ip_address is None for e in events)
