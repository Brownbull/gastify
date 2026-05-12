"""P2 exit-signal E2E test — proves REQ-01, REQ-02, REQ-03, REQ-12 integrate.

Assertion chain (per PLAN.md Phase 5 / ROADMAP §Phase-2):
  10 test receipts (8 benign, 2 adversarial) → two-stage pipeline
  → 7 benign receipts → COMPLETED with Transaction + LineItems persisted
  → 1 math-inconsistent receipt → NEEDS_REVIEW (math gate fires)
  → 2 adversarial receipts → processed safely (no crash, correct status)
  → USD shadow computed for CLP receipts via FX service
  → V4 taxonomy category_id FK linked on TransactionItems
"""

import uuid
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
import sqlalchemy as sa
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.agents.categorization import CategorizationOutput, CategorizationUsage
from app.agents.extraction import ExtractionResult, ExtractionUsage
from app.models.reference import ItemCategory
from app.models.scan import Scan, ScanStatus
from app.models.transaction import Transaction, TransactionItem
from app.schemas.scan import (
    CategorizationResult,
    CategoryAssignment,
    GeminiExtractionResult,
)
from app.services.scan_worker import process_scan
from tests.fixtures.receipts import (
    ALL_RECEIPTS,
    BENIGN_RECEIPTS,
    R06_MATH_INCONSISTENT,
)

_W = "app.services.scan_worker"

CATEGORY_KEYS = [
    "Supermercado",
    "CafeteriaSnack",
    "Farmacia",
    "Restaurante",
    "Combustible",
    "Miscelaneo",
    "CuidadoPersonal",
    "Panaderia",
]


def _make_extraction_result(receipt: GeminiExtractionResult) -> ExtractionResult:
    return ExtractionResult(
        extraction=receipt,
        usage=ExtractionUsage(input_tokens=1500, output_tokens=250, latency_ms=800.0),
    )


def _make_categorization(receipt: GeminiExtractionResult) -> CategorizationOutput:
    assignments = [
        CategoryAssignment(
            line_item_index=i,
            category_key="Supermercado",
            confidence=0.90,
        )
        for i in range(len(receipt.line_items))
    ]
    return CategorizationOutput(
        result=CategorizationResult(assignments=assignments),
        usage=CategorizationUsage(input_tokens=400, output_tokens=80, latency_ms=350.0),
    )


@pytest.fixture
async def scan_db(engine):
    """Session factory bound to the test engine, plus seed V4 categories."""
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as db:
        for key in CATEGORY_KEYS:
            cat = ItemCategory(key=key, level=2, display_labels={"es": key})
            db.add(cat)
        await db.commit()

    return factory


async def _create_scan(factory, *, scan_id: uuid.UUID) -> Scan:
    async with factory() as db:
        scan = Scan(
            id=scan_id,
            ownership_scope_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            status=ScanStatus.SUBMITTED,
            image_path="/tmp/test/receipt.jpg",
            thumbnail_path="/tmp/test/receipt_thumb.jpg",
            original_filename="receipt.jpg",
            content_type="image/jpeg",
            file_size_bytes=50000,
            submitted_at=datetime(2026, 5, 12, tzinfo=UTC),
        )
        db.add(scan)
        await db.commit()
        return scan


async def _run_receipt_through_pipeline(
    factory,
    receipt: GeminiExtractionResult,
) -> tuple[uuid.UUID, bool]:
    """Create a scan, mock AI agents with fixture data, run process_scan."""
    scan_id = uuid.uuid4()
    await _create_scan(factory, scan_id=scan_id)

    ext = _make_extraction_result(receipt)
    cat = _make_categorization(receipt)

    with (
        patch(f"{_W}.async_session", factory),
        patch(f"{_W}.extract_receipt", new_callable=AsyncMock, return_value=ext),
        patch(f"{_W}.categorize_items", new_callable=AsyncMock, return_value=cat),
        patch.object(Path, "exists", return_value=True),
        patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
        patch(f"{_W}.settings", gemini_max_retries=3, gemini_retry_delay_seconds=0.001),
    ):
        result = await process_scan(scan_id)

    return scan_id, result


class TestP2ExitSignalBenign:
    """7 benign math-consistent receipts → COMPLETED with persisted data."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "receipt_name,receipt",
        [
            (name, r)
            for name, r in BENIGN_RECEIPTS
            if name != "R06_MATH_INCONSISTENT"
        ],
        ids=[name for name, _ in BENIGN_RECEIPTS if name != "R06_MATH_INCONSISTENT"],
    )
    async def test_benign_receipt_completes(self, scan_db, receipt_name, receipt):
        scan_id, result = await _run_receipt_through_pipeline(scan_db, receipt)

        assert result is True, f"{receipt_name} should succeed"

        async with scan_db() as db:
            row = await db.execute(select(Scan).where(Scan.id == scan_id))
            scan = row.scalar_one()
            assert scan.status == ScanStatus.COMPLETED, (
                f"{receipt_name}: expected COMPLETED, got {scan.status}"
            )

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "receipt_name,receipt",
        [
            (name, r)
            for name, r in BENIGN_RECEIPTS
            if name != "R06_MATH_INCONSISTENT"
        ],
        ids=[
            f"{name}_tx"
            for name, _ in BENIGN_RECEIPTS
            if name != "R06_MATH_INCONSISTENT"
        ],
    )
    async def test_transaction_persisted(self, scan_db, receipt_name, receipt):
        scan_id, _ = await _run_receipt_through_pipeline(scan_db, receipt)

        async with scan_db() as db:
            row = await db.execute(select(Transaction))
            tx = row.scalar_one()

            assert tx.merchant == receipt.merchant_name
            assert tx.currency == receipt.currency_code
            assert tx.receipt_type == "scan"
            assert tx.llm_tokens_in > 0
            assert tx.llm_tokens_out > 0

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "receipt_name,receipt",
        [
            (name, r)
            for name, r in BENIGN_RECEIPTS
            if name != "R06_MATH_INCONSISTENT"
        ],
        ids=[
            f"{name}_items"
            for name, _ in BENIGN_RECEIPTS
            if name != "R06_MATH_INCONSISTENT"
        ],
    )
    async def test_line_items_persisted(self, scan_db, receipt_name, receipt):
        scan_id, _ = await _run_receipt_through_pipeline(scan_db, receipt)

        async with scan_db() as db:
            row = await db.execute(
                select(TransactionItem).order_by(TransactionItem.sort_order)
            )
            items = row.scalars().all()

            assert len(items) == len(receipt.line_items), (
                f"{receipt_name}: expected {len(receipt.line_items)} items, got {len(items)}"
            )

            for i, (db_item, fixture_item) in enumerate(
                zip(items, receipt.line_items, strict=True)
            ):
                assert db_item.name == fixture_item.name
                assert db_item.sort_order == i


class TestP2ExitSignalMathGate:
    """REQ-12: Math-inconsistent receipt → NEEDS_REVIEW."""

    @pytest.mark.asyncio
    async def test_math_inconsistent_routes_to_needs_review(self, scan_db):
        scan_id, result = await _run_receipt_through_pipeline(
            scan_db, R06_MATH_INCONSISTENT
        )

        assert result is True

        async with scan_db() as db:
            row = await db.execute(select(Scan).where(Scan.id == scan_id))
            scan = row.scalar_one()
            assert scan.status == ScanStatus.NEEDS_REVIEW
            assert scan.error_code == "RECONCILIATION_MISMATCH"

    @pytest.mark.asyncio
    async def test_math_inconsistent_still_persists_transaction(self, scan_db):
        scan_id, _ = await _run_receipt_through_pipeline(
            scan_db, R06_MATH_INCONSISTENT
        )

        async with scan_db() as db:
            row = await db.execute(select(Transaction))
            tx = row.scalar_one()
            assert tx.merchant == "Almacén Don Hugo"
            assert tx.currency == "CLP"


class TestP2ExitSignalUsdShadow:
    """CLP receipts get USD shadow via FX service (mocked at 0.00105)."""

    @pytest.mark.asyncio
    async def test_clp_receipt_has_usd_shadow(self, scan_db):
        r01 = BENIGN_RECEIPTS[0][1]
        scan_id, _ = await _run_receipt_through_pipeline(scan_db, r01)

        async with scan_db() as db:
            row = await db.execute(select(Transaction))
            tx = row.scalar_one()

            assert tx.currency == "CLP"
            assert tx.amount_usd_minor is not None
            assert tx.amount_usd_minor > 0
            assert tx.fx_rate_to_usd is not None

    @pytest.mark.asyncio
    async def test_usd_receipt_shadow_is_identity(self, scan_db):
        r02 = BENIGN_RECEIPTS[1][1]
        scan_id, _ = await _run_receipt_through_pipeline(scan_db, r02)

        async with scan_db() as db:
            row = await db.execute(select(Transaction))
            tx = row.scalar_one()

            assert tx.currency == "USD"
            assert tx.amount_usd_minor == tx.total_minor


class TestP2ExitSignalV4Taxonomy:
    """REQ-03: TransactionItems link to V4 taxonomy via category_id FK."""

    @pytest.mark.asyncio
    async def test_items_have_category_ids(self, scan_db):
        r01 = BENIGN_RECEIPTS[0][1]
        scan_id, _ = await _run_receipt_through_pipeline(scan_db, r01)

        async with scan_db() as db:
            row = await db.execute(select(TransactionItem))
            items = row.scalars().all()

            for item in items:
                assert item.item_category_id is not None, (
                    f"Item '{item.name}' missing category_id"
                )
                assert item.category_source == "ai"


class TestP2ExitSignalAllReceipts:
    """Full exit signal: all 10 receipts processed without crash."""

    @pytest.mark.asyncio
    async def test_all_10_receipts_process_successfully(self, scan_db):
        results = {}
        for name, receipt in ALL_RECEIPTS:
            scan_id, ok = await _run_receipt_through_pipeline(scan_db, receipt)
            results[name] = (scan_id, ok)

        for name, (_scan_id, ok) in results.items():
            assert ok is True, f"{name} pipeline returned False"

        async with scan_db() as db:
            row = await db.execute(
                sa.select(sa.func.count()).select_from(Transaction)
            )
            tx_count = row.scalar_one()
            assert tx_count == 10

    @pytest.mark.asyncio
    async def test_final_status_distribution(self, scan_db):
        statuses = {}
        for name, receipt in ALL_RECEIPTS:
            scan_id, _ = await _run_receipt_through_pipeline(scan_db, receipt)
            async with scan_db() as db:
                row = await db.execute(select(Scan).where(Scan.id == scan_id))
                scan = row.scalar_one()
                statuses[name] = scan.status

        completed = [n for n, s in statuses.items() if s == ScanStatus.COMPLETED]
        needs_review = [n for n, s in statuses.items() if s == ScanStatus.NEEDS_REVIEW]

        assert len(completed) == 9, f"Expected 9 COMPLETED, got {len(completed)}: {completed}"
        assert len(needs_review) == 1, f"Expected 1 NEEDS_REVIEW, got {needs_review}"
        assert "R06_MATH_INCONSISTENT" in needs_review
