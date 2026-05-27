import json
import uuid
from argparse import Namespace
from datetime import date
from pathlib import Path

import fitz
import pytest
import sqlalchemy as sa
from pydantic_ai.exceptions import ModelHTTPError
from pypdf import PdfWriter
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.agents.statement_extraction import (
    StatementExtractionUsage,
    StatementLayoutProfileAgentResult,
)
from app.models.transaction import Transaction, TransactionItem
from app.prompt_lab import cli as prompt_cli_mod
from app.prompt_lab.statement import cases as statement_mod
from app.prompt_lab.statement import deterministic as statement_deterministic_mod
from app.prompt_lab.statement import fallback_calibration as statement_fallback_mod
from app.prompt_lab.statement import readiness as statement_readiness_mod
from app.prompt_lab.statement import report as statement_report_mod
from app.prompt_lab.statement import runner as statement_runner_mod
from app.prompt_lab.statement import suite as statement_suite_mod
from app.prompt_lab.statement.batch_report import write_statement_batch_report
from app.prompt_lab.statement.cases import (
    StatementCase,
    StatementPromptLabExtractionPacket,
    extract_statement_text,
    import_statement_corpus,
    inspect_pdf,
    write_statement_extraction_packet,
)
from app.prompt_lab.statement.coalesce import coalesce_statement_output
from app.prompt_lab.statement.report import write_statement_expected_report
from app.prompt_lab.statement.scoring import score_statement_output
from app.prompt_lab.statement.seed_db import (
    DEFAULT_STATEMENT_SEED_PROFILE,
    STATEMENT_LAB_SEED_PROMPT_PREFIX,
    assert_local_sqlite_seed_allowed,
    build_statement_seed_transactions,
    seed_statement_lab_transactions,
)
from app.prompts import get_prompt
from app.schemas.statement import (
    StatementAmountCandidate,
    StatementExtractionOutput,
    StatementInfo,
    StatementLine,
    StatementProcessingMetadata,
)
from app.schemas.statement_profile import (
    StatementLayoutProfile,
    StatementProfileApplicationResult,
    StatementRowRange,
)
from app.services.statement_pdf_evidence import StatementPdfEvidence
from app.services.statement_profile_fallback import (
    apply_statement_layout_profile,
    build_statement_compact_evidence,
    compact_evidence_provider_payload,
)
from tests.conftest import TEST_SCOPE_ID


def test_statement_import_copies_pdfs_to_ignored_private_storage_and_writes_sanitized_manifest(
    tmp_path,
    monkeypatch,
):
    source = tmp_path / "legacy" / "CreditCard"
    cmr_dir = source / "cmr"
    edwards_dir = source / "edwards"
    cmr_dir.mkdir(parents=True)
    edwards_dir.mkdir(parents=True)

    _write_pdf(cmr_dir / "cmr202503.pdf")
    _write_pdf(edwards_dir / "edw202506.pdf", password="secret-password")
    (edwards_dir / "credentials.json").write_text(
        json.dumps({"pdfPassword": "secret-password", "notes": "private"}),
        encoding="utf-8",
    )

    root = tmp_path / "prompt-testing" / "test-cases" / "statements"
    private_root = root / "private"
    manifest_path = root / "manifest.json"
    monkeypatch.setattr(statement_mod, "STATEMENT_TEST_CASES_ROOT", root)
    monkeypatch.setattr(statement_mod, "STATEMENT_PRIVATE_ROOT", private_root)
    monkeypatch.setattr(statement_mod, "STATEMENT_MANIFEST_PATH", manifest_path)
    monkeypatch.setattr(statement_mod, "ensure_workspace", lambda: root.mkdir(parents=True))

    manifest = import_statement_corpus(source, force=True)

    assert (private_root / "cmr" / "cmr202503.pdf").exists()
    assert (private_root / "edwards" / "edw202506.pdf").exists()
    assert not (private_root / "edwards" / "credentials.json").exists()
    assert manifest["summary"]["total_pdfs"] == 2
    assert manifest["summary"]["encrypted"] == 1
    assert manifest["summary"]["password_sources"] == 1
    assert {record["page_count"] for record in manifest["records"]} == {1}

    serialized = manifest_path.read_text(encoding="utf-8")
    assert "secret-password" not in serialized
    assert "pdfPassword" not in serialized


def test_statement_pdf_password_states(tmp_path):
    pdf_path = tmp_path / "edwards" / "edw.pdf"
    pdf_path.parent.mkdir()
    _write_pdf(pdf_path, password="correct-password")

    assert inspect_pdf(pdf_path).status == "password_required"
    assert inspect_pdf(pdf_path, password="wrong-password").status == "password_invalid"

    readable = inspect_pdf(pdf_path, password="correct-password")
    assert readable.status == "readable"
    assert readable.is_encrypted is True
    assert readable.page_count == 1


def test_statement_text_extraction_uses_local_issuer_credentials(tmp_path):
    source = tmp_path / "CreditCard"
    edwards_source = source / "edwards"
    edwards_source.mkdir(parents=True)
    (edwards_source / "credentials.json").write_text(
        json.dumps({"pdfPassword": "correct-password"}),
        encoding="utf-8",
    )

    pdf_path = tmp_path / "private" / "edwards" / "edw202506.pdf"
    pdf_path.parent.mkdir(parents=True)
    _write_pdf(pdf_path, password="correct-password")
    case = StatementCase(
        id="edwards/edw202506",
        issuer="edwards",
        pdf_path=pdf_path,
        relative_path="private/edwards/edw202506.pdf",
    )

    packet = extract_statement_text(case, credentials_root=source)
    extraction = packet.extraction

    assert extraction.document_type == "credit_card_statement"
    assert extraction.pdf_status == "readable"
    assert extraction.statement.issuer == "edwards"
    assert packet.source_text is not None
    assert extraction.processing.page_count == 1
    assert "codex_text_only_no_line_normalization" in extraction.processing.warnings
    assert "source_text" not in StatementExtractionOutput.model_fields
    assert "source_text" not in StatementLine.model_fields
    assert "correct-password" not in packet.model_dump_json()


def test_statement_extraction_packet_surfaces_password_states(tmp_path):
    pdf_path = tmp_path / "private" / "edwards" / "edw202506.pdf"
    pdf_path.parent.mkdir(parents=True)
    _write_pdf(pdf_path, password="correct-password")
    case = StatementCase(
        id="edwards/edw202506",
        issuer="edwards",
        pdf_path=pdf_path,
        relative_path="private/edwards/edw202506.pdf",
    )

    packet = extract_statement_text(case, password="wrong-password")
    manifest = write_statement_extraction_packet(case, packet, output_root=tmp_path / "results")

    assert packet.extraction.pdf_status == "password_invalid"
    assert packet.source_text is None
    assert manifest["status"] == "password_invalid"
    assert manifest["packet_status"] == "written"
    assert manifest["contains_raw_statement_text"] is False


def test_statement_scoring_is_separate_from_receipt_item_scoring():
    expected = StatementExtractionOutput(
        statement=StatementInfo(issuer="cmr", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 1),
                description="Compra Supermercado",
                amount_minor=15990,
                currency="CLP",
                line_type="charge",
            )
        ],
        processing=StatementProcessingMetadata(provider="manual"),
    )
    actual = expected.model_copy(deep=True)

    score = score_statement_output(expected=expected, actual=actual)

    assert score["passed"] is True
    assert score["line_count_match"] is True
    assert score["amount_matches"] == 1

    actual.lines[0].description = "Comercio Diferente"
    score = score_statement_output(expected=expected, actual=actual)

    assert score["description_matches"] == 0
    assert score["passed"] is False


def test_statement_scoring_allows_safe_ocr_only_description_drift():
    expected = StatementExtractionOutput(
        statement=StatementInfo(issuer="cmr", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 1),
                description="Codiner ltda",
                amount_minor=15990,
                currency="CLP",
                line_type="charge",
            )
        ],
        processing=StatementProcessingMetadata(provider="manual"),
    )
    actual = expected.model_copy(deep=True)
    actual.lines[0].description = "Codiner Itda"

    score = score_statement_output(expected=expected, actual=actual)

    assert score["passed"] is True
    assert score["description_exact_matches"] == 0
    assert score["description_matches"] == 1


def test_statement_scoring_best_match_allows_order_drift_without_value_failure():
    expected = StatementExtractionOutput(
        statement=StatementInfo(issuer="cmr", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 1),
                description="Internet mensual",
                amount_minor=20_000,
                currency="CLP",
                line_type="charge",
            ),
            StatementLine(
                source_order=2,
                date=date(2026, 5, 2),
                description="Cafe central",
                amount_minor=3_500,
                currency="CLP",
                line_type="charge",
            ),
        ],
        processing=StatementProcessingMetadata(provider="manual"),
    )
    actual = StatementExtractionOutput(
        statement=StatementInfo(issuer="cmr", currency="CLP"),
        lines=[
            expected.lines[1].model_copy(update={"source_order": 1}),
            expected.lines[0].model_copy(update={"source_order": 2}),
        ],
        processing=StatementProcessingMetadata(provider="gemini"),
    )

    score = score_statement_output(expected=expected, actual=actual)

    assert score["passed"] is True
    assert score["alignment"]["order_drift_count"] == 2
    assert score["amount_matches"] == 2
    assert score["description_matches"] == 2


def test_statement_scoring_best_match_still_fails_wrong_amount():
    expected = StatementExtractionOutput(
        statement=StatementInfo(issuer="cmr", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 1),
                description="Pago en mercadopago 4",
                amount_minor=55_036,
                currency="CLP",
                line_type="charge",
                installment="03/03",
            )
        ],
        processing=StatementProcessingMetadata(provider="manual"),
    )
    actual = expected.model_copy(deep=True)
    actual.lines[0].amount_minor = 165_106

    score = score_statement_output(expected=expected, actual=actual)

    assert score["passed"] is False
    assert score["alignment"]["matched_pairs"][0]["match_score"] >= 0.8
    assert score["amount_matches"] == 0


def test_statement_prompt_is_registered_as_own_kind():
    prompt = get_prompt("statement-extraction-current", kind="statement-extraction")

    assert prompt.kind == "statement-extraction"
    assert "credit-card statement evidence normalizer" in prompt.system_prompt
    assert "extracted PDF\ntext/layout evidence from PyMuPDF" in prompt.system_prompt
    assert "never ask the user for clarification or approval" in prompt.system_prompt
    assert "P0: `date`, `amount_minor`, and `currency`" in prompt.system_prompt
    assert "description`, preserving merchant, payee, or place text" in (prompt.system_prompt)
    assert "Include every visible amount that plausibly belongs to a row" in (prompt.system_prompt)
    assert "pick the best current statement\n  amount" in prompt.system_prompt
    assert "Preserve visible installment or term markers when present" in (prompt.system_prompt)
    assert "Do not output previous balance, opening balance" in prompt.system_prompt
    assert "amount_candidates" in prompt.system_prompt
    assert "amount_selection_reason" in prompt.system_prompt
    assert "01/01" not in prompt.system_prompt
    assert "current cuota" not in prompt.system_prompt
    assert prompt.version == "2026-05-27.3"
    required_line_fields = StatementLine.model_json_schema()["required"]
    assert "amount_selection_reason" in required_line_fields
    assert "amount_candidates" in required_line_fields


@pytest.mark.asyncio
async def test_statement_expected_report_can_use_mock_gemini_output_for_reconciliation(
    tmp_path,
    monkeypatch,
):
    expected = StatementExtractionOutput(
        statement=StatementInfo(
            issuer="cmr",
            currency="CLP",
            period_start=date(2026, 5, 1),
            period_end=date(2026, 5, 31),
        ),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 20),
                description="SUPERMERCADO FIXTURE",
                amount_minor=19_990,
                currency="CLP",
                line_type="charge",
            ),
            StatementLine(
                source_order=2,
                date=date(2026, 5, 21),
                description="PAGO RECIBIDO",
                amount_minor=-10_000,
                currency="CLP",
                line_type="payment",
            ),
        ],
        processing=StatementProcessingMetadata(provider="manual"),
    )
    expected_path = tmp_path / "cmr202605.expected.json"
    expected_path.write_text(expected.model_dump_json(), encoding="utf-8")
    case = StatementCase(
        id="cmr/cmr202605",
        issuer="cmr",
        pdf_path=tmp_path / "cmr202605.pdf",
        relative_path="private/cmr/cmr202605.pdf",
        expected_path=expected_path,
    )
    actual = StatementPromptLabExtractionPacket(
        extraction=StatementExtractionOutput(
            statement=StatementInfo(issuer="cmr", currency="CLP"),
            lines=[],
            processing=StatementProcessingMetadata(
                provider="codex-pdf-text",
                warnings=["codex_text_only_no_line_normalization"],
            ),
        )
    )

    async def fake_db_snapshot(**_kwargs):
        return [
            statement_report_mod._ReceiptTransaction(
                id="receipt-1",
                ownership_scope_id="scope-1",
                transaction_date=date(2026, 5, 20),
                merchant="Supermercado Fixture",
                total_minor=19_990,
                currency="CLP",
                receipt_type="scan",
                card_alias_id=None,
                merchant_user_edited_at=None,
            )
        ], {
            "url": "sqlite+aiosqlite:///test.db",
            "readable": True,
            "table_count": 1,
            "has_transactions_table": True,
            "has_statements_table": False,
            "has_statement_lines_table": False,
            "transactions_available": 1,
            "statement_lab_seed_transactions": 0,
            "transactions_date_min": "2026-05-20",
            "transactions_date_max": "2026-05-20",
            "transaction_scope_firebase_uid": None,
            "transaction_scope_ownership_scope_id": None,
            "reason": None,
        }

    monkeypatch.setattr(statement_report_mod, "list_statement_cases", lambda: [case])
    monkeypatch.setattr(statement_report_mod, "extract_statement_text", lambda *_, **__: actual)
    monkeypatch.setattr(
        statement_report_mod,
        "_load_receipt_transactions_snapshot",
        fake_db_snapshot,
    )

    manifest = await write_statement_expected_report(
        run_id="unit",
        output_root=tmp_path / "results",
        actual_source="mock-gemini",
    )

    assert manifest["summary"]["expected_line_count"] == 2
    assert manifest["summary"]["actual_output_line_count"] == 2
    assert manifest["summary"]["reconciliation_counts"]["matched"] == 1
    assert manifest["summary"]["reconciliation_counts"]["statement_only"] == 1
    assert manifest["summary"]["reconciliation_counts"]["candidate_transactions"] == 0
    report = json.loads((tmp_path / "results" / "statements" / "unit" / "report.json").read_text())
    assert report["actual_source"] == "mock-gemini"
    assert report["cases"][0]["current_extraction"]["score_against_expected"]["passed"] is True
    assert report["cases"][0]["reconciliation"]["line_outcomes"][0]["verdict"] == "matched"
    assert report["cases"][0]["reconciliation"]["line_outcomes"][1]["candidate_transaction"] is None
    artifacts = report["cases"][0]["artifacts"]
    for artifact_path in artifacts.values():
        assert Path(artifact_path).exists()


@pytest.mark.asyncio
async def test_statement_expected_report_can_compare_live_gemini_manifest(
    tmp_path,
    monkeypatch,
):
    expected = StatementExtractionOutput(
        statement=StatementInfo(issuer="fixture", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 20),
                description="Supermercado Fixture",
                amount_minor=19_990,
                currency="CLP",
                line_type="charge",
            )
        ],
        processing=StatementProcessingMetadata(provider="manual", page_count=1),
    )
    expected_path = tmp_path / "fixture.expected.json"
    expected_path.write_text(expected.model_dump_json(), encoding="utf-8")
    case = StatementCase(
        id="fixture/live",
        issuer="fixture",
        pdf_path=tmp_path / "live.pdf",
        relative_path="private/fixture/live.pdf",
        expected_path=expected_path,
    )
    actual = expected.model_copy(deep=True)
    actual.processing = StatementProcessingMetadata(
        provider="gemini",
        prompt_id="statement-extraction-current",
        model_name="google:gemini-2.5-flash-lite",
        page_count=1,
    )
    source_dir = tmp_path / "source-live"
    source_dir.mkdir()
    processed_path = source_dir / "processed_output.json"
    processed_path.write_text(
        json.dumps(
            {
                "document_type": "credit_card_statement",
                "statement_extraction": actual.model_dump(mode="json"),
            },
            default=str,
        ),
        encoding="utf-8",
    )
    raw_path = source_dir / "raw_output.json"
    raw_path.write_text(
        json.dumps({"provider_call": "completed", "extraction": actual.model_dump(mode="json")}),
        encoding="utf-8",
    )
    field_path = source_dir / "field_provenance.json"
    field_path.write_text(json.dumps({"source": "gemini_provider_output"}), encoding="utf-8")
    cost_path = source_dir / "cost_summary.json"
    cost_path.write_text(
        json.dumps(
            {
                "totals": {
                    "input_tokens": 10,
                    "output_tokens": 20,
                    "total_tokens": 30,
                    "cost_usd": "0.001",
                }
            }
        ),
        encoding="utf-8",
    )
    pdf_input_path = source_dir / "pdf_input.json"
    pdf_input_path.write_text(json.dumps({"status": "readable", "page_count": 1}), encoding="utf-8")
    manifest_path = source_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "case_id": "fixture/live",
                "issuer": "fixture",
                "status": "completed",
                "evidence_label": "statement-prompt-lab-ai-quality",
                "expected_path": str(expected_path),
                "processed_output_path": str(processed_path),
                "raw_output_path": str(raw_path),
                "field_provenance_path": str(field_path),
                "cost_summary_path": str(cost_path),
                "pdf_input_path": str(pdf_input_path),
            }
        ),
        encoding="utf-8",
    )

    async def fake_db_snapshot(**_kwargs):
        return [], {
            "url": "sqlite+aiosqlite:///test.db",
            "readable": True,
            "table_count": 1,
            "has_transactions_table": True,
            "has_statements_table": False,
            "has_statement_lines_table": False,
            "transactions_available": 0,
            "statement_lab_seed_transactions": 0,
            "transactions_date_min": None,
            "transactions_date_max": None,
            "transaction_scope_firebase_uid": None,
            "transaction_scope_ownership_scope_id": None,
            "reason": None,
        }

    monkeypatch.setattr(statement_report_mod, "get_statement_case", lambda _case_id: case)
    monkeypatch.setattr(
        statement_report_mod,
        "_load_receipt_transactions_snapshot",
        fake_db_snapshot,
    )

    manifest = await write_statement_expected_report(
        run_id="live-report",
        output_root=tmp_path / "results",
        actual_source="live-gemini",
        manifest_paths=[manifest_path],
    )

    assert manifest["actual_source"] == "live-gemini"
    assert manifest["summary"]["expected_line_count"] == 1
    assert manifest["summary"]["actual_output_line_count"] == 1
    report = json.loads(
        (tmp_path / "results" / "statements" / "live-report" / "report.json").read_text()
    )
    assert report["execution_mode"] == "live_gemini_provider_manifest_no_provider_call"
    assert report["cases"][0]["current_extraction"]["score_against_expected"]["passed"] is True
    artifacts = report["cases"][0]["artifacts"]
    assert Path(artifacts["raw_output_path"]).exists()
    assert Path(artifacts["pdf_input_path"]).exists()


@pytest.mark.asyncio
async def test_statement_deterministic_pymupdf_selects_current_installment_amount(
    tmp_path,
    monkeypatch,
):
    expected = StatementExtractionOutput(
        statement=StatementInfo(issuer="cmr", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2024, 12, 20),
                description="Pago en mercadopago 4",
                amount_minor=55_036,
                currency="CLP",
                line_type="charge",
                installment="03/03",
            )
        ],
        processing=StatementProcessingMetadata(provider="manual"),
    )
    expected_path = tmp_path / "cmr-layout.expected.json"
    expected_path.write_text(expected.model_dump_json(), encoding="utf-8")
    pdf_path = tmp_path / "cmr-layout.pdf"
    _write_cmr_layout_pdf(
        pdf_path,
        rows=[
            [
                (37, "Santiago"),
                (101, "20/12/2024"),
                (150, "Pago"),
                (170, "en"),
                (181, "mercadopago"),
                (234, "4"),
                (303, "T"),
                (327, "165.106"),
                (388, "165.106"),
                (432, "03/03"),
                (472, "feb-2025"),
                (533, "55.036"),
            ]
        ],
    )
    case = StatementCase(
        id="cmr/layout",
        issuer="cmr",
        pdf_path=pdf_path,
        relative_path="private/cmr/cmr-layout.pdf",
        expected_path=expected_path,
    )
    monkeypatch.setattr(
        statement_deterministic_mod,
        "_load_receipt_transactions_snapshot",
        _fake_transaction_snapshot,
    )

    packets = await statement_deterministic_mod.run_statement_deterministic_case(
        case,
        extractors=["pymupdf"],
        results_root=tmp_path / "results",
        run_id="deterministic",
    )

    packet = packets[0]
    line = packet["processed_output"]["statement_extraction"]["lines"][0]
    assert packet["status"] == "completed"
    assert packet["score"]["passed"] is True
    assert line["amount_minor"] == 55_036
    assert line["installment"] == "03/03"
    assert line["row_type"] == "charge"
    assert line["ledger_ready"] is True
    assert line["confidence"] is not None
    assert line["source_row_index"] == 1
    assert line["source_page"] == 1
    assert line["field_provenance"]["parser_id"] == "pymupdf:cmr"
    assert {candidate["role"] for candidate in line["amount_candidates"]} >= {
        "selected",
        "current_installment",
        "purchase_total",
        "plan_total",
    }
    assert Path(packet["layout_words_path"]).exists()
    assert Path(packet["candidate_rows_path"]).exists()


@pytest.mark.asyncio
async def test_statement_deterministic_pymupdf_extracts_edwards_bank_layout(
    tmp_path,
    monkeypatch,
):
    expected = StatementExtractionOutput(
        statement=StatementInfo(issuer="edwards", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2025, 5, 27),
                description="Pago Pesos TEF",
                amount_minor=-58_545,
                currency="CLP",
                line_type="payment",
                installment="01/01",
                original_amount_minor=-58_545,
            ),
            StatementLine(
                source_order=2,
                date=date(2025, 6, 11),
                description="STEAMGAMES.COM 4259 912-1844160",
                amount_minor=960,
                currency="USD",
                line_type="charge",
                original_currency="CLP",
                original_amount_minor=900_000,
            ),
        ],
        processing=StatementProcessingMetadata(provider="manual"),
    )
    expected_path = tmp_path / "edwards-layout.expected.json"
    expected_path.write_text(expected.model_dump_json(), encoding="utf-8")
    pdf_path = tmp_path / "edwards-layout.pdf"
    _write_cmr_layout_pdf(
        pdf_path,
        rows=[
            [
                (105, "27/05/25"),
                (143, "270500000000 Pago Pesos TEF"),
                (379, "$"),
                (412, "-58.545"),
                (441, "$"),
                (474, "-58.545"),
                (508, "01/01"),
                (535, "$"),
                (568, "-58.545"),
            ],
            [
                (45, "1106"),
                (63, "247933"),
                (168, "11/06/25"),
                (207, "STEAMGAMES.COM 4259"),
                (377, "912-1844160"),
                (448, "US"),
                (499, "9.000,00"),
                (578, "9,60"),
            ],
        ],
    )
    case = StatementCase(
        id="edwards/layout",
        issuer="edwards",
        pdf_path=pdf_path,
        relative_path="private/edwards/edwards-layout.pdf",
        expected_path=expected_path,
    )
    monkeypatch.setattr(
        statement_deterministic_mod,
        "_load_receipt_transactions_snapshot",
        _fake_transaction_snapshot,
    )

    packets = await statement_deterministic_mod.run_statement_deterministic_case(
        case,
        extractors=["pymupdf"],
        results_root=tmp_path / "results",
        run_id="deterministic",
    )

    packet = packets[0]
    lines = packet["processed_output"]["statement_extraction"]["lines"]
    assert packet["status"] == "completed"
    assert packet["score"]["passed"] is True
    assert lines[0]["line_type"] == "payment"
    assert lines[1]["currency"] == "USD"
    assert lines[1]["amount_minor"] == 960
    assert lines[1]["original_currency"] == "CLP"
    assert lines[1]["original_amount_minor"] == 900_000
    assert lines[1]["ledger_ready"] is True
    assert lines[1]["source_row_index"] == 2
    assert lines[1]["field_provenance"]["parser_id"] == "pymupdf:edwards"


@pytest.mark.asyncio
async def test_statement_deterministic_pymupdf_extracts_scotiabank_installment_layout(
    tmp_path,
    monkeypatch,
):
    expected = StatementExtractionOutput(
        statement=StatementInfo(issuer="scotiabank", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2022, 5, 20),
                description="PAGO",
                amount_minor=-8_904,
                currency="CLP",
                line_type="payment",
                installment="01/01",
                original_amount_minor=-8_904,
            ),
            StatementLine(
                source_order=2,
                date=date(2019, 11, 14),
                description="STA ISABEL COMPANIA TASA INT. 2,22%",
                amount_minor=1_513,
                currency="CLP",
                line_type="charge",
                installment="30/31",
                original_amount_minor=33_659,
            ),
        ],
        processing=StatementProcessingMetadata(provider="manual"),
    )
    expected_path = tmp_path / "scotiabank-layout.expected.json"
    expected_path.write_text(expected.model_dump_json(), encoding="utf-8")
    pdf_path = tmp_path / "scotiabank-layout.pdf"
    _write_cmr_layout_pdf(
        pdf_path,
        rows=[
            [
                (113, "20/05/22"),
                (149, "2005"),
                (167, "72487230"),
                (207, "PAGO"),
                (420, "$-8.904"),
                (462, "$-8.904"),
                (509, "01/01"),
                (570, "$-8.904"),
            ],
            [
                (40, "SANTIAGO"),
                (113, "14/11/19"),
                (149, "3005"),
                (167, "88874946"),
                (207, "STA ISABEL COMPANIA TASA INT. 2,22%"),
                (416, "$33.659"),
                (458, "$46.903"),
                (509, "30/31"),
                (570, "$1.513"),
            ],
        ],
    )
    case = StatementCase(
        id="scotiabank/layout",
        issuer="scotiabank",
        pdf_path=pdf_path,
        relative_path="private/scotiabank/scotiabank-layout.pdf",
        expected_path=expected_path,
    )
    monkeypatch.setattr(
        statement_deterministic_mod,
        "_load_receipt_transactions_snapshot",
        _fake_transaction_snapshot,
    )

    packets = await statement_deterministic_mod.run_statement_deterministic_case(
        case,
        extractors=["pymupdf"],
        results_root=tmp_path / "results",
        run_id="deterministic",
    )

    packet = packets[0]
    lines = packet["processed_output"]["statement_extraction"]["lines"]
    assert packet["status"] == "completed"
    assert packet["score"]["passed"] is True
    assert lines[0]["line_type"] == "payment"
    assert lines[1]["amount_minor"] == 1_513
    assert lines[1]["installment"] == "30/31"
    assert lines[1]["original_amount_minor"] == 33_659
    assert lines[1]["ledger_ready"] is True
    assert lines[1]["field_provenance"]["parser_id"] == "pymupdf:scotiabank"


@pytest.mark.asyncio
async def test_statement_deterministic_pypdf_is_text_only_baseline(tmp_path, monkeypatch):
    case = _cmr_layout_case(tmp_path)
    _write_cmr_layout_pdf(
        case.pdf_path,
        rows=[
            [
                (101, "20/12/2024"),
                (150, "Pago"),
                (170, "en"),
                (181, "mercadopago"),
                (234, "4"),
                (303, "T"),
                (327, "165.106"),
                (388, "165.106"),
                (432, "03/03"),
                (533, "55.036"),
            ]
        ],
    )
    monkeypatch.setattr(
        statement_deterministic_mod,
        "_load_receipt_transactions_snapshot",
        _fake_transaction_snapshot,
    )

    packets = await statement_deterministic_mod.run_statement_deterministic_case(
        case,
        extractors=["pypdf"],
        results_root=tmp_path / "results",
        run_id="deterministic",
    )

    packet = packets[0]
    extraction = packet["processed_output"]["statement_extraction"]
    assert packet["extractor"] == "pypdf"
    assert packet["status"] == "threshold-failed"
    assert extraction["lines"] == []
    assert "no_line_normalization" in extraction["processing"]["warnings"]
    assert packet["cost_summary"]["totals"]["cost_usd"] == "0"


@pytest.mark.asyncio
async def test_statement_report_compares_deterministic_manifests_without_gemini(
    tmp_path,
    monkeypatch,
):
    case = _cmr_layout_case(tmp_path)
    _write_cmr_layout_pdf(
        case.pdf_path,
        rows=[
            [
                (101, "20/12/2024"),
                (150, "Pago"),
                (170, "en"),
                (181, "mercadopago"),
                (234, "4"),
                (303, "T"),
                (327, "165.106"),
                (388, "165.106"),
                (432, "03/03"),
                (533, "55.036"),
            ]
        ],
    )
    monkeypatch.setattr(
        statement_deterministic_mod,
        "_load_receipt_transactions_snapshot",
        _fake_transaction_snapshot,
    )
    packets = await statement_deterministic_mod.run_statement_deterministic_case(
        case,
        extractors=["pypdf", "pymupdf"],
        results_root=tmp_path / "deterministic-results",
        run_id="deterministic",
    )
    live_manifest_path = _write_live_statement_manifest(
        tmp_path,
        case=case,
        actual=StatementExtractionOutput.model_validate(
            packets[1]["processed_output"]["statement_extraction"]
        ),
    )
    monkeypatch.setattr(statement_report_mod, "get_statement_case", lambda _case_id: case)
    monkeypatch.setattr(
        statement_report_mod,
        "_load_receipt_transactions_snapshot",
        _fake_transaction_snapshot,
    )

    manifest = await write_statement_expected_report(
        run_id="deterministic-report",
        output_root=tmp_path / "report-results",
        actual_source="deterministic",
        deterministic_manifest_paths=[Path(packet["manifest_path"]) for packet in packets],
        comparison_manifest_paths=[live_manifest_path],
    )

    report_path = Path(manifest["report_path"])
    report = json.loads(report_path.read_text(encoding="utf-8"))
    markdown = Path(manifest["markdown_path"]).read_text(encoding="utf-8")
    assert report["actual_source"] == "deterministic"
    assert report["promotion_recommendation"] == "deterministic_primary_candidate"
    assert report["deterministic_comparison"]["best_deterministic"]["extractor"] == "pymupdf"
    assert report["deterministic_comparison"]["best_deterministic"]["passed"] is True
    assert report["deterministic_comparison"]["comparison_extractors"][0]["actual_source"] == (
        "live-gemini"
    )
    assert "Deterministic Comparison" in markdown
    assert Path(report["cases"][1]["artifacts"]["text_layer_path"]).exists()


@pytest.mark.asyncio
async def test_statement_suite_run_writes_one_folder_with_approach_reports(
    tmp_path,
    monkeypatch,
):
    case_ids = [
        "cmr/cmr202503",
        "cmr/cmr202504",
        "edwards/edw202506",
        "scotiabank/sco202206",
    ]
    cases = {_case.id: _case for _case in [_suite_case(tmp_path, case_id) for case_id in case_ids]}

    async def fake_deterministic_case(case, **kwargs):
        approach = "auto" if "approaches/auto" in str(kwargs["artifact_dir"]) else "pymupdf"
        return [
            _write_suite_source_manifest(
                artifact_dir=kwargs["artifact_dir"],
                case=case,
                approach=approach,
            )
        ]

    async def fake_gemini_case(case, **kwargs):
        return _write_suite_source_manifest(
            artifact_dir=kwargs["artifact_dir"],
            case=case,
            approach="gemini",
        )

    async def fake_approach_report(**kwargs):
        return _write_suite_approach_report(
            output_dir=kwargs["output_dir"],
            case_output_root=kwargs["case_output_root"],
            actual_source=kwargs["actual_source"],
            manifest_paths=kwargs.get("deterministic_manifest_paths")
            or kwargs.get("manifest_paths")
            or [],
        )

    monkeypatch.setattr(statement_suite_mod, "get_statement_case", lambda case_id: cases[case_id])
    monkeypatch.setattr(
        statement_suite_mod,
        "run_statement_deterministic_case",
        fake_deterministic_case,
    )
    monkeypatch.setattr(statement_suite_mod, "run_statement_case", fake_gemini_case)
    monkeypatch.setattr(
        statement_suite_mod,
        "write_statement_expected_report",
        fake_approach_report,
    )

    manifest = await statement_suite_mod.run_statement_suite(
        case_ids=case_ids,
        approaches=["auto", "pymupdf", "gemini"],
        run_id="suite",
        output_root=tmp_path / "results",
    )

    suite_dir = Path(manifest["suite_dir"])
    report = json.loads((suite_dir / "report.json").read_text(encoding="utf-8"))
    assert manifest["recommendation"] == "pymupdf_primary"
    assert (suite_dir / "REPORT.md").exists()
    assert (suite_dir / "EXECUTIVE_SUMMARY.md").exists()
    executive_summary = (suite_dir / "EXECUTIVE_SUMMARY.md").read_text(encoding="utf-8")
    assert "What Went Well" in executive_summary
    assert "What Went Wrong" in executive_summary
    assert "Fixes To Try Next" in executive_summary
    assert "Fallback Transaction Readiness" in executive_summary
    assert "| Factor | Weight | Current Result | Decision Impact |" in executive_summary
    assert "Runtime Critical Field Readiness" in executive_summary
    assert "API Usage And Cost" in executive_summary
    assert "| Approach | Deterministic Calls Avoided | Fallback Calls Made |" in executive_summary
    assert "Improvement Potential" in executive_summary
    assert "deterministic PyMuPDF evidence; no Gemini categorization or provider call" in (
        executive_summary
    )
    assert (suite_dir / "approaches" / "auto" / "REPORT.md").exists()
    assert (suite_dir / "approaches" / "pymupdf" / "REPORT.md").exists()
    assert (suite_dir / "approaches" / "gemini" / "REPORT.md").exists()
    assert (suite_dir / "approaches" / "auto" / "cases" / "cmr-cmr202504" / "run").exists()
    assert (suite_dir / "approaches" / "pymupdf" / "cases" / "cmr-cmr202504" / "run").exists()
    assert report["approaches"][0]["case_count"] == 4
    assert report["approaches"][0]["recurrence_field_mismatches"] == 0
    assert report["fallback_readiness"]["status"] == "strict_ready"
    assert report["fallback_transaction_readiness"]["score"] == 100
    assert report["fallback_p0_components"]["amount"]["weight"] == 25
    assert report["line_coverage_band"]["min_ratio"] == 0.9
    assert report["line_coverage_band"]["max_ratio"] == 1.1
    assert report["provider_cost_report"][0]["deterministic_calls_avoided"] == 4
    assert report["approaches"][2]["fallback_readiness"]["p0_passed"] is True
    assert "Fallback Readiness Gate" in executive_summary
    assert report["runtime_critical_field_readiness"][0]["field"] == "Date"
    assert report["improvement_potential"][0]["improvement"] == (
        "Preserve deterministic primary gates"
    )
    assert report["case_comparison"][0]["best_approach"] in {"auto", "pymupdf", "gemini"}


@pytest.mark.asyncio
async def test_statement_suite_run_blocks_missing_expected_fixture(tmp_path, monkeypatch):
    missing_case = StatementCase(
        id="cmr/cmr202504",
        issuer="cmr",
        pdf_path=tmp_path / "cmr202504.pdf",
        relative_path="private/cmr/cmr202504.pdf",
        expected_path=None,
    )
    monkeypatch.setattr(
        statement_suite_mod,
        "get_statement_case",
        lambda _case_id: missing_case,
    )

    with pytest.raises(ValueError, match="cmr/cmr202504"):
        await statement_suite_mod.run_statement_suite(
            case_ids=["cmr/cmr202504"],
            approaches=["pymupdf"],
            output_root=tmp_path / "results",
        )


@pytest.mark.asyncio
async def test_statement_suite_default_blocks_until_seven_expected_fixtures_exist(
    tmp_path,
    monkeypatch,
):
    missing_ids = {"cmr/cmr202505", "edwards/edw202507", "scotiabank/sco202207"}

    def fake_get_statement_case(case_id):
        if case_id in missing_ids:
            issuer, filename = case_id.split("/", maxsplit=1)
            return StatementCase(
                id=case_id,
                issuer=issuer,
                pdf_path=tmp_path / issuer / f"{filename}.pdf",
                relative_path=f"private/{issuer}/{filename}.pdf",
                expected_path=None,
            )
        return _suite_case(tmp_path, case_id)

    monkeypatch.setattr(statement_suite_mod, "get_statement_case", fake_get_statement_case)

    with pytest.raises(ValueError) as exc:
        await statement_suite_mod.run_statement_suite(
            approaches=["auto"],
            output_root=tmp_path / "results",
        )

    message = str(exc.value)
    for case_id in missing_ids:
        assert case_id in message


@pytest.mark.asyncio
async def test_statement_fallback_calibration_from_manifest_writes_reports(
    tmp_path,
    monkeypatch,
):
    case = _suite_case(tmp_path, "cmr/cmr202503")
    actual = StatementExtractionOutput(
        statement=StatementInfo(issuer="cmr", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 20),
                description="cmr test charge",
                amount_minor=99_999,
                currency="CLP",
                line_type="charge",
            )
        ],
        processing=StatementProcessingMetadata(provider="gemini", page_count=1),
    )
    manifest_path = _write_live_statement_manifest(tmp_path, case=case, actual=actual)

    monkeypatch.setattr(statement_fallback_mod, "get_statement_case", lambda _case_id: case)
    monkeypatch.setattr(statement_report_mod, "get_statement_case", lambda _case_id: case)

    summary = await statement_fallback_mod.run_statement_fallback_calibration(
        from_manifest_paths=[manifest_path],
        run_id="fallback-calibration",
        output_root=tmp_path / "results",
        transaction_scope_firebase_uid="local-user",
    )

    report_path = Path(summary["report_path"])
    report = json.loads(report_path.read_text(encoding="utf-8"))
    markdown = Path(summary["fallback_calibration_path"]).read_text(encoding="utf-8")
    executive_summary = Path(summary["executive_summary_path"]).read_text(encoding="utf-8")
    assert summary["recommendation"] == "needs_prompt_iteration"
    assert report["run_mode"] == "from_manifest"
    assert report["provider_calls_allowed"] is False
    assert report["totals"]["field_mismatch_counts"]["amount_minor"] == 1
    assert report["totals"]["weighted_impact_score"] == 100
    assert report["totals"]["field_mismatch_percentages"]["amount_minor"] == 100.0
    assert report["cases"][0]["weighted_impact"]["case_contribution_pct"] == 100.0
    assert report["totals"]["top_weighted_locations"][0]["field"] == "amount_minor"
    assert report["fallback_readiness"]["status"] == "not_ready"
    assert report["fallback_transaction_readiness"]["score"] == 75
    assert report["fallback_p0_components"]["amount"]["passed"] is False
    assert report["decision_explanation"].startswith("P0 readiness score 75/100")
    assert report["runtime_critical_field_readiness"][0]["field"] == "Date"
    assert report["improvement_potential"][0]["improvement"] == "Fix selected statement amount"
    assert report["failure_classes"]["amount_selection"] == 1
    assert report["recommended_prompt_improvements"][0]["priority"] == ("P0 financial correctness")
    assert "Concrete Expected Vs Actual Examples" in markdown
    assert "| Field | Expected Fixture | Actual Origin | Actual Value | Difference Summary |" in (
        markdown
    )
    assert "`12345` | `Gemini Fallback` | `99999` | `different: +87654`" in markdown
    assert "Rejected Anti-Overfit Suggestions" in markdown
    assert "What Went Wrong" in executive_summary
    assert "Runtime Critical Field Readiness" in executive_summary
    assert "Fallback Transaction Readiness" in executive_summary
    assert "| Factor | Weight | Current Result | Decision Impact |" in executive_summary
    assert "Fallback Readiness Gate" in executive_summary
    assert "Improvement Potential" in executive_summary
    assert "Difference Weight And Percentage" in executive_summary
    assert "Where Differences Are Located" in executive_summary


def test_statement_fallback_readiness_allows_non_p0_caveats():
    readiness = statement_readiness_mod.case_fallback_readiness(
        {
            "status": "completed",
            "passed": False,
            "expected_line_count": 10,
            "actual_line_count": 10,
            "line_count_delta": 0,
            "non_ledger_ready_count": 0,
            "field_mismatch_counts": {
                "amount_minor": 0,
                "date": 0,
                "currency": 0,
                "description": 3,
                "line_type": 1,
                "original_currency": 2,
            },
            "candidate_safety": {
                "passed": True,
                "evaluated": True,
                "unsafe_candidate_count": 0,
                "candidate_transaction_count": 4,
            },
        }
    )

    assert readiness["status"] == "fallback_promoted_with_caveats"
    assert readiness["p0_readiness_score"] == 100
    assert readiness["fallback_transaction_readiness"]["score_label"] == "100/100"
    assert readiness["fallback_p0_components"]["line_coverage"]["passed"] is True
    assert readiness["line_coverage_band"]["max_ratio"] == 1.1
    assert readiness["p0_passed"] is True
    assert readiness["candidate_safety_passed"] is True
    assert "description_drift:3" in readiness["caveats"]


def test_statement_fallback_readiness_blocks_p0_and_unsafe_candidates():
    amount_blocked = statement_readiness_mod.case_fallback_readiness(
        {
            "status": "completed",
            "passed": False,
            "expected_line_count": 2,
            "actual_line_count": 2,
            "field_mismatch_counts": {"amount_minor": 1, "date": 0, "currency": 0},
            "candidate_safety": {"passed": True, "evaluated": True},
        }
    )
    unsafe_blocked = statement_readiness_mod.case_fallback_readiness(
        {
            "status": "completed",
            "passed": False,
            "expected_line_count": 2,
            "actual_line_count": 2,
            "field_mismatch_counts": {"amount_minor": 0, "date": 0, "currency": 0},
            "candidate_safety": {
                "passed": False,
                "evaluated": True,
                "unsafe_candidate_count": 1,
            },
        }
    )

    assert amount_blocked["status"] == "not_ready"
    assert amount_blocked["p0_readiness_score"] == 75
    assert amount_blocked["fallback_p0_components"]["amount"]["passed"] is False
    assert "amount_minor_mismatches:1" in amount_blocked["blocking_reasons"]
    assert unsafe_blocked["status"] == "not_ready"
    assert unsafe_blocked["p0_readiness_score"] == 80
    assert "unsafe_candidate_transactions:1" in unsafe_blocked["blocking_reasons"]


def test_statement_fallback_readiness_treats_candidate_safe_overcoverage_as_caveat():
    readiness = statement_readiness_mod.case_fallback_readiness(
        {
            "status": "completed",
            "passed": False,
            "expected_line_count": 10,
            "actual_line_count": 12,
            "line_count_delta": 2,
            "field_mismatch_counts": {"amount_minor": 0, "date": 0, "currency": 0},
            "candidate_safety": {"passed": True, "evaluated": True},
        }
    )

    assert readiness["status"] == "fallback_promoted_with_caveats"
    assert readiness["p0_readiness_score"] == 100
    assert readiness["fallback_p0_components"]["line_coverage"]["passed"] is True
    assert "line_coverage_above_110_pct:120.0%" in readiness["caveats"]
    assert "line_coverage_above_110_pct:120.0%" not in readiness["blocking_reasons"]


def test_statement_compact_evidence_provider_payload_v2_omits_word_lists():
    compact = build_statement_compact_evidence(_fake_statement_pdf_evidence())

    provider_payload = compact_evidence_provider_payload(compact)

    assert provider_payload["schema_version"] == "statement-compact-evidence.v2"
    assert provider_payload["provider_payload_version"] == (
        "statement-compact-evidence-provider.v2"
    )
    assert provider_payload["provider_row_count"] == 1
    assert provider_payload["privacy"]["full_word_lists_included"] is False
    assert "compact_evidence_sha256" in provider_payload
    assert "words" not in provider_payload["rows"][0]
    assert provider_payload["rows"][0]["visible_text"] == ("03/05/2026 EXACT MARKET 10000")


@pytest.mark.asyncio
async def test_statement_fallback_calibration_blocks_missing_expected_fixture(
    tmp_path,
    monkeypatch,
):
    missing_case = StatementCase(
        id="cmr/missing",
        issuer="cmr",
        pdf_path=tmp_path / "missing.pdf",
        relative_path="private/cmr/missing.pdf",
        expected_path=None,
    )
    monkeypatch.setattr(
        statement_fallback_mod,
        "get_statement_case",
        lambda _case_id: missing_case,
    )

    with pytest.raises(ValueError, match="cmr/missing"):
        await statement_fallback_mod.run_statement_fallback_calibration(
            case_ids=["cmr/missing"],
            cache_only=True,
            output_root=tmp_path / "results",
        )


def test_statement_fallback_calibration_cli_guards_live_cost_and_bypass_cache():
    base = {
        "case_ids": ["cmr/cmr202503"],
        "run_id": None,
        "credentials_root": None,
        "model": "gemini-2.5-pro",
        "prompt": "statement-extraction-v1",
        "live": True,
        "cache_only": False,
        "bypass_cache": False,
        "confirm_live_cost": False,
        "from_manifest": None,
        "transaction_scope_firebase_uid": None,
    }
    with pytest.raises(SystemExit, match="requires --confirm-live-cost"):
        prompt_cli_mod._statement_fallback_calibrate(Namespace(**base))

    args = Namespace(**{**base, "live": False, "bypass_cache": True})
    with pytest.raises(SystemExit, match="--bypass-cache requires --live"):
        prompt_cli_mod._statement_fallback_calibrate(args)


def test_statement_live_cost_estimate_uses_validated_fallback_budget():
    assert prompt_cli_mod._estimated_statement_fallback_cost(
        1, "gemini-2.5-flash-lite"
    ) == pytest.approx(0.018)
    assert prompt_cli_mod._estimated_statement_fallback_cost(
        7, "google-gla:gemini-2.5-flash-lite"
    ) == pytest.approx(0.126)


def test_statement_fallback_calibration_anti_overfit_classifier():
    rejected = statement_fallback_mod.classify_prompt_suggestion(
        "Add a CMR cmr202503 coordinate rule for Mercadopago rows.",
        case_ids=["cmr/cmr202503"],
    )
    assert rejected["classification"] == "case_specific_rejected"
    assert rejected["recommended_for_prompt_promotion"] is False
    assert any(reason.startswith("issuer_name:cmr") for reason in rejected["reasons"])
    assert any(reason.startswith("case_id_or_filename:cmr202503") for reason in rejected["reasons"])
    assert any(reason.startswith("exact_merchant:mercadopago") for reason in rejected["reasons"])
    assert any(reason.startswith("layout_specific:coordinate") for reason in rejected["reasons"])

    allowed = statement_fallback_mod.classify_prompt_suggestion(
        "For each transaction row, set amount_minor to the current statement-line amount."
    )
    assert allowed["classification"] == "schema_invariant"
    assert allowed["recommended_for_prompt_promotion"] is True


def test_statement_fallback_calibration_prioritizes_financial_prompt_candidates():
    candidates = statement_fallback_mod.build_prompt_improvement_candidates(
        [
            {
                "case_id": "fixture/case",
                "issuer": "fixture",
                "passed": False,
                "field_mismatch_counts": {
                    "amount_minor": 2,
                    "description": 1,
                    "installment": 1,
                    "line_type": 1,
                    "currency": 0,
                    "date": 0,
                    "original_currency": 0,
                    "original_amount_minor": 0,
                },
                "failure_classes": {
                    "amount_selection": 2,
                    "description_drift": 1,
                    "installment_recurrence": 1,
                    "line_type": 1,
                },
            }
        ]
    )

    by_id = {candidate["id"]: candidate for candidate in candidates}
    assert by_id["amount-current-statement-line"]["priority"] == "P0 financial correctness"
    assert by_id["line-type-financial-behavior"]["priority"] == "P1 reconciliation quality"
    assert by_id["installment-marker-and-term-preservation"]["classification"] in {
        "generalizable",
        "schema_invariant",
    }
    rejected = [
        candidate
        for candidate in candidates
        if candidate["classification"] == "case_specific_rejected"
    ]
    assert rejected


@pytest.mark.asyncio
async def test_statement_live_report_explains_field_severity_and_downstream_impact(
    tmp_path,
    monkeypatch,
):
    expected = StatementExtractionOutput(
        statement=StatementInfo(issuer="fixture", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 20),
                description="Pago en mercadopago 4",
                amount_minor=55_036,
                currency="CLP",
                line_type="charge",
                installment="03/03",
            ),
            StatementLine(
                source_order=2,
                date=date(2026, 5, 21),
                description="Amazon mktpl",
                amount_minor=68_264,
                currency="CLP",
                line_type="charge",
                installment="01/01",
                original_currency="USD",
                original_amount_minor=7_060,
            ),
            StatementLine(
                source_order=3,
                date=date(2026, 5, 22),
                description="Amazon.com",
                amount_minor=-83_334,
                currency="CLP",
                line_type="adjustment",
                installment="01/01",
                original_currency="USD",
                original_amount_minor=8_710,
            ),
            StatementLine(
                source_order=4,
                date=date(2026, 5, 23),
                description="Codiner ltda",
                amount_minor=53_900,
                currency="CLP",
                line_type="charge",
            ),
        ],
        processing=StatementProcessingMetadata(provider="manual", page_count=1),
    )
    expected_path = tmp_path / "fixture.expected.json"
    expected_path.write_text(expected.model_dump_json(), encoding="utf-8")
    case = StatementCase(
        id="fixture/diagnostics",
        issuer="fixture",
        pdf_path=tmp_path / "diagnostics.pdf",
        relative_path="private/fixture/diagnostics.pdf",
        expected_path=expected_path,
    )
    actual = expected.model_copy(deep=True)
    actual.processing = StatementProcessingMetadata(
        provider="gemini",
        prompt_id="statement-extraction-current",
        model_name="google:gemini-2.5-flash-lite",
        page_count=1,
    )
    actual.lines[0].amount_minor = 165_106
    actual.lines[
        0
    ].amount_selection_reason = "selected larger value from row; current cuota also visible"
    actual.lines[0].amount_candidates = [
        StatementAmountCandidate(
            role="current_installment",
            amount_minor=55_036,
            currency="CLP",
            visible_text="$55.036",
            column_label="Valor cuota",
        ),
        StatementAmountCandidate(
            role="selected",
            amount_minor=165_106,
            currency="CLP",
            visible_text="$165.106",
            column_label="Total cuotas",
        ),
        StatementAmountCandidate(
            role="plan_total",
            amount_minor=165_106,
            currency="CLP",
            visible_text="$165.106",
            column_label="Total cuotas",
        ),
    ]
    actual.lines[0].installment = None
    actual.lines[1].description = "Amazon mktpl CL USD"
    actual.lines[1].installment = None
    actual.lines[1].original_amount_minor = 706
    actual.lines[2].description = "Amazon.com CL USD"
    actual.lines[2].line_type = "charge"
    actual.lines[2].installment = None
    actual.lines[2].original_amount_minor = -871
    actual.lines[3].description = "Codiner Itda"

    source_dir = tmp_path / "source-live-diagnostics"
    source_dir.mkdir()
    processed_path = source_dir / "processed_output.json"
    processed_path.write_text(
        json.dumps(
            {
                "document_type": "credit_card_statement",
                "statement_extraction": actual.model_dump(mode="json"),
            },
            default=str,
        ),
        encoding="utf-8",
    )
    raw_path = source_dir / "raw_output.json"
    raw_path.write_text(
        json.dumps({"provider_call": "completed", "extraction": actual.model_dump(mode="json")}),
        encoding="utf-8",
    )
    field_path = source_dir / "field_provenance.json"
    field_path.write_text(json.dumps({"source": "gemini_provider_output"}), encoding="utf-8")
    cost_path = source_dir / "cost_summary.json"
    cost_path.write_text(
        json.dumps(
            {
                "totals": {
                    "input_tokens": 10,
                    "output_tokens": 20,
                    "total_tokens": 30,
                    "cost_usd": "0.001",
                }
            }
        ),
        encoding="utf-8",
    )
    manifest_path = source_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "case_id": "fixture/diagnostics",
                "issuer": "fixture",
                "status": "threshold-failed",
                "evidence_label": "statement-prompt-lab-ai-quality",
                "expected_path": str(expected_path),
                "processed_output_path": str(processed_path),
                "raw_output_path": str(raw_path),
                "field_provenance_path": str(field_path),
                "cost_summary_path": str(cost_path),
            }
        ),
        encoding="utf-8",
    )

    async def fake_db_snapshot(**_kwargs):
        return [], {
            "url": "sqlite+aiosqlite:///test.db",
            "readable": True,
            "table_count": 1,
            "has_transactions_table": True,
            "has_statements_table": False,
            "has_statement_lines_table": False,
            "transactions_available": 0,
            "statement_lab_seed_transactions": 0,
            "transactions_date_min": None,
            "transactions_date_max": None,
            "transaction_scope_firebase_uid": None,
            "transaction_scope_ownership_scope_id": None,
            "reason": None,
        }

    monkeypatch.setattr(statement_report_mod, "get_statement_case", lambda _case_id: case)
    monkeypatch.setattr(
        statement_report_mod,
        "_load_receipt_transactions_snapshot",
        fake_db_snapshot,
    )

    await write_statement_expected_report(
        run_id="live-diagnostics",
        output_root=tmp_path / "results",
        actual_source="live-gemini",
        manifest_paths=[manifest_path],
    )

    report_dir = tmp_path / "results" / "statements" / "live-diagnostics"
    report = json.loads((report_dir / "report.json").read_text())
    case_report = report["cases"][0]
    differences = case_report["current_extraction"]["differences"]

    assert report["recommended_owner"] == "prompt"
    assert "amount_mismatches_present" in report["promotion_blockers"]
    assert "missing_installments_present" in report["promotion_blockers"]
    assert "description_mismatches_present" in report["promotion_blockers"]
    assert report["severity_counts"]["critical"] >= 1
    assert report["severity_counts"]["high"] >= 1
    assert report["severity_counts"]["medium"] >= 1
    assert report["severity_counts"]["low"] >= 1
    assert differences["field_mismatch_counts"]["amount_minor"] == 1
    assert differences["field_mismatch_counts"]["description"] == 3
    assert differences["field_mismatch_counts"]["installment"] == 3
    assert "installment_total_or_balance_used_as_line_amount" in differences["pattern_counts"]
    amount_issue = next(
        issue
        for issue in differences["mismatches"][0]["issues"]
        if issue["field"] == "amount_minor"
    )
    assert amount_issue["amount_evidence"]["selected_amount_minor"] == 165_106
    assert amount_issue["amount_evidence"]["current_amount_candidates"][0]["amount_minor"] == 55_036
    assert (
        differences["mismatches"][0]["transaction_context"]["actual_candidate_transaction"][
            "total_minor"
        ]
        == 165_106
    )
    markdown = (report_dir / "REPORT.md").read_text()
    assert "## Why It Failed" in markdown
    assert "Wrong amounts block valid receipt matches" in markdown
    assert "### Line Comparison Policy" in markdown
    assert "best_match_with_source_order_diagnostics" in markdown
    assert "Order drift matched pairs" in markdown
    assert "### Expected Vs Actual Values" in markdown
    assert "| Case | Transaction | Field | Expected Fixture | Actual Origin | Actual Value |" in (
        markdown
    )
    assert "`amount_minor`" in markdown
    assert "`55036` | `Gemini` | `165106` | `different: +110070`" in markdown
    assert "Pago en mercadopago 4" in markdown
    assert "`description`" in markdown
    assert "`Amazon mktpl` | `Gemini` | `Amazon mktpl CL USD`" in markdown
    assert "Top Mismatch Examples" in markdown


@pytest.mark.asyncio
async def test_statement_expected_report_edge_fixture_covers_reconciliation_buckets(
    tmp_path,
    monkeypatch,
):
    expected = StatementExtractionOutput(
        statement=StatementInfo(
            issuer="fixture",
            currency="CLP",
            period_start=date(2026, 5, 1),
            period_end=date(2026, 5, 31),
        ),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 3),
                description="EXACT MARKET",
                amount_minor=10_000,
                currency="CLP",
                line_type="charge",
            ),
            StatementLine(
                source_order=2,
                date=date(2026, 5, 4),
                description="FUZZY COFFEE STORE",
                amount_minor=20_000,
                currency="CLP",
                line_type="charge",
            ),
            StatementLine(
                source_order=3,
                date=date(2026, 5, 5),
                description="DUPLICATE CAFE",
                amount_minor=30_000,
                currency="CLP",
                line_type="charge",
            ),
            StatementLine(
                source_order=4,
                date=date(2026, 5, 6),
                description="STATEMENT ONLY SHOP",
                amount_minor=40_000,
                currency="CLP",
                line_type="charge",
                installment="02/06",
            ),
            StatementLine(
                source_order=5,
                date=date(2026, 5, 7),
                description="PAGO RECIBIDO",
                amount_minor=-50_000,
                currency="CLP",
                line_type="payment",
            ),
        ],
        processing=StatementProcessingMetadata(provider="manual"),
    )
    expected_path = tmp_path / "fixture.expected.json"
    expected_path.write_text(expected.model_dump_json(), encoding="utf-8")
    case = StatementCase(
        id="fixture/edge",
        issuer="fixture",
        pdf_path=tmp_path / "edge.pdf",
        relative_path="private/fixture/edge.pdf",
        expected_path=expected_path,
    )
    actual = StatementPromptLabExtractionPacket(
        extraction=StatementExtractionOutput(
            statement=StatementInfo(issuer="fixture", currency="CLP"),
            lines=[],
            processing=StatementProcessingMetadata(provider="codex-pdf-text"),
        )
    )

    async def fake_db_snapshot(**_kwargs):
        return [], {
            "url": "sqlite+aiosqlite:///test.db",
            "readable": True,
            "table_count": 1,
            "has_transactions_table": True,
            "has_statements_table": False,
            "has_statement_lines_table": False,
            "transactions_available": 0,
            "statement_lab_seed_transactions": 0,
            "transactions_date_min": None,
            "transactions_date_max": None,
            "transaction_scope_firebase_uid": None,
            "transaction_scope_ownership_scope_id": None,
            "reason": None,
        }

    monkeypatch.setattr(statement_report_mod, "list_statement_cases", lambda: [case])
    monkeypatch.setattr(statement_report_mod, "extract_statement_text", lambda *_, **__: actual)
    monkeypatch.setattr(
        statement_report_mod,
        "_load_receipt_transactions_snapshot",
        fake_db_snapshot,
    )

    manifest = await write_statement_expected_report(
        run_id="edge",
        output_root=tmp_path / "results",
        actual_source="mock-gemini",
        transaction_fixture="edge-cases",
    )

    counts = manifest["summary"]["reconciliation_counts"]
    assert counts["matched"] == 2
    assert counts["ambiguous"] == 1
    assert counts["receipt_only"] == 1
    assert counts["statement_only"] == 2
    assert counts["candidate_transactions"] == 1
    assert manifest["summary"]["synthetic_transactions_available"] == 5
    report = json.loads((tmp_path / "results" / "statements" / "edge" / "report.json").read_text())
    outcomes = report["cases"][0]["reconciliation"]["line_outcomes"]
    assert [outcome["verdict"] for outcome in outcomes] == [
        "matched",
        "matched",
        "ambiguous",
        "statement_only",
        "statement_only",
    ]
    assert report["cases"][0]["reconciliation"]["receipt_only"][0]["fixture_kind"] == (
        "receipt_only_app_transaction"
    )


def test_statement_seed_planning_builds_representative_edge_rows(tmp_path):
    case = _statement_case_with_expected(tmp_path, case_id="fixture/edge")

    rows, skipped = build_statement_seed_transactions(
        [case],
        profile=DEFAULT_STATEMENT_SEED_PROFILE,
    )

    assert skipped == []
    assert [row.fixture_kind for row in rows] == [
        "exact_match",
        "fuzzy_date_amount_merchant_match",
        "ambiguous_duplicate_match_1",
        "ambiguous_duplicate_match_2",
        "receipt_only_app_transaction",
        "near_miss_receipt_only",
    ]
    assert all(row.receipt_type == "scan" for row in rows)
    assert all(row.prompt_version.startswith(STATEMENT_LAB_SEED_PROMPT_PREFIX) for row in rows)
    assert len({row.id for row in rows}) == len(rows)


def test_statement_seed_guard_refuses_non_local_or_non_sqlite():
    with pytest.raises(RuntimeError, match="GASTIFY_ENVIRONMENT=local"):
        assert_local_sqlite_seed_allowed(
            environment="staging",
            database_url="sqlite+aiosqlite:///tmp/test.db",
        )

    with pytest.raises(RuntimeError, match="SQLite"):
        assert_local_sqlite_seed_allowed(
            environment="local",
            database_url="postgresql+asyncpg://example/db",
        )


@pytest.mark.asyncio
async def test_statement_seed_resets_only_prior_seed_rows_and_is_idempotent(tmp_path, engine):
    case = _statement_case_with_expected(tmp_path, case_id="fixture/edge")
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    normal_id = uuid.uuid4()
    async with factory() as session:
        normal = Transaction(
            id=normal_id,
            ownership_scope_id=TEST_SCOPE_ID,
            transaction_date=date(2026, 5, 3),
            merchant="Normal Local Receipt",
            total_minor=12_345,
            currency="CLP",
            receipt_type="scan",
        )
        session.add(normal)
        session.add(
            TransactionItem(
                transaction_id=normal.id,
                name="Normal item",
                total_price_minor=12_345,
                sort_order=0,
            )
        )
        await session.commit()

    first = await seed_statement_lab_transactions(
        firebase_uid="test-firebase-uid",
        cases=[case],
        session_factory=factory,
    )
    second = await seed_statement_lab_transactions(
        firebase_uid="test-firebase-uid",
        cases=[case],
        session_factory=factory,
    )

    assert first["inserted_transactions"] == 6
    assert first["reset_deleted_transactions"] == 0
    assert second["inserted_transactions"] == 6
    assert second["reset_deleted_transactions"] == 6
    async with factory() as session:
        total_transactions = await session.scalar(
            sa.select(sa.func.count()).select_from(Transaction)
        )
        seed_transactions = await session.scalar(
            sa.select(sa.func.count())
            .select_from(Transaction)
            .where(Transaction.prompt_version.like(f"{STATEMENT_LAB_SEED_PROMPT_PREFIX}%"))
        )
        normal = await session.get(Transaction, normal_id)
    assert total_transactions == 7
    assert seed_transactions == 6
    assert normal is not None


@pytest.mark.asyncio
async def test_statement_report_uses_seeded_sqlite_rows_and_payload_examples(
    tmp_path,
    engine,
    monkeypatch,
):
    case = _statement_case_with_expected(tmp_path, case_id="fixture/edge")
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    await seed_statement_lab_transactions(
        firebase_uid="test-firebase-uid",
        cases=[case],
        session_factory=factory,
    )
    actual = StatementPromptLabExtractionPacket(
        extraction=StatementExtractionOutput(
            statement=StatementInfo(issuer="fixture", currency="CLP"),
            lines=[],
            processing=StatementProcessingMetadata(provider="codex-pdf-text"),
        )
    )
    monkeypatch.setattr(statement_report_mod, "list_statement_cases", lambda: [case])
    monkeypatch.setattr(statement_report_mod, "extract_statement_text", lambda *_, **__: actual)
    monkeypatch.setattr(statement_report_mod, "engine", engine)

    manifest = await write_statement_expected_report(
        run_id="seeded",
        output_root=tmp_path / "results",
        actual_source="mock-gemini",
        transaction_scope_firebase_uid="test-firebase-uid",
    )

    counts = manifest["summary"]["reconciliation_counts"]
    assert counts["matched"] == 2
    assert counts["ambiguous"] == 1
    assert counts["receipt_only"] == 2
    assert counts["statement_only"] == 2
    assert counts["candidate_transactions"] == 1
    assert manifest["summary"]["database_statement_lab_seed_transactions"] == 6
    report = json.loads(
        (tmp_path / "results" / "statements" / "seeded" / "report.json").read_text()
    )
    examples = report["payload_examples"]
    assert examples["matched"][0]["application_payload"]["action"] == "accept_match"
    assert examples["statement_only"][0]["candidate_transaction"]["receipt_type"] == "statement"
    assert examples["statement_only"][0]["candidate_transaction"]["recurrence_kind"] == "fixed_term"
    assert examples["statement_only"][0]["candidate_transaction"]["term_current"] == 2
    assert examples["statement_only"][0]["candidate_transaction"]["term_total"] == 6
    assert examples["receipt_only"][0]["application_payload"]["action"] == (
        "keep_or_unlink_app_transaction"
    )
    assert examples["ambiguous"][0]["application_payload"]["candidate_transaction_ids"]
    assert examples["manual_review"][0]["application_payload"]["action"] == (
        "manual_review_statement_line"
    )
    artifacts = report["cases"][0]["artifacts"]
    assert Path(artifacts["payload_examples_path"]).exists()


def test_statement_coalesce_normalizes_lines_and_provider_metadata():
    raw = StatementExtractionOutput(
        statement=StatementInfo(issuer=None, currency="clp"),
        lines=[
            StatementLine(
                source_order=4,
                date=None,
                description="LINE B",
                amount_minor=2_000,
                currency="clp",
                line_type="other",
            ),
            StatementLine(
                source_order=1,
                date=date(2026, 5, 1),
                description="LINE A CL USD",
                amount_minor=-1_000,
                currency="usd",
                line_type="charge",
                original_currency="usd",
                original_amount_minor=-100,
            ),
            StatementLine(
                source_order=2,
                date=date(2026, 5, 2),
                description="INSTALLMENT SHOP",
                amount_minor=165_106,
                currency="clp",
                line_type="charge",
                installment="03/03",
                amount_selection_reason="selected larger visible amount",
                amount_candidates=[
                    StatementAmountCandidate(
                        role="current_installment",
                        amount_minor=55_036,
                        currency="clp",
                        visible_text="$55.036",
                    ),
                    StatementAmountCandidate(
                        role="plan_total",
                        amount_minor=165_106,
                        currency="clp",
                        visible_text="$165.106",
                    ),
                ],
            ),
        ],
        processing=StatementProcessingMetadata(provider="manual", confidence=0.81),
    )

    processed = coalesce_statement_output(
        raw,
        issuer_hint="cmr",
        prompt_id="statement-extraction-current",
        model_name="google-gla:test",
        page_count=4,
    )

    assert processed.processing.provider == "gemini"
    assert processed.processing.model_name == "google-gla:test"
    assert processed.processing.page_count == 4
    assert processed.statement.issuer == "cmr"
    assert processed.statement.currency == "CLP"
    assert [line.source_order for line in processed.lines] == [1, 2, 3]
    assert processed.lines[0].currency == "USD"
    assert processed.lines[0].original_currency == "USD"
    assert processed.lines[1].amount_minor == 55_036
    assert "statement_line_source_order_normalized" in processed.processing.warnings
    assert "statement_line_foreign_currency_marker_in_description" in (
        processed.processing.warnings
    )
    assert "statement_line_negative_charge_type" in processed.processing.warnings
    assert "statement_line_negative_original_amount" in processed.processing.warnings
    assert "statement_line_type_other" in processed.processing.warnings
    assert "statement_line_missing_date" in processed.processing.warnings
    assert "statement_line_installment_amount_corrected_from_current_candidate" in (
        processed.processing.warnings
    )
    assert "statement_line_installment_amount_corrected_from_candidate" in (
        processed.processing.warnings
    )
    assert "statement_line_installment_selected_non_current_amount" in (
        processed.processing.warnings
    )


def test_statement_coalesce_corrects_fixed_term_amount_from_explicit_candidate_label():
    raw = StatementExtractionOutput(
        statement=StatementInfo(issuer="issuer", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 2),
                description="TERM SHOP",
                amount_minor=84_000,
                currency="CLP",
                line_type="charge",
                installment=None,
                amount_selection_reason="row shows 02/03 cuotas; selected total cuotas",
                amount_candidates=[
                    StatementAmountCandidate(
                        role="selected",
                        amount_minor=84_000,
                        currency="CLP",
                        visible_text="$84.000",
                        column_label="Total cuotas",
                    ),
                    StatementAmountCandidate(
                        role="unknown",
                        amount_minor=28_000,
                        currency="CLP",
                        visible_text="$28.000",
                        column_label="Valor cuota",
                    ),
                ],
            )
        ],
        processing=StatementProcessingMetadata(provider="gemini"),
    )

    processed = coalesce_statement_output(
        raw,
        issuer_hint=None,
        prompt_id="statement-extraction-current",
        model_name="google-gla:test",
        page_count=1,
    )

    assert processed.lines[0].amount_minor == 28_000
    assert "statement_line_installment_amount_corrected_from_candidate" in (
        processed.processing.warnings
    )


def test_statement_coalesce_does_not_invent_missing_installment_amount():
    raw = StatementExtractionOutput(
        statement=StatementInfo(issuer="issuer", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 2),
                description="TERM SHOP",
                amount_minor=84_000,
                currency="CLP",
                line_type="charge",
                installment="02/03",
                amount_selection_reason="selected plan total",
                amount_candidates=[
                    StatementAmountCandidate(
                        role="plan_total",
                        amount_minor=84_000,
                        currency="CLP",
                        visible_text="$84.000",
                        column_label="Total cuotas",
                    )
                ],
            )
        ],
        processing=StatementProcessingMetadata(provider="gemini"),
    )

    processed = coalesce_statement_output(
        raw,
        issuer_hint=None,
        prompt_id="statement-extraction-current",
        model_name="google-gla:test",
        page_count=1,
    )

    assert processed.lines[0].amount_minor == 84_000
    assert "statement_line_installment_amount_corrected_from_candidate" not in (
        processed.processing.warnings
    )


def test_statement_coalesce_does_not_correct_ambiguous_installment_candidates():
    raw = StatementExtractionOutput(
        statement=StatementInfo(issuer="issuer", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 2),
                description="TERM SHOP",
                amount_minor=100_000,
                currency="CLP",
                line_type="charge",
                installment="02/03",
                amount_selection_reason="selected plan total",
                amount_candidates=[
                    StatementAmountCandidate(
                        role="current_installment",
                        amount_minor=30_000,
                        currency="CLP",
                        visible_text="$30.000",
                        column_label="Valor cuota",
                    ),
                    StatementAmountCandidate(
                        role="current_statement_amount",
                        amount_minor=35_000,
                        currency="CLP",
                        visible_text="$35.000",
                        column_label="Monto facturado",
                    ),
                    StatementAmountCandidate(
                        role="plan_total",
                        amount_minor=100_000,
                        currency="CLP",
                        visible_text="$100.000",
                        column_label="Total cuotas",
                    ),
                ],
            )
        ],
        processing=StatementProcessingMetadata(provider="gemini"),
    )

    processed = coalesce_statement_output(
        raw,
        issuer_hint=None,
        prompt_id="statement-extraction-current",
        model_name="google-gla:test",
        page_count=1,
    )

    assert processed.lines[0].amount_minor == 100_000
    assert "statement_line_installment_amount_corrected_from_candidate" not in (
        processed.processing.warnings
    )


def test_statement_run_live_cost_guard_requires_confirmation():
    args = Namespace(
        cache_only=False,
        case_id="cmr/cmr202503",
        confirm_live_cost=False,
        limit=None,
        model="gemini-2.5-flash-lite",
    )

    with pytest.raises(SystemExit, match="requires --confirm-live-cost"):
        prompt_cli_mod._guard_statement_live_run(args)


@pytest.mark.asyncio
async def test_statement_runner_dry_run_and_cache_only_do_not_call_provider(
    tmp_path,
    monkeypatch,
):
    case = _statement_case_with_expected(tmp_path, case_id="fixture/edge")
    _write_pdf(case.pdf_path)
    calls = 0

    async def fake_provider(*_args, **_kwargs):
        nonlocal calls
        calls += 1
        raise AssertionError("provider should not be called")

    monkeypatch.setattr(statement_runner_mod, "extract_statement_with_gemini", fake_provider)
    monkeypatch.setattr(
        statement_runner_mod, "read_statement_cache", lambda *_args, **_kwargs: None
    )
    monkeypatch.setattr(
        statement_runner_mod,
        "_load_receipt_transactions_snapshot",
        _fake_transaction_snapshot,
    )

    dry = await statement_runner_mod.run_statement_case(
        case,
        results_root=tmp_path / "results",
        run_id="dry",
    )
    missing = await statement_runner_mod.run_statement_case(
        case,
        cache_only=True,
        results_root=tmp_path / "results",
        run_id="cache-only",
    )

    assert calls == 0
    assert dry["status"] == "dry-run"
    assert missing["status"] == "missing-cache"
    assert Path(dry["pdf_input_path"]).exists()
    assert Path(dry["raw_output_path"]).exists()
    assert Path(missing["manifest_path"]).exists()


@pytest.mark.asyncio
async def test_statement_runner_encrypted_pdf_states_skip_provider(tmp_path, monkeypatch):
    pdf_path = tmp_path / "edwards" / "edw202506.pdf"
    pdf_path.parent.mkdir()
    _write_pdf(pdf_path, password="correct-password")
    expected_path = pdf_path.with_name("edw202506.expected.json")
    expected_path.write_text(
        StatementExtractionOutput(
            statement=StatementInfo(issuer="edwards", currency="CLP"),
            lines=[],
            processing=StatementProcessingMetadata(provider="manual"),
        ).model_dump_json(),
        encoding="utf-8",
    )
    case = StatementCase(
        id="edwards/edw202506",
        issuer="edwards",
        pdf_path=pdf_path,
        relative_path="private/edwards/edw202506.pdf",
        expected_path=expected_path,
    )
    wrong_root = tmp_path / "wrong-creds"
    (wrong_root / "edwards").mkdir(parents=True)
    (wrong_root / "edwards" / "credentials.json").write_text(
        json.dumps({"pdfPassword": "wrong-password"}),
        encoding="utf-8",
    )
    valid_root = tmp_path / "valid-creds"
    (valid_root / "edwards").mkdir(parents=True)
    (valid_root / "edwards" / "credentials.json").write_text(
        json.dumps({"pdfPassword": "correct-password"}),
        encoding="utf-8",
    )

    async def fake_provider(*_args, **_kwargs):
        raise AssertionError("provider should not be called")

    monkeypatch.setattr(statement_runner_mod, "extract_statement_with_gemini", fake_provider)
    monkeypatch.setattr(
        statement_runner_mod, "read_statement_cache", lambda *_args, **_kwargs: None
    )
    monkeypatch.setattr(
        statement_runner_mod,
        "_load_receipt_transactions_snapshot",
        _fake_transaction_snapshot,
    )

    missing = await statement_runner_mod.run_statement_case(
        case,
        results_root=tmp_path / "results",
        run_id="missing",
    )
    invalid = await statement_runner_mod.run_statement_case(
        case,
        credentials_root=wrong_root,
        results_root=tmp_path / "results",
        run_id="invalid",
    )
    valid = await statement_runner_mod.run_statement_case(
        case,
        credentials_root=valid_root,
        results_root=tmp_path / "results",
        run_id="valid",
    )

    assert missing["status"] == "password_required"
    assert invalid["status"] == "password_invalid"
    assert valid["status"] == "dry-run"
    assert valid["pdf_input"]["decrypted_for_provider"] is True
    assert valid["pdf_input"]["provider_size_bytes"] > 0


@pytest.mark.asyncio
async def test_statement_runner_live_provider_error_writes_classified_packet(
    tmp_path,
    monkeypatch,
):
    case = _statement_case_with_expected(tmp_path, case_id="fixture/edge")
    _write_pdf(case.pdf_path)

    async def fake_provider(*_args, **_kwargs):
        raise ModelHTTPError(429, "google-gla:test", {"error": "rate-limit"})

    monkeypatch.setattr(
        statement_runner_mod,
        "extract_statement_pdf_evidence",
        lambda *_args, **_kwargs: _fake_statement_pdf_evidence(),
    )
    monkeypatch.setattr(
        statement_runner_mod,
        "infer_statement_layout_profile_with_gemini",
        fake_provider,
    )
    monkeypatch.setattr(
        statement_runner_mod,
        "extract_statement_with_gemini",
        lambda *_args, **_kwargs: pytest.fail("direct PDF Gemini should not run"),
    )
    monkeypatch.setattr(
        statement_runner_mod, "read_statement_cache", lambda *_args, **_kwargs: None
    )

    packet = await statement_runner_mod.run_statement_case(
        case,
        live=True,
        bypass_cache=True,
        model="test",
        results_root=tmp_path / "results",
        run_id="provider-error",
    )

    assert packet["status"] == "provider-error"
    assert packet["failure_owner"] == "provider"
    assert packet["provider_error"]["status_code"] == 429
    assert Path(packet["manifest_path"]).exists()


@pytest.mark.asyncio
async def test_statement_runner_live_success_scores_and_reconciles_against_local_rows(
    tmp_path,
    monkeypatch,
):
    case = _statement_case_with_expected(tmp_path, case_id="fixture/edge")
    _write_pdf(case.pdf_path)
    expected = StatementExtractionOutput.model_validate_json(
        case.expected_path.read_text(encoding="utf-8")
    )

    async def fake_provider(evidence, *_args, **_kwargs):
        assert evidence["input_mode"] == "profile-rows"
        return StatementLayoutProfileAgentResult(
            layout_profile=StatementLayoutProfile(
                transaction_row_ranges=[StatementRowRange(start_row=1, end_row=1)],
                confidence=0.95,
            ),
            usage=StatementExtractionUsage(input_tokens=1200, output_tokens=320, latency_ms=42.0),
            prompt_id="statement-layout-profile-current",
            prompt_version="unit",
            model_name="google-gla:test",
        )

    def fake_cache_write(_key, _payload):
        path = tmp_path / "cache" / "statement.json"
        path.parent.mkdir()
        path.write_text(json.dumps(_payload), encoding="utf-8")
        return path

    monkeypatch.setattr(
        statement_runner_mod,
        "extract_statement_pdf_evidence",
        lambda *_args, **_kwargs: _fake_statement_pdf_evidence(),
    )
    monkeypatch.setattr(
        statement_runner_mod,
        "infer_statement_layout_profile_with_gemini",
        fake_provider,
    )
    monkeypatch.setattr(
        statement_runner_mod,
        "apply_statement_layout_profile",
        lambda **kwargs: StatementProfileApplicationResult(
            extraction=expected,
            compact_evidence=kwargs["compact_evidence"],
            layout_profile=kwargs["layout_profile"],
            unresolved_rows=[],
            warnings=["unit_profile_application"],
        ),
    )
    monkeypatch.setattr(
        statement_runner_mod,
        "extract_statement_with_gemini",
        lambda *_args, **_kwargs: pytest.fail("direct PDF Gemini should not run"),
    )
    monkeypatch.setattr(
        statement_runner_mod, "read_statement_cache", lambda *_args, **_kwargs: None
    )
    monkeypatch.setattr(statement_runner_mod, "write_statement_cache", fake_cache_write)
    monkeypatch.setattr(
        statement_runner_mod,
        "_load_receipt_transactions_snapshot",
        _fake_transaction_snapshot_with_match,
    )

    packet = await statement_runner_mod.run_statement_case(
        case,
        live=True,
        bypass_cache=True,
        model="test",
        results_root=tmp_path / "results",
        run_id="live",
    )

    assert packet["status"] == "completed"
    assert packet["score"]["passed"] is True
    assert packet["reconciliation"]["counts"]["matched"] == 1
    assert packet["reconciliation"]["counts"]["statement_only"] >= 1
    assert packet["cost_summary"]["totals"]["input_tokens"] == 1200
    for key in (
        "pdf_input_path",
        "raw_output_path",
        "processed_output_path",
        "field_provenance_path",
        "score_path",
        "reconciliation_path",
        "payload_examples_path",
        "cost_summary_path",
        "manifest_path",
    ):
        assert Path(packet[key]).exists()


@pytest.mark.asyncio
async def test_statement_runner_cache_reapplies_profile_with_current_deterministic_logic(
    tmp_path,
    monkeypatch,
):
    case = _statement_case_with_expected(tmp_path, case_id="fixture/edge")
    _write_pdf(case.pdf_path)
    cached_wrong_raw = StatementExtractionOutput(
        statement=StatementInfo(issuer="fixture", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 3),
                description="EXACT MARKET",
                amount_minor=1,
                currency="CLP",
                line_type="charge",
            )
        ],
        processing=StatementProcessingMetadata(provider="gemini"),
    )
    cached = {
        "raw_output": {
            "extraction": cached_wrong_raw.model_dump(mode="json"),
        },
        "usage": {"layout_profile": {"input_tokens": 10, "output_tokens": 5}},
        "layout_profile": StatementLayoutProfile(
            transaction_row_ranges=[StatementRowRange(start_row=1, end_row=1)],
            default_currency="CLP",
            confidence=0.9,
        ).model_dump(mode="json"),
        "statement_cache_path": str(tmp_path / "cache" / "cached.json"),
    }

    async def fake_provider(*_args, **_kwargs):
        raise AssertionError("provider should not be called for cached profile rows")

    monkeypatch.setattr(
        statement_runner_mod,
        "extract_statement_pdf_evidence",
        lambda *_args, **_kwargs: _fake_statement_pdf_evidence(),
    )
    monkeypatch.setattr(
        statement_runner_mod,
        "infer_statement_layout_profile_with_gemini",
        fake_provider,
    )
    monkeypatch.setattr(
        statement_runner_mod,
        "read_statement_cache",
        lambda *_args, **_kwargs: cached,
    )
    monkeypatch.setattr(
        statement_runner_mod,
        "_load_receipt_transactions_snapshot",
        _fake_transaction_snapshot,
    )

    packet = await statement_runner_mod.run_statement_case(
        case,
        results_root=tmp_path / "results",
        run_id="cached-profile",
    )

    assert packet["status"] == "completed-from-cache"
    assert packet["raw_output"]["extraction"]["lines"][0]["amount_minor"] == 10_000
    assert packet["raw_output"]["extraction"]["lines"][0]["description"] == "EXACT MARKET"


def test_statement_profile_application_augments_profile_ranges_with_likely_rows():
    compact = build_statement_compact_evidence(
        {
            "status": "readable",
            "is_encrypted": False,
            "page_count": 1,
            "raw_text_sha256": "unit",
            "text_char_count": 160,
            "text_line_count": 3,
            "warnings": [],
            "row_groups": {
                "rows": [
                    {
                        "row_index": 1,
                        "page": 1,
                        "text": "MONTO TOTAL FACTURADO A PAGAR $99.999",
                    },
                    {
                        "row_index": 2,
                        "page": 1,
                        "text": "01/05/2026 MERCHANT ONE $10.000",
                    },
                    {
                        "row_index": 3,
                        "page": 1,
                        "text": "02/05/2026 MERCHANT TWO $20.000",
                    },
                ]
            },
        }
    )
    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=StatementLayoutProfile(
            transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
            excluded_row_ranges=[StatementRowRange(start_row=3, end_row=3)],
            default_currency="CLP",
            confidence=0.9,
        ),
        issuer_hint="fixture",
        prompt_id="unit",
        model_name="unit",
    )

    assert [line.source_row_index for line in result.extraction.lines] == [2, 3]
    assert "statement_profile_augmented_with_likely_financial_rows" in result.warnings
    assert "statement_profile_soft_ignored_exclusion_for_financial_rows" in result.warnings


def test_statement_profile_application_selects_billing_amount_from_local_foreign_row():
    compact = build_statement_compact_evidence(
        {
            "status": "readable",
            "is_encrypted": False,
            "page_count": 1,
            "raw_text_sha256": "unit",
            "text_char_count": 120,
            "text_line_count": 1,
            "warnings": [],
            "row_groups": {
                "rows": [
                    {
                        "row_index": 1,
                        "page": 1,
                        "text": (
                            "20/02/2025 Amzncombill Amazon.com*r CL USD 70,6 "
                            "T 68.264 68.264 01/01 abr-2025 68.264"
                        ),
                    }
                ]
            },
        }
    )
    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=StatementLayoutProfile(
            transaction_row_ranges=[StatementRowRange(start_row=1, end_row=1)],
            default_currency="CLP",
            confidence=0.9,
        ),
        issuer_hint="fixture",
        prompt_id="unit",
        model_name="unit",
    )
    line = result.extraction.lines[0]

    assert line.amount_minor == 68_264
    assert line.currency == "CLP"
    assert line.original_currency == "USD"
    assert line.original_amount_minor == 7_060
    assert line.ledger_ready is True
    assert line.amount_selection_reason == (
        "profile_rows_selected_billing_amount_from_local_foreign_row"
    )


def test_statement_profile_application_selects_usd_section_amount():
    compact = build_statement_compact_evidence(
        {
            "status": "readable",
            "is_encrypted": False,
            "page_count": 1,
            "raw_text_sha256": "unit",
            "text_char_count": 160,
            "text_line_count": 2,
            "warnings": [],
            "row_groups": {
                "rows": [
                    {
                        "row_index": 1,
                        "page": 1,
                        "text": "TOTAL DE COMPRAS US$ 42,64",
                    },
                    {
                        "row_index": 2,
                        "page": 1,
                        "text": ("11/06/25 STEAMGAMES.COM 4259 912-1844160 US 9.000,00 9,60"),
                    },
                ]
            },
        }
    )
    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=StatementLayoutProfile(
            transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
            default_currency="CLP",
            confidence=0.9,
        ),
        issuer_hint="fixture",
        prompt_id="unit",
        model_name="unit",
    )
    line = result.extraction.lines[0]

    assert line.amount_minor == 960
    assert line.currency == "USD"
    assert line.original_currency == "CLP"
    assert line.original_amount_minor == 900_000
    assert line.ledger_ready is True
    assert line.amount_selection_reason == "profile_rows_selected_foreign_section_statement_amount"


def test_statement_profile_application_prefers_clp_like_amount_without_currency_hint():
    compact = build_statement_compact_evidence(
        {
            "status": "readable",
            "is_encrypted": False,
            "page_count": 1,
            "raw_text_sha256": "unit",
            "text_char_count": 120,
            "text_line_count": 1,
            "warnings": [],
            "row_groups": {
                "rows": [
                    {
                        "row_index": 1,
                        "page": 1,
                        "text": "03/07/25 STEAM PURCHASE SEATTLE DE 23.875,00 25,60",
                    }
                ]
            },
        }
    )
    result = apply_statement_layout_profile(
        compact_evidence=compact,
        layout_profile=StatementLayoutProfile(
            transaction_row_ranges=[StatementRowRange(start_row=1, end_row=1)],
            default_currency="CLP",
            confidence=0.9,
        ),
        issuer_hint="fixture",
        prompt_id="unit",
        model_name="unit",
    )
    line = result.extraction.lines[0]

    assert line.amount_minor == 2_387_500
    assert line.currency == "CLP"
    assert line.ledger_ready is True
    assert line.amount_selection_reason == (
        "profile_rows_selected_clp_like_amount_without_currency_hint"
    )


def test_statement_batch_report_classifies_cache_and_failure_ownership(tmp_path):
    artifact_dir = tmp_path / "artifacts"
    artifact_dir.mkdir()
    cost_path = artifact_dir / "cost.json"
    cost_path.write_text(
        json.dumps(
            {
                "totals": {
                    "input_tokens": 100,
                    "output_tokens": 20,
                    "total_tokens": 120,
                    "cost_usd": "0.001",
                }
            }
        ),
        encoding="utf-8",
    )
    score_path = artifact_dir / "score.json"
    score_path.write_text(
        json.dumps(
            {
                "passed": False,
                "failure_owner": "prompt_or_coalesce",
                "differences": {"line_count_delta": -1, "mismatch_count": 2},
                "currency_match": True,
                "issuer_match": True,
            }
        ),
        encoding="utf-8",
    )
    reconciliation_path = artifact_dir / "reconciliation.json"
    reconciliation_path.write_text(
        json.dumps(
            {
                "counts": {
                    "matched": 1,
                    "statement_only": 2,
                    "receipt_only": 1,
                    "ambiguous": 0,
                    "failed": 0,
                    "candidate_transactions": 2,
                }
            }
        ),
        encoding="utf-8",
    )
    processed_path = artifact_dir / "processed.json"
    processed_path.write_text(
        json.dumps({"statement_extraction": {"lines": [{"source_order": 1}]}}),
        encoding="utf-8",
    )
    manifest_path = artifact_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "case_id": "fixture/edge",
                "issuer": "fixture",
                "status": "threshold-failed-from-cache",
                "expected_path": str(artifact_dir / "expected.json"),
                "cost_summary_path": str(cost_path),
                "score_path": str(score_path),
                "reconciliation_path": str(reconciliation_path),
                "processed_output_path": str(processed_path),
                "failure_owner": "prompt_or_coalesce",
            }
        ),
        encoding="utf-8",
    )

    summary = write_statement_batch_report(
        manifest_paths=[manifest_path],
        output_dir=tmp_path / "batch",
        label="unit",
    )

    assert summary["case_count"] == 1
    assert summary["cache_evidence_status_count"] == 1
    assert summary["promotion_decision"]["decision"] == "needs_prompt_or_coalesce_iteration"
    assert summary["totals"]["reconciliation_counts"]["statement_only"] == 2
    assert Path(summary["summary_path"]).exists()
    assert Path(summary["analysis_path"]).exists()


def _write_pdf(path, *, password: str | None = None) -> None:
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    if password:
        writer.encrypt(password)
    with path.open("wb") as handle:
        writer.write(handle)


def _fake_statement_pdf_evidence() -> StatementPdfEvidence:
    return StatementPdfEvidence(
        status="readable",
        is_encrypted=False,
        page_count=1,
        raw_text_sha256="unit-text-hash",
        text_char_count=74,
        text_line_count=2,
        word_count=8,
        row_count=1,
        warnings=("unit_test_evidence",),
        text_layer={
            "extractor": "pymupdf",
            "page_count": 1,
            "raw_text_sha256": "unit-text-hash",
            "text_char_count": 74,
            "text_line_count": 2,
            "pages": [
                {
                    "page": 1,
                    "text": "03/05/2026 EXACT MARKET 10000\n",
                    "text_sha256": "unit-page-hash",
                    "char_count": 32,
                    "line_count": 1,
                }
            ],
        },
        layout_words={"extractor": "pymupdf", "page_count": 1, "word_count": 0, "words": []},
        row_groups={
            "extractor": "pymupdf",
            "row_grouping": "unit",
            "row_count": 1,
            "rows": [{"row_index": 1, "page": 1, "text": "03/05/2026 EXACT MARKET 10000"}],
        },
    )


def _cmr_layout_case(tmp_path) -> StatementCase:
    expected = StatementExtractionOutput(
        statement=StatementInfo(issuer="cmr", currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2024, 12, 20),
                description="Pago en mercadopago 4",
                amount_minor=55_036,
                currency="CLP",
                line_type="charge",
                installment="03/03",
            )
        ],
        processing=StatementProcessingMetadata(provider="manual"),
    )
    expected_path = tmp_path / "cmr-layout.expected.json"
    expected_path.write_text(expected.model_dump_json(), encoding="utf-8")
    return StatementCase(
        id="cmr/layout",
        issuer="cmr",
        pdf_path=tmp_path / "cmr-layout.pdf",
        relative_path="private/cmr/cmr-layout.pdf",
        expected_path=expected_path,
    )


def _suite_case(tmp_path, case_id: str) -> StatementCase:
    issuer, filename = case_id.split("/", maxsplit=1)
    expected = StatementExtractionOutput(
        statement=StatementInfo(issuer=issuer, currency="CLP"),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 20),
                description=f"{issuer} test charge",
                amount_minor=12_345,
                currency="CLP",
                line_type="charge",
            )
        ],
        processing=StatementProcessingMetadata(provider="manual"),
    )
    case_root = tmp_path / issuer
    case_root.mkdir(exist_ok=True)
    expected_path = case_root / f"{filename}.expected.json"
    expected_path.write_text(expected.model_dump_json(), encoding="utf-8")
    pdf_path = case_root / f"{filename}.pdf"
    pdf_path.write_bytes(b"%PDF-1.4\n")
    return StatementCase(
        id=case_id,
        issuer=issuer,
        pdf_path=pdf_path,
        relative_path=f"private/{issuer}/{filename}.pdf",
        expected_path=expected_path,
    )


def _write_suite_source_manifest(
    *,
    artifact_dir: Path,
    case: StatementCase,
    approach: str,
) -> dict:
    artifact_dir.mkdir(parents=True, exist_ok=True)
    cost_path = artifact_dir / "cost_summary.json"
    cost_path.write_text(
        json.dumps(
            {
                "totals": {
                    "input_tokens": 10 if approach == "gemini" else 0,
                    "output_tokens": 5 if approach == "gemini" else 0,
                    "total_tokens": 15 if approach == "gemini" else 0,
                    "cost_usd": "0.001" if approach == "gemini" else "0",
                }
            }
        ),
        encoding="utf-8",
    )
    processed_path = artifact_dir / "processed_output.json"
    processed_path.write_text(
        json.dumps({"document_type": "credit_card_statement", "statement_extraction": None}),
        encoding="utf-8",
    )
    manifest = {
        "case_id": case.id,
        "issuer": case.issuer,
        "status": "completed",
        "actual_source": "deterministic" if approach in {"auto", "pymupdf"} else "live-gemini",
        "extractor": approach,
        "manifest_path": str(artifact_dir / "manifest.json"),
        "processed_output_path": str(processed_path),
        "cost_summary_path": str(cost_path),
    }
    (artifact_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return manifest


def _write_suite_approach_report(
    *,
    output_dir: Path,
    case_output_root: Path,
    actual_source: str,
    manifest_paths: list[Path],
) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    cases = []
    case_artifact_files = {}
    for manifest_path in manifest_paths:
        source = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
        case_id = source["case_id"]
        case_dir = case_output_root / case_id.replace("/", "-")
        case_dir.mkdir(parents=True, exist_ok=True)
        report_manifest_path = case_dir / "manifest.json"
        report_manifest_path.write_text("{}", encoding="utf-8")
        case_artifact_files[case_id] = {
            "manifest_path": str(report_manifest_path),
            "cost_summary_path": source["cost_summary_path"],
        }
        cases.append(
            {
                "case_id": case_id,
                "artifact_dir": str(case_dir),
                "expected": {"line_count": 1},
                "current_extraction": {
                    "actual_source": actual_source,
                    "extractor": source.get("extractor", actual_source),
                    "line_count": 1,
                    "source_status": source["status"],
                    "score_against_expected": {"passed": True},
                    "differences": {
                        "line_count_delta": 0,
                        "field_mismatch_counts": {
                            "amount_minor": 0,
                            "currency": 0,
                            "date": 0,
                            "description": 0,
                            "installment": 0,
                            "line_type": 0,
                        },
                        "severity_counts": {
                            "critical": 0,
                            "high": 0,
                            "medium": 0,
                            "low": 0,
                        },
                        "promotion_blockers": [],
                    },
                },
                "reconciliation": {
                    "counts": {
                        "ambiguous": 0,
                        "candidate_transactions": 1,
                        "failed": 0,
                        "matched": 1,
                        "receipt_only": 0,
                        "statement_only": 0,
                    }
                },
            }
        )
    report = {
        "cases": cases,
        "generated_artifacts": {"case_artifact_files": case_artifact_files},
    }
    report_path = output_dir / "report.json"
    markdown_path = output_dir / "REPORT.md"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    markdown_path.write_text("# Approach Report\n", encoding="utf-8")
    manifest = {
        "report_path": str(report_path),
        "markdown_path": str(markdown_path),
        "generated_artifacts": {"manifest_path": str(output_dir / "manifest.json")},
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return manifest


def _write_cmr_layout_pdf(path: Path, *, rows: list[list[tuple[int, str]]]) -> None:
    document = fitz.open()
    page = document.new_page(width=612, height=792)
    y = 100
    for row in rows:
        for x, text in row:
            page.insert_text((x, y), text, fontsize=8)
        y += 14
    document.save(path)
    document.close()


def _write_live_statement_manifest(
    tmp_path,
    *,
    case: StatementCase,
    actual: StatementExtractionOutput,
) -> Path:
    source_dir = tmp_path / "source-live"
    source_dir.mkdir(exist_ok=True)
    processed_path = source_dir / "processed_output.json"
    processed_path.write_text(
        json.dumps(
            {
                "document_type": "credit_card_statement",
                "statement_extraction": actual.model_dump(mode="json"),
            },
            default=str,
        ),
        encoding="utf-8",
    )
    raw_path = source_dir / "raw_output.json"
    raw_path.write_text(
        json.dumps({"provider_call": "completed", "extraction": actual.model_dump(mode="json")}),
        encoding="utf-8",
    )
    field_path = source_dir / "field_provenance.json"
    field_path.write_text(json.dumps({"source": "gemini_provider_output"}), encoding="utf-8")
    cost_path = source_dir / "cost_summary.json"
    cost_path.write_text(
        json.dumps(
            {
                "totals": {
                    "input_tokens": 10,
                    "output_tokens": 20,
                    "total_tokens": 30,
                    "cost_usd": "0.001",
                }
            }
        ),
        encoding="utf-8",
    )
    pdf_input_path = source_dir / "pdf_input.json"
    pdf_input_path.write_text(json.dumps({"status": "readable", "page_count": 1}), encoding="utf-8")
    manifest_path = source_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "case_id": case.id,
                "issuer": case.issuer,
                "status": "completed",
                "evidence_label": "statement-prompt-lab-ai-quality",
                "expected_path": str(case.expected_path),
                "processed_output_path": str(processed_path),
                "raw_output_path": str(raw_path),
                "field_provenance_path": str(field_path),
                "cost_summary_path": str(cost_path),
                "pdf_input_path": str(pdf_input_path),
            }
        ),
        encoding="utf-8",
    )
    return manifest_path


def _statement_case_with_expected(tmp_path, *, case_id: str) -> StatementCase:
    expected = StatementExtractionOutput(
        statement=StatementInfo(
            issuer="fixture",
            currency="CLP",
            period_start=date(2026, 5, 1),
            period_end=date(2026, 5, 31),
        ),
        lines=[
            StatementLine(
                source_order=1,
                date=date(2026, 5, 3),
                description="EXACT MARKET",
                amount_minor=10_000,
                currency="CLP",
                line_type="charge",
            ),
            StatementLine(
                source_order=2,
                date=date(2026, 5, 4),
                description="FUZZY COFFEE STORE",
                amount_minor=20_000,
                currency="CLP",
                line_type="charge",
            ),
            StatementLine(
                source_order=3,
                date=date(2026, 5, 5),
                description="DUPLICATE CAFE",
                amount_minor=30_000,
                currency="CLP",
                line_type="charge",
            ),
            StatementLine(
                source_order=4,
                date=date(2026, 5, 6),
                description="STATEMENT ONLY SHOP",
                amount_minor=40_000,
                currency="CLP",
                line_type="charge",
                installment="02/06",
            ),
            StatementLine(
                source_order=5,
                date=date(2026, 5, 7),
                description="PAGO RECIBIDO",
                amount_minor=-50_000,
                currency="CLP",
                line_type="payment",
            ),
        ],
        processing=StatementProcessingMetadata(provider="manual"),
    )
    issuer, name = case_id.split("/", 1)
    expected_path = tmp_path / f"{name}.expected.json"
    expected_path.write_text(expected.model_dump_json(), encoding="utf-8")
    return StatementCase(
        id=case_id,
        issuer=issuer,
        pdf_path=tmp_path / f"{name}.pdf",
        relative_path=f"private/{issuer}/{name}.pdf",
        expected_path=expected_path,
    )


async def _fake_transaction_snapshot(**_kwargs):
    return [], {
        "url": "sqlite+aiosqlite:///test.db",
        "readable": True,
        "table_count": 1,
        "has_transactions_table": True,
        "has_statements_table": False,
        "has_statement_lines_table": False,
        "transactions_available": 0,
        "statement_lab_seed_transactions": 0,
        "transactions_date_min": None,
        "transactions_date_max": None,
        "transaction_scope_firebase_uid": None,
        "transaction_scope_ownership_scope_id": None,
        "reason": None,
    }


async def _fake_transaction_snapshot_with_match(**_kwargs):
    transactions, snapshot = await _fake_transaction_snapshot()
    return [
        *transactions,
        statement_report_mod._ReceiptTransaction(
            id="receipt-1",
            ownership_scope_id="scope-1",
            transaction_date=date(2026, 5, 3),
            merchant="EXACT MARKET",
            total_minor=10_000,
            currency="CLP",
            receipt_type="scan",
            card_alias_id=None,
            merchant_user_edited_at=None,
        ),
    ], {
        **snapshot,
        "transactions_available": 1,
        "transactions_date_min": "2026-05-03",
        "transactions_date_max": "2026-05-03",
    }
