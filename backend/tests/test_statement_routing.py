"""Tests for statement layout routing and deterministic extraction."""

from __future__ import annotations

import io
from datetime import date

import fitz
from pypdf import PdfWriter

from app.schemas.statement_profile import (
    StatementAmountColumnProfile,
    StatementColumnProfile,
    StatementLayoutProfile,
    StatementRowRange,
)
from app.services import statement_extraction
from app.services.statement_extraction import extract_statement_pdf
from app.services.statement_pdf_evidence import extract_statement_pdf_evidence
from app.services.statement_profile_fallback import (
    apply_statement_layout_profile,
    build_statement_compact_evidence,
)
from app.services.statement_routing import extract_statement_with_pymupdf


def _write_layout_pdf(
    path,
    *,
    marker: str,
    rows: list[list[tuple[int, str]]],
) -> None:
    document = fitz.open()
    page = document.new_page(width=612, height=792)
    page.insert_text((60, 45), marker, fontsize=8)
    y = 100
    for row in rows:
        for x, text in row:
            page.insert_text((x, y), text, fontsize=8)
        y += 14
    document.save(path)
    document.close()


def _encrypted_pdf_bytes(password: str) -> bytes:
    buffer = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.encrypt(password)
    writer.write(buffer)
    return buffer.getvalue()


def _write_encrypted_layout_pdf(path, *, password: str) -> None:
    document = fitz.open()
    page = document.new_page(width=612, height=792)
    page.insert_text((60, 45), "Encrypted text statement", fontsize=8)
    page.insert_text((90, 100), "20/05/2026 TEST MERCHANT $12.345", fontsize=8)
    document.save(
        path,
        encryption=fitz.PDF_ENCRYPT_AES_256,
        owner_pw=password,
        user_pw=password,
    )
    document.close()


def test_cmr_layout_routes_above_threshold_and_extracts_current_installment_amount(tmp_path):
    path = tmp_path / "cmr.pdf"
    _write_layout_pdf(
        path,
        marker="CMR Falabella Periodo Facturado 01/05/2026 31/05/2026",
        rows=[
            [
                (90, "20/05/2026"),
                (140, "Pago"),
                (170, "en"),
                (190, "mercadopago"),
                (430, "03/03"),
                (350, "$165.106"),
                (520, "$55.036"),
            ]
        ],
    )

    result = extract_statement_with_pymupdf(path)

    assert result.routing.issuer == "cmr"
    assert result.routing.parser_id == "pymupdf:cmr"
    assert result.routing.confidence >= 0.80
    assert result.routing.fallback_required is False
    assert result.extraction.lines[0].date == date(2026, 5, 20)
    assert result.extraction.lines[0].installment == "03/03"
    assert result.extraction.lines[0].amount_minor == 55_036
    assert result.extraction.lines[0].amount_candidates[1].role == "current_installment"
    assert result.extraction.lines[0].row_type == "charge"
    assert result.extraction.lines[0].ledger_ready is True
    assert result.extraction.lines[0].source_row_index == 2
    assert result.extraction.lines[0].source_page == 1
    assert result.extraction.lines[0].field_provenance["parser_id"] == "pymupdf:cmr"


def test_bank_layouts_route_to_issuer_specific_parsers(tmp_path):
    cases = [
        ("edwards", "Banco Edwards Banco de Chile Mastercard Estado de Cuenta"),
        ("scotiabank", "Scotiabank Mastercard Estado de Cuenta"),
    ]
    for issuer, marker in cases:
        path = tmp_path / f"{issuer}.pdf"
        _write_layout_pdf(
            path,
            marker=marker,
            rows=[
                [
                    (100, "20/05/26"),
                    (200, "SUPERMERCADO"),
                    (280, "TEST"),
                    (400, "12.345"),
                ]
            ],
        )

        result = extract_statement_with_pymupdf(path)

        assert result.routing.issuer == issuer
        assert result.routing.parser_id == f"pymupdf:{issuer}"
        assert result.routing.confidence >= 0.80
        assert result.routing.fallback_required is False
        assert result.extraction.lines[0].amount_minor == 12_345
        assert result.extraction.lines[0].ledger_ready is True
        assert result.extraction.lines[0].source_row_index == 2
        assert result.extraction.lines[0].field_provenance["parser_id"] == f"pymupdf:{issuer}"


def test_unknown_text_bearing_pdf_routes_to_fallback(tmp_path):
    path = tmp_path / "unknown.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "20/05/2026"),
                (140, "Unknown"),
                (200, "shop"),
                (400, "$12.345"),
            ]
        ],
    )

    result = extract_statement_with_pymupdf(path)

    assert result.routing.fallback_required is True
    assert result.extraction.pdf_status == "extraction_failed"
    assert "deterministic_route_fallback_required" in result.extraction.processing.warnings


def test_generic_pymupdf_evidence_extracts_text_words_rows_without_pdf_bytes(tmp_path):
    path = tmp_path / "unknown.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "20/05/2026"),
                (140, "Unknown"),
                (200, "shop"),
                (400, "$12.345"),
            ]
        ],
    )

    evidence = extract_statement_pdf_evidence(path)
    payload = evidence.provider_payload()

    assert evidence.status == "readable"
    assert evidence.page_count == 1
    assert evidence.text_line_count >= 1
    assert evidence.word_count >= 1
    assert evidence.row_count >= 1
    assert payload["input_mode"] == "pymupdf-evidence"
    assert payload["privacy"]["raw_pdf_bytes_included"] is False
    assert payload["privacy"]["passwords_included"] is False
    assert "Unknown bank statement" in payload["text_layer"]["pages"][0]["text"]


def test_compact_profile_rows_extracts_candidates_without_pdf_bytes(tmp_path):
    path = tmp_path / "unknown.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "20/05/2026"),
                (140, "Unknown"),
                (200, "shop"),
                (400, "$12.345"),
            ]
        ],
    )

    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))

    assert compact.input_mode == "profile-rows"
    assert compact.status == "readable"
    assert compact.candidate_row_count == 1
    assert compact.rows[1].date_candidates[0].parsed_date == date(2026, 5, 20)
    assert compact.rows[1].amount_candidates[0].amount_minor == 12_345
    assert compact.privacy["raw_pdf_bytes_included"] is False


def test_compact_profile_rows_do_not_treat_dates_or_month_labels_as_amounts(tmp_path):
    path = tmp_path / "unknown-installment.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (40, "S/I"),
                (90, "01/03/2025"),
                (150, "Compra"),
                (190, "sodimac"),
                (300, "T"),
                (330, "171.039"),
                (390, "171.039"),
                (430, "01/01"),
                (470, "abr-2025"),
                (530, "171.039"),
            ]
        ],
    )

    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    row = next(candidate for candidate in compact.rows if "Compra" in candidate.text)

    assert {candidate.amount_minor for candidate in row.amount_candidates} == {171_039}
    assert [candidate.visible_text for candidate in row.installment_candidates] == ["01/01"]


def test_compact_profile_rows_filters_reference_numbers_when_money_tokens_exist(
    tmp_path,
):
    path = tmp_path / "unknown-references.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "27/05/25"),
                (145, "270500000000"),
                (220, "Pago"),
                (250, "Pesos"),
                (280, "TEF"),
                (420, "$"),
                (430, "-58.545"),
            ]
        ],
    )

    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    row = next(candidate for candidate in compact.rows if "Pago Pesos" in candidate.text)

    assert [candidate.amount_minor for candidate in row.amount_candidates] == [58_545]
    assert row.currency_hints == ["CLP"]


def test_profile_application_excludes_summaries_and_keeps_payment_rows(tmp_path):
    path = tmp_path / "unknown.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [(90, "Header"), (200, "Amount")],
            [(90, "20/05/2026"), (140, "Unknown"), (200, "shop"), (400, "$12.345")],
            [(90, "21/05/2026"), (140, "Pago"), (400, "$-5.000")],
            [(90, "Total"), (400, "$17.345")],
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=2, end_row=4)],
        excluded_row_ranges=[StatementRowRange(start_row=5, end_row=5)],
        date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
        description_column=StatementColumnProfile(x_min=130, x_max=300, confidence=0.9),
        amount_column=StatementColumnProfile(x_min=350, x_max=450, confidence=0.9),
        default_currency="CLP",
        confidence=0.9,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    assert result.extraction.pdf_status == "readable"
    assert [line.description for line in result.extraction.lines] == ["Unknown shop", "Pago"]
    assert [line.amount_minor for line in result.extraction.lines] == [12_345, -5_000]
    assert result.extraction.lines[1].line_type == "payment"


def test_profile_application_skips_selected_summary_and_no_date_rows(tmp_path):
    path = tmp_path / "unknown-summary-no-date.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [(90, "1.TOTAL"), (130, "OPERACIONES")],
            [(90, "20/05/2026"), (140, "Unknown"), (200, "shop"), (400, "$12.345")],
            [(90, "Monto"), (130, "Total"), (200, "Facturado"), (400, "$99.999")],
            [(90, "Para"), (120, "realizar"), (180, "prepago"), (400, "6003906000")],
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=2, end_row=5)],
        date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
        description_column=StatementColumnProfile(x_min=130, x_max=300, confidence=0.9),
        amount_column=StatementColumnProfile(x_min=350, x_max=450, confidence=0.9),
        default_currency="CLP",
        confidence=0.9,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    assert [line.description for line in result.extraction.lines] == ["Unknown shop"]
    assert result.unresolved_rows


def test_profile_application_falls_back_to_likely_rows_when_profile_yields_no_lines(
    tmp_path,
):
    path = tmp_path / "unknown-empty-profile.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [(90, "20/05/2026"), (140, "Unknown"), (200, "shop"), (400, "$12.345")],
            [(90, "Monto"), (130, "Total"), (200, "Facturado"), (400, "$99.999")],
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=3, end_row=3)],
        date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
        description_column=StatementColumnProfile(x_min=130, x_max=300, confidence=0.9),
        amount_column=StatementColumnProfile(x_min=350, x_max=450, confidence=0.9),
        default_currency="CLP",
        confidence=0.3,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    assert [line.description for line in result.extraction.lines] == ["Unknown shop"]
    assert (
        "statement_profile_used_likely_financial_rows_after_empty_profile"
        in result.warnings
    )


def test_profile_application_does_not_flip_positive_pago_merchant_rows(tmp_path):
    path = tmp_path / "unknown-positive-pago.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "20/05/2026"),
                (140, "Pago"),
                (170, "en"),
                (190, "mercadopago"),
                (430, "03/03"),
                (350, "$84.000"),
                (520, "$28.000"),
            ]
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
        date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
        description_column=StatementColumnProfile(x_min=130, x_max=330, confidence=0.9),
        amount_column=StatementColumnProfile(x_min=330, x_max=560, confidence=0.9),
        installment_column=StatementColumnProfile(x_min=420, x_max=460, confidence=0.9),
        default_currency="CLP",
        confidence=0.9,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    assert result.extraction.lines[0].line_type == "charge"
    assert result.extraction.lines[0].amount_minor == 28_000
    assert result.extraction.lines[0].installment == "03/03"


def test_profile_application_does_not_treat_single_installment_as_fixed_term(tmp_path):
    path = tmp_path / "unknown-single-installment.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "22/02/2025"),
                (140, "Sociedad"),
                (180, "cafe"),
                (220, "2001"),
                (430, "01/01"),
                (520, "$40.579"),
            ]
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
        date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
        description_column=StatementColumnProfile(x_min=130, x_max=330, confidence=0.9),
        amount_column=StatementColumnProfile(x_min=500, x_max=560, confidence=0.9),
        installment_column=StatementColumnProfile(x_min=420, x_max=460, confidence=0.9),
        default_currency="CLP",
        confidence=0.9,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    line = result.extraction.lines[0]
    assert line.amount_minor == 40_579
    assert line.installment == "01/01"
    assert {candidate.role for candidate in line.amount_candidates} == {"selected"}


def test_profile_application_uses_amount_role_columns_for_installments(tmp_path):
    path = tmp_path / "unknown-installment-profile.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "20/05/2026"),
                (140, "Pago"),
                (170, "en"),
                (190, "mercadopago"),
                (430, "03/03"),
                (350, "$165.106"),
                (520, "$55.036"),
            ]
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
        date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
        description_column=StatementColumnProfile(x_min=130, x_max=330, confidence=0.9),
        installment_column=StatementColumnProfile(x_min=420, x_max=460, confidence=0.9),
        amount_columns=[
            StatementAmountColumnProfile(
                role="plan_total",
                x_min=340,
                x_max=380,
                confidence=0.9,
            ),
            StatementAmountColumnProfile(
                role="current_installment",
                x_min=510,
                x_max=560,
                confidence=0.9,
            ),
        ],
        default_currency="CLP",
        confidence=0.9,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    line = result.extraction.lines[0]
    assert line.amount_minor == 55_036
    assert line.ledger_ready is True
    assert line.amount_selection_reason == "profile_rows_selected_current_installment"
    assert {candidate.role for candidate in line.amount_candidates} >= {
        "current_installment",
        "plan_total",
    }


def test_profile_application_ignores_merchant_suffix_when_selecting_installment_amount(
    tmp_path,
):
    path = tmp_path / "unknown-installment-merchant-number.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "19/01/2025"),
                (140, "Pago"),
                (170, "en"),
                (190, "mercadopago"),
                (270, "4"),
                (300, "T"),
                (430, "02/03"),
                (350, "$84.000"),
                (520, "$28.000"),
            ]
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
        date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
        description_column=StatementColumnProfile(x_min=130, x_max=330, confidence=0.9),
        installment_column=StatementColumnProfile(x_min=420, x_max=460, confidence=0.9),
        amount_columns=[
            StatementAmountColumnProfile(
                role="unknown",
                x_min=340,
                x_max=380,
                confidence=0.8,
            ),
            StatementAmountColumnProfile(
                role="unknown",
                x_min=510,
                x_max=560,
                confidence=0.8,
            ),
        ],
        default_currency="CLP",
        confidence=0.4,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    line = result.extraction.lines[0]
    assert line.amount_minor == 28_000
    assert (
        line.amount_selection_reason
        == "profile_rows_selected_smallest_visible_installment_amount"
    )
    assert all(candidate.visible_text != "4" for candidate in line.amount_candidates)
    assert line.ledger_ready is False


def test_profile_application_uses_row_currency_hint_over_wrong_profile_default(tmp_path):
    path = tmp_path / "unknown-local-currency-hint.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "27/05/25"),
                (145, "270500000000"),
                (220, "Pago"),
                (250, "Pesos"),
                (280, "TEF"),
                (420, "$"),
                (430, "-58.545"),
            ]
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
        date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
        description_column=StatementColumnProfile(x_min=200, x_max=330, confidence=0.9),
        amount_column=StatementColumnProfile(x_min=400, x_max=460, confidence=0.9),
        default_currency="USD",
        currency_policy="mixed_billing_and_original",
        confidence=0.9,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    line = result.extraction.lines[0]
    assert line.amount_minor == -58_545
    assert line.currency == "CLP"
    assert line.line_type == "payment"


def test_profile_application_ignores_unknown_role_column_currency(tmp_path):
    path = tmp_path / "unknown-spurious-column-currency.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "20/03/2025"),
                (140, "Insurance"),
                (190, "merchant"),
                (350, "39.100"),
                (410, "39.100"),
                (520, "39.100"),
            ]
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
        date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
        description_column=StatementColumnProfile(x_min=130, x_max=300, confidence=0.9),
        amount_columns=[
            StatementAmountColumnProfile(
                role="unknown",
                currency="GBP",
                x_min=330,
                x_max=370,
                confidence=0.6,
            ),
            StatementAmountColumnProfile(
                role="unknown",
                currency="GBP",
                x_min=390,
                x_max=430,
                confidence=0.6,
            ),
            StatementAmountColumnProfile(
                role="unknown",
                currency="GBP",
                x_min=500,
                x_max=560,
                confidence=0.6,
            ),
        ],
        default_currency="CLP",
        currency_policy="mixed_billing_and_original",
        confidence=0.9,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    line = result.extraction.lines[0]
    assert line.amount_minor == 39_100
    assert line.currency == "CLP"


def test_profile_application_keeps_default_currency_when_foreign_hint_is_row_level(
    tmp_path,
):
    path = tmp_path / "unknown-row-level-foreign-hint.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "20/02/2025"),
                (140, "Amazon.com*r"),
                (250, "USD"),
                (305, "70,6"),
                (520, "$68.264"),
            ]
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
        date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
        description_column=StatementColumnProfile(x_min=130, x_max=245, confidence=0.9),
        amount_columns=[
            StatementAmountColumnProfile(
                role="unknown",
                x_min=295,
                x_max=330,
                confidence=0.8,
            ),
            StatementAmountColumnProfile(
                role="unknown",
                x_min=500,
                x_max=560,
                confidence=0.8,
            ),
        ],
        default_currency="CLP",
        currency_policy="mixed_billing_and_original",
        confidence=0.9,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    line = result.extraction.lines[0]
    assert line.amount_minor == 68_264
    assert line.currency == "CLP"


def test_profile_application_selects_rightmost_money_column_over_reference_numbers(
    tmp_path,
):
    path = tmp_path / "unknown-foreign-section.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (40, "1106"),
                (65, "24793385162001204294027"),
                (170, "11/06/25"),
                (210, "STEAMGAMES.COM"),
                (280, "4259"),
                (320, "US"),
                (500, "9.000,00"),
                (580, "9,60"),
            ]
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
        date_column=StatementColumnProfile(x_min=160, x_max=205, confidence=0.9),
        description_column=StatementColumnProfile(x_min=205, x_max=360, confidence=0.9),
        amount_columns=[
            StatementAmountColumnProfile(
                role="foreign_original",
                x_min=490,
                x_max=530,
                confidence=0.8,
            ),
            StatementAmountColumnProfile(
                role="foreign_original",
                x_min=570,
                x_max=600,
                confidence=0.8,
            ),
        ],
        default_currency="USD",
        currency_policy="mixed_billing_and_original",
        confidence=0.9,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    line = result.extraction.lines[0]
    assert line.amount_minor == 960
    assert line.currency == "USD"
    assert line.original_currency == "CLP"
    assert line.original_amount_minor == 900_000


def test_profile_application_keeps_billing_currency_and_original_foreign_amount(tmp_path):
    path = tmp_path / "unknown-foreign-profile.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "20/02/2025"),
                (140, "Amazon.com*r"),
                (250, "CL"),
                (275, "USD"),
                (305, "70,6"),
                (430, "01/01"),
                (520, "$68.264"),
            ]
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
        date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
        description_column=StatementColumnProfile(x_min=130, x_max=245, confidence=0.9),
        installment_column=StatementColumnProfile(x_min=420, x_max=460, confidence=0.9),
        amount_columns=[
            StatementAmountColumnProfile(
                role="foreign_original",
                currency="USD",
                x_min=295,
                x_max=330,
                confidence=0.9,
            ),
            StatementAmountColumnProfile(
                role="current_statement_amount",
                currency="CLP",
                x_min=500,
                x_max=560,
                confidence=0.9,
            ),
        ],
        default_currency="CLP",
        currency_policy="mixed_billing_and_original",
        confidence=0.9,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    line = result.extraction.lines[0]
    assert line.amount_minor == 68_264
    assert line.currency == "CLP"
    assert line.original_currency == "USD"
    assert line.original_amount_minor == 7_060
    assert line.ledger_ready is True


def test_profile_application_marks_ambiguous_amount_rows_not_ledger_ready(tmp_path):
    path = tmp_path / "unknown-ambiguous-profile.pdf"
    _write_layout_pdf(
        path,
        marker="Unknown bank statement",
        rows=[
            [
                (90, "20/05/2026"),
                (140, "Unknown"),
                (200, "shop"),
                (360, "$12.345"),
                (430, "$67.890"),
            ]
        ],
    )
    compact = build_statement_compact_evidence(extract_statement_pdf_evidence(path))
    profile = StatementLayoutProfile(
        transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
        date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
        description_column=StatementColumnProfile(x_min=130, x_max=300, confidence=0.9),
        default_currency="CLP",
        confidence=0.9,
    )

    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=profile,
        issuer_hint=None,
        prompt_id="statement-layout-profile-current",
        model_name="google-gla:test",
    )

    line = result.extraction.lines[0]
    assert line.ledger_ready is False
    assert "statement_profile_amount_role_unknown_with_multiple_amounts" in line.warnings


def test_generic_pymupdf_evidence_handles_encrypted_password_states(tmp_path):
    path = tmp_path / "encrypted-layout.pdf"
    _write_encrypted_layout_pdf(path, password="correct")

    missing = extract_statement_pdf_evidence(path)
    invalid = extract_statement_pdf_evidence(path, password="wrong")
    readable = extract_statement_pdf_evidence(path, password="correct")

    assert missing.status == "password_required"
    assert invalid.status == "password_invalid"
    assert readable.status == "readable"
    assert readable.is_encrypted is True
    assert readable.text_line_count >= 1


def test_generic_pymupdf_evidence_reports_insufficient_text_layer(tmp_path):
    path = tmp_path / "blank.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    with path.open("wb") as handle:
        writer.write(handle)

    evidence = extract_statement_pdf_evidence(path)

    assert evidence.status == "insufficient_text_layer"
    assert "insufficient_text_layer" in evidence.warnings
    assert evidence.text_line_count == 0
    assert evidence.word_count == 0


def test_auto_provider_returns_password_required_before_gemini(monkeypatch, tmp_path):
    path = tmp_path / "encrypted.pdf"
    path.write_bytes(_encrypted_pdf_bytes("correct"))

    async def fail_gemini(*args, **kwargs):  # pragma: no cover - should not be called.
        raise AssertionError("Gemini should not run before password validation")

    monkeypatch.setattr(statement_extraction, "extract_statement_with_gemini", fail_gemini)
    monkeypatch.setattr(
        statement_extraction,
        "extract_statement_with_gemini_evidence",
        fail_gemini,
    )

    result = extract_statement_pdf(path, provider="auto")

    assert result.pdf_status == "password_required"
    assert result.lines == []
