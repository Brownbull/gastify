"""Tests for persist_scan — Transaction + LineItem creation from scan pipeline."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.categorization import CategorizationOutput, CategorizationUsage
from app.agents.extraction import ExtractionResult, ExtractionUsage
from app.schemas.scan import (
    CategorizationResult,
    CategoryAssignment,
    GeminiExtractionResult,
    LineItemExtraction,
    MathReconciliationVerdict,
)
from app.services.persist_scan import (
    _build_category_map,
    _estimate_total_cost,
    _get_usd_shadow,
    _parse_date,
    persist_scan_result,
)


def _extraction(
    total: str = "15990",
    currency: str = "CLP",
    items: list[tuple[str, str]] | None = None,
) -> ExtractionResult:
    if items is None:
        items = [("Leche", "2990"), ("Pan", "13000")]
    ext = GeminiExtractionResult(
        merchant_name="Jumbo",
        transaction_date="2026-05-12",
        currency_code=currency,
        total_amount=Decimal(total),
        line_items=[LineItemExtraction(name=n, total_price=Decimal(p)) for n, p in items],
        confidence_score=0.92,
    )
    usage = ExtractionUsage(input_tokens=1500, output_tokens=250, latency_ms=820.5)
    return ExtractionResult(extraction=ext, usage=usage)


def _categorization(
    assignments: list[tuple[int, str, float]] | None = None,
) -> CategorizationOutput:
    if assignments is None:
        assignments = [(0, "Supermercado", 0.95), (1, "Panaderia", 0.88)]
    result = CategorizationResult(
        assignments=[
            CategoryAssignment(line_item_index=idx, category_key=key, confidence=conf)
            for idx, key, conf in assignments
        ]
    )
    usage = CategorizationUsage(input_tokens=400, output_tokens=80, latency_ms=350.0)
    return CategorizationOutput(result=result, usage=usage)


def _verdict(passed: bool = True, discrepancy: int = 0) -> MathReconciliationVerdict:
    return MathReconciliationVerdict(
        passed=passed,
        discrepancy_minor_units=discrepancy,
        adjusted_total=None if passed else 15990,
    )


def _mock_scan(
    scope_id: uuid.UUID | None = None,
    image_path: str = "/tmp/receipt.jpg",
    thumb_path: str | None = "/tmp/receipt_thumb.jpg",
) -> MagicMock:
    scan = MagicMock()
    scan.id = uuid.uuid4()
    scan.ownership_scope_id = scope_id or uuid.UUID("00000000-0000-0000-0000-000000000001")
    scan.image_path = image_path
    scan.thumbnail_path = thumb_path
    return scan


class TestParseDate:
    def test_valid_iso_date(self):
        assert _parse_date("2026-05-12") == date(2026, 5, 12)

    def test_invalid_date_returns_today(self):
        result = _parse_date("not-a-date")
        assert result == date.today()

    def test_none_date_returns_today(self):
        result = _parse_date(None)
        assert result == date.today()

    def test_empty_string_returns_today(self):
        result = _parse_date("")
        assert result == date.today()


class TestEstimateTotalCost:
    def test_typical_scan(self):
        ext = _extraction()
        cat = _categorization()
        cost = _estimate_total_cost(ext, cat)
        assert isinstance(cost, Decimal)
        assert cost > 0

    def test_zero_tokens(self):
        ext = ExtractionResult(
            extraction=_extraction().extraction,
            usage=ExtractionUsage(input_tokens=0, output_tokens=0, latency_ms=0),
        )
        cat = CategorizationOutput(
            result=_categorization().result,
            usage=CategorizationUsage(input_tokens=0, output_tokens=0, latency_ms=0),
        )
        assert _estimate_total_cost(ext, cat) == Decimal("0")

    def test_known_pricing(self):
        ext = ExtractionResult(
            extraction=_extraction().extraction,
            usage=ExtractionUsage(input_tokens=1_000_000, output_tokens=0, latency_ms=0),
        )
        cat = CategorizationOutput(
            result=_categorization().result,
            usage=CategorizationUsage(input_tokens=0, output_tokens=0, latency_ms=0),
        )
        cost = _estimate_total_cost(ext, cat)
        assert cost == Decimal("0.15")


class TestGetUsdShadow:
    @pytest.mark.asyncio
    async def test_usd_returns_identity(self):
        db = AsyncMock()
        amount, rate, captured = await _get_usd_shadow(db, "USD", 4850, 2, date.today())
        assert amount == 4850
        assert rate == Decimal("1")
        assert captured is None

    @pytest.mark.asyncio
    async def test_fx_failure_returns_nones(self):
        from app.services.fx import FxServiceError

        db = AsyncMock()
        with patch(
            "app.services.persist_scan.get_fx_rate",
            new_callable=AsyncMock,
            side_effect=FxServiceError("No rate"),
        ):
            amount, rate, captured = await _get_usd_shadow(db, "CLP", 15990, 0, date.today())
        assert amount is None
        assert rate is None
        assert captured is None

    @pytest.mark.asyncio
    async def test_fx_success_returns_shadow(self):
        fx_mock = MagicMock()
        fx_mock.rate = Decimal("0.001")
        fx_mock.captured_at = datetime(2026, 5, 12)

        db = AsyncMock()
        with (
            patch(
                "app.services.persist_scan.get_fx_rate",
                new_callable=AsyncMock,
                return_value=fx_mock,
            ),
            patch(
                "app.services.persist_scan.compute_usd_shadow",
                return_value=16,
            ),
        ):
            amount, rate, captured = await _get_usd_shadow(db, "CLP", 15990, 0, date.today())
        assert amount == 16
        assert rate == Decimal("0.001")
        assert captured == datetime(2026, 5, 12)


class TestBuildCategoryMap:
    @pytest.mark.asyncio
    async def test_all_keys_found(self):
        cat_id_1 = uuid.uuid4()
        cat_id_2 = uuid.uuid4()

        mock_rows = MagicMock()
        row1 = MagicMock(key="Supermercado", id=cat_id_1)
        row2 = MagicMock(key="Panaderia", id=cat_id_2)
        mock_rows.scalars.return_value = [row1, row2]

        db = AsyncMock()
        db.execute = AsyncMock(return_value=mock_rows)

        result = await _build_category_map(db, _categorization())
        assert result[0] == cat_id_1
        assert result[1] == cat_id_2

    @pytest.mark.asyncio
    async def test_unknown_key_returns_none_and_warns(self):
        mock_rows = MagicMock()
        mock_rows.scalars.return_value = []

        db = AsyncMock()
        db.execute = AsyncMock(return_value=mock_rows)

        cat = _categorization([(0, "NonexistentCategory", 0.9)])
        result = await _build_category_map(db, cat)
        assert result[0] is None

    @pytest.mark.asyncio
    async def test_empty_assignments(self):
        db = AsyncMock()
        cat = _categorization([])
        result = await _build_category_map(db, cat)
        assert result == {}


class TestPersistScanResult:
    @pytest.mark.asyncio
    async def test_creates_transaction_and_items(self):
        db = AsyncMock()

        currency_row = MagicMock()
        currency_obj = MagicMock(exponent=0)
        currency_row.scalar_one_or_none.return_value = currency_obj

        cat_rows = MagicMock()
        cat_id = uuid.uuid4()
        cat_rows.scalars.return_value = [
            MagicMock(key="Supermercado", id=cat_id),
            MagicMock(key="Panaderia", id=uuid.uuid4()),
        ]

        db.execute = AsyncMock(side_effect=[currency_row, cat_rows])
        db.add = MagicMock()
        db.flush = AsyncMock()

        with (
            patch(
                "app.services.persist_scan.get_fx_rate",
                new_callable=AsyncMock,
                side_effect=__import__(
                    "app.services.fx", fromlist=["FxServiceError"]
                ).FxServiceError("skip"),
            ),
        ):
            tx = await persist_scan_result(
                db=db,
                scan=_mock_scan(),
                extraction=_extraction(),
                categorization=_categorization(),
                verdict=_verdict(),
            )

        assert tx is not None
        assert db.add.call_count == 5  # 1 tx + 2 items + 2 images (full + thumbnail)

    @pytest.mark.asyncio
    async def test_adjusted_total_used_when_verdict_fails(self):
        db = AsyncMock()

        currency_row = MagicMock()
        currency_row.scalar_one_or_none.return_value = MagicMock(exponent=0)

        cat_rows = MagicMock()
        cat_rows.scalars.return_value = []

        db.execute = AsyncMock(side_effect=[currency_row, cat_rows])
        db.add = MagicMock()
        db.flush = AsyncMock()

        verdict = MathReconciliationVerdict(
            passed=False, discrepancy_minor_units=100, adjusted_total=15990
        )

        with patch(
            "app.services.persist_scan.get_fx_rate",
            new_callable=AsyncMock,
            side_effect=__import__("app.services.fx", fromlist=["FxServiceError"]).FxServiceError(
                "skip"
            ),
        ):
            tx = await persist_scan_result(
                db=db,
                scan=_mock_scan(),
                extraction=_extraction(total="16090"),
                categorization=_categorization(),
                verdict=verdict,
            )

        assert tx.total_minor == 15990

    @pytest.mark.asyncio
    async def test_no_images_when_paths_none(self):
        db = AsyncMock()

        currency_row = MagicMock()
        currency_row.scalar_one_or_none.return_value = MagicMock(exponent=0)

        cat_rows = MagicMock()
        cat_rows.scalars.return_value = []

        db.execute = AsyncMock(side_effect=[currency_row, cat_rows])
        db.add = MagicMock()
        db.flush = AsyncMock()

        with patch(
            "app.services.persist_scan.get_fx_rate",
            new_callable=AsyncMock,
            side_effect=__import__("app.services.fx", fromlist=["FxServiceError"]).FxServiceError(
                "skip"
            ),
        ):
            await persist_scan_result(
                db=db,
                scan=_mock_scan(image_path=None, thumb_path=None),
                extraction=_extraction(),
                categorization=_categorization(),
                verdict=_verdict(),
            )

        add_types = [type(c[0][0]).__name__ for c in db.add.call_args_list]
        assert "TransactionImage" not in add_types
