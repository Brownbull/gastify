"""Tests for math reconciliation gate — sum validation with 1-minor-unit tolerance."""

import json
from decimal import Decimal

from app.schemas.scan import GeminiExtractionResult, LineItemExtraction
from app.services.math_gate import reconcile


def _extraction(
    total: str,
    items: list[tuple[str, str]],
    currency: str = "CLP",
    tax: str | None = None,
    discount: str | None = None,
) -> GeminiExtractionResult:
    return GeminiExtractionResult(
        merchant_name="Test",
        transaction_date="2026-05-12",
        currency_code=currency,
        total_amount=Decimal(total),
        tax_amount=Decimal(tax) if tax else None,
        discount_amount=Decimal(discount) if discount else None,
        line_items=[
            LineItemExtraction(name=name, total_price=Decimal(price)) for name, price in items
        ],
        confidence_score=0.9,
    )


class TestReconcileExactMatch:
    def test_clp_exact_match(self):
        ext = _extraction("15990", [("Leche", "2990"), ("Pan", "13000")])
        verdict = reconcile(ext)
        assert verdict.passed is True
        assert verdict.discrepancy_minor_units == 0
        assert verdict.reconstructed_total == 15990
        assert verdict.discrepancy_ratio == 0
        assert verdict.severity == "none"
        assert verdict.adjusted_total is None

    def test_usd_exact_match(self):
        ext = _extraction("48.50", [("Coffee", "3.50"), ("Sandwich", "45.00")], currency="USD")
        verdict = reconcile(ext)
        assert verdict.passed is True
        assert verdict.discrepancy_minor_units == 0

    def test_usd_minor_unit_contract_exact_match(self):
        ext = _extraction("4850", [("Coffee", "350"), ("Sandwich", "4500")], currency="USD")
        verdict = reconcile(ext)
        assert verdict.passed is True
        assert verdict.discrepancy_minor_units == 0

    def test_single_item_matches_total(self):
        ext = _extraction("5990", [("Item", "5990")])
        verdict = reconcile(ext)
        assert verdict.passed is True


class TestReconcileWithTolerance:
    def test_clp_one_peso_tolerance_passes(self):
        ext = _extraction("15991", [("Leche", "2990"), ("Pan", "13000")])
        verdict = reconcile(ext)
        assert verdict.passed is True
        assert verdict.discrepancy_minor_units == 1

    def test_usd_one_cent_tolerance_passes(self):
        ext = _extraction("48.51", [("A", "3.50"), ("B", "45.00")], currency="USD")
        verdict = reconcile(ext)
        assert verdict.passed is True
        assert verdict.discrepancy_minor_units == 1

    def test_usd_minor_unit_contract_one_cent_tolerance_passes(self):
        ext = _extraction("4851", [("A", "350"), ("B", "4500")], currency="USD")
        verdict = reconcile(ext)
        assert verdict.passed is True
        assert verdict.discrepancy_minor_units == 1

    def test_two_minor_units_fails(self):
        ext = _extraction("15992", [("Leche", "2990"), ("Pan", "13000")])
        verdict = reconcile(ext)
        assert verdict.passed is False
        assert verdict.discrepancy_minor_units == 2
        assert verdict.reconstructed_total == 15990
        assert verdict.adjusted_total is None
        assert verdict.severity == "minor"

    def test_policy_file_controls_exact_tolerance(self, tmp_path, monkeypatch):
        policy_path = tmp_path / "policy.json"
        policy_path.write_text(
            json.dumps(
                {
                    "policy_id": "receipt-validation-policy",
                    "policy_version": "test",
                    "math_exact_tolerance_minor_units": 2,
                    "major_reconstruction_discrepancy_ratio": 0.25,
                    "significant_item_count_delta_ratio": 0.25,
                    "significant_item_total_mismatch_ratio": 0.25,
                    "significant_quantity_mismatch_ratio": 0.25,
                    "significant_unit_price_mismatch_ratio": 0.25,
                    "significant_discount_delta_ratio": 0.25,
                    "discount_delta_denominator": "expected_final_total_minor",
                }
            ),
            encoding="utf-8",
        )
        monkeypatch.setenv("GASTIFY_RECEIPT_VALIDATION_POLICY_PATH", str(policy_path))

        ext = _extraction("15992", [("Leche", "2990"), ("Pan", "13000")])
        verdict = reconcile(ext)

        assert verdict.passed is True
        assert verdict.discrepancy_minor_units == 2
        assert verdict.severity == "none"


class TestReconcileWithTax:
    def test_tax_included_in_reconciliation(self):
        ext = _extraction(
            "17489",
            [("Leche", "2990"), ("Pan", "13000")],
            tax="1499",
        )
        verdict = reconcile(ext)
        assert verdict.passed is True
        assert verdict.discrepancy_minor_units == 0

    def test_usd_tax(self):
        ext = _extraction(
            "53.55",
            [("Coffee", "3.50"), ("Sandwich", "45.00")],
            currency="USD",
            tax="5.05",
        )
        verdict = reconcile(ext)
        assert verdict.passed is True


class TestReconcileWithDiscount:
    def test_discount_subtracted(self):
        ext = _extraction(
            "14990",
            [("Leche", "2990"), ("Pan", "13000")],
            discount="1000",
        )
        verdict = reconcile(ext)
        assert verdict.passed is True
        assert verdict.discrepancy_minor_units == 0

    def test_item_discount_is_informational_when_receipt_discount_missing(self):
        ext = GeminiExtractionResult(
            merchant_name="Test",
            transaction_date="2026-05-12",
            currency_code="CLP",
            total_amount=Decimal("14990"),
            tax_amount=None,
            discount_amount=None,
            line_items=[
                LineItemExtraction(
                    name="Leche",
                    total_price=Decimal("2990"),
                ),
                LineItemExtraction(
                    name="Pan",
                    total_price=Decimal("13000"),
                    discount_amount=Decimal("1000"),
                ),
            ],
            confidence_score=0.9,
        )

        verdict = reconcile(ext)

        assert verdict.passed is False
        assert verdict.discrepancy_minor_units == 1000
        assert verdict.reconstructed_total == 15990
        assert verdict.severity == "minor"

    def test_tax_and_discount_combined(self):
        ext = _extraction(
            "16489",
            [("Leche", "2990"), ("Pan", "13000")],
            tax="1499",
            discount="1000",
        )
        verdict = reconcile(ext)
        assert verdict.passed is True


class TestReconcileFails:
    def test_large_discrepancy(self):
        ext = _extraction("20000", [("Leche", "2990"), ("Pan", "13000")])
        verdict = reconcile(ext)
        assert verdict.passed is False
        assert verdict.discrepancy_minor_units == 4010
        assert verdict.reconstructed_total == 15990
        assert verdict.adjusted_total is None
        assert verdict.severity == "minor"

    def test_usd_large_discrepancy(self):
        ext = _extraction("100.00", [("A", "3.50"), ("B", "45.00")], currency="USD")
        verdict = reconcile(ext)
        assert verdict.passed is False
        assert verdict.discrepancy_minor_units == 5150
        assert verdict.reconstructed_total == 4850
        assert verdict.adjusted_total is None
        assert verdict.severity == "major_warning"
        assert verdict.discrepancy_ratio == 0.515


class TestReconcileEdgeCases:
    def test_no_items_zero_total(self):
        ext = _extraction("0", [])
        verdict = reconcile(ext)
        assert verdict.passed is True
        assert verdict.discrepancy_minor_units == 0

    def test_jpy_zero_exponent(self):
        ext = _extraction("1500", [("Onigiri", "300"), ("Ramen", "1200")], currency="JPY")
        verdict = reconcile(ext)
        assert verdict.passed is True
