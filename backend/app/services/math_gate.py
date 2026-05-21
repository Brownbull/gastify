"""Math reconciliation gate — validates extraction totals against line items.

sum(line_items.total_price) + tax - discount == total within 1 minor unit
tolerance per currency. Receipts that fail route to NEEDS_REVIEW instead
of auto-completing.
"""

from __future__ import annotations

import structlog

from app.schemas.scan import GeminiExtractionResult, MathReconciliationVerdict
from app.services.coalesce import to_minor_units
from app.services.receipt_validation_policy import get_receipt_validation_policy

logger = structlog.get_logger()


def reconcile(extraction: GeminiExtractionResult) -> MathReconciliationVerdict:
    """Check that line item sum + tax - discount matches stated total.

    All math done in minor units (integer) to avoid floating-point drift.
    Tolerance: 1 minor unit (1 cent for USD, 1 peso for CLP).
    """
    currency = extraction.currency_code

    items_sum = sum(to_minor_units(item.total_price, currency) for item in extraction.line_items)
    tax = to_minor_units(extraction.tax_amount, currency) if extraction.tax_amount else 0
    discount = (
        to_minor_units(extraction.discount_amount, currency) if extraction.discount_amount else 0
    )
    stated_total = to_minor_units(extraction.total_amount, currency)
    policy = get_receipt_validation_policy()

    expected = items_sum + tax - discount
    discrepancy = abs(expected - stated_total)
    passed = discrepancy <= policy.math_exact_tolerance_minor_units
    discrepancy_ratio = discrepancy / abs(stated_total) if stated_total else 0
    severity = _severity(
        passed=passed,
        discrepancy_ratio=discrepancy_ratio,
        major_warning_ratio=policy.major_reconstruction_discrepancy_ratio,
    )

    verdict = MathReconciliationVerdict(
        passed=passed,
        discrepancy_minor_units=discrepancy,
        reconstructed_total=expected,
        discrepancy_ratio=round(discrepancy_ratio, 6),
        severity=severity,
        adjusted_total=None,
    )

    logger.info(
        "math_reconciliation",
        passed=passed,
        items_sum=items_sum,
        tax=tax,
        discount=discount,
        stated_total=stated_total,
        expected=expected,
        discrepancy=discrepancy,
        discrepancy_ratio=round(discrepancy_ratio, 6),
        severity=severity,
        policy_id=policy.policy_id,
        policy_version=policy.policy_version,
        currency=currency,
    )

    return verdict


def _severity(
    *,
    passed: bool,
    discrepancy_ratio: float,
    major_warning_ratio: float,
) -> str:
    if passed:
        return "none"
    if discrepancy_ratio > major_warning_ratio:
        return "major_warning"
    return "minor"
