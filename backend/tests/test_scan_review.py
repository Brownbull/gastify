"""Tests for runtime scan-review signal computation."""

from decimal import Decimal

from app.schemas.scan import (
    GeminiExtractionResult,
    LineItemExtraction,
    MathReconciliationVerdict,
    RawGeminiExtractionResult,
    RawLineItemExtraction,
    ReceiptAdjustmentEvidence,
)
from app.services.scan_review import build_scan_review_signals, scan_review_level


def _processed(
    *,
    total: str = "5000",
    items: list[tuple[str, str]] | None = None,
    discount: str | None = None,
) -> GeminiExtractionResult:
    return GeminiExtractionResult(
        merchant_name="Test Store",
        transaction_date="2026-05-20",
        currency_code="CLP",
        total_amount=Decimal(total),
        discount_amount=Decimal(discount) if discount is not None else None,
        line_items=[
            LineItemExtraction(name=name, total_price=Decimal(price))
            for name, price in (items or [("Item A", "5000")])
        ],
        confidence_score=0.9,
    )


def _raw(
    *,
    total: str | None = "5000",
    items: list[tuple[str, str]] | None = None,
    discount: str | None = None,
    adjustments: list[tuple[str, str]] | None = None,
    source_lines: list[str] | None = None,
) -> RawGeminiExtractionResult:
    return RawGeminiExtractionResult(
        merchant_name="Test Store",
        transaction_date="2026-05-20",
        currency_code="CLP",
        total_amount=Decimal(total) if total is not None else None,
        discount_amount=Decimal(discount) if discount is not None else None,
        line_items=[
            RawLineItemExtraction(name=name, total_price=Decimal(price))
            for name, price in (items if items is not None else [("Item A", "5000")])
        ],
        adjustment_lines=[
            ReceiptAdjustmentEvidence(label=label, amount=Decimal(amount))
            for label, amount in (adjustments or [])
        ],
        source_lines=source_lines or [],
        confidence_score=0.9,
    )


def _verdict(
    *,
    passed: bool = True,
    discrepancy: int = 0,
    reconstructed_total: int | None = 5000,
) -> MathReconciliationVerdict:
    return MathReconciliationVerdict(
        passed=passed,
        discrepancy_minor_units=discrepancy,
        reconstructed_total=reconstructed_total,
        discrepancy_ratio=0.0 if passed else 0.25,
        severity="none" if passed else "major_warning",
    )


def test_clean_scan_has_no_review_signals() -> None:
    signals = build_scan_review_signals(
        raw_extraction=_raw(),
        extraction=_processed(),
        verdict=_verdict(),
    )

    assert signals == []
    assert scan_review_level(signals) == "none"


def test_math_discrepancy_needs_review() -> None:
    signals = build_scan_review_signals(
        raw_extraction=None,
        extraction=_processed(),
        verdict=_verdict(passed=False, discrepancy=1500, reconstructed_total=3500),
    )

    assert [signal.code for signal in signals] == ["math_reconciliation_delta"]
    assert signals[0].severity == "needs_review"
    assert scan_review_level(signals) == "needs_review"


def test_item_count_change_creates_item_structure_signal() -> None:
    signals = build_scan_review_signals(
        raw_extraction=_raw(items=[("Item A", "3000")]),
        extraction=_processed(items=[("Item A", "3000"), ("Item B", "2000")]),
        verdict=_verdict(),
    )

    signal = next(signal for signal in signals if signal.code == "item_structure_changed")
    assert signal.details == {"raw_item_count": 1, "processed_item_count": 2}
    assert scan_review_level(signals) == "warning"


def test_discount_evidence_unresolved_creates_warning_signal() -> None:
    signals = build_scan_review_signals(
        raw_extraction=_raw(adjustments=[("Total Descuentos", "4190")]),
        extraction=_processed(discount=None),
        verdict=_verdict(),
    )

    signal = next(signal for signal in signals if signal.code == "discount_evidence_unresolved")
    assert signal.details["raw_discount_candidates_minor"] == [4190]
    assert signal.details["processed_discount_minor"] == 0
    assert scan_review_level(signals) == "warning"


def test_visible_total_conflict_creates_warning_signal() -> None:
    signals = build_scan_review_signals(
        raw_extraction=_raw(total="900", source_lines=["TOTAL $ 860"]),
        extraction=_processed(total="900", items=[("Item A", "900")]),
        verdict=_verdict(reconstructed_total=900),
    )

    signal = next(signal for signal in signals if signal.code == "visible_total_conflict")
    assert signal.details["raw_total_minor"] == 900
    assert signal.details["processed_total_minor"] == 900
    assert scan_review_level(signals) == "warning"


def test_synthesized_service_item_creates_warning_signal() -> None:
    signals = build_scan_review_signals(
        raw_extraction=_raw(items=[]),
        extraction=_processed(items=[("Service item", "5000")]),
        verdict=_verdict(),
    )

    assert {signal.code for signal in signals} == {
        "item_structure_changed",
        "synthesized_service_item",
    }
    synthesized = next(signal for signal in signals if signal.code == "synthesized_service_item")
    assert synthesized.details["item_name"] == "Service item"
    assert scan_review_level(signals) == "warning"
