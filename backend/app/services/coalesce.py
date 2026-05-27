"""Output coalescing and currency-aware numeric coercion for receipt extraction results.

The model is allowed to return visible receipt evidence and imperfect numeric
shape. This module produces the canonical extraction used by math gates,
persistence, web, mobile, and prompt-lab scoring.
"""

from __future__ import annotations

import re
from datetime import date
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from app.schemas.scan import (
    GeminiExtractionResult,
    LineItemExtraction,
    RawGeminiExtractionResult,
    RawLineItemExtraction,
    ReceiptAdjustmentEvidence,
)

ZERO_EXPONENT_CURRENCIES = frozenset(
    {
        "CLP",
        "JPY",
        "KRW",
        "VND",
        "ISK",
        "UGX",
        "RWF",
        "DJF",
        "GNF",
        "KMF",
        "XAF",
        "XOF",
        "XPF",
    }
)

CLP_THOUSANDS_SEPARATORS = frozenset({"CLP"})
INCLUDED_TAX_CURRENCIES = frozenset({"CLP"})
CURRENCY_EXPONENTS = {
    "CLP": 0,
    "JPY": 0,
    "KRW": 0,
    "VND": 0,
    "ISK": 0,
    "UGX": 0,
    "RWF": 0,
    "DJF": 0,
    "GNF": 0,
    "KMF": 0,
    "XAF": 0,
    "XOF": 0,
    "XPF": 0,
    "USD": 2,
    "EUR": 2,
    "GBP": 2,
    "MXN": 2,
    "BRL": 2,
    "CAD": 2,
    "AUD": 2,
}

_RECONCILIATION_TOLERANCE = Decimal(1)
_PAYMENT_TENDER_PATTERN = re.compile(
    r"(?i)\b("
    r"credit\s*card|debit\s*card|card\s*(payment|holder|ending|no\.?)?|"
    r"gift\s*card|store\s*credit|"
    r"visa|master\s*card|mastercard|amex|american\s*express|diners|"
    r"cash|efectivo|redcompra|transbank|webpay|pos|terminal|"
    r"paid|payment|tender|settlement|change|balance|amount\s*paid|"
    r"pago|pagado|vuelto|cambio|saldo|tarjeta|cheque"
    r")\b"
)
_MASKED_CARD_PATTERN = re.compile(r"(\*{2,}|x{2,})\s*\d{2,4}", re.IGNORECASE)
_DISCOUNT_EVIDENCE_PATTERN = re.compile(
    r"(?i)\b("
    r"discount|promo|promotion|coupon|voucher|savings?|rebate|markdown|"
    r"offer|deal|member|loyalty|club|clearance|"
    r"remise|r[eé]duction|rabais|"
    r"descuentos?|promo[cç]i[oó]n|cup[oó]n|ahorro|rebaja|oferta|bonificaci[oó]n|"
    r"precio\s*antes|antes\s*ahora"
    r")\b"
)
_INFORMATIONAL_SAVINGS_PATTERN = re.compile(
    r"(?i)\b("
    r"you\s+saved|your\s+savings|savings?\s+summary|special\s+price\s+savings|"
    r"ahorro\s+total|resumen\s+de\s+ahorro"
    r")\b"
)
_TAX_REPORTING_PATTERN = re.compile(
    r"(?i)\b("
    r"tax|vat|iva|gst|hst|pst|taxable|net\s*amount|tax\s*base|"
    r"base\s*imponible|monto\s*neto|impuesto"
    r")\b"
)
_VISIBLE_TOTAL_LABEL_PATTERN = re.compile(
    r"(?i)\b("
    r"total|grand\s*total|amount\s*due|total\s*due|total\s*a\s*pagar|"
    r"monto\s*total|importe\s*total|total\s*pagado"
    r")\b"
)
_VISIBLE_TOTAL_EXCLUDE_PATTERN = re.compile(
    r"(?i)\b("
    r"subtotal|sub\s*total|iva|tax|vat|gst|neto|taxable|base\s*imponible|"
    r"cash|efectivo|card|visa|mastercard|payment|paid|tender|change|balance|"
    r"pago|pagado|vuelto|saldo|tarjeta|terminal|pos|rut|r\.?u\.?t\.?|"
    r"folio|boleta|factura|documento|receipt\s*no|phone|telefono|tel[eé]fono|"
    r"items?|art[ií]culos?|artic(?:ulo)?s?|productos?|units?|unidades?|qty|"
    r"cantidad|n[uú]mero\s+de\s+art"
    r")\b"
)
_VISIBLE_TOTAL_AMOUNT_PATTERN = re.compile(r"[-+]?\s*[$€£¥]?\s*[0-9][0-9.,]*")
_EXPLICIT_QTY_PRICE_PATTERN = re.compile(
    r"(?i)\b(?:qt[eé]|qty|cant\.?|cantidad)\s*[:=]?\s*"
    r"([0-9]+(?:[.,][0-9]+)?)\s*(?:[xX@])\s*([$€£¥]?\s*[0-9][0-9.,]*)"
)
_LINE_START_MULTIPACK_PATTERN = re.compile(
    r"(?i)^\s*([0-9]{1,3})\s*[xX]\s*"
    r"([$€£¥]?\s*[0-9][0-9.,]*)(?!\s*(?:g|gr|kg|ml|l|lt|oz|lb)\b)(?![A-Za-z])"
)
_LINE_START_AT_PRICE_PATTERN = re.compile(r"(?i)^\s*([0-9]{1,3})\s*@\s*([$€£¥]?\s*[0-9][0-9.,]*)")
_N_FOR_PRICE_PATTERN = re.compile(r"(?i)\b([0-9]{1,3})\s*(?:for|por)\s*([$€£¥]?\s*[0-9][0-9.,]*)\b")
_PACKAGE_SIZE_PATTERN = re.compile(
    r"(?i)\b[0-9]{1,3}\s*[xX]\s*[0-9][0-9.,]*\s*(?:g|gr|kg|ml|l|lt|oz|lb)\b"
)


def coalesce_extraction(
    result: GeminiExtractionResult | RawGeminiExtractionResult,
    scan_date: date | None = None,
) -> GeminiExtractionResult:
    """Apply deterministic post-processing to a parsed extraction result."""
    merchant = result.merchant_name.strip() if result.merchant_name else ""
    if not merchant or merchant.lower() in ("null", "none", "n/a", ""):
        merchant = "Unknown"

    tx_date = result.transaction_date.strip() if result.transaction_date else ""
    if not tx_date or tx_date.lower() in ("null", "none", "n/a"):
        fallback = scan_date or date.today()
        tx_date = fallback.isoformat()

    currency = result.currency_code.strip().upper() if result.currency_code else "CLP"
    if not currency or len(currency) != 3:
        currency = "CLP"

    adjustment_lines = (
        result.adjustment_lines if isinstance(result, RawGeminiExtractionResult) else []
    )
    has_discount_adjustment_evidence = any(
        not _is_non_discount_adjustment(adjustment) for adjustment in adjustment_lines
    )
    items, visible_discount_total = _coalesce_line_items(
        result.line_items,
        currency=currency,
        has_discount_adjustment_evidence=has_discount_adjustment_evidence,
    )

    total = _normalize_optional_money_amount(result.total_amount, currency)
    original_total = total
    visible_total = _select_visible_total_for_correction(result, currency=currency)
    if total is None and visible_total is not None:
        total = visible_total
    elif (
        total is not None
        and visible_total is not None
        # Example: parking receipt says `TOTAL: $860`, but the model returns CLP `86000`.
        # For zero-decimal currencies this is an exact x100 scaling error, so the
        # visible total wins. Non-exact conflicts stay uncorrected and route to review.
        and _is_exact_zero_decimal_scale_error(
            extracted_total=total,
            visible_total=visible_total,
            currency=currency,
        )
    ):
        total = visible_total
        if original_total is not None:
            items = _synchronize_sole_service_item_total(
                items,
                result=result,
                merchant=merchant,
                old_total=original_total,
                corrected_total=total,
            )

    tax = _normalize_optional_money_amount(result.tax_amount, currency)
    if currency.upper() in INCLUDED_TAX_CURRENCIES:
        tax = None
    if total is not None:
        tax = _suppress_included_tax_if_items_reconcile(items, total=total, tax_amount=tax)

    items, adjustment_discount_total = _coalesce_adjustment_lines(
        items,
        adjustment_lines=adjustment_lines,
        currency=currency,
        total=total,
        tax_amount=tax,
    )
    visible_discount_total += adjustment_discount_total

    explicit_discount = _normalize_optional_discount_amount(result.discount_amount, currency)
    discount = _select_receipt_discount(
        explicit_receipt_discount=explicit_discount,
        visible_discount_total=visible_discount_total,
        items=items,
        total=total,
        tax_amount=tax,
    )
    items = _correct_single_item_total_from_receipt_total(
        items,
        total=total,
        tax_amount=tax,
        discount=discount,
        currency=currency,
    )

    if total is None or total == Decimal(0):
        total = _reconstructed_total(items, tax_amount=tax, discount=discount)

    if not items and total > Decimal(0):
        items = [_synthesize_service_line(result, merchant=merchant, total=total)]

    return GeminiExtractionResult(
        merchant_name=merchant,
        transaction_date=tx_date,
        currency_code=currency,
        total_amount=total,
        tax_amount=tax,
        discount_amount=discount,
        line_items=items,
        recurrence_hint=result.recurrence_hint,
        confidence_score=result.confidence_score,
    )


def to_minor_units(amount: Decimal, currency_code: str) -> int:
    """Return integer minor units for an extraction amount.

    Current extraction prompts request integer minor units directly. For
    backwards compatibility with older fixtures, decimal-major values such as
    USD 48.50 are still converted to 4850.
    """
    exponent = CURRENCY_EXPONENTS.get(currency_code.upper(), 2)
    if not amount.is_finite():
        return 0
    amount_exponent = amount.as_tuple().exponent
    if exponent == 0 or (isinstance(amount_exponent, int) and amount_exponent >= 0):
        return int(amount)
    scale = Decimal(10) ** exponent
    return int((amount * scale).to_integral_value(rounding=ROUND_HALF_UP))


def from_minor_units(minor: int, currency_code: str) -> Decimal:
    """Convert minor units back to Decimal amount."""
    exponent = CURRENCY_EXPONENTS.get(currency_code.upper(), 2)
    if exponent == 0:
        return Decimal(minor)
    return Decimal(minor) / (Decimal(10) ** exponent)


def parse_clp_number(value: str) -> Decimal:
    """Parse a CLP-formatted number string, stripping thousands separators."""
    cleaned = re.sub(r"[^0-9-]", "", value.replace(".", "").replace(",", ""))
    if not cleaned or cleaned == "-":
        return Decimal(0)
    return Decimal(cleaned)


def parse_decimal_amount(value: str, currency_code: str) -> Decimal:
    """Parse a numeric string into Decimal, respecting currency formatting."""
    if not value or not value.strip():
        return Decimal(0)

    cleaned = value.strip()

    if currency_code.upper() in CLP_THOUSANDS_SEPARATORS:
        return parse_clp_number(cleaned)

    if currency_code.upper() in ZERO_EXPONENT_CURRENCIES:
        cleaned = cleaned.replace(",", "").replace(".", "")
        try:
            return Decimal(cleaned)
        except InvalidOperation:
            return Decimal(0)

    cleaned = cleaned.replace(",", "")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        numeric = re.sub(r"[^0-9.-]", "", cleaned)
        try:
            return Decimal(numeric or "0")
        except InvalidOperation:
            return Decimal(0)


def _coalesce_line_items(
    raw_items: list[LineItemExtraction] | list[RawLineItemExtraction],
    *,
    currency: str,
    has_discount_adjustment_evidence: bool = False,
) -> tuple[list[LineItemExtraction], Decimal]:
    items: list[LineItemExtraction] = []
    visible_discount_total = Decimal(0)

    for raw_item in raw_items:
        item = _coalesce_line_item(
            raw_item,
            currency,
            has_discount_adjustment_evidence=has_discount_adjustment_evidence,
        )
        if item.total_price < 0:
            # Example: a printed `RF Precio Antes Ahora -600` row is evidence
            # of a discount, but it must not persist as a fake product item.
            discount = abs(item.total_price)
            visible_discount_total += discount
            continue
        if item.total_price == Decimal(0):
            continue
        items.append(item)

    return items, visible_discount_total


def _coalesce_adjustment_lines(
    items: list[LineItemExtraction],
    *,
    adjustment_lines: list[ReceiptAdjustmentEvidence],
    currency: str,
    total: Decimal | None,
    tax_amount: Decimal | None,
) -> tuple[list[LineItemExtraction], Decimal]:
    normalized_adjustments: list[tuple[ReceiptAdjustmentEvidence, Decimal]] = []
    for adjustment in adjustment_lines:
        if _is_non_discount_adjustment(adjustment):
            continue
        amount = _normalize_money_amount(adjustment.amount, currency)
        if amount < 0:
            amount = abs(amount)
        if amount == Decimal(0):
            continue
        normalized_adjustments.append((adjustment, amount))

    if not normalized_adjustments:
        return items, Decimal(0)

    adjustment_total = sum((amount for _, amount in normalized_adjustments), Decimal(0))
    if total is not None and _adjustments_break_existing_reconciliation(
        items,
        adjustment_total=adjustment_total,
        total=total,
        tax_amount=tax_amount,
    ):
        return items, Decimal(0)

    visible_discount_total = Decimal(0)
    for _adjustment, amount in normalized_adjustments:
        # Example: a receipt-level `Discount 1.000` contributes only to the
        # receipt discount total. Scan-created item discounts are deprecated.
        visible_discount_total += amount

    return items, visible_discount_total


def _adjustments_break_existing_reconciliation(
    items: list[LineItemExtraction],
    *,
    adjustment_total: Decimal,
    total: Decimal,
    tax_amount: Decimal | None,
) -> bool:
    items_sum = sum((item.total_price for item in items), Decimal(0))
    tax = tax_amount or Decimal(0)
    without_adjustments = abs(items_sum + tax - total)
    with_adjustments = abs(items_sum + tax - adjustment_total - total)
    # Example: British Museum item totals already equal the grand total; a VAT
    # or card line must not be treated as a discount just because it has a number.
    return (
        without_adjustments <= _RECONCILIATION_TOLERANCE and with_adjustments > without_adjustments
    )


def _suppress_included_tax_if_items_reconcile(
    items: list[LineItemExtraction],
    *,
    total: Decimal,
    tax_amount: Decimal | None,
) -> Decimal | None:
    if tax_amount is None or not items:
        return tax_amount
    items_sum = sum((item.total_price for item in items), Decimal(0))
    without_tax = abs(items_sum - total)
    with_tax = abs(items_sum + tax_amount - total)
    if without_tax <= _RECONCILIATION_TOLERANCE and with_tax > without_tax:
        return None
    return tax_amount


def _is_non_discount_adjustment(adjustment: ReceiptAdjustmentEvidence) -> bool:
    text = _adjustment_text(adjustment)
    if _PAYMENT_TENDER_PATTERN.search(text) or _MASKED_CARD_PATTERN.search(text):
        return True
    if _TAX_REPORTING_PATTERN.search(text) and not _DISCOUNT_EVIDENCE_PATTERN.search(text):
        return True
    if _INFORMATIONAL_SAVINGS_PATTERN.search(text):
        return True
    return not bool(_DISCOUNT_EVIDENCE_PATTERN.search(text))


def _adjustment_text(adjustment: ReceiptAdjustmentEvidence) -> str:
    return "\n".join(
        part for part in [adjustment.label, *adjustment.source_lines] if part is not None
    )


def _synthesize_service_line(
    result: GeminiExtractionResult | RawGeminiExtractionResult,
    *,
    merchant: str,
    total: Decimal,
) -> LineItemExtraction:
    evidence = [line for line in getattr(result, "source_lines", []) if line]
    service_name = _service_line_name(evidence=evidence, merchant=merchant)
    return LineItemExtraction(
        name=service_name,
        qty=Decimal(1),
        unit_price=total,
        total_price=total,
        source_lines=evidence,
    )


def _service_line_name(*, evidence: list[str], merchant: str) -> str:
    text = "\n".join([*evidence, merchant])
    if re.search(r"(?i)\b(parking|estacionamiento|parqu[ií]metro)\b", text):
        return "Parking"
    if re.search(r"(?i)\b(admission|ticket|entrada|boleto)\b", text):
        return "Admission"
    if re.search(r"(?i)\b(delivery|shipping|env[ií]o|despacho)\b", text):
        return "Delivery"
    return "Service"


def find_visible_total_candidates(source_lines: list[str], currency: str) -> list[Decimal]:
    """Return conservative top-level visible total candidates from OCR-like source lines."""
    if currency.upper() not in ZERO_EXPONENT_CURRENCIES:
        return []

    candidates: list[Decimal] = []
    for line in source_lines:
        # Accept examples: `TOTAL: $860`, `MONTO TOTAL 12.990`.
        # Reject examples: `IVA TOTAL 137`, `TARJETA TOTAL 860`, `TOTAL ITEMS 12`.
        if not line or not _VISIBLE_TOTAL_LABEL_PATTERN.search(line):
            continue
        if _VISIBLE_TOTAL_EXCLUDE_PATTERN.search(line):
            continue
        label_match = _VISIBLE_TOTAL_LABEL_PATTERN.search(line)
        tail = line[label_match.end() :] if label_match else line
        amounts = _VISIBLE_TOTAL_AMOUNT_PATTERN.findall(tail)
        if not amounts:
            amounts = _VISIBLE_TOTAL_AMOUNT_PATTERN.findall(line)
        for amount_text in amounts:
            amount = parse_decimal_amount(amount_text, currency)
            if amount > 0:
                candidates.append(amount)
    return candidates


def has_visible_total_conflict(
    raw: RawGeminiExtractionResult | None,
    processed: GeminiExtractionResult | None = None,
) -> bool:
    """Detect a visible total conflict that post-processing could not safely correct."""
    if raw is None:
        return False
    currency = raw.currency_code.strip().upper() if raw.currency_code else "CLP"
    if currency not in ZERO_EXPONENT_CURRENCIES:
        return False
    candidates = find_visible_total_candidates(raw.source_lines, currency)
    if not candidates:
        return False
    raw_total = _normalize_optional_money_amount(raw.total_amount, currency)
    processed_total = (
        _normalize_money_amount(processed.total_amount, currency)
        if processed is not None
        else raw_total
    )
    for candidate in candidates:
        if raw_total == candidate or processed_total == candidate:
            return False
        if raw_total is not None and _is_exact_zero_decimal_scale_error(
            extracted_total=raw_total,
            visible_total=candidate,
            currency=currency,
        ):
            return False
    return True


def _select_visible_total_for_correction(
    result: GeminiExtractionResult | RawGeminiExtractionResult,
    *,
    currency: str,
) -> Decimal | None:
    candidates = find_visible_total_candidates(
        list(getattr(result, "source_lines", []) or []),
        currency,
    )
    unique_candidates = set(candidates)
    if len(unique_candidates) != 1:
        return None
    return next(iter(unique_candidates))


def _is_exact_zero_decimal_scale_error(
    *,
    extracted_total: Decimal,
    visible_total: Decimal,
    currency: str,
) -> bool:
    return (
        currency.upper() in ZERO_EXPONENT_CURRENCIES
        and visible_total > 0
        and extracted_total == visible_total * Decimal(100)
    )


def _synchronize_sole_service_item_total(
    items: list[LineItemExtraction],
    *,
    result: GeminiExtractionResult | RawGeminiExtractionResult,
    merchant: str,
    old_total: Decimal,
    corrected_total: Decimal,
) -> list[LineItemExtraction]:
    if len(items) != 1 or items[0].total_price != old_total:
        return items
    item = items[0]
    evidence = [
        *list(getattr(result, "source_lines", []) or []),
        *item.source_lines,
        item.name,
        merchant,
    ]
    if not _is_service_like_text("\n".join(evidence)):
        return items
    unit_price = item.unit_price
    # Example: one parking/service item copied as `86000` follows the corrected
    # receipt total `860`; a multi-quantity product would be left unchanged.
    if item.qty in (None, Decimal(1)) or unit_price == old_total:
        unit_price = corrected_total
    return [item.model_copy(update={"total_price": corrected_total, "unit_price": unit_price})]


def _correct_single_item_total_from_receipt_total(
    items: list[LineItemExtraction],
    *,
    total: Decimal | None,
    tax_amount: Decimal | None,
    discount: Decimal | None,
    currency: str,
) -> list[LineItemExtraction]:
    if total is None or len(items) != 1 or tax_amount is not None or discount is not None:
        return items

    item = items[0]
    if item.qty is None or item.unit_price is None or item.qty <= 0:
        return items

    expected_total = _round_money_product(item.qty * item.unit_price, currency)
    if expected_total != total or item.total_price == total:
        return items

    return [item.model_copy(update={"total_price": total})]


def _is_service_like_text(text: str) -> bool:
    return bool(
        re.search(
            r"(?i)\b("
            r"parking|estacionamiento|parqu[ií]metro|admission|ticket|entrada|boleto|"
            r"delivery|shipping|env[ií]o|despacho|repair|fee|fees|service|servicio|"
            r"concesi[oó]n|peaje|toll"
            r")\b",
            text,
        )
    )


def _coalesce_line_item(
    item: LineItemExtraction,
    currency: str,
    *,
    has_discount_adjustment_evidence: bool = False,
) -> LineItemExtraction:
    name = item.name.strip() if item.name else "Item"
    if not name or name.lower() in ("null", "none"):
        name = "Item"

    source_lines = list(getattr(item, "source_lines", []) or [])
    modifier_lines = list(getattr(item, "modifier_lines", []) or [])
    evidence_lines = [*source_lines, *modifier_lines, name]
    total_price = _normalize_money_amount(item.total_price, currency)
    parsed_qty, parsed_unit = _parse_quantity_and_unit_price(evidence_lines, currency)
    qty, unit_price = _coalesce_quantity_and_unit_price(
        qty=item.qty,
        unit_price=item.unit_price,
        total_price=total_price,
        currency=currency,
        evidence_lines=evidence_lines,
        parsed_qty=parsed_qty,
        parsed_unit=parsed_unit,
    )
    total_price = _correct_total_price_from_multiplier(
        total_price=total_price,
        parsed_qty=parsed_qty,
        parsed_unit=parsed_unit,
        currency=currency,
        n_for_price=any(_N_FOR_PRICE_PATTERN.search(line) for line in evidence_lines),
        allow_n_for_total_correction=not has_discount_adjustment_evidence,
    )

    return LineItemExtraction(
        name=name,
        qty=qty,
        unit_price=unit_price,
        total_price=total_price,
        discount_amount=None,
        discount_label=None,
        discount_attribution_confidence=None,
        source_lines=source_lines,
    )


def _normalize_optional_money_amount(
    amount: Decimal | None,
    currency: str,
) -> Decimal | None:
    if amount is None:
        return None
    return _normalize_money_amount(amount, currency)


def _normalize_optional_discount_amount(
    amount: Decimal | None,
    currency: str,
) -> Decimal | None:
    normalized = _normalize_optional_money_amount(amount, currency)
    if normalized is None:
        return None
    return abs(normalized)


def _normalize_money_amount(amount: Decimal, currency: str) -> Decimal:
    if currency.upper() in ZERO_EXPONENT_CURRENCIES and not _is_integral(amount):
        return parse_decimal_amount(format(amount, "f"), currency)
    return Decimal(to_minor_units(amount, currency))


def _select_receipt_discount(
    *,
    explicit_receipt_discount: Decimal | None,
    visible_discount_total: Decimal,
    items: list[LineItemExtraction],
    total: Decimal | None,
    tax_amount: Decimal | None,
) -> Decimal | None:
    """Choose the canonical receipt discount total.

    The receipt total is canonical. Discounts only become receipt-level math
    inputs when they improve reconstruction against that total.

    Examples:
    - `DESCUENTO TOTAL 1.000` and gross items exceed total by 1.000 -> use 1000.
    - negative discount rows or valid adjustments can sum into the receipt discount.
    - item totals already equal total -> savings/markdown data is informational.
    - items sum 9000 and total 8000 with no visible discount -> no discount;
      math/review logic must surface the mismatch instead.
    """
    if total is None:
        return explicit_receipt_discount or (
            visible_discount_total if visible_discount_total else None
        )

    base_gap = _reconstruction_gap(items, total=total, tax_amount=tax_amount, discount=Decimal(0))
    if base_gap <= _RECONCILIATION_TOLERANCE:
        return None

    candidates = [
        explicit_receipt_discount if explicit_receipt_discount else None,
        visible_discount_total if visible_discount_total else None,
    ]
    for candidate in candidates:
        if candidate is None or candidate == Decimal(0):
            continue
        if _discount_improves_reconstruction(
            items,
            total=total,
            tax_amount=tax_amount,
            discount=candidate,
            base_gap=base_gap,
        ):
            return candidate
    return None


def _reconstructed_total(
    items: list[LineItemExtraction],
    *,
    tax_amount: Decimal | None,
    discount: Decimal | None,
) -> Decimal:
    items_sum = sum((item.total_price for item in items), Decimal(0))
    tax = tax_amount or Decimal(0)
    selected_discount = discount or Decimal(0)
    return items_sum + tax - selected_discount


def _reconstruction_gap(
    items: list[LineItemExtraction],
    *,
    total: Decimal,
    tax_amount: Decimal | None,
    discount: Decimal,
) -> Decimal:
    items_sum = sum((item.total_price for item in items), Decimal(0))
    tax = tax_amount or Decimal(0)
    return abs(items_sum + tax - discount - total)


def _discount_improves_reconstruction(
    items: list[LineItemExtraction],
    *,
    total: Decimal,
    tax_amount: Decimal | None,
    discount: Decimal,
    base_gap: Decimal,
) -> bool:
    gap_with_discount = _reconstruction_gap(
        items,
        total=total,
        tax_amount=tax_amount,
        discount=discount,
    )
    return gap_with_discount < base_gap


def _is_integral(amount: Decimal) -> bool:
    return amount == amount.to_integral_value()


def _coalesce_quantity_and_unit_price(
    *,
    qty: Decimal | None,
    unit_price: Decimal | None,
    total_price: Decimal,
    currency: str,
    evidence_lines: list[str],
    parsed_qty: Decimal | None = None,
    parsed_unit: Decimal | None = None,
) -> tuple[Decimal, Decimal | None]:
    if parsed_qty is None and parsed_unit is None:
        parsed_qty, parsed_unit = _parse_quantity_and_unit_price(evidence_lines, currency)
    final_qty = parsed_qty or qty or Decimal(1)
    normalized_unit = _normalize_optional_money_amount(unit_price, currency)
    final_unit = parsed_unit or normalized_unit
    if final_unit is None:
        final_unit = _derive_unit_price(
            total_price=total_price,
            qty=final_qty,
            currency=currency,
            evidence_lines=evidence_lines,
        )
    return final_qty, final_unit


def _correct_total_price_from_multiplier(
    *,
    total_price: Decimal,
    parsed_qty: Decimal | None,
    parsed_unit: Decimal | None,
    currency: str,
    n_for_price: bool = False,
    allow_n_for_total_correction: bool = True,
) -> Decimal:
    if parsed_qty is None or parsed_unit is None or parsed_qty <= 0:
        return total_price
    expected_total = _round_money_product(parsed_qty * parsed_unit, currency)
    double_multiplied_total = _round_money_product(expected_total * parsed_qty, currency)
    # Example: `3X990` means total 2970. If the model returns 8910, it multiplied
    # by quantity twice, so the deterministic multiplier total wins.
    if total_price == double_multiplied_total and expected_total != total_price:
        return expected_total
    # Example: `2 FOR 5.00` means the charged line total is 5.00. If the model
    # copied the derived unit price 2.50 as the total, the visible promo total wins.
    if (
        parsed_qty > 1
        and total_price == parsed_unit
        and expected_total != total_price
        and (allow_n_for_total_correction or not n_for_price)
    ):
        return expected_total
    return total_price


def _round_money_product(value: Decimal, currency: str) -> Decimal:
    if currency.upper() in ZERO_EXPONENT_CURRENCIES:
        return value.to_integral_value(rounding=ROUND_HALF_UP)
    return value.quantize(Decimal(1), rounding=ROUND_HALF_UP)


def _parse_quantity_and_unit_price(
    evidence_lines: list[str],
    currency: str,
) -> tuple[Decimal | None, Decimal | None]:
    for line in evidence_lines:
        # Strongest evidence: explicit quantity labels such as `Qté : 2 x 18.90`.
        explicit = _EXPLICIT_QTY_PRICE_PATTERN.search(line)
        if explicit:
            qty = Decimal(explicit.group(1).replace(",", "."))
            unit = _normalize_money_amount(
                parse_decimal_amount(explicit.group(2), currency),
                currency,
            )
            return qty, unit

    for line in evidence_lines:
        # `2 FOR 5.00` means two units for a total of 5.00, so unit price is 2.50.
        # This differs from `2X990`, where the second number is the per-unit price.
        n_for = _N_FOR_PRICE_PATTERN.search(line)
        if n_for:
            qty = Decimal(n_for.group(1))
            total = _normalize_money_amount(
                parse_decimal_amount(n_for.group(2), currency),
                currency,
            )
            unit = _round_money_product(total / qty, currency)
            return qty, unit

    for line in evidence_lines:
        # Store formats also use line-start `3 @ 1.99` for quantity x unit price.
        at_price = _LINE_START_AT_PRICE_PATTERN.search(line)
        if at_price:
            qty = Decimal(at_price.group(1))
            unit = _normalize_money_amount(
                parse_decimal_amount(at_price.group(2), currency),
                currency,
            )
            return qty, unit

    for line in evidence_lines:
        # Accept line-start `2X990`; reject product package sizes like `7X70G`.
        if _PACKAGE_SIZE_PATTERN.search(line):
            continue
        multi = _LINE_START_MULTIPACK_PATTERN.search(line)
        if multi:
            qty = Decimal(multi.group(1))
            unit = _normalize_money_amount(parse_decimal_amount(multi.group(2), currency), currency)
            return qty, unit

    joined = "\n".join(evidence_lines)
    # Weighted/measure items: `x 1.045 KG` means quantity 1.045, unit price may
    # come from another visible line or be derived from total / quantity.
    weight = re.search(
        r"(?i)(?:x|qty|cant\.?)\s*([0-9]+(?:[.,][0-9]+)?)\s*(kg|kilo|lt|l)\b",
        joined,
    )
    if weight:
        return Decimal(weight.group(1).replace(",", ".")), None

    return None, None


def _derive_unit_price(
    *,
    total_price: Decimal,
    qty: Decimal,
    currency: str,
    evidence_lines: list[str],
) -> Decimal | None:
    if qty == 0:
        return None
    has_modifier = _parse_quantity_and_unit_price(evidence_lines, currency)[0] is not None
    if qty == Decimal(1):
        return total_price
    if not has_modifier and qty != qty.to_integral_value():
        return None
    unit = total_price / qty
    if currency.upper() in ZERO_EXPONENT_CURRENCIES:
        return unit.to_integral_value(rounding=ROUND_HALF_UP)
    return unit.quantize(Decimal(1), rounding=ROUND_HALF_UP)
