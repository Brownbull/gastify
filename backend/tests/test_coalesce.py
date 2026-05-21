"""Tests for output coalescing and currency-aware numeric coercion."""

from datetime import date
from decimal import Decimal

from app.schemas.scan import (
    GeminiExtractionResult,
    LineItemExtraction,
    RawGeminiExtractionResult,
    RawLineItemExtraction,
    ReceiptAdjustmentEvidence,
)
from app.services.coalesce import (
    coalesce_extraction,
    find_visible_total_candidates,
    from_minor_units,
    has_visible_total_conflict,
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
        result = _make_result(
            line_items=[
                LineItemExtraction(name="Leche", total_price=Decimal("2990")),
                LineItemExtraction(name="Free sample", total_price=Decimal("0")),
            ]
        )
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
        result = _make_result(
            line_items=[
                LineItemExtraction(name="null", total_price=Decimal("500")),
            ]
        )
        coalesced = coalesce_extraction(result)
        assert coalesced.line_items[0].name == "Item"

    def test_preserves_tax_and_discount(self):
        result = _make_result(
            currency_code="USD",
            total_amount=Decimal("4990"),
            tax_amount=Decimal("1000"),
            discount_amount=Decimal("500"),
        )
        coalesced = coalesce_extraction(result)
        assert coalesced.tax_amount == Decimal("1000")
        assert coalesced.discount_amount == Decimal("500")

    def test_clp_included_iva_is_not_treated_as_added_tax(self):
        result = _make_result(tax_amount=Decimal("2542"))

        coalesced = coalesce_extraction(result)

        assert coalesced.tax_amount is None

    def test_does_not_infer_discount_from_item_total_gap_without_visible_discount(self):
        result = _make_result(
            total_amount=Decimal("8000"),
            line_items=[
                LineItemExtraction(name="A", total_price=Decimal("5000")),
                LineItemExtraction(name="B", total_price=Decimal("4000")),
            ],
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount is None
        assert [item.name for item in coalesced.line_items] == ["A", "B"]
        assert sum(item.total_price for item in coalesced.line_items) == Decimal("9000")

    def test_uses_explicit_receipt_discount_when_present(self):
        result = _make_result(
            currency_code="USD",
            total_amount=Decimal("8000"),
            discount_amount=Decimal("1000"),
            line_items=[
                LineItemExtraction(name="A", total_price=Decimal("5000")),
                LineItemExtraction(name="B", total_price=Decimal("4000")),
            ],
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount == Decimal("1000")
        assert [item.name for item in coalesced.line_items] == ["A", "B"]

    def test_item_discounts_do_not_become_receipt_discount(self):
        result = _make_result(
            total_amount=Decimal("8500"),
            line_items=[
                LineItemExtraction(
                    name="A",
                    total_price=Decimal("5000"),
                    discount_amount=Decimal("300"),
                ),
                LineItemExtraction(
                    name="B",
                    total_price=Decimal("4000"),
                    discount_amount=Decimal("200"),
                ),
            ],
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount is None
        assert coalesced.line_items[0].discount_amount is None
        assert coalesced.line_items[1].discount_amount is None

    def test_item_discount_is_informational_when_items_already_reconcile(self):
        result = _make_result(
            currency_code="USD",
            total_amount=Decimal("12440"),
            line_items=[
                LineItemExtraction(
                    name="Groceries",
                    total_price=Decimal("12440"),
                    discount_amount=Decimal("400"),
                ),
            ],
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount is None
        assert coalesced.line_items[0].discount_amount is None

    def test_receipt_discount_wins_over_item_discount_aggregation(self):
        result = _make_result(
            total_amount=Decimal("8000"),
            discount_amount=Decimal("1000"),
            line_items=[
                LineItemExtraction(
                    name="A",
                    total_price=Decimal("5000"),
                    discount_amount=Decimal("300"),
                ),
                LineItemExtraction(
                    name="B",
                    total_price=Decimal("4000"),
                    discount_amount=Decimal("200"),
                ),
            ],
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount == Decimal("1000")
        assert coalesced.line_items[0].discount_amount is None
        assert coalesced.line_items[1].discount_amount is None

    def test_normalizes_clp_thousands_decimals_in_money_fields_for_legacy_outputs(self):
        result = _make_result(
            total_amount=Decimal("102.052"),
            tax_amount=Decimal("16.294"),
            discount_amount=Decimal("-1.200"),
            line_items=[
                LineItemExtraction(
                    name="PAN CIA RUST",
                    qty=Decimal("1.045"),
                    unit_price=Decimal("2.990"),
                    total_price=Decimal("3.125"),
                )
            ],
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.total_amount == Decimal("102052")
        assert coalesced.tax_amount is None
        assert coalesced.discount_amount is None
        assert coalesced.line_items[0].qty == Decimal("1.045")
        assert coalesced.line_items[0].unit_price == Decimal("2990")
        assert coalesced.line_items[0].total_price == Decimal("3125")

    def test_normalizes_decimal_currency_money_fields_to_minor_units(self):
        result = _make_result(
            currency_code="USD",
            total_amount=Decimal("48.50"),
            tax_amount=Decimal("1.25"),
            line_items=[
                LineItemExtraction(
                    name="Sandwich",
                    unit_price=Decimal("12.25"),
                    total_price=Decimal("24.50"),
                )
            ],
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.total_amount == Decimal("4850")
        assert coalesced.tax_amount == Decimal("125")
        assert coalesced.line_items[0].unit_price == Decimal("1225")
        assert coalesced.line_items[0].total_price == Decimal("2450")

    def test_preserves_decimal_currency_integer_minor_units(self):
        result = _make_result(
            currency_code="USD",
            total_amount=Decimal("4850"),
            line_items=[
                LineItemExtraction(
                    name="Sandwich",
                    unit_price=Decimal("1225"),
                    total_price=Decimal("2450"),
                )
            ],
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.total_amount == Decimal("4850")
        assert coalesced.line_items[0].unit_price == Decimal("1225")
        assert coalesced.line_items[0].total_price == Decimal("2450")

    def test_defaults_missing_quantity_to_one_and_unit_to_total(self):
        result = _make_result(
            line_items=[LineItemExtraction(name="SUPER8 HALLO", total_price=Decimal("1890"))]
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.line_items[0].qty == Decimal("1")
        assert coalesced.line_items[0].unit_price == Decimal("1890")

    def test_parses_weight_modifier_from_raw_source_lines(self):
        result = RawGeminiExtractionResult(
            merchant_name="Lider",
            transaction_date="2026-05-10",
            currency_code="CLP",
            total_amount=Decimal("3125"),
            line_items=[
                RawLineItemExtraction(
                    name="PAN CIA RUST",
                    total_price=Decimal("3125"),
                    source_lines=["PAN CIA RUST $ 3.125", "x 1.045 KG", "$ 2.990"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.line_items[0].qty == Decimal("1.045")
        assert coalesced.line_items[0].unit_price == Decimal("2990")

    def test_parses_multipack_modifier_from_raw_source_lines(self):
        result = RawGeminiExtractionResult(
            merchant_name="Lider",
            transaction_date="2026-05-10",
            currency_code="CLP",
            total_amount=Decimal("1980"),
            line_items=[
                RawLineItemExtraction(
                    name="GALL DONUTS ORANGE",
                    total_price=Decimal("1980"),
                    source_lines=["2X990", "GALL DONUTS ORANGE $ 1.980"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.line_items[0].qty == Decimal("2")
        assert coalesced.line_items[0].unit_price == Decimal("990")

    def test_parses_n_for_total_price_from_raw_source_lines(self):
        result = RawGeminiExtractionResult(
            merchant_name="Publix",
            transaction_date="2026-05-10",
            currency_code="USD",
            total_amount=Decimal("500"),
            line_items=[
                RawLineItemExtraction(
                    name="CUCUMBER HOT HOUSE",
                    total_price=Decimal("250"),
                    source_lines=["CUCUMBER HOT HOUSE", "2 FOR 5.00"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.line_items[0].qty == Decimal("2")
        assert coalesced.line_items[0].unit_price == Decimal("250")
        assert coalesced.line_items[0].total_price == Decimal("500")

    def test_corrects_double_multiplied_total_from_explicit_multiplier(self):
        result = RawGeminiExtractionResult(
            merchant_name="Lider",
            transaction_date="2026-05-10",
            currency_code="CLP",
            total_amount=Decimal("2970"),
            line_items=[
                RawLineItemExtraction(
                    name="GALL DONUTS COCO",
                    qty=Decimal("3"),
                    unit_price=Decimal("2970"),
                    total_price=Decimal("8910"),
                    source_lines=["3X990 GALL DONUTS COCO", "$ 2.970"],
                    modifier_lines=["3X990"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.line_items[0].qty == Decimal("3")
        assert coalesced.line_items[0].unit_price == Decimal("990")
        assert coalesced.line_items[0].total_price == Decimal("2970")

    def test_corrects_single_item_total_when_qty_unit_product_matches_receipt_total(self):
        result = RawGeminiExtractionResult(
            merchant_name="VETERINARIA ARAUCANIA LIMITADA",
            transaction_date="2026-03-16",
            currency_code="CLP",
            total_amount=Decimal("12400"),
            line_items=[
                RawLineItemExtraction(
                    name="CLINDABONE 165 MG X COMP",
                    qty=Decimal("8"),
                    unit_price=Decimal("1550"),
                    total_price=Decimal("10420"),
                    source_lines=["8 CLINDABONE 165 MG X COMP", "TOTAL 12.400"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.line_items[0].qty == Decimal("8")
        assert coalesced.line_items[0].unit_price == Decimal("1550")
        assert coalesced.line_items[0].total_price == Decimal("12400")

    def test_visible_clp_total_corrects_cent_scaled_total(self):
        result = RawGeminiExtractionResult(
            merchant_name="MUFIN SPA",
            transaction_date="2025-12-04",
            currency_code="CLP",
            total_amount=Decimal("86000"),
            source_lines=["ESTACIONAMIENTO", "TOTAL: $860"],
            line_items=[],
            confidence_score=0.8,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.total_amount == Decimal("860")
        assert coalesced.line_items[0].total_price == Decimal("860")

    def test_visible_clp_total_synchronizes_sole_service_item(self):
        result = RawGeminiExtractionResult(
            merchant_name="MUFIN SPA",
            transaction_date="2025-12-04",
            currency_code="CLP",
            total_amount=Decimal("86000"),
            source_lines=["ESTACIONAMIENTO", "TOTAL: $860"],
            line_items=[
                RawLineItemExtraction(
                    name="CONCESION ESTACIONAMIENTOS",
                    total_price=Decimal("86000"),
                    source_lines=["CONCESION ESTACIONAMIENTOS", "TOTAL: $860"],
                )
            ],
            confidence_score=0.8,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.total_amount == Decimal("860")
        assert coalesced.line_items[0].total_price == Decimal("860")
        assert coalesced.line_items[0].unit_price == Decimal("860")
        assert coalesced.discount_amount is None

    def test_conflicting_visible_total_is_not_auto_corrected(self):
        result = RawGeminiExtractionResult(
            merchant_name="Store",
            transaction_date="2026-05-10",
            currency_code="CLP",
            total_amount=Decimal("900"),
            source_lines=["TOTAL: $860"],
            line_items=[RawLineItemExtraction(name="Item", total_price=Decimal("900"))],
            confidence_score=0.8,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.total_amount == Decimal("900")
        assert has_visible_total_conflict(result, coalesced) is True

    def test_explicit_quantity_marker_wins_over_package_size_token(self):
        result = RawGeminiExtractionResult(
            merchant_name="Galeries Lafayette",
            transaction_date="2026-05-10",
            currency_code="EUR",
            total_amount=Decimal("3780"),
            line_items=[
                RawLineItemExtraction(
                    name="7X70G BAGUETTE MAGIQ 7 TERRIN",
                    qty=Decimal("2"),
                    unit_price=Decimal("1890"),
                    total_price=Decimal("3780"),
                    source_lines=["7X70G BAGUETTE MAGIQ 7 TERRIN", "Qté : 2 x 18.90 €"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.line_items[0].qty == Decimal("2")
        assert coalesced.line_items[0].unit_price == Decimal("1890")

    def test_package_size_token_is_not_parsed_as_quantity_multiplier(self):
        result = RawGeminiExtractionResult(
            merchant_name="Store",
            transaction_date="2026-05-10",
            currency_code="CLP",
            total_amount=Decimal("1890"),
            line_items=[
                RawLineItemExtraction(
                    name="7X70G SNACK PACK",
                    total_price=Decimal("1890"),
                    source_lines=["7X70G SNACK PACK $ 1.890"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.line_items[0].qty == Decimal("1")
        assert coalesced.line_items[0].unit_price == Decimal("1890")

    def test_tender_and_tax_lines_are_ignored_as_visible_total_candidates(self):
        result = RawGeminiExtractionResult(
            merchant_name="MUFIN SPA",
            transaction_date="2025-12-04",
            currency_code="CLP",
            total_amount=Decimal("86000"),
            source_lines=["IVA TOTAL 860", "TARJETA TOTAL 860"],
            line_items=[],
            confidence_score=0.8,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.total_amount == Decimal("86000")

    def test_article_count_line_is_ignored_as_visible_total_candidate(self):
        candidates = find_visible_total_candidates(
            [
                "TOTAL NUMERO DE ARTIC VEND = 36",
                "TOTAL $ 102.052",
            ],
            "CLP",
        )

        assert Decimal("36") not in candidates
        assert Decimal("102052") in candidates

    def test_raw_null_total_falls_back_to_visible_total(self):
        result = RawGeminiExtractionResult(
            merchant_name="MUFIN SPA",
            transaction_date="2025-12-04",
            currency_code="CLP",
            total_amount=None,
            source_lines=["ESTACIONAMIENTO", "TOTAL: $860"],
            line_items=[],
            confidence_score=0.8,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.total_amount == Decimal("860")
        assert coalesced.line_items[0].total_price == Decimal("860")

    def test_raw_null_total_falls_back_to_reconstructed_total(self):
        result = RawGeminiExtractionResult(
            merchant_name="Store",
            transaction_date="2026-05-10",
            currency_code="USD",
            total_amount=None,
            line_items=[
                RawLineItemExtraction(name="A", total_price=Decimal("500")),
                RawLineItemExtraction(name="Coupon", total_price=Decimal("-100")),
            ],
            confidence_score=0.8,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount == Decimal("100")
        assert coalesced.total_amount == Decimal("400")

    def test_negative_discount_rows_do_not_persist_as_items(self):
        result = _make_result(
            total_amount=Decimal("8400"),
            line_items=[
                LineItemExtraction(name="Product", total_price=Decimal("9000")),
                LineItemExtraction(name="RF Precio Antes Ahora", total_price=Decimal("-600")),
            ],
        )

        coalesced = coalesce_extraction(result)

        assert [item.name for item in coalesced.line_items] == ["Product"]
        assert coalesced.discount_amount == Decimal("600")

    def test_high_confidence_adjustment_only_sets_receipt_discount(self):
        result = RawGeminiExtractionResult(
            merchant_name="Lider",
            transaction_date="2026-05-10",
            currency_code="CLP",
            total_amount=Decimal("8400"),
            line_items=[RawLineItemExtraction(name="Product", total_price=Decimal("9000"))],
            adjustment_lines=[
                ReceiptAdjustmentEvidence(
                    label="RF Precio Antes Ahora",
                    amount=Decimal("600"),
                    applies_to_line_item_indexes=[0],
                    confidence=0.9,
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount == Decimal("600")
        assert coalesced.line_items[0].discount_amount is None
        assert coalesced.line_items[0].discount_label is None

    def test_ignores_adjustment_when_items_already_reconcile_to_total(self):
        result = RawGeminiExtractionResult(
            merchant_name="LOTTEmarket",
            transaction_date="2026-05-10",
            currency_code="USD",
            total_amount=Decimal("12440"),
            line_items=[
                RawLineItemExtraction(name="Groceries", total_price=Decimal("12440")),
            ],
            adjustment_lines=[
                ReceiptAdjustmentEvidence(
                    label="Temporary markdown",
                    amount=Decimal("400"),
                    source_lines=["Temporary markdown", "$4.00"],
                )
            ],
            confidence_score=0.9,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount is None
        assert coalesced.line_items[0].discount_amount is None

    def test_ignores_informational_savings_summary_adjustment(self):
        result = RawGeminiExtractionResult(
            merchant_name="Publix",
            transaction_date="2026-05-10",
            currency_code="USD",
            total_amount=Decimal("2866"),
            line_items=[
                RawLineItemExtraction(name="Groceries", total_price=Decimal("2866")),
            ],
            adjustment_lines=[
                ReceiptAdjustmentEvidence(
                    label="Special Price Savings",
                    amount=Decimal("2575"),
                    source_lines=["Savings Summary", "Special Price Savings 25.75"],
                )
            ],
            confidence_score=0.9,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount is None

    def test_keeps_adjustment_when_it_reconciles_gross_items_to_total(self):
        result = RawGeminiExtractionResult(
            merchant_name="Lider",
            transaction_date="2026-05-10",
            currency_code="CLP",
            total_amount=Decimal("8400"),
            line_items=[RawLineItemExtraction(name="Product", total_price=Decimal("9000"))],
            adjustment_lines=[
                ReceiptAdjustmentEvidence(
                    label="RF Precio Antes Ahora",
                    amount=Decimal("600"),
                    source_lines=["RF Precio Antes Ahora", "-600"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount == Decimal("600")

    def test_accepts_plural_spanish_discount_adjustment(self):
        result = RawGeminiExtractionResult(
            merchant_name="COMERCIAL LILY LTDA.",
            transaction_date="2026-05-10",
            currency_code="CLP",
            total_amount=Decimal("39971"),
            line_items=[
                RawLineItemExtraction(name="Groceries", total_price=Decimal("44161")),
            ],
            adjustment_lines=[
                ReceiptAdjustmentEvidence(
                    label="Total Descuentos",
                    amount=Decimal("4190"),
                    source_lines=["Total Descuentos", "- $ 4.190"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount == Decimal("4190")

    def test_accepts_french_remise_discount_adjustment(self):
        result = RawGeminiExtractionResult(
            merchant_name="SEPHORA PARIS OPERA",
            transaction_date="2026-05-10",
            currency_code="EUR",
            total_amount=Decimal("8400"),
            line_items=[
                RawLineItemExtraction(name="PACO INVICTUS SET 200", total_price=Decimal("11200")),
            ],
            adjustment_lines=[
                ReceiptAdjustmentEvidence(
                    label="REMise",
                    amount=Decimal("2800"),
                    source_lines=["-25% sur tous les coffrets", "REMise EUR 28,00"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount == Decimal("2800")
        assert coalesced.total_amount == Decimal("8400")
        assert coalesced.line_items[0].total_price == Decimal("11200")

    def test_n_for_total_correction_is_conservative_with_adjustment_evidence(self):
        result = RawGeminiExtractionResult(
            merchant_name="Publix",
            transaction_date="2026-05-10",
            currency_code="USD",
            total_amount=Decimal("2866"),
            line_items=[
                RawLineItemExtraction(
                    name="CUCUMBER HOT HOUSE",
                    total_price=Decimal("250"),
                    source_lines=["CUCUMBER HOT HOUSE", "2 FOR 5.00", "2.50 F"],
                )
            ],
            adjustment_lines=[
                ReceiptAdjustmentEvidence(
                    label="Promotion",
                    amount=Decimal("59"),
                    source_lines=["Promotion", "-0.59 F"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.line_items[0].qty == Decimal("2")
        assert coalesced.line_items[0].unit_price == Decimal("250")
        assert coalesced.line_items[0].total_price == Decimal("250")

    def test_ignores_payment_tender_adjustment_lines(self):
        result = RawGeminiExtractionResult(
            merchant_name="The British Museum",
            transaction_date="2026-05-10",
            currency_code="GBP",
            total_amount=Decimal("2997"),
            line_items=[
                RawLineItemExtraction(name="Book", total_price=Decimal("1899")),
                RawLineItemExtraction(name="Card holder", total_price=Decimal("299")),
                RawLineItemExtraction(name="Key ring", total_price=Decimal("799")),
            ],
            adjustment_lines=[
                ReceiptAdjustmentEvidence(
                    label="Credit Card",
                    amount=Decimal("2997"),
                    source_lines=["Credit Card", "**** **** **** 8955"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount is None

    def test_ignores_tax_summary_adjustment_lines(self):
        result = RawGeminiExtractionResult(
            merchant_name="Museum Shop",
            transaction_date="2026-05-10",
            currency_code="GBP",
            total_amount=Decimal("2997"),
            line_items=[
                RawLineItemExtraction(name="Book", total_price=Decimal("2997")),
            ],
            adjustment_lines=[
                ReceiptAdjustmentEvidence(
                    label="VAT summary",
                    amount=Decimal("698"),
                    source_lines=["VAT amount", "6.98"],
                )
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.discount_amount is None

    def test_suppresses_tax_when_items_already_reconcile_to_total(self):
        result = RawGeminiExtractionResult(
            merchant_name="The British Museum",
            transaction_date="2026-05-10",
            currency_code="GBP",
            total_amount=Decimal("2997"),
            tax_amount=Decimal("698"),
            line_items=[
                RawLineItemExtraction(name="Book", total_price=Decimal("1899")),
                RawLineItemExtraction(name="Toy", total_price=Decimal("1098")),
            ],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.tax_amount is None

    def test_keeps_added_tax_when_it_reconciles_to_total(self):
        result = RawGeminiExtractionResult(
            merchant_name="Restaurant",
            transaction_date="2026-05-10",
            currency_code="USD",
            total_amount=Decimal("1075"),
            tax_amount=Decimal("75"),
            line_items=[RawLineItemExtraction(name="Meal", total_price=Decimal("1000"))],
            confidence_score=0.95,
        )

        coalesced = coalesce_extraction(result)

        assert coalesced.tax_amount == Decimal("75")

    def test_synthesizes_service_line_when_positive_total_has_no_items(self):
        result = RawGeminiExtractionResult(
            merchant_name="MUFIN SPA",
            transaction_date="2025-12-04",
            currency_code="CLP",
            total_amount=Decimal("860"),
            source_lines=["ESTACIONAMIENTO", "TOTAL 860"],
            line_items=[],
            confidence_score=0.8,
        )

        coalesced = coalesce_extraction(result)

        assert len(coalesced.line_items) == 1
        assert coalesced.line_items[0].name == "Parking"
        assert coalesced.line_items[0].qty == Decimal("1")
        assert coalesced.line_items[0].unit_price == Decimal("860")
        assert coalesced.line_items[0].total_price == Decimal("860")


class TestMinorUnits:
    def test_clp_no_multiplication(self):
        assert to_minor_units(Decimal("15990"), "CLP") == 15990

    def test_usd_multiply_by_100(self):
        assert to_minor_units(Decimal("48.50"), "USD") == 4850

    def test_usd_minor_units_pass_through(self):
        assert to_minor_units(Decimal("4850"), "USD") == 4850

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
