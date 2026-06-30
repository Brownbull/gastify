"""Tests for persist_scan — Transaction + LineItem creation from scan pipeline."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.categorization import CategorizationOutput, CategorizationUsage
from app.agents.extraction import ExtractionResult, ExtractionUsage
from app.agents.store_categorization import StoreCategorizationOutput, StoreCategorizationUsage
from app.schemas.recurrence import RecurrenceHint
from app.schemas.scan import (
    CategorizationResult,
    CategoryAssignment,
    GeminiExtractionResult,
    LineItemExtraction,
    MathReconciliationVerdict,
    ScanReviewSignal,
    StoreCategorizationResult,
)
from app.services.mappings import ItemMemory, MerchantMemory
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
    discount: str | None = None,
) -> ExtractionResult:
    if items is None:
        items = [("Leche", "2990"), ("Pan", "13000")]
    ext = GeminiExtractionResult(
        merchant_name="Jumbo",
        transaction_date="2026-05-12",
        currency_code=currency,
        total_amount=Decimal(total),
        discount_amount=Decimal(discount) if discount else None,
        line_items=[LineItemExtraction(name=n, total_price=Decimal(p)) for n, p in items],
        confidence_score=0.92,
    )
    usage = ExtractionUsage(input_tokens=1500, output_tokens=250, latency_ms=820.5)
    return ExtractionResult(extraction=ext, usage=usage)


def _categorization(
    assignments: list[tuple[int, str, float]] | None = None,
) -> CategorizationOutput:
    if assignments is None:
        assignments = [(0, "DairyEggs", 0.95), (1, "BreadPastry", 0.88)]
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
        reconstructed_total=None if passed else 15990,
        discrepancy_ratio=0 if passed else 0.1,
        severity="none" if passed else "minor",
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
        assert cost == Decimal("0.100000")

    def test_gemini_3_5_pricing(self):
        ext = ExtractionResult(
            extraction=_extraction().extraction,
            usage=ExtractionUsage(input_tokens=1_000_000, output_tokens=0, latency_ms=0),
            model_name="google-gla:gemini-3.5-flash",
        )
        cat = CategorizationOutput(
            result=_categorization().result,
            usage=CategorizationUsage(input_tokens=0, output_tokens=1_000_000, latency_ms=0),
        )
        cost = _estimate_total_cost(ext, cat)
        assert cost == Decimal("10.500000")


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
        row1 = MagicMock(key="DairyEggs", id=cat_id_1)
        row2 = MagicMock(key="BreadPastry", id=cat_id_2)
        mock_rows.scalars.return_value = [row1, row2]

        db = AsyncMock()
        db.execute = AsyncMock(return_value=mock_rows)

        result = await _build_category_map(db, _categorization())
        assert result[0] == (cat_id_1, "DairyEggs")
        assert result[1] == (cat_id_2, "BreadPastry")

    @pytest.mark.asyncio
    async def test_unknown_key_returns_none_and_warns(self):
        mock_rows = MagicMock()
        mock_rows.scalars.return_value = []

        db = AsyncMock()
        db.execute = AsyncMock(return_value=mock_rows)

        cat = _categorization([(0, "OtherItem", 0.9)])
        result = await _build_category_map(db, cat)
        assert result[0] == (None, None)

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
            MagicMock(key="DairyEggs", id=cat_id),
            MagicMock(key="BreadPastry", id=uuid.uuid4()),
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
            patch(
                "app.services.persist_scan.lookup_merchant_mapping",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch(
                "app.services.persist_scan.batch_lookup_item_mappings",
                new_callable=AsyncMock,
                return_value={},
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
        assert "receipt-extraction-current@2026-06-29.0" in tx.prompt_version
        assert "item-categorization-current@2026-05-18.1" in tx.prompt_version
        assert "store-categorization-current@2026-05-19.1" in tx.prompt_version
        assert tx.scan_review_level == "none"
        assert tx.scan_review_signals == []
        assert db.add.call_count == 5  # 1 tx + 2 items + 2 images (full + thumbnail)

    @pytest.mark.asyncio
    async def test_persists_receipt_recurrence_hint(self):
        db = AsyncMock()

        currency_row = MagicMock()
        currency_row.scalar_one_or_none.return_value = MagicMock(exponent=0)

        cat_rows = MagicMock()
        cat_rows.scalars.return_value = []

        db.execute = AsyncMock(side_effect=[currency_row, cat_rows])
        db.add = MagicMock()
        db.flush = AsyncMock()

        extraction = _extraction()
        extraction.extraction.recurrence_hint = RecurrenceHint(
            kind="fixed_term",
            interval="monthly",
            term_current=3,
            term_total=12,
            label="03/12 cuotas",
            confidence=0.88,
        )

        with (
            patch(
                "app.services.persist_scan.get_fx_rate",
                new_callable=AsyncMock,
                side_effect=__import__(
                    "app.services.fx", fromlist=["FxServiceError"]
                ).FxServiceError("skip"),
            ),
            patch(
                "app.services.persist_scan.lookup_merchant_mapping",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch(
                "app.services.persist_scan.batch_lookup_item_mappings",
                new_callable=AsyncMock,
                return_value={},
            ),
        ):
            tx = await persist_scan_result(
                db=db,
                scan=_mock_scan(image_path=None, thumb_path=None),
                extraction=extraction,
                categorization=_categorization([]),
                verdict=_verdict(),
            )

        assert tx.recurrence_kind == "fixed_term"
        assert tx.recurrence_interval == "monthly"
        assert tx.term_current == 3
        assert tx.term_total == 12
        assert tx.recurrence_label == "03/12 cuotas"
        assert tx.recurrence_source == "receipt"
        assert tx.recurrence_confidence == Decimal("0.88")

    @pytest.mark.asyncio
    async def test_persists_review_signals_and_preserves_item_sort_order(self):
        db = AsyncMock()

        currency_row = MagicMock()
        currency_row.scalar_one_or_none.return_value = MagicMock(exponent=0)

        cat_rows = MagicMock()
        cat_rows.scalars.return_value = []

        db.execute = AsyncMock(side_effect=[currency_row, cat_rows])
        db.add = MagicMock()
        db.flush = AsyncMock()

        signal = ScanReviewSignal(
            code="item_structure_changed",
            severity="warning",
            source_stage="postprocess",
            message="Post-processing changed the receipt item structure.",
            details={"raw_item_count": 1, "processed_item_count": 2},
        )

        with (
            patch(
                "app.services.persist_scan.get_fx_rate",
                new_callable=AsyncMock,
                side_effect=__import__(
                    "app.services.fx", fromlist=["FxServiceError"]
                ).FxServiceError("skip"),
            ),
            patch(
                "app.services.persist_scan.lookup_merchant_mapping",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch(
                "app.services.persist_scan.batch_lookup_item_mappings",
                new_callable=AsyncMock,
                return_value={},
            ),
        ):
            tx = await persist_scan_result(
                db=db,
                scan=_mock_scan(image_path=None, thumb_path=None),
                extraction=_extraction(),
                categorization=_categorization(),
                verdict=_verdict(),
                review_level="warning",
                review_signals=[signal],
            )

        added_items = [
            call.args[0]
            for call in db.add.call_args_list
            if call.args[0].__class__.__name__ == "TransactionItem"
        ]
        assert tx.scan_review_level == "warning"
        assert tx.scan_review_signals == [
            {
                "code": "item_structure_changed",
                "severity": "warning",
                "source_stage": "postprocess",
                "message": "Post-processing changed the receipt item structure.",
                "details": {"raw_item_count": 1, "processed_item_count": 2},
            }
        ]
        assert [item.sort_order for item in added_items] == [0, 1]

    @pytest.mark.asyncio
    async def test_persists_receipt_discount_and_null_scan_item_discount_fields(self):
        db = AsyncMock()

        currency_row = MagicMock()
        currency_row.scalar_one_or_none.return_value = MagicMock(exponent=0)

        cat_rows = MagicMock()
        cat_rows.scalars.return_value = []

        db.execute = AsyncMock(side_effect=[currency_row, cat_rows])
        db.add = MagicMock()
        db.flush = AsyncMock()

        extraction = _extraction(total="8400", items=[("Product", "9000")], discount="600")
        extraction.extraction.line_items[0].discount_amount = Decimal("600")
        extraction.extraction.line_items[0].discount_label = "RF Precio Antes Ahora"

        with (
            patch(
                "app.services.persist_scan.get_fx_rate",
                new_callable=AsyncMock,
                side_effect=__import__(
                    "app.services.fx", fromlist=["FxServiceError"]
                ).FxServiceError("skip"),
            ),
            patch(
                "app.services.persist_scan.lookup_merchant_mapping",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch(
                "app.services.persist_scan.batch_lookup_item_mappings",
                new_callable=AsyncMock,
                return_value={},
            ),
        ):
            tx = await persist_scan_result(
                db=db,
                scan=_mock_scan(image_path=None, thumb_path=None),
                extraction=extraction,
                categorization=_categorization([]),
                verdict=_verdict(),
            )

        added_items = [call.args[0] for call in db.add.call_args_list]
        persisted_item = next(
            item for item in added_items if item.__class__.__name__ == "TransactionItem"
        )
        assert tx.discount_total_minor == 600
        assert tx.gross_total_minor == 9000
        assert tx.reconstructed_total_minor == 8400
        assert persisted_item.discount_minor is None
        assert persisted_item.discount_label is None

    @pytest.mark.asyncio
    async def test_applies_merchant_mapping_to_transaction_and_store_category(self):
        db = AsyncMock()

        currency_row = MagicMock()
        currency_row.scalar_one_or_none.return_value = MagicMock(exponent=0)

        cat_rows = MagicMock()
        cat_rows.scalars.return_value = []

        db.execute = AsyncMock(side_effect=[currency_row, cat_rows])
        db.add = MagicMock()
        db.flush = AsyncMock()

        store_category_id = uuid.uuid4()
        mapping_id = uuid.uuid4()

        with (
            patch(
                "app.services.persist_scan.get_fx_rate",
                new_callable=AsyncMock,
                side_effect=__import__(
                    "app.services.fx", fromlist=["FxServiceError"]
                ).FxServiceError("skip"),
            ),
            patch(
                "app.services.persist_scan.lookup_merchant_mapping",
                new_callable=AsyncMock,
                return_value=MerchantMemory(
                    target_merchant="Jumbo Normalized",
                    store_category_id=store_category_id,
                    confidence=Decimal("1.00"),
                    mapping_id=mapping_id,
                ),
            ),
            patch(
                "app.services.persist_scan.batch_lookup_item_mappings",
                new_callable=AsyncMock,
                return_value={},
            ),
        ):
            tx = await persist_scan_result(
                db=db,
                scan=_mock_scan(image_path=None, thumb_path=None),
                extraction=_extraction(items=[]),
                categorization=_categorization([]),
                verdict=_verdict(),
            )

        assert tx.merchant == "Jumbo Normalized"
        assert tx.merchant_source == "mapping"
        assert tx.store_category_id == store_category_id
        assert tx.store_category_source == "mapping"
        assert tx.store_category_confidence == Decimal("1.00")
        assert tx.store_category_mapping_id == mapping_id

    @pytest.mark.asyncio
    async def test_applies_item_mapping_and_clears_ai_subcategory(self):
        db = AsyncMock()

        currency_row = MagicMock()
        currency_row.scalar_one_or_none.return_value = MagicMock(exponent=0)

        cat_rows = MagicMock()
        ai_cat_id = uuid.uuid4()
        cat_rows.scalars.return_value = [MagicMock(key="DairyEggs", id=ai_cat_id)]

        item_key_row = MagicMock()
        item_key_row.scalar_one_or_none.return_value = "Pantry"

        db.execute = AsyncMock(side_effect=[currency_row, cat_rows, item_key_row])
        db.add = MagicMock()
        db.flush = AsyncMock()

        mapped_category_id = uuid.uuid4()
        categorization = CategorizationOutput(
            result=CategorizationResult(
                assignments=[
                    CategoryAssignment(
                        line_item_index=0,
                        category_key="DairyEggs",
                        confidence=0.9,
                        subcategory="Milk",
                    )
                ]
            ),
            usage=CategorizationUsage(input_tokens=400, output_tokens=80, latency_ms=350.0),
        )

        with (
            patch(
                "app.services.persist_scan.get_fx_rate",
                new_callable=AsyncMock,
                side_effect=__import__(
                    "app.services.fx", fromlist=["FxServiceError"]
                ).FxServiceError("skip"),
            ),
            patch(
                "app.services.persist_scan.lookup_merchant_mapping",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch(
                "app.services.persist_scan.batch_lookup_item_mappings",
                new_callable=AsyncMock,
                return_value={
                    "Leche": ItemMemory(
                        target_item="Milk 1L",
                        target_category_id=mapped_category_id,
                        confidence=Decimal("1.00"),
                        mapping_id=uuid.uuid4(),
                    )
                },
            ),
        ):
            await persist_scan_result(
                db=db,
                scan=_mock_scan(image_path=None, thumb_path=None),
                extraction=_extraction(items=[("Leche", "2990")]),
                categorization=categorization,
                verdict=_verdict(),
            )

        added_items = [call.args[0] for call in db.add.call_args_list]
        persisted_item = next(
            item for item in added_items if item.__class__.__name__ == "TransactionItem"
        )
        assert persisted_item.name == "Milk 1L"
        assert persisted_item.item_category_id == mapped_category_id
        assert persisted_item.category_source == "mapping"
        assert persisted_item.subcategory is None

    @pytest.mark.asyncio
    async def test_runs_store_fallback_after_effective_item_categories(self):
        db = AsyncMock()

        currency_row = MagicMock()
        currency_row.scalar_one_or_none.return_value = MagicMock(exponent=0)

        cat_rows = MagicMock()
        cat_rows.scalars.return_value = [
            MagicMock(key="DairyEggs", id=uuid.uuid4()),
            MagicMock(key="BreadPastry", id=uuid.uuid4()),
        ]

        store_category_id = uuid.uuid4()
        store_row = MagicMock()
        store_row.scalar_one_or_none.return_value = MagicMock(id=store_category_id)

        db.execute = AsyncMock(side_effect=[currency_row, cat_rows, store_row])
        db.add = MagicMock()
        db.flush = AsyncMock()

        store_output = StoreCategorizationOutput(
            result=StoreCategorizationResult(
                category_key="Supermarket",
                confidence=0.92,
                rationale_short="Merchant and item mix indicate supermarket.",
            ),
            usage=StoreCategorizationUsage(input_tokens=120, output_tokens=20, latency_ms=90.0),
        )

        with (
            patch(
                "app.services.persist_scan.get_fx_rate",
                new_callable=AsyncMock,
                side_effect=__import__(
                    "app.services.fx", fromlist=["FxServiceError"]
                ).FxServiceError("skip"),
            ),
            patch(
                "app.services.persist_scan.lookup_merchant_mapping",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch(
                "app.services.persist_scan.batch_lookup_item_mappings",
                new_callable=AsyncMock,
                return_value={},
            ),
            patch(
                "app.services.persist_scan.categorize_store",
                new_callable=AsyncMock,
                return_value=store_output,
            ) as mock_store,
            patch("app.services.persist_scan.settings.scan_provider", "gemini"),
        ):
            tx = await persist_scan_result(
                db=db,
                scan=_mock_scan(image_path=None, thumb_path=None),
                extraction=_extraction(),
                categorization=_categorization(),
                verdict=_verdict(),
            )

        assert tx.store_category_id == store_category_id
        assert tx.store_category_source == "ai"
        assert tx.store_category_confidence == Decimal("0.92")
        assert tx.llm_tokens_in == 2020
        assert tx.llm_tokens_out == 350
        store_kwargs = mock_store.call_args.kwargs
        assert store_kwargs["item_category_keys"] == ["DairyEggs", "BreadPastry"]
        assert store_kwargs["item_names"] == ["Leche", "Pan"]

    @pytest.mark.asyncio
    async def test_receipt_total_is_preserved_when_verdict_fails(self):
        db = AsyncMock()

        currency_row = MagicMock()
        currency_row.scalar_one_or_none.return_value = MagicMock(exponent=0)

        cat_rows = MagicMock()
        cat_rows.scalars.return_value = []

        db.execute = AsyncMock(side_effect=[currency_row, cat_rows])
        db.add = MagicMock()
        db.flush = AsyncMock()

        verdict = MathReconciliationVerdict(
            passed=False,
            discrepancy_minor_units=100,
            reconstructed_total=15990,
            discrepancy_ratio=0.006215,
            severity="minor",
        )

        with (
            patch(
                "app.services.persist_scan.get_fx_rate",
                new_callable=AsyncMock,
                side_effect=__import__(
                    "app.services.fx", fromlist=["FxServiceError"]
                ).FxServiceError("skip"),
            ),
            patch(
                "app.services.persist_scan.lookup_merchant_mapping",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch(
                "app.services.persist_scan.batch_lookup_item_mappings",
                new_callable=AsyncMock,
                return_value={},
            ),
        ):
            tx = await persist_scan_result(
                db=db,
                scan=_mock_scan(),
                extraction=_extraction(total="16090"),
                categorization=_categorization(),
                verdict=verdict,
            )

        assert tx.total_minor == 16090
        assert tx.reconstructed_total_minor == 15990
        assert tx.gross_total_minor is None

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

        with (
            patch(
                "app.services.persist_scan.get_fx_rate",
                new_callable=AsyncMock,
                side_effect=__import__(
                    "app.services.fx", fromlist=["FxServiceError"]
                ).FxServiceError("skip"),
            ),
            patch(
                "app.services.persist_scan.lookup_merchant_mapping",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch(
                "app.services.persist_scan.batch_lookup_item_mappings",
                new_callable=AsyncMock,
                return_value={},
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

    @pytest.mark.asyncio
    async def test_merchant_mapping_overrides_ocr_merchant_and_sets_store_category(self):
        """Merchant mapping hit: effective merchant comes from mapping, not OCR."""
        db = AsyncMock()

        currency_row = MagicMock()
        currency_row.scalar_one_or_none.return_value = MagicMock(exponent=0)

        cat_rows = MagicMock()
        cat_id = uuid.uuid4()
        cat_rows.scalars.return_value = [MagicMock(key="DairyEggs", id=cat_id)]

        db.execute = AsyncMock(side_effect=[currency_row, cat_rows])
        db.add = MagicMock()
        db.flush = AsyncMock()

        store_category_id = uuid.uuid4()
        mapping_id = uuid.uuid4()
        merchant_memory = MerchantMemory(
            target_merchant="Supermercado Jumbo",
            store_category_id=store_category_id,
            confidence=Decimal("0.85"),
            mapping_id=mapping_id,
        )

        with (
            patch(
                "app.services.persist_scan.get_fx_rate",
                new_callable=AsyncMock,
                side_effect=__import__(
                    "app.services.fx", fromlist=["FxServiceError"]
                ).FxServiceError("skip"),
            ),
            patch(
                "app.services.persist_scan.lookup_merchant_mapping",
                new_callable=AsyncMock,
                return_value=merchant_memory,
            ),
            patch(
                "app.services.persist_scan.batch_lookup_item_mappings",
                new_callable=AsyncMock,
                return_value={},
            ),
        ):
            tx = await persist_scan_result(
                db=db,
                scan=_mock_scan(image_path=None, thumb_path=None),
                extraction=_extraction(items=[("Leche", "2990")]),
                categorization=_categorization([(0, "DairyEggs", 0.95)]),
                verdict=_verdict(),
            )

        assert tx.merchant == "Supermercado Jumbo"
        assert tx.merchant_source == "mapping"
        assert tx.store_category_id == store_category_id
        assert tx.store_category_source == "mapping"
        assert tx.store_category_confidence == Decimal("0.85")
        assert tx.store_category_mapping_id == mapping_id

    @pytest.mark.asyncio
    async def test_item_mapping_sets_category_source_and_target_id(self):
        """Item mapping hit: persisted item uses mapping category, not AI."""
        db = AsyncMock()

        currency_row = MagicMock()
        currency_row.scalar_one_or_none.return_value = MagicMock(exponent=0)

        cat_rows = MagicMock()
        ai_cat_id = uuid.uuid4()
        cat_rows.scalars.return_value = [MagicMock(key="DairyEggs", id=ai_cat_id)]

        mapped_category_id = uuid.uuid4()
        item_key_row = MagicMock()
        item_key_row.scalar_one_or_none.return_value = "Beverages"

        db.execute = AsyncMock(side_effect=[currency_row, cat_rows, item_key_row])
        db.add = MagicMock()
        db.flush = AsyncMock()

        item_mapping_id = uuid.uuid4()
        item_memory = ItemMemory(
            target_item=None,
            target_category_id=mapped_category_id,
            confidence=Decimal("0.90"),
            mapping_id=item_mapping_id,
        )

        with (
            patch(
                "app.services.persist_scan.get_fx_rate",
                new_callable=AsyncMock,
                side_effect=__import__(
                    "app.services.fx", fromlist=["FxServiceError"]
                ).FxServiceError("skip"),
            ),
            patch(
                "app.services.persist_scan.lookup_merchant_mapping",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch(
                "app.services.persist_scan.batch_lookup_item_mappings",
                new_callable=AsyncMock,
                return_value={"Coca Cola": item_memory},
            ),
        ):
            await persist_scan_result(
                db=db,
                scan=_mock_scan(image_path=None, thumb_path=None),
                extraction=_extraction(items=[("Coca Cola", "1500")]),
                categorization=_categorization([(0, "DairyEggs", 0.88)]),
                verdict=_verdict(),
            )

        added_items = [call.args[0] for call in db.add.call_args_list]
        persisted_item = next(
            item for item in added_items if item.__class__.__name__ == "TransactionItem"
        )
        assert persisted_item.category_source == "mapping"
        assert persisted_item.item_category_id == mapped_category_id

    @pytest.mark.asyncio
    async def test_store_categorization_exception_falls_back_to_unknown(self):
        """Store category AI fallback: exception in categorize_store does not crash."""
        db = AsyncMock()

        currency_row = MagicMock()
        currency_row.scalar_one_or_none.return_value = MagicMock(exponent=0)

        cat_rows = MagicMock()
        cat_rows.scalars.return_value = [
            MagicMock(key="DairyEggs", id=uuid.uuid4()),
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
            patch(
                "app.services.persist_scan.lookup_merchant_mapping",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch(
                "app.services.persist_scan.batch_lookup_item_mappings",
                new_callable=AsyncMock,
                return_value={},
            ),
            patch(
                "app.services.persist_scan.categorize_store",
                new_callable=AsyncMock,
                side_effect=RuntimeError("Gemini API timeout"),
            ),
            patch("app.services.persist_scan.settings.scan_provider", "gemini"),
        ):
            tx = await persist_scan_result(
                db=db,
                scan=_mock_scan(image_path=None, thumb_path=None),
                extraction=_extraction(items=[("Leche", "2990")]),
                categorization=_categorization([(0, "DairyEggs", 0.95)]),
                verdict=_verdict(),
            )

        assert tx is not None
        assert tx.store_category_source == "unknown"
        assert tx.store_category_id is None
        assert tx.merchant == "Jumbo"
        assert db.flush.called
