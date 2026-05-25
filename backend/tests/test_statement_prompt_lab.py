import json
from datetime import date

from pypdf import PdfWriter

from app.prompt_lab import statement_cases as statement_mod
from app.prompt_lab.statement_cases import (
    StatementCase,
    extract_statement_text,
    import_statement_corpus,
    inspect_pdf,
    write_statement_extraction_packet,
)
from app.prompt_lab.statement_scoring import score_statement_output
from app.prompts import get_prompt
from app.schemas.statement import (
    StatementExtractionOutput,
    StatementInfo,
    StatementLine,
    StatementProcessingMetadata,
)


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


def test_statement_prompt_is_registered_as_own_kind():
    prompt = get_prompt("statement-extraction-current", kind="statement-extraction")

    assert prompt.kind == "statement-extraction"
    assert "credit-card statement" in prompt.system_prompt


def _write_pdf(path, *, password: str | None = None) -> None:
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    if password:
        writer.encrypt(password)
    with path.open("wb") as handle:
        writer.write(handle)
