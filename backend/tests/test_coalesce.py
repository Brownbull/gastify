"""Tests for output coalescing and currency-aware numeric coercion."""

from datetime import date
from decimal import Decimal

from app.schemas.scan import GeminiExtractionResult, LineItemExtraction
from app.services.coalesce import (
    coalesce_extraction,
    from_minor_units,
    parse_clp_number,
    parse_decimal_amount,
    to_minor_units,
)


def _make_result(**overrides) -> GeminiExtractionResult:
    defaults = {
        "merchant_name": "Jumbo",
        "transaction_date": "2026-05-10",
        "currency_code": "CLP",
        "total_amount": Decimal("15990"),
        "line_items": [
            LineItemExtraction(name="Leche", total_price=Decimal("2990")),
            LineItemExtraction(name="Pan", total_price=Decimal("1500")),
        ],
        "confidence_score": 0.95,
    }
    defaults.update(overrides)
    return GeminiExtractionResult(**defaults)


class TestCoalesceExtraction:
    def test_passthrough_valid_result(self):
        result = _make_result()
        coalesced = coalesce_extraction(result)
        assert coalesced.merchant_name == "Jumbo"
        assert coalesced.total_amount == Decimal("15990")
        assert len(coalesced.line_items) == 2

    def test_null_merchant_defaults_to_unknown(self):
        result = _make_result(merchant_name="null")
        assert coalesce_extraction(result).merchant_name == "Unknown"

    def test_empty_merchant_defaults_to_unknown(self):
        result = _make_result(merchant_name="")
        assert coalesce_extraction(result).merchant_name == "Unknown"

    def test_na_merchant_defaults_to_unknown(self):
        result = _make_result(merchant_name="N/A")
        assert coalesce_extraction(result).merchant_name == "Unknown"

    def test_null_date_uses_scan_date(self):
        result = _make_result(transaction_date="null")
        coalesced = coalesce_extraction(result, scan_date=date(2026, 5, 12))
        assert coalesced.transaction_date == "2026-05-12"

    def test_empty_date_uses_scan_date(self):
        result = _make_result(transaction_date="")
        coalesced = coalesce_extraction(result, scan_date=date(2026, 5, 12))
        assert coalesced.transaction_date == "2026-05-12"

    def test_drops_zero_price_items(self):
        result = _make_result(line_items=[
            LineItemExtraction(name="Leche", total_price=Decimal("2990")),
            LineItemExtraction(name="Free sample", total_price=Decimal("0")),
        ])
        coalesced = coalesce_extraction(result)
        assert len(coalesced.line_items) == 1
        assert coalesced.line_items[0].name == "Leche"

    def test_fallback_total_from_items_sum(self):
        result = _make_result(
            total_amount=Decimal("0"),
            line_items=[
                LineItemExtraction(name="A", total_price=Decimal("1000")),
                LineItemExtraction(name="B", total_price=Decimal("2000")),
            ],
        )
        coalesced = coalesce_extraction(result)
        assert coalesced.total_amount == Decimal("3000")

    def test_currency_normalized_to_uppercase(self):
        result = _make_result(currency_code="clp")
        assert coalesce_extraction(result).currency_code == "CLP"

    def test_invalid_currency_defaults_to_clp(self):
        result = _make_result(currency_code="ABCD")
        assert coalesce_extraction(result).currency_code == "CLP"

    def test_empty_currency_defaults_to_clp(self):
        result = _make_result(currency_code="")
        assert coalesce_extraction(result).currency_code == "CLP"

    def test_null_item_name_defaults(self):
        result = _make_result(line_items=[
            LineItemExtraction(name="null", total_price=Decimal("500")),
        ])
        coalesced = coalesce_extraction(result)
        assert coalesced.line_items[0].name == "Item"

    def test_preserves_tax_and_discount(self):
        result = _make_result(
            tax_amount=Decimal("1000"),
            discount_amount=Decimal("500"),
        )
        coalesced = coalesce_extraction(result)
        assert coalesced.tax_amount == Decimal("1000")
        assert coalesced.discount_amount == Decimal("500")


class TestMinorUnits:
    def test_clp_no_multiplication(self):
        assert to_minor_units(Decimal("15990"), "CLP") == 15990

    def test_usd_multiply_by_100(self):
        assert to_minor_units(Decimal("48.50"), "USD") == 4850

    def test_eur_multiply_by_100(self):
        assert to_minor_units(Decimal("9.99"), "EUR") == 999

    def test_jpy_no_multiplication(self):
        assert to_minor_units(Decimal("1500"), "JPY") == 1500

    def test_from_minor_clp(self):
        assert from_minor_units(15990, "CLP") == Decimal("15990")

    def test_from_minor_usd(self):
        assert from_minor_units(4850, "USD") == Decimal("48.50")

    def test_from_minor_eur(self):
        assert from_minor_units(999, "EUR") == Decimal("9.99")


class TestParseCLPNumber:
    def test_thousands_separator_dot(self):
        assert parse_clp_number("15.990") == Decimal("15990")

    def test_thousands_separator_comma(self):
        assert parse_clp_number("15,990") == Decimal("15990")

    def test_no_separator(self):
        assert parse_clp_number("15990") == Decimal("15990")

    def test_large_number(self):
        assert parse_clp_number("1.234.567") == Decimal("1234567")


class TestParseDecimalAmount:
    def test_clp_strips_dots(self):
        assert parse_decimal_amount("15.990", "CLP") == Decimal("15990")

    def test_usd_keeps_decimals(self):
        assert parse_decimal_amount("48.50", "USD") == Decimal("48.50")

    def test_usd_strips_comma_thousands(self):
        assert parse_decimal_amount("1,234.56", "USD") == Decimal("1234.56")

    def test_empty_returns_zero(self):
        assert parse_decimal_amount("", "CLP") == Decimal("0")

    def test_whitespace_returns_zero(self):
        assert parse_decimal_amount("  ", "USD") == Decimal("0")

    def test_jpy_strips_separators(self):
        assert parse_decimal_amount("1,500", "JPY") == Decimal("1500")

    def test_invalid_returns_zero(self):
        assert parse_decimal_amount("not-a-number", "USD") == Decimal("0")
