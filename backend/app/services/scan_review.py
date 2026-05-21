"""Runtime scan-review signal computation for the G4 scan pipeline."""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.schemas.scan import (
    GeminiExtractionResult,
    MathReconciliationVerdict,
    RawGeminiExtractionResult,
    ScanReviewLevel,
    ScanReviewSignal,
)
from app.services.coalesce import has_visible_total_conflict, to_minor_units

if TYPE_CHECKING:
    from collections.abc import Sequence
    from decimal import Decimal


def build_scan_review_signals(
    *,
    raw_extraction: RawGeminiExtractionResult | GeminiExtractionResult | None,
    extraction: GeminiExtractionResult,
    verdict: MathReconciliationVerdict,
) -> list[ScanReviewSignal]:
    """Build user-review hints from runtime evidence only.

    Prompt-lab expected baselines are intentionally excluded; live scans only
    know what the model extracted, what post-processing changed, and whether
    deterministic math reconciled.
    """
    signals: list[ScanReviewSignal] = []

    if not verdict.passed:
        signals.append(_math_reconciliation_signal(verdict))

    raw = raw_extraction if isinstance(raw_extraction, RawGeminiExtractionResult) else None
    if raw is None:
        return signals

    if has_visible_total_conflict(raw, extraction):
        signals.append(_visible_total_conflict_signal(raw, extraction))

    if len(raw.line_items) != len(extraction.line_items):
        signals.append(_item_structure_changed_signal(raw, extraction))

    if not raw.line_items and len(extraction.line_items) == 1 and extraction.total_amount > 0:
        signals.append(_synthesized_service_item_signal(extraction))

    discount_signal = _discount_evidence_unresolved_signal(raw, extraction)
    if discount_signal is not None:
        signals.append(discount_signal)

    return signals


def scan_review_level(signals: Sequence[ScanReviewSignal]) -> ScanReviewLevel:
    if any(signal.severity == "needs_review" for signal in signals):
        return "needs_review"
    if signals:
        return "warning"
    return "none"


def _math_reconciliation_signal(verdict: MathReconciliationVerdict) -> ScanReviewSignal:
    return ScanReviewSignal(
        code="math_reconciliation_delta",
        severity="needs_review",
        source_stage="math_gate",
        message="Receipt math did not reconcile cleanly.",
        details={
            "discrepancy_minor_units": verdict.discrepancy_minor_units,
            "discrepancy_ratio": verdict.discrepancy_ratio,
            "reconstructed_total": verdict.reconstructed_total,
            "adjusted_total": verdict.adjusted_total,
            "reconciliation_severity": verdict.severity,
        },
    )


def _visible_total_conflict_signal(
    raw: RawGeminiExtractionResult,
    extraction: GeminiExtractionResult,
) -> ScanReviewSignal:
    currency = extraction.currency_code
    return ScanReviewSignal(
        code="visible_total_conflict",
        severity="warning",
        source_stage="postprocess",
        message="Visible total evidence conflicts with the extracted total.",
        details={
            "currency_code": currency,
            "raw_total_minor": _minor_or_none(raw.total_amount, currency),
            "processed_total_minor": to_minor_units(extraction.total_amount, currency),
            "source_lines_count": len(raw.source_lines),
        },
    )


def _item_structure_changed_signal(
    raw: RawGeminiExtractionResult,
    extraction: GeminiExtractionResult,
) -> ScanReviewSignal:
    return ScanReviewSignal(
        code="item_structure_changed",
        severity="warning",
        source_stage="postprocess",
        message="Post-processing changed the receipt item structure.",
        details={
            "raw_item_count": len(raw.line_items),
            "processed_item_count": len(extraction.line_items),
        },
    )


def _synthesized_service_item_signal(extraction: GeminiExtractionResult) -> ScanReviewSignal:
    item = extraction.line_items[0]
    return ScanReviewSignal(
        code="synthesized_service_item",
        severity="warning",
        source_stage="postprocess",
        message="Post-processing synthesized one service item from the receipt total.",
        details={
            "currency_code": extraction.currency_code,
            "item_name": item.name,
            "item_total_minor": to_minor_units(item.total_price, extraction.currency_code),
        },
    )


def _discount_evidence_unresolved_signal(
    raw: RawGeminiExtractionResult,
    extraction: GeminiExtractionResult,
) -> ScanReviewSignal | None:
    currency = extraction.currency_code
    raw_discount_candidates = _raw_discount_candidates(raw, currency)
    if not raw_discount_candidates:
        return None

    processed_discount = (
        to_minor_units(extraction.discount_amount, currency)
        if extraction.discount_amount is not None
        else 0
    )
    raw_discount_sum = sum(raw_discount_candidates)

    if processed_discount in raw_discount_candidates or processed_discount == raw_discount_sum:
        return None

    return ScanReviewSignal(
        code="discount_evidence_unresolved",
        severity="warning",
        source_stage="postprocess",
        message="Receipt discount evidence was not resolved into the processed transaction.",
        details={
            "currency_code": currency,
            "raw_discount_candidates_minor": raw_discount_candidates,
            "raw_discount_sum_minor": raw_discount_sum,
            "processed_discount_minor": processed_discount,
        },
    )


def _raw_discount_candidates(raw: RawGeminiExtractionResult, currency: str) -> list[int]:
    candidates: list[int] = []
    summary_discount = _positive_minor(raw.discount_amount, currency)
    if summary_discount is not None:
        candidates.append(summary_discount)
    for adjustment in raw.adjustment_lines:
        amount = _positive_minor(adjustment.amount, currency)
        if amount is not None:
            candidates.append(amount)
    return candidates


def _positive_minor(amount: Decimal | None, currency: str) -> int | None:
    if amount is None or amount <= 0:
        return None
    return to_minor_units(amount, currency)


def _minor_or_none(amount: Decimal | None, currency: str) -> int | None:
    if amount is None:
        return None
    return to_minor_units(amount, currency)
