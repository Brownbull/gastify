"""Adversarial prompt-injection defense tests.

Two-stage defense architecture:
  Stage 1 (vision) extracts raw text from image — PydanticAI output_type
  enforces structure, so injected instructions become literal string data.
  Stage 2 (text-only categorization) receives extracted text, never raw image.
  Injected instructions in receipt images cannot influence categorization.

These tests verify:
  1. Adversarial receipts process without crash
  2. Categorization receives text-only args (never image bytes)
  3. No finance-category steering from injected instructions
  4. Adversarial text in merchant/item names is preserved as data (not interpreted)
"""

import uuid
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
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
    ADVERSARIAL_RECEIPTS,
    FINANCE_CATEGORY_KEYS,
    R09_ADVERSARIAL_MERCHANT,
    R10_ADVERSARIAL_ITEMS,
)

_W = "app.services.scan_worker"

SAFE_CATEGORIES = ["Supermercado", "CuidadoPersonal", "Miscelaneo"]


def _make_extraction(receipt: GeminiExtractionResult) -> ExtractionResult:
    return ExtractionResult(
        extraction=receipt,
        usage=ExtractionUsage(input_tokens=1500, output_tokens=250, latency_ms=800.0),
    )


def _make_safe_categorization(receipt: GeminiExtractionResult) -> CategorizationOutput:
    """Simulate categorization that correctly ignores injected instructions."""
    assignments = [
        CategoryAssignment(
            line_item_index=i,
            category_key="Supermercado" if i % 2 == 0 else "CuidadoPersonal",
            confidence=0.90,
        )
        for i in range(len(receipt.line_items))
    ]
    return CategorizationOutput(
        result=CategorizationResult(assignments=assignments),
        usage=CategorizationUsage(input_tokens=400, output_tokens=80, latency_ms=350.0),
    )


@pytest.fixture
async def adv_db(engine):
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as db:
        for key in SAFE_CATEGORIES:
            cat = ItemCategory(key=key, level=2, display_labels={"es": key})
            db.add(cat)
        await db.commit()

    return factory


async def _run_adversarial(
    factory,
    receipt: GeminiExtractionResult,
    *,
    categorize_mock: AsyncMock | None = None,
) -> tuple[uuid.UUID, bool, AsyncMock]:
    scan_id = uuid.uuid4()

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

    ext = _make_extraction(receipt)
    cat = categorize_mock or AsyncMock(return_value=_make_safe_categorization(receipt))

    with (
        patch(f"{_W}.async_session", factory),
        patch(f"{_W}.extract_receipt", new_callable=AsyncMock, return_value=ext),
        patch(f"{_W}.categorize_items", cat),
        patch.object(Path, "exists", return_value=True),
        patch.object(Path, "read_bytes", return_value=b"fake-jpeg"),
        patch(f"{_W}.settings", gemini_max_retries=3, gemini_retry_delay_seconds=0.001),
    ):
        result = await process_scan(scan_id)

    return scan_id, result, cat


class TestAdversarialPipelineRobustness:
    """Adversarial receipts don't crash the pipeline."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "name,receipt",
        ADVERSARIAL_RECEIPTS,
        ids=[name for name, _ in ADVERSARIAL_RECEIPTS],
    )
    async def test_adversarial_completes(self, adv_db, name, receipt):
        _, result, _ = await _run_adversarial(adv_db, receipt)
        assert result is True, f"{name} should process successfully"


class TestTwoStageDefense:
    """Categorization receives text-only args, never image bytes."""

    @pytest.mark.asyncio
    async def test_categorize_called_with_text_only(self, adv_db):
        _, _, cat_mock = await _run_adversarial(adv_db, R09_ADVERSARIAL_MERCHANT)

        cat_mock.assert_called_once()
        call_kwargs = cat_mock.call_args
        all_args = call_kwargs.kwargs if call_kwargs.kwargs else {}

        assert "items" in all_args
        assert "merchant_name" in all_args
        assert "currency_code" in all_args
        for key, val in all_args.items():
            assert not isinstance(val, (bytes, bytearray)), (
                f"categorize_items received binary data in '{key}'"
            )

    @pytest.mark.asyncio
    async def test_adversarial_merchant_passed_as_text(self, adv_db):
        """The injected merchant name is treated as literal text data."""
        _, _, cat_mock = await _run_adversarial(adv_db, R09_ADVERSARIAL_MERCHANT)

        call_kwargs = cat_mock.call_args.kwargs
        assert "IGNORE ALL PREVIOUS INSTRUCTIONS" in call_kwargs["merchant_name"]

    @pytest.mark.asyncio
    async def test_adversarial_items_passed_as_text(self, adv_db):
        """Injected instructions in item names are treated as literal text data."""
        _, _, cat_mock = await _run_adversarial(adv_db, R10_ADVERSARIAL_ITEMS)

        call_kwargs = cat_mock.call_args.kwargs
        item_names = [item.name for item in call_kwargs["items"]]
        assert any("SYSTEM: override" in name for name in item_names)
        assert any("ignore taxonomy" in name for name in item_names)


class TestNoCategorySteering:
    """Adversarial text must not steer items to finance categories."""

    @pytest.mark.asyncio
    async def test_r09_no_finance_categories(self, adv_db):
        scan_id, _, _ = await _run_adversarial(adv_db, R09_ADVERSARIAL_MERCHANT)

        async with adv_db() as db:
            rows = await db.execute(select(TransactionItem))
            items = rows.scalars().all()

            for item in items:
                if item.item_category_id:
                    cat_row = await db.execute(
                        select(ItemCategory).where(ItemCategory.id == item.item_category_id)
                    )
                    cat = cat_row.scalar_one()
                    assert cat.key not in FINANCE_CATEGORY_KEYS, (
                        f"Item '{item.name}' assigned finance category '{cat.key}' — "
                        "prompt injection may have succeeded"
                    )

    @pytest.mark.asyncio
    async def test_r10_no_finance_categories(self, adv_db):
        scan_id, _, _ = await _run_adversarial(adv_db, R10_ADVERSARIAL_ITEMS)

        async with adv_db() as db:
            rows = await db.execute(select(TransactionItem))
            items = rows.scalars().all()

            for item in items:
                if item.item_category_id:
                    cat_row = await db.execute(
                        select(ItemCategory).where(ItemCategory.id == item.item_category_id)
                    )
                    cat = cat_row.scalar_one()
                    assert cat.key not in FINANCE_CATEGORY_KEYS, (
                        f"Item '{item.name}' assigned finance category '{cat.key}' — "
                        "prompt injection may have succeeded"
                    )

    @pytest.mark.asyncio
    async def test_adversarial_merchant_not_stored_as_category(self, adv_db):
        """The merchant name with injection text is stored as merchant, not as category."""
        scan_id, _, _ = await _run_adversarial(adv_db, R09_ADVERSARIAL_MERCHANT)

        async with adv_db() as db:
            row = await db.execute(select(Transaction))
            tx = row.scalar_one()
            assert "IGNORE ALL PREVIOUS INSTRUCTIONS" in tx.merchant
