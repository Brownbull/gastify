import json
from decimal import Decimal
from pathlib import Path

import pytest
from PIL import Image
from pydantic_ai.exceptions import ModelHTTPError

from app.agents.categorization import CategorizationOutput, CategorizationUsage
from app.agents.extraction import ExtractionResult, ExtractionUsage
from app.prompt_lab import import_legacy as import_mod
from app.prompt_lab import runner as runner_mod
from app.prompt_lab.adapter import ExpectedReceipt, adapt_legacy_payload, load_expected_receipt
from app.prompt_lab.batch_report import write_batch_report
from app.prompt_lab.cache import build_cache_key
from app.prompt_lab.cases import PromptCase, get_case
from app.prompt_lab.cli import main
from app.prompt_lab.costs import build_cost_summary
from app.prompt_lab.provenance import build_field_provenance
from app.prompt_lab.scoring import score_prompt_run
from app.schemas.scan import (
    CategorizationResult,
    CategoryAssignment,
    GeminiExtractionResult,
    LineItemExtraction,
    MathReconciliationVerdict,
    RawGeminiExtractionResult,
    RawLineItemExtraction,
    ReceiptAdjustmentEvidence,
)
from app.services.coalesce import coalesce_extraction


def test_legacy_import_whitelists_receipts_and_skips_private_or_deferred_files(
    tmp_path,
    monkeypatch,
):
    source = tmp_path / "legacy"
    dest = tmp_path / "prompt-testing" / "test-cases" / "receipts"
    source.mkdir()
    (source / "supermarket").mkdir()
    (source / "CreditCard").mkdir()

    (source / "supermarket" / "receipt.jpg").write_bytes(b"jpg")
    (source / "supermarket" / "receipt.expected.json").write_text("{}", encoding="utf-8")
    (source / "supermarket" / "receipt.pdf").write_bytes(b"pdf")
    (source / "CreditCard" / "statement.jpg").write_bytes(b"card")
    (source / "credentials.json").write_text("{}", encoding="utf-8")

    monkeypatch.setattr(import_mod, "TEST_CASES_ROOT", dest)
    monkeypatch.setattr(import_mod, "IMPORT_MANIFEST_PATH", tmp_path / "import-manifest.json")
    monkeypatch.setattr(import_mod, "ensure_workspace", lambda: dest.mkdir(parents=True))

    manifest = import_mod.import_legacy_cases(source, force=True)

    assert (dest / "supermarket" / "receipt.jpg").exists()
    assert (dest / "supermarket" / "receipt.expected.json").exists()
    assert manifest["summary"]["imported"] == 2
    skipped_reasons = {entry["reason"] for entry in manifest["skipped"]}
    assert "excluded document family" in skipped_reasons
    assert "excluded credential file" in skipped_reasons
    assert "excluded file type" in skipped_reasons


def test_legacy_adapter_applies_corrections_and_chilean_thousands():
    expected = adapt_legacy_payload(
        {
            "input": {"currency": "CLP", "receiptType": "auto"},
            "expectedAfterCoercion": {
                "merchant": "Falabella Villarrica",
                "date": "2026-03-01",
                "total": "1.523.990",
                "items": [
                    {
                        "name": "TV Samsung",
                        "totalPrice": "1.499.990",
                        "quantity": 1,
                        "category": "Electronics",
                    }
                ],
            },
            "corrections": {"merchant": "Falabella"},
        },
        case_id="adversarial/chilean-thousands",
    )

    assert expected.merchant == "Falabella"
    assert expected.total_minor == 1523990
    assert expected.items[0].total_minor == 1499990
    assert expected.scan_context["receiptType"] == "auto"


def test_legacy_adapter_converts_negative_discount_rows_to_canonical_fields():
    expected = adapt_legacy_payload(
        {
            "input": {"currency": "CLP"},
            "aiExtraction": {
                "merchant": "Lider",
                "date": "2026-05-10",
                "total": 8400,
                "currency": "CLP",
                "items": [
                    {"name": "Product", "unitPrice": 9000, "totalPrice": 9000, "quantity": 1},
                    {"name": "Discount", "unitPrice": -600, "totalPrice": -600, "quantity": 1},
                ],
            },
        },
        case_id="supermarket/discount",
    )

    assert len(expected.items) == 1
    assert expected.discount_total_minor == 600
    assert expected.items[0].discount_minor is None
    assert expected.items[0].discount_label is None


def test_cache_key_changes_when_model_prompt_or_context_changes():
    base = build_cache_key(
        raw_image_hash="raw",
        processed_image_hash="processed",
        model="gemini-2.5-flash-lite",
        extraction_prompt_id="receipt-extraction-current",
        categorization_prompt_id="item-categorization-current",
        scan_context={"currency": "CLP"},
    )
    changed_model = build_cache_key(
        raw_image_hash="raw",
        processed_image_hash="processed",
        model="gemini-2.5-flash",
        extraction_prompt_id="receipt-extraction-current",
        categorization_prompt_id="item-categorization-current",
        scan_context={"currency": "CLP"},
    )
    changed_context = build_cache_key(
        raw_image_hash="raw",
        processed_image_hash="processed",
        model="gemini-2.5-flash-lite",
        extraction_prompt_id="receipt-extraction-current",
        categorization_prompt_id="item-categorization-current",
        scan_context={"currency": "USD"},
    )

    assert base != changed_model
    assert base != changed_context


def test_scoring_covers_extraction_categories_and_math_gate():
    expected = adapt_legacy_payload(
        {
            "aiExtraction": {
                "merchant": "Jumbo",
                "date": "2026-05-12",
                "total": 15990,
                "currency": "CLP",
                "items": [{"name": "Leche", "totalPrice": 15990, "quantity": 1}],
                "aiMetadata": {"confidence": 0.9},
            }
        },
        case_id="supermarket/jumbo",
    )
    extraction = GeminiExtractionResult(
        merchant_name="Jumbo",
        transaction_date="2026-05-12",
        currency_code="CLP",
        total_amount=Decimal("15990"),
        line_items=[LineItemExtraction(name="Leche", total_price=Decimal("15990"))],
        confidence_score=0.95,
    )
    categorization = CategorizationResult(
        assignments=[
            CategoryAssignment(line_item_index=0, category_key="DairyEggs", confidence=0.9)
        ]
    )

    score = score_prompt_run(
        expected=expected,
        extraction=extraction,
        categorization=categorization,
        verdict=MathReconciliationVerdict(passed=True, discrepancy_minor_units=0),
    )

    assert score.passed is True
    assert score.extraction["total_match"] is True
    assert score.categorization["all_category_keys_valid"] is True
    assert score.pipeline["state"] == "completed"
    assert score.transaction_gate["passed"] is True
    assert score.reconstruction_gate["passed"] is True
    assert score.strict_status == "completed"
    assert score.severity_status == "pass"
    assert score.validation_policy["policy_version"] == "2026-05-20.v1"


def test_scoring_separates_transaction_and_reconstruction_gates():
    expected = adapt_legacy_payload(
        {
            "aiExtraction": {
                "merchant": "Jumbo",
                "date": "2026-05-12",
                "total": 14990,
                "currency": "CLP",
                "items": [
                    {"name": "Leche", "unitPrice": 15990, "totalPrice": 15990, "quantity": 1},
                    {"name": "Discount", "unitPrice": -1000, "totalPrice": -1000, "quantity": 1},
                ],
            }
        },
        case_id="supermarket/jumbo",
    )
    extraction = GeminiExtractionResult(
        merchant_name="Jumbo",
        transaction_date="2026-05-12",
        currency_code="CLP",
        total_amount=Decimal("14990"),
        discount_amount=Decimal("1000"),
        line_items=[LineItemExtraction(name="Leche", total_price=Decimal("15990"))],
        confidence_score=0.95,
    )
    categorization = CategorizationResult(
        assignments=[
            CategoryAssignment(line_item_index=0, category_key="DairyEggs", confidence=0.9)
        ]
    )

    score = score_prompt_run(
        expected=expected,
        extraction=extraction,
        categorization=categorization,
        verdict=MathReconciliationVerdict(passed=True, discrepancy_minor_units=0),
    )

    assert score.transaction_gate["passed"] is True
    assert score.reconstruction_gate["passed"] is False
    assert score.passed is False
    assert score.strict_status == "threshold-failed"
    assert score.severity_status == "significant_failure"


def test_reconstruction_gate_requires_item_total_matches():
    expected = adapt_legacy_payload(
        {
            "aiExtraction": {
                "merchant": "Vet",
                "date": "2026-05-12",
                "total": 12400,
                "currency": "CLP",
                "items": [
                    {"name": "Medication", "unitPrice": 1550, "totalPrice": 12400, "quantity": 8}
                ],
            }
        },
        case_id="edge/qty-total",
    )
    extraction = GeminiExtractionResult(
        merchant_name="Vet",
        transaction_date="2026-05-12",
        currency_code="CLP",
        total_amount=Decimal("12400"),
        line_items=[
            LineItemExtraction(
                name="Medication",
                qty=Decimal("8"),
                unit_price=Decimal("1550"),
                total_price=Decimal("10420"),
            )
        ],
        confidence_score=0.95,
    )

    score = score_prompt_run(
        expected=expected,
        extraction=extraction,
        categorization=CategorizationResult(
            assignments=[
                CategoryAssignment(line_item_index=0, category_key="Medications", confidence=0.9)
            ]
        ),
        verdict=MathReconciliationVerdict(
            passed=False,
            discrepancy_minor_units=1980,
            reconstructed_total=10420,
            discrepancy_ratio=0.159677,
            severity="minor",
        ),
    )

    assert score.reconstruction_gate["item_total_matches"] == 0
    assert score.reconstruction_gate["item_total_matches_by_name"] == 0
    assert score.reconstruction_gate["item_totals_match"] is False
    assert score.reconstruction_gate["passed"] is False
    assert score.strict_status == "threshold-failed"


def test_reconstruction_gate_uses_name_aware_item_matches_for_swapped_rows():
    expected = adapt_legacy_payload(
        {
            "aiExtraction": {
                "merchant": "Store",
                "date": "2026-05-12",
                "total": 300,
                "currency": "CLP",
                "items": [
                    {"name": "Apple", "unitPrice": 100, "totalPrice": 100, "quantity": 1},
                    {"name": "Bread", "unitPrice": 200, "totalPrice": 200, "quantity": 1},
                ],
            }
        },
        case_id="local/swapped",
    )
    extraction = GeminiExtractionResult(
        merchant_name="Store",
        transaction_date="2026-05-12",
        currency_code="CLP",
        total_amount=Decimal("300"),
        line_items=[
            LineItemExtraction(
                name="Bread",
                qty=Decimal("1"),
                unit_price=Decimal("200"),
                total_price=Decimal("200"),
            ),
            LineItemExtraction(
                name="Apple",
                qty=Decimal("1"),
                unit_price=Decimal("100"),
                total_price=Decimal("100"),
            ),
        ],
        confidence_score=0.95,
    )

    score = score_prompt_run(
        expected=expected,
        extraction=extraction,
        categorization=CategorizationResult(
            assignments=[
                CategoryAssignment(line_item_index=0, category_key="OtherItem", confidence=0.9),
                CategoryAssignment(line_item_index=1, category_key="Produce", confidence=0.9),
            ]
        ),
        verdict=MathReconciliationVerdict(passed=True, discrepancy_minor_units=0),
    )

    assert score.reconstruction_gate["item_total_matches"] == 0
    assert score.reconstruction_gate["item_total_matches_by_name"] == 2
    assert score.reconstruction_gate["quantity_matches_by_name"] == 2
    assert score.reconstruction_gate["unit_price_matches_by_name"] == 2
    assert score.reconstruction_gate["full_item_matches_by_name"] == 2
    assert score.reconstruction_gate["passed"] is True
    assert score.passed is True
    assert score.severity_status == "pass"


def test_name_aware_matching_handles_duplicate_names_once_by_best_amount():
    expected = adapt_legacy_payload(
        {
            "aiExtraction": {
                "merchant": "Store",
                "date": "2026-05-12",
                "total": 300,
                "currency": "CLP",
                "items": [
                    {"name": "Cookie", "unitPrice": 100, "totalPrice": 100, "quantity": 1},
                    {"name": "Cookie", "unitPrice": 200, "totalPrice": 200, "quantity": 1},
                ],
            }
        },
        case_id="local/duplicates",
    )
    extraction = GeminiExtractionResult(
        merchant_name="Store",
        transaction_date="2026-05-12",
        currency_code="CLP",
        total_amount=Decimal("300"),
        line_items=[
            LineItemExtraction(
                name="Cookie",
                qty=Decimal("1"),
                unit_price=Decimal("200"),
                total_price=Decimal("200"),
            ),
            LineItemExtraction(
                name="Cookie",
                qty=Decimal("1"),
                unit_price=Decimal("100"),
                total_price=Decimal("100"),
            ),
        ],
        confidence_score=0.95,
    )

    score = score_prompt_run(
        expected=expected,
        extraction=extraction,
        categorization=CategorizationResult(
            assignments=[
                CategoryAssignment(line_item_index=0, category_key="Snacks", confidence=0.9),
                CategoryAssignment(line_item_index=1, category_key="Snacks", confidence=0.9),
            ]
        ),
        verdict=MathReconciliationVerdict(passed=True, discrepancy_minor_units=0),
    )

    assert score.reconstruction_gate["matched_item_names"] == 2
    assert score.reconstruction_gate["item_total_matches"] == 0
    assert score.reconstruction_gate["item_total_matches_by_name"] == 2
    assert score.reconstruction_gate["full_item_matches_by_name"] == 2
    assert score.passed is True


def test_extra_rows_fail_strict_but_do_not_inflate_item_price_severity():
    expected = adapt_legacy_payload(
        {
            "aiExtraction": {
                "merchant": "Store",
                "date": "2026-05-12",
                "total": 1000,
                "currency": "CLP",
                "items": [
                    {"name": "A", "unitPrice": 250, "totalPrice": 250, "quantity": 1},
                    {"name": "B", "unitPrice": 250, "totalPrice": 250, "quantity": 1},
                    {"name": "C", "unitPrice": 250, "totalPrice": 250, "quantity": 1},
                    {"name": "D", "unitPrice": 250, "totalPrice": 250, "quantity": 1},
                ],
            }
        },
        case_id="local/extra-row",
    )
    extraction = GeminiExtractionResult(
        merchant_name="Store",
        transaction_date="2026-05-12",
        currency_code="CLP",
        total_amount=Decimal("1000"),
        line_items=[
            LineItemExtraction(
                name=name,
                qty=Decimal("1"),
                unit_price=Decimal("250"),
                total_price=Decimal("250"),
            )
            for name in ("A", "B", "C", "D")
        ]
        + [
            LineItemExtraction(
                name="Extra",
                qty=Decimal("1"),
                unit_price=Decimal("10"),
                total_price=Decimal("10"),
            )
        ],
        confidence_score=0.95,
    )

    score = score_prompt_run(
        expected=expected,
        extraction=extraction,
        categorization=CategorizationResult(
            assignments=[
                CategoryAssignment(line_item_index=index, category_key="OtherItem", confidence=0.9)
                for index in range(5)
            ]
        ),
        verdict=MathReconciliationVerdict(
            passed=False,
            discrepancy_minor_units=10,
            reconstructed_total=1010,
            discrepancy_ratio=0.01,
            severity="minor",
        ),
    )

    assert score.reconstruction_gate["item_count_delta"] == 1
    assert score.reconstruction_gate["item_total_matches_by_name"] == 4
    assert score.reconstruction_gate["passed"] is False
    assert score.strict_status == "threshold-failed"
    assert score.severity_status == "minor_review"
    assert not any("item total" in reason for reason in score.severity_reasons)


def test_single_item_name_miss_uses_positional_amounts_for_severity_only():
    expected = adapt_legacy_payload(
        {
            "aiExtraction": {
                "merchant": "Cafe",
                "date": "2026-05-12",
                "total": 23700,
                "currency": "CLP",
                "items": [
                    {
                        "name": "Restaurant charge",
                        "unitPrice": 23700,
                        "totalPrice": 23700,
                        "quantity": 1,
                    }
                ],
            }
        },
        case_id="local/single-item-name-miss",
    )
    extraction = GeminiExtractionResult(
        merchant_name="Cafe",
        transaction_date="2026-05-12",
        currency_code="CLP",
        total_amount=Decimal("23700"),
        line_items=[
            LineItemExtraction(
                name="Card payment",
                qty=Decimal("1"),
                unit_price=Decimal("23700"),
                total_price=Decimal("23700"),
            )
        ],
        confidence_score=0.95,
    )

    score = score_prompt_run(
        expected=expected,
        extraction=extraction,
        categorization=CategorizationResult(
            assignments=[
                CategoryAssignment(line_item_index=0, category_key="OtherItem", confidence=0.9)
            ]
        ),
        verdict=MathReconciliationVerdict(passed=True, discrepancy_minor_units=0),
    )

    assert score.reconstruction_gate["matched_item_names"] == 0
    assert score.reconstruction_gate["item_total_matches"] == 1
    assert score.reconstruction_gate["item_total_matches_by_name"] == 0
    assert score.reconstruction_gate["single_item_positional_fallback"] is True
    assert score.reconstruction_gate["passed"] is False
    assert score.strict_status == "threshold-failed"
    assert score.severity_status == "minor_review"
    assert score.severity_reasons == [
        "minor: strict gate failed below configured significance thresholds"
    ]


def test_scoring_thresholds_are_severity_only():
    expected = adapt_legacy_payload(
        {
            "aiExtraction": {
                "merchant": "Store",
                "date": "2026-05-12",
                "total": 1000,
                "currency": "CLP",
                "items": [
                    {"name": "A", "unitPrice": 250, "totalPrice": 250, "quantity": 1},
                    {"name": "B", "unitPrice": 250, "totalPrice": 250, "quantity": 1},
                    {"name": "C", "unitPrice": 250, "totalPrice": 250, "quantity": 1},
                    {"name": "D", "unitPrice": 250, "totalPrice": 250, "quantity": 1},
                ],
            }
        },
        case_id="local/thresholds",
    )
    categorization = CategorizationResult(
        assignments=[
            CategoryAssignment(line_item_index=index, category_key="OtherItem", confidence=0.9)
            for index in range(3)
        ]
    )
    extraction = GeminiExtractionResult(
        merchant_name="Store",
        transaction_date="2026-05-12",
        currency_code="CLP",
        total_amount=Decimal("1000"),
        line_items=[
            LineItemExtraction(name="A", unit_price=Decimal("250"), total_price=Decimal("250")),
            LineItemExtraction(name="B", unit_price=Decimal("250"), total_price=Decimal("250")),
            LineItemExtraction(name="C", unit_price=Decimal("250"), total_price=Decimal("250")),
        ],
        confidence_score=0.95,
    )

    score = score_prompt_run(
        expected=expected,
        extraction=extraction,
        categorization=categorization,
        verdict=MathReconciliationVerdict(
            passed=False,
            discrepancy_minor_units=250,
            reconstructed_total=750,
            discrepancy_ratio=0.25,
            severity="minor",
        ),
    )

    assert score.passed is False
    assert score.strict_status == "threshold-failed"
    assert score.severity_status == "minor_review"


def test_scoring_marks_over_threshold_item_loss_as_significant():
    expected = adapt_legacy_payload(
        {
            "aiExtraction": {
                "merchant": "Store",
                "date": "2026-05-12",
                "total": 1000,
                "currency": "CLP",
                "items": [
                    {"name": "A", "unitPrice": 250, "totalPrice": 250, "quantity": 1},
                    {"name": "B", "unitPrice": 250, "totalPrice": 250, "quantity": 1},
                    {"name": "C", "unitPrice": 250, "totalPrice": 250, "quantity": 1},
                    {"name": "D", "unitPrice": 250, "totalPrice": 250, "quantity": 1},
                ],
            }
        },
        case_id="local/significant",
    )
    extraction = GeminiExtractionResult(
        merchant_name="Store",
        transaction_date="2026-05-12",
        currency_code="CLP",
        total_amount=Decimal("1000"),
        line_items=[
            LineItemExtraction(name="A", unit_price=Decimal("250"), total_price=Decimal("250")),
            LineItemExtraction(name="B", unit_price=Decimal("250"), total_price=Decimal("250")),
        ],
        confidence_score=0.95,
    )
    categorization = CategorizationResult(
        assignments=[
            CategoryAssignment(line_item_index=index, category_key="OtherItem", confidence=0.9)
            for index in range(2)
        ]
    )

    score = score_prompt_run(
        expected=expected,
        extraction=extraction,
        categorization=categorization,
        verdict=MathReconciliationVerdict(
            passed=False,
            discrepancy_minor_units=500,
            reconstructed_total=500,
            discrepancy_ratio=0.5,
            severity="major_warning",
        ),
    )

    assert score.passed is False
    assert score.strict_status == "threshold-failed"
    assert score.severity_status == "significant_failure"
    assert any("item count" in reason for reason in score.severity_reasons)


def test_cost_summary_uses_flash_lite_standard_pricing():
    summary = build_cost_summary(
        model_name="google-gla:gemini-2.5-flash-lite",
        usage={
            "extraction": {"input_tokens": 1_000_000, "output_tokens": 1_000_000},
            "categorization": {"input_tokens": 500_000, "output_tokens": 250_000},
        },
    )

    assert summary["pricing"]["input_per_1m_usd"] == "0.1"
    assert summary["pricing"]["output_per_1m_usd"] == "0.4"
    assert summary["pricing"]["verified_on"] == "2026-05-20"
    assert summary["stages"]["extraction"]["cost_usd"] == "0.5"
    assert summary["stages"]["categorization"]["cost_usd"] == "0.15"
    assert summary["totals"]["cost_usd"] == "0.65"
    assert summary["legacy_comparison"]["legacy_cost_kind"] == "legacy_flat_estimate"
    assert summary["legacy_comparison"]["legacy_token_kind"] == "legacy_rough_token_estimate"


def test_cost_summary_knows_gemini_3_5_flash_standard_pricing():
    summary = build_cost_summary(
        model_name="google-gla:gemini-3.5-flash",
        usage={
            "extraction": {"input_tokens": 1_000_000, "output_tokens": 1_000_000},
        },
    )

    assert summary["pricing"]["input_per_1m_usd"] == "1.5"
    assert summary["pricing"]["output_per_1m_usd"] == "9"
    assert summary["pricing"]["tier"] == "standard"
    assert summary["stages"]["extraction"]["cost_usd"] == "10.5"


def test_field_provenance_classifies_prompt_and_postprocess_fields():
    raw = RawGeminiExtractionResult(
        merchant_name="The British Museum",
        transaction_date="2026-05-10",
        currency_code="GBP",
        total_amount=Decimal("2997"),
        tax_amount=Decimal("698"),
        line_items=[RawLineItemExtraction(name="Book", total_price=Decimal("2997"))],
        adjustment_lines=[
            ReceiptAdjustmentEvidence(
                label="Credit Card",
                amount=Decimal("2997"),
                source_lines=["Credit Card", "**** **** **** 8955"],
            )
        ],
        confidence_score=0.9,
    )
    processed = coalesce_extraction(raw)
    verdict = MathReconciliationVerdict(passed=True, discrepancy_minor_units=0)
    provenance = build_field_provenance(
        raw_extraction=raw,
        processed_extraction=processed,
        categorization=CategorizationResult(assignments=[]),
        verdict=verdict,
        score={"pipeline": {"completed": True}},
    )
    fields = {field["field_path"]: field for field in provenance["fields"]}

    assert fields["extraction.tax_amount"]["origin_stage"] == "postprocess"
    assert fields["extraction.tax_amount"]["operation"] == "removed"
    assert "Tax was suppressed" in fields["extraction.tax_amount"]["notes"]
    assert fields["raw_extraction.adjustment_lines[0]"]["operation"] == "ignored_by_postprocess"
    assert fields["verdict.passed"]["origin_stage"] == "deterministic_math_gate"
    assert fields["score.pipeline.completed"]["origin_stage"] == "scoring"


def test_field_provenance_marks_synthesized_service_line():
    raw = RawGeminiExtractionResult(
        merchant_name="MUFIN SPA",
        transaction_date="2025-12-04",
        currency_code="CLP",
        total_amount=Decimal("860"),
        source_lines=["ESTACIONAMIENTO", "TOTAL 860"],
        line_items=[],
        confidence_score=0.8,
    )
    processed = coalesce_extraction(raw)
    provenance = build_field_provenance(
        raw_extraction=raw,
        processed_extraction=processed,
    )

    synthesized = [
        field
        for field in provenance["fields"]
        if field["operation"] == "synthesized" and field["field_path"] == "extraction.line_items[0]"
    ]
    assert synthesized
    assert synthesized[0]["origin_stage"] == "postprocess"


def test_field_provenance_marks_visible_total_correction_and_quantity_evidence():
    raw = RawGeminiExtractionResult(
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
            ),
            RawLineItemExtraction(
                name="7X70G BAGUETTE",
                qty=Decimal("2"),
                unit_price=Decimal("1890"),
                total_price=Decimal("3780"),
                source_lines=["7X70G BAGUETTE", "Qté : 2 x 18.90 €"],
            ),
        ],
        confidence_score=0.8,
    )
    processed = coalesce_extraction(raw)
    provenance = build_field_provenance(
        raw_extraction=raw,
        processed_extraction=processed,
    )
    fields = {field["field_path"]: field for field in provenance["fields"]}

    assert fields["extraction.total_amount"]["final_value"] == "860"
    assert "visible total evidence" in fields["extraction.total_amount"]["notes"]
    assert fields["raw_extraction.visible_total_candidates"]["operation"] == "raw_evidence_only"
    assert (
        fields["raw_extraction.line_items[1].quantity_evidence.package_size"]["operation"]
        == "multiplier_rejected"
    )
    assert (
        fields["raw_extraction.line_items[1].quantity_evidence.multiplier"]["operation"]
        == "multiplier_accepted"
    )


def test_field_provenance_marks_n_for_price_and_major_warning():
    raw = RawGeminiExtractionResult(
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
        confidence_score=0.8,
    )
    processed = coalesce_extraction(raw)
    verdict = MathReconciliationVerdict(
        passed=False,
        discrepancy_minor_units=1000,
        reconstructed_total=1500,
        discrepancy_ratio=2,
        severity="major_warning",
    )

    provenance = build_field_provenance(
        raw_extraction=raw,
        processed_extraction=processed,
        verdict=verdict,
    )
    fields = {field["field_path"]: field for field in provenance["fields"]}

    assert (
        fields["raw_extraction.line_items[0].quantity_evidence.n_for_price"]["operation"]
        == "n_for_price_parsed"
    )
    assert fields["verdict.reconstruction_warning"]["operation"] == "major_reconstruction_warning"


def test_score_blocks_unresolved_visible_total_conflict():
    expected = ExpectedReceipt(
        case_id="local/conflict",
        merchant="Store",
        transaction_date="2026-05-10",
        currency="CLP",
        total_minor=860,
        discount_total_minor=None,
        items=[],
    )
    raw = RawGeminiExtractionResult(
        merchant_name="Store",
        transaction_date="2026-05-10",
        currency_code="CLP",
        total_amount=Decimal("900"),
        source_lines=["TOTAL: $860"],
        line_items=[],
        confidence_score=0.8,
    )
    extraction = GeminiExtractionResult(
        merchant_name="Store",
        transaction_date="2026-05-10",
        currency_code="CLP",
        total_amount=Decimal("900"),
        line_items=[],
        confidence_score=0.8,
    )

    score = score_prompt_run(
        expected=expected,
        extraction=extraction,
        raw_extraction=raw,
        categorization=CategorizationResult(assignments=[]),
        verdict=MathReconciliationVerdict(passed=True, discrepancy_minor_units=0),
    )

    assert score.extraction["visible_total_conflict"] is True
    assert score.transaction_gate["passed"] is False


def test_unbaselined_smoke_scores_runtime_validity_without_expected_values():
    extraction = GeminiExtractionResult(
        merchant_name="Superdrug",
        transaction_date="2025-05-26",
        currency_code="GBP",
        total_amount=Decimal("2324"),
        line_items=[
            LineItemExtraction(name="Blush", total_price=Decimal("1175")),
            LineItemExtraction(name="Mascara", total_price=Decimal("349")),
            LineItemExtraction(name="Selected", total_price=Decimal("800")),
        ],
        confidence_score=1,
    )
    categorization = CategorizationResult(
        assignments=[
            CategoryAssignment(line_item_index=0, category_key="PersonalCare", confidence=0.9),
            CategoryAssignment(line_item_index=1, category_key="PersonalCare", confidence=0.9),
            CategoryAssignment(line_item_index=2, category_key="PersonalCare", confidence=0.9),
        ]
    )

    score = score_prompt_run(
        expected=None,
        extraction=extraction,
        categorization=categorization,
        verdict=MathReconciliationVerdict(
            passed=True,
            discrepancy_minor_units=0,
            reconstructed_total=2324,
        ),
    )

    assert score.transaction_gate["baseline_available"] is False
    assert score.transaction_gate["passed"] is True
    assert score.reconstruction_gate["passed"] is True
    assert score.passed is True


def test_batch_report_explains_threshold_failures(tmp_path):
    case_dir = tmp_path / "case"
    case_dir.mkdir()
    baseline_path = case_dir / "receipt.expected.json"
    raw_path = case_dir / "raw_output.json"
    processed_path = case_dir / "processed_output.json"
    score_path = case_dir / "score.json"
    cost_path = case_dir / "cost_summary.json"
    manifest_path = case_dir / "manifest.json"

    baseline_path.write_text(
        json.dumps(
            {
                "aiExtraction": {
                    "merchant": "Store",
                    "date": "2026-05-10",
                    "total": 1000,
                    "currency": "CLP",
                    "items": [
                        {"name": "A", "totalPrice": 900, "unitPrice": 900, "quantity": 1},
                        {"name": "B", "totalPrice": 200, "unitPrice": 200, "quantity": 1},
                        {"name": "Discount", "totalPrice": -100, "quantity": 1},
                    ],
                }
            }
        ),
        encoding="utf-8",
    )
    raw_path.write_text(
        json.dumps(
            {
                "extraction": {
                    "merchant_name": "Store",
                    "transaction_date": "2026-05-10",
                    "currency_code": "CLP",
                    "total_amount": "1000",
                    "discount_amount": None,
                    "line_items": [
                        {
                            "name": "A",
                            "qty": "1",
                            "unit_price": "900",
                            "total_price": "900",
                        },
                        {
                            "name": "B",
                            "qty": "1",
                            "unit_price": "200",
                            "total_price": "200",
                        },
                    ],
                }
            }
        ),
        encoding="utf-8",
    )
    processed_path.write_text(
        json.dumps(
            {
                "extraction": {
                    "merchant_name": "Store",
                    "transaction_date": "2026-05-10",
                    "currency_code": "CLP",
                    "total_amount": "1000",
                    "discount_amount": None,
                    "line_items": [
                        {
                            "name": "A",
                            "qty": "1",
                            "unit_price": "900",
                            "total_price": "900",
                        }
                    ],
                },
                "verdict": {
                    "passed": False,
                    "reconstructed_total": 900,
                    "discrepancy_minor_units": 100,
                    "discrepancy_ratio": 0.1,
                    "severity": "minor",
                },
            }
        ),
        encoding="utf-8",
    )
    score_path.write_text(
        json.dumps(
            {
                "extraction": {"item_price_matches": 1},
                "transaction_gate": {
                    "passed": False,
                    "merchant_match": True,
                    "currency_match": True,
                    "total_match": True,
                    "visible_total_conflict": False,
                    "math_passed": False,
                    "all_category_keys_valid": True,
                },
                "reconstruction_gate": {
                    "passed": False,
                    "item_count_delta": -1,
                    "item_totals_match": False,
                    "item_total_matches": 1,
                    "quantity_matches": 1,
                    "unit_price_matches": 1,
                    "discount_total_match": False,
                    "discount_delta_minor": -100,
                },
                "strict_status": "threshold-failed",
                "severity_status": "minor_review",
                "severity_reasons": [
                    "minor: strict gate failed below configured significance thresholds"
                ],
                "validation_policy": {
                    "policy_id": "receipt-validation-policy",
                    "policy_version": "2026-05-20.v1",
                    "math_exact_tolerance_minor_units": 1,
                    "major_reconstruction_discrepancy_ratio": 0.25,
                    "significant_item_count_delta_ratio": 0.25,
                    "significant_item_total_mismatch_ratio": 0.25,
                    "significant_quantity_mismatch_ratio": 0.25,
                    "significant_unit_price_mismatch_ratio": 0.25,
                    "significant_discount_delta_ratio": 0.25,
                    "discount_delta_denominator": "expected_final_total_minor",
                },
            }
        ),
        encoding="utf-8",
    )
    cost_path.write_text(
        json.dumps({"totals": {"input_tokens": 10, "output_tokens": 5, "cost_usd": "0.1"}}),
        encoding="utf-8",
    )
    manifest_path.write_text(
        json.dumps(
            {
                "case_id": "local/discount",
                "status": "threshold-failed",
                "baseline_path": str(baseline_path),
                "raw_output_path": str(raw_path),
                "processed_output_path": str(processed_path),
                "score_path": str(score_path),
                "cost_summary_path": str(cost_path),
            }
        ),
        encoding="utf-8",
    )

    batch = write_batch_report(
        manifest_paths=[manifest_path],
        output_dir=tmp_path / "batch",
        label="threshold-details",
    )
    case = batch["cases"][0]

    assert case["expected_item_count"] == 2
    assert case["extracted_item_count"] == 1
    assert case["item_price_matches"] == 1
    assert case["item_total_matches"] == 1
    assert case["item_totals_match"] is False
    assert case["full_item_matches"] == 1
    assert case["transaction_gate_passed"] is False
    assert case["strict_status"] == "threshold-failed"
    assert case["severity_status"] == "minor_review"
    assert case["final_total_minor"] == 1000
    assert case["gross_total_minor"] is None
    assert case["expected_discount_total_minor"] == 100
    assert case["threshold_factors"]["transaction"]["math_passed"] is False
    assert case["threshold_factors"]["reconstruction"]["item_count_delta_ratio"] == 0.5
    assert case["threshold_factors"]["reconstruction"]["item_total_mismatch_ratio"] == 0.5
    assert case["threshold_factors"]["reconstruction"]["discount_delta_ratio"] == 0.1
    assert case["raw_diagnostics"]["transaction_total_delta_minor"] == 0
    assert case["raw_diagnostics"]["item_total_sum_delta_minor"] == 0
    assert case["raw_diagnostics"]["item_name_matches"] == 2
    assert case["raw_diagnostics"]["item_total_matches"] == 2
    assert case["raw_diagnostics"]["item_total_mismatch_count"] == 0
    assert case["processed_diagnostics"]["item_total_sum_delta_minor"] == -200
    assert case["processed_diagnostics"]["item_total_matches"] == 1
    assert case["processed_diagnostics"]["item_total_mismatch_count"] == 1
    assert case["stage_attribution"]["primary_stage"] == "postprocess/math"
    assert "transaction: reconstructed math failed" in case["threshold_failure_reasons"]
    assert (
        "reconstruction: item total-price matches by name 1/2" in case["threshold_failure_reasons"]
    )
    assert (
        "reconstruction: item count mismatch (1 extracted vs 2 expected)"
        in case["threshold_failure_reasons"]
    )
    assert "reconstruction: receipt discount mismatch" in case["threshold_failure_reasons"]
    analysis = Path(batch["analysis_path"]).read_text(encoding="utf-8")
    assert "## Gate Failure Details" in analysis
    assert "## Threshold Factor Matrix" in analysis
    assert "## Raw Vs Processed Arithmetic" in analysis
    assert "## Item Price Delta Details" in analysis
    assert "## Fix Focus From This Run" in analysis
    assert "## Run Output Summary" in analysis
    assert "postprocess/math" in analysis
    assert "Raw Transaction" in analysis
    assert "B -> n/a: 200 -> n/a (delta -200)" in analysis
    assert "merchant=ok" in analysis
    assert "math=fail" in analysis
    assert "item_total_missing_effective=50.0% (sig>25.0%)" in analysis
    assert "discount_delta=10.0% (sig>25.0%)" in analysis
    assert "1/2" in analysis
    assert "Transaction Match" in analysis
    assert "Before Discount" in analysis
    assert "Full Matches Name/Pos" in analysis
    assert "Severity counts" in analysis
    assert "Promotion blockers" in analysis


def test_batch_report_flags_cache_statuses_as_invalid_no_cache_evidence(tmp_path):
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(
        json.dumps({"case_id": "local/cache", "status": "completed-from-cache"}),
        encoding="utf-8",
    )

    batch = write_batch_report(
        manifest_paths=[manifest_path],
        output_dir=tmp_path / "batch",
        label="cache-evidence",
    )

    assert batch["cache_evidence_status_count"] == 1
    assert batch["no_cache_evidence_valid"] is False
    assert batch["promotion_decision"]["prompt_lab_threshold_passed"] is False


def test_batch_report_blocks_prompt_promotion_on_significant_failures(tmp_path):
    manifest_path = tmp_path / "manifest.json"
    score_path = tmp_path / "score.json"
    score_path.write_text(
        json.dumps(
            {
                "strict_status": "threshold-failed",
                "severity_status": "significant_failure",
                "severity_reasons": ["significant: final total mismatch"],
                "transaction_gate": {"passed": False},
                "reconstruction_gate": {"passed": False},
            }
        ),
        encoding="utf-8",
    )
    manifest_path.write_text(
        json.dumps(
            {
                "case_id": "local/failure",
                "status": "threshold-failed",
                "score_path": str(score_path),
            }
        ),
        encoding="utf-8",
    )

    batch = write_batch_report(
        manifest_paths=[manifest_path],
        output_dir=tmp_path / "batch",
        label="promotion-threshold",
    )

    assert batch["promotion_threshold"]["threshold_id"] == "receipt-extraction-promotion-v1"
    assert batch["promotion_decision"]["prompt_lab_threshold_passed"] is False
    assert batch["promotion_decision"]["production_promotion_allowed"] is False
    assert any(
        "significant_failure" in reason
        for reason in batch["promotion_decision"]["blocking_reasons"]
    )


def test_receipt_baseline_set_v1_cases_are_baselined():
    repo_root = Path(__file__).resolve().parents[2]
    manifest_path = repo_root / "prompt-testing/baselines/receipt-baseline-set-v1.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    assert manifest["validation_policy"]["policy_version"] == "2026-05-20.v1"
    assert manifest["promotion_threshold"]["threshold_id"] == "receipt-extraction-promotion-v1"
    assert len(manifest["cases"]) == 14
    assert set(manifest["coverage_tags"]) == set(manifest["cases"])
    for case_id in manifest["cases"]:
        case = get_case(case_id)
        assert case.baseline_path is not None, case_id
        expected = load_expected_receipt(case.baseline_path, case_id=case.id)
        assert expected.total_minor > 0
        assert manifest["coverage_tags"][case_id], case_id


def test_cli_live_run_requires_limit_and_confirmation():
    with pytest.raises(SystemExit) as exc_info:
        main(["run", "--live", "--case", "missing"])

    assert "requires --limit" in str(exc_info.value)


def test_cli_bypass_cache_requires_live():
    with pytest.raises(SystemExit) as exc_info:
        main(["run", "--bypass-cache", "--case", "missing"])

    assert "requires --live" in str(exc_info.value)


@pytest.mark.asyncio
async def test_runner_cache_only_never_calls_gemini(tmp_path, monkeypatch):
    image_path = tmp_path / "receipt.jpg"
    Image.new("RGB", (10, 10), "white").save(image_path)
    case = PromptCase(id="local/receipt", image_path=image_path, relative_path="receipt.jpg")

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("Gemini should not be called in cache-only mode")

    monkeypatch.setattr(runner_mod, "read_cache", lambda _key: None)
    monkeypatch.setattr(runner_mod, "extract_receipt", fail_if_called)
    packet = await runner_mod.run_case(
        case,
        cache_only=True,
        results_root=tmp_path / "results",
    )

    assert packet["status"] == "missing-cache"


@pytest.mark.asyncio
async def test_runner_groups_case_artifacts_under_explicit_run_id(tmp_path, monkeypatch):
    image_path = tmp_path / "receipt.jpg"
    Image.new("RGB", (10, 10), "white").save(image_path)
    case = PromptCase(id="local/receipt", image_path=image_path, relative_path="receipt.jpg")

    monkeypatch.setattr(runner_mod, "read_cache", lambda _key: None)

    packet = await runner_mod.run_case(
        case,
        extraction_prompt_id="receipt-extraction-v2-evidence",
        results_root=tmp_path / "results",
        run_id="Ten Case V2.7 No Cache",
    )

    artifact_dir = Path(packet["artifact_dir"])
    assert packet["status"] == "dry-run"
    assert packet["artifact_layout"] == "run-folder-v1"
    assert packet["batch_run_id"] == "Ten-Case-V2.7-No-Cache"
    assert artifact_dir == (
        tmp_path
        / "results"
        / "local"
        / "receipt-extraction-v2-evidence"
        / "Ten-Case-V2.7-No-Cache"
        / "local-receipt"
    )
    assert (artifact_dir / "manifest.json").exists()


@pytest.mark.asyncio
async def test_runner_bypass_cache_skips_cache_reads(tmp_path, monkeypatch):
    image_path = tmp_path / "receipt.jpg"
    Image.new("RGB", (10, 10), "white").save(image_path)
    case = PromptCase(id="local/receipt", image_path=image_path, relative_path="receipt.jpg")

    raw = RawGeminiExtractionResult(
        merchant_name="Store",
        transaction_date="2026-05-10",
        currency_code="CLP",
        total_amount=Decimal("1000"),
        line_items=[RawLineItemExtraction(name="Item", total_price=Decimal("1000"))],
        confidence_score=0.9,
    )

    def fail_if_cache_read(*args, **kwargs):
        raise AssertionError("Bypass cache should skip cache reads")

    async def fake_extract(*args, **kwargs):
        return ExtractionResult(
            extraction=runner_mod.coalesce_extraction(raw),
            raw_extraction=raw,
            usage=ExtractionUsage(input_tokens=1, output_tokens=1, latency_ms=1),
        )

    monkeypatch.setattr(runner_mod, "read_cache", fail_if_cache_read)
    monkeypatch.setattr(runner_mod, "extract_receipt", fake_extract)

    packet = await runner_mod.run_case(
        case,
        model="test-bypass-model",
        live=True,
        bypass_cache=True,
        stage="raw",
        results_root=tmp_path / "results",
    )

    assert packet["status"] == "raw-completed"


@pytest.mark.asyncio
async def test_runner_writes_provenance_and_cost_artifacts(tmp_path, monkeypatch):
    image_path = tmp_path / "receipt.jpg"
    Image.new("RGB", (10, 10), "white").save(image_path)
    case = PromptCase(id="local/receipt", image_path=image_path, relative_path="receipt.jpg")

    raw = RawGeminiExtractionResult(
        merchant_name="Store",
        transaction_date="2026-05-10",
        currency_code="CLP",
        total_amount=Decimal("1000"),
        line_items=[RawLineItemExtraction(name="Item", total_price=Decimal("1000"))],
        confidence_score=0.9,
    )

    async def fake_extract(*args, **kwargs):
        return ExtractionResult(
            extraction=coalesce_extraction(raw),
            raw_extraction=raw,
            usage=ExtractionUsage(input_tokens=1000, output_tokens=200, latency_ms=10),
        )

    async def fake_categorize(*args, **kwargs):
        return CategorizationOutput(
            result=CategorizationResult(
                assignments=[
                    CategoryAssignment(
                        line_item_index=0,
                        category_key="OtherItem",
                        confidence=0.8,
                    )
                ]
            ),
            usage=CategorizationUsage(input_tokens=500, output_tokens=100, latency_ms=5),
        )

    monkeypatch.setattr(runner_mod, "read_cache", lambda _key: None)
    monkeypatch.setattr(runner_mod, "extract_receipt", fake_extract)
    monkeypatch.setattr(runner_mod, "categorize_items", fake_categorize)

    packet = await runner_mod.run_case(
        case,
        model="google-gla:gemini-2.5-flash-lite",
        live=True,
        bypass_cache=True,
        results_root=tmp_path / "results",
    )

    assert packet["field_provenance_path"].endswith("field_provenance.json")
    assert packet["cost_summary_path"].endswith("cost_summary.json")
    assert packet["cost_summary"]["totals"]["input_tokens"] == 1500
    assert packet["cost_summary"]["totals"]["output_tokens"] == 300
    assert packet["field_provenance"]["summary"]["extraction_prompt"] > 0
    assert packet["field_provenance"]["summary"]["item_categorization_prompt"] > 0
    assert Path(packet["field_provenance_path"]).exists()

    batch = write_batch_report(
        manifest_paths=[Path(packet["manifest_path"])],
        output_dir=tmp_path / "batch",
        label="ten-case-v2.6-no-cache",
    )
    assert Path(batch["summary_path"]).exists()
    assert Path(batch["analysis_path"]).exists()
    assert batch["summary_path"].endswith("ten-case-v2-6-no-cache-summary.json")
    assert batch["analysis_path"].endswith("ten-case-v2-6-no-cache-analysis.md")
    assert batch["totals"]["input_tokens"] == 1500
    assert batch["cache_evidence_status_count"] == 0
    assert batch["cache_evidence_blocking"] is False
    assert batch["baseline_counts"]["unbaselined_smoke"] == 1


@pytest.mark.asyncio
async def test_runner_records_model_http_errors_as_provider_error(tmp_path, monkeypatch):
    image_path = tmp_path / "receipt.jpg"
    Image.new("RGB", (10, 10), "white").save(image_path)
    case = PromptCase(id="local/receipt", image_path=image_path, relative_path="receipt.jpg")
    calls = 0

    async def provider_unavailable(*args, **kwargs):
        nonlocal calls
        calls += 1
        raise ModelHTTPError(
            status_code=503,
            model_name="gemini-2.5-flash-lite",
            body={"error": {"status": "UNAVAILABLE"}},
        )

    monkeypatch.setattr(runner_mod, "read_cache", lambda _key: None)
    monkeypatch.setattr(runner_mod, "extract_receipt", provider_unavailable)
    monkeypatch.setattr(runner_mod.settings, "gemini_retry_delay_seconds", 0)
    packet = await runner_mod.run_case(
        case,
        live=True,
        results_root=tmp_path / "results",
    )

    assert packet["status"] == "provider-error"
    assert packet["evidence_label"] == "prompt-lab-provider-error"
    assert packet["provider_error"]["stage"] == "extraction"
    assert packet["provider_error"]["status_code"] == 503
    assert packet["manifest_path"].endswith("manifest.json")
    assert calls == 1


@pytest.mark.asyncio
async def test_runner_replays_raw_cache_through_postprocessing(tmp_path, monkeypatch):
    image_path = tmp_path / "receipt.jpg"
    Image.new("RGB", (10, 10), "white").save(image_path)
    case = PromptCase(id="local/receipt", image_path=image_path, relative_path="receipt.jpg")

    raw = RawGeminiExtractionResult(
        merchant_name="Lider",
        transaction_date="2026-05-10",
        currency_code="CLP",
        total_amount=Decimal("8400"),
        line_items=[
            RawLineItemExtraction(name="Product", total_price=Decimal("9000")),
            RawLineItemExtraction(name="Discount", total_price=Decimal("-600")),
        ],
        confidence_score=0.9,
    )
    first = True

    async def fake_extract(*args, **kwargs):
        nonlocal first
        if not first:
            raise AssertionError("Raw cache should avoid a second extraction call")
        first = False
        return ExtractionResult(
            extraction=runner_mod.coalesce_extraction(raw),
            raw_extraction=raw,
            usage=ExtractionUsage(input_tokens=1, output_tokens=1, latency_ms=1),
        )

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("Cache-only replay should not call categorization")

    monkeypatch.setattr(runner_mod, "extract_receipt", fake_extract)
    monkeypatch.setattr(runner_mod, "categorize_items", fail_if_called)

    await runner_mod.run_case(
        case,
        model="test-replay-model",
        live=True,
        stage="raw",
        results_root=tmp_path / "results",
    )
    packet = await runner_mod.run_case(
        case,
        model="test-replay-model",
        cache_only=True,
        results_root=tmp_path / "results",
    )

    assert packet["processed_output"]["extraction"]["discount_amount"] == "600"
    assert "normalized_output" not in packet
    assert "cache_key" not in packet
    assert packet["processed_cache_key"]
    assert packet["processed_replay_cacheable"] is False
    assert "processed_cache_path" not in packet
    assert packet["processed_output_path"].endswith("processed_output.json")
    assert packet["score_path"].endswith("score.json")


def test_cli_render_prints_prompt_hash(capsys):
    assert main(["render", "--prompt", "receipt-extraction-current"]) == 0

    output = json.loads(capsys.readouterr().out)
    assert output["id"] == "receipt-extraction-current"
    assert len(output["text_hash"]) == 64
