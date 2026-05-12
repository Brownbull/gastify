"""Math reconciliation gate — validates extraction totals against line items.

sum(line_items.total_price) + tax - discount == total within 1 minor unit
tolerance per currency. Receipts that fail route to NEEDS_REVIEW instead
of auto-completing.
"""

from __future__ import annotations

import structlog

from app.schemas.scan import GeminiExtractionResult, MathReconciliationVerdict
from app.services.coalesce import to_minor_units

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

    expected = items_sum + tax - discount
    discrepancy = abs(expected - stated_total)
    passed = discrepancy <= 1

    adjusted_total: int | None = None
    if not passed:
        adjusted_total = expected

    verdict = MathReconciliationVerdict(
        passed=passed,
        discrepancy_minor_units=discrepancy,
        adjusted_total=adjusted_total,
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
        currency=currency,
    )

    return verdict
