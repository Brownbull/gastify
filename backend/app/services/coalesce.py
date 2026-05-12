"""Output coalescing and currency-aware numeric coercion for Gemini extraction results.

Port of BoletApp analyzeReceipt.ts coalescing logic, extended for multi-currency.
Operates on GeminiExtractionResult after PydanticAI parsing.
"""

from datetime import date
from decimal import Decimal, InvalidOperation

from app.schemas.scan import GeminiExtractionResult, LineItemExtraction

ZERO_EXPONENT_CURRENCIES = frozenset({
    "CLP", "JPY", "KRW", "VND", "ISK", "UGX", "RWF",
    "DJF", "GNF", "KMF", "XAF", "XOF", "XPF",
})

CLP_THOUSANDS_SEPARATORS = frozenset({"CLP"})


def coalesce_extraction(
    result: GeminiExtractionResult,
    scan_date: date | None = None,
) -> GeminiExtractionResult:
    """Apply coalescing rules to a parsed extraction result.

    - Fill missing merchant/date with defaults
    - Strip CLP thousands separators from amount strings
    - Drop zero-price line items
    - Fallback total = sum(line_items) when total is zero/missing
    """
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

    items = [
        _coalesce_line_item(item, currency)
        for item in result.line_items
    ]
    items = [item for item in items if item.total_price != Decimal(0)]

    total = result.total_amount
    if total is None or total == Decimal(0):
        total = sum((item.total_price for item in items), Decimal(0))

    return GeminiExtractionResult(
        merchant_name=merchant,
        transaction_date=tx_date,
        currency_code=currency,
        total_amount=total,
        tax_amount=result.tax_amount,
        discount_amount=result.discount_amount,
        line_items=items,
        confidence_score=result.confidence_score,
    )


def to_minor_units(amount: Decimal, currency_code: str) -> int:
    """Convert a Decimal amount to minor units (integer cents/units).

    CLP/JPY/KRW (exponent=0): amount is already in minor units → int(amount)
    USD/EUR/GBP (exponent=2): multiply by 100 → int(amount * 100)
    """
    if currency_code.upper() in ZERO_EXPONENT_CURRENCIES:
        return int(amount)
    return int(amount * 100)


def from_minor_units(minor: int, currency_code: str) -> Decimal:
    """Convert minor units back to Decimal amount."""
    if currency_code.upper() in ZERO_EXPONENT_CURRENCIES:
        return Decimal(minor)
    return Decimal(minor) / Decimal(100)


def parse_clp_number(value: str) -> Decimal:
    """Parse a CLP-formatted number string, stripping thousands separators.

    Chilean format: "15.990" means 15990 (dot = thousands separator).
    This ONLY applies to CLP — for decimal currencies, dots are decimal points.
    """
    cleaned = value.replace(".", "").replace(",", "")
    return Decimal(cleaned)


def parse_decimal_amount(value: str, currency_code: str) -> Decimal:
    """Parse a numeric string into Decimal, respecting currency formatting.

    CLP/JPY/KRW: strip dots/commas as thousands separators.
    USD/EUR/GBP: treat dots as decimal points, commas as thousands.
    """
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
        return Decimal(0)


def _coalesce_line_item(item: LineItemExtraction, currency: str) -> LineItemExtraction:
    name = item.name.strip() if item.name else "Item"
    if not name or name.lower() in ("null", "none"):
        name = "Item"

    return LineItemExtraction(
        name=name,
        qty=item.qty,
        unit_price=item.unit_price,
        total_price=item.total_price,
    )
