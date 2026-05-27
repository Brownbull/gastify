"""Tests for the statement extraction worker."""

from __future__ import annotations

import io
import uuid
from decimal import Decimal

import fitz
import pytest
import sqlalchemy as sa
from pypdf import PdfWriter
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.agents.statement_extraction import (
    StatementExtractionUsage,
    StatementLayoutProfileAgentResult,
)
from app.config import settings
from app.models.statement import (
    Statement,
    StatementLine,
    StatementReconciliationRun,
    StatementStatus,
)
from app.schemas.statement import (
    StatementExtractionOutput,
    StatementInfo,
    StatementProcessingMetadata,
)
from app.schemas.statement_profile import (
    StatementColumnProfile,
    StatementLayoutProfile,
    StatementRowRange,
)
from app.services import statement_extraction as statement_extraction_module
from app.services import statement_worker
from app.services.statement_worker import process_statement
from tests.conftest import TEST_SCOPE_ID


def _pdf_bytes(*, password: str | None = None) -> bytes:
    buffer = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    if password:
        writer.encrypt(password)
    writer.write(buffer)
    return buffer.getvalue()


def _layout_pdf_bytes(*, marker: str, rows: list[list[tuple[int, str]]]) -> bytes:
    document = fitz.open()
    page = document.new_page(width=612, height=792)
    page.insert_text((60, 45), marker, fontsize=8)
    y = 100
    for row in rows:
        for x, text in row:
            page.insert_text((x, y), text, fontsize=8)
        y += 14
    payload = document.tobytes()
    document.close()
    return payload


async def _insert_statement(engine, tmp_path, *, raw: bytes | None = None) -> uuid.UUID:
    statement_id = uuid.uuid4()
    statement_dir = tmp_path / str(TEST_SCOPE_ID) / str(statement_id)
    statement_dir.mkdir(parents=True)
    path = statement_dir / "statement.pdf"
    path.write_bytes(raw or _pdf_bytes())

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        statement = Statement(
            id=statement_id,
            ownership_scope_id=TEST_SCOPE_ID,
            status=StatementStatus.QUEUED,
            original_filename="statement.pdf",
            file_path=str(path),
            file_sha256="b" * 64,
            content_type="application/pdf",
            file_size_bytes=path.stat().st_size,
            ai_processing_consent=True,
            currency="CLP",
            pdf_status="readable",
            is_encrypted=False,
        )
        session.add(statement)
        await session.commit()
    return statement_id


@pytest.mark.asyncio
async def test_fixture_worker_persists_statement_metadata_lines_and_events(
    engine, tmp_path, monkeypatch
):
    monkeypatch.setattr(settings, "statement_provider", "fixture")
    monkeypatch.setattr(settings, "e2e_scan_event_delay_ms", 0)
    statement_id = await _insert_statement(engine, tmp_path)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    events: list[str] = []

    monkeypatch.setattr(statement_worker, "async_session", factory)
    monkeypatch.setattr(
        statement_worker.statement_dispatcher,
        "emit",
        lambda event: events.append(event.event_type) or 0,
    )
    monkeypatch.setattr(statement_worker.statement_dispatcher, "store_terminal", lambda event: None)
    monkeypatch.setattr(
        statement_worker.statement_dispatcher,
        "close_statement",
        lambda statement_id: None,
    )
    monkeypatch.setattr(
        statement_worker.statement_dispatcher,
        "clear_terminal",
        lambda statement_id: None,
    )

    assert await process_statement(statement_id) is True

    async with factory() as session:
        statement = await session.get(Statement, statement_id)
        rows = await session.execute(
            sa.select(StatementLine).where(StatementLine.statement_id == statement_id)
        )
        lines = rows.scalars().all()
        run = await session.scalar(
            sa.select(StatementReconciliationRun).where(
                StatementReconciliationRun.statement_id == statement_id
            )
        )

    assert statement is not None
    assert statement.status == StatementStatus.COMPLETED
    assert statement.issuer == "fixture-bank"
    assert statement.currency == "USD"
    assert statement.period_start is not None
    assert statement.payment_due_minor == 19_990
    assert statement.extraction_provider == "fixture"
    assert statement.confidence == Decimal("1.000")
    assert len(lines) == 2
    assert [line.source_order for line in lines] == [1, 2]
    assert lines[0].description == "SUPERMERCADO FIXTURE"
    assert lines[0].amount_minor == 19_990
    assert {line.currency for line in lines} == {"USD"}
    assert run is not None
    assert run.total_statement_lines == 2
    assert run.matched_count == 0
    assert run.statement_only_count == 2
    assert events == [
        "statement_picked_up",
        "statement_llm_start",
        "statement_llm_end",
        "statement_reconciling",
        "statement_completed",
    ]


@pytest.mark.asyncio
async def test_worker_missing_password_sets_explicit_state(engine, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "statement_provider", "fixture")
    statement_id = await _insert_statement(engine, tmp_path, raw=_pdf_bytes(password="correct"))
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    monkeypatch.setattr(statement_worker, "async_session", factory)

    assert await process_statement(statement_id) is True

    async with factory() as session:
        statement = await session.get(Statement, statement_id)
    assert statement is not None
    assert statement.status == StatementStatus.PASSWORD_REQUIRED
    assert statement.pdf_status == "password_required"
    assert statement.error_code == "PASSWORD_REQUIRED"


@pytest.mark.asyncio
async def test_worker_wrong_password_sets_explicit_state(engine, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "statement_provider", "fixture")
    statement_id = await _insert_statement(engine, tmp_path, raw=_pdf_bytes(password="correct"))
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    monkeypatch.setattr(statement_worker, "async_session", factory)

    assert await process_statement(statement_id, password="wrong") is True

    async with factory() as session:
        statement = await session.get(Statement, statement_id)
    assert statement is not None
    assert statement.status == StatementStatus.PASSWORD_INVALID
    assert statement.pdf_status == "password_invalid"
    assert statement.error_code == "PASSWORD_INVALID"


@pytest.mark.asyncio
async def test_codex_worker_empty_text_sets_extraction_failed(engine, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "statement_provider", "codex-pdf-text")
    statement_id = await _insert_statement(engine, tmp_path)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    monkeypatch.setattr(statement_worker, "async_session", factory)

    assert await process_statement(statement_id) is True

    async with factory() as session:
        statement = await session.get(Statement, statement_id)
    assert statement is not None
    assert statement.status == StatementStatus.FAILED
    assert statement.pdf_status == "extraction_failed"
    assert statement.error_code == "EXTRACTION_FAILED"
    assert statement.warnings == ["empty_pdf_text"]


@pytest.mark.asyncio
async def test_codex_worker_text_bearing_pdf_without_normalization_sets_failed(
    engine, tmp_path, monkeypatch
):
    monkeypatch.setattr(settings, "statement_provider", "codex-pdf-text")
    statement_id = await _insert_statement(engine, tmp_path)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr(statement_worker, "async_session", factory)

    def _patched_extract(path, *, provider=None, password=None, issuer_hint=None):

        return StatementExtractionOutput(
            pdf_status="extraction_failed",
            statement=StatementInfo(issuer=issuer_hint),
            lines=[],
            processing=StatementProcessingMetadata(
                provider="codex-pdf-text",
                prompt_id="statement-extraction-current",
                model_name=None,
                confidence=0.0,
                page_count=1,
                raw_text_sha256="abc123",
                text_char_count=50,
                text_line_count=3,
                warnings=["codex_text_only_no_line_normalization"],
            ),
        )

    monkeypatch.setattr(statement_worker, "extract_statement_pdf", _patched_extract)

    assert await process_statement(statement_id) is True

    async with factory() as session:
        statement = await session.get(Statement, statement_id)
        lines = (
            (
                await session.execute(
                    sa.select(StatementLine).where(StatementLine.statement_id == statement_id)
                )
            )
            .scalars()
            .all()
        )
    assert statement is not None
    assert statement.status == StatementStatus.FAILED
    assert statement.pdf_status == "extraction_failed"
    assert statement.error_code == "EXTRACTION_FAILED"
    assert "codex_text_only_no_line_normalization" in (statement.warnings or [])
    assert len(lines) == 0


@pytest.mark.asyncio
async def test_auto_worker_uses_pymupdf_when_routing_and_quality_pass(
    engine, tmp_path, monkeypatch
):
    monkeypatch.setattr(settings, "statement_provider", "auto")
    raw = _layout_pdf_bytes(
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
    statement_id = await _insert_statement(engine, tmp_path, raw=raw)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr(statement_worker, "async_session", factory)

    async def fail_gemini(*args, **kwargs):  # pragma: no cover - should not be called.
        raise AssertionError("Gemini should not run when deterministic extraction passes")

    monkeypatch.setattr(
        statement_extraction_module,
        "extract_statement_with_gemini",
        fail_gemini,
    )

    assert await process_statement(statement_id) is True

    async with factory() as session:
        statement = await session.get(Statement, statement_id)
        lines = (
            (
                await session.execute(
                    sa.select(StatementLine).where(StatementLine.statement_id == statement_id)
                )
            )
            .scalars()
            .all()
        )

    assert statement is not None
    assert statement.status == StatementStatus.COMPLETED
    assert statement.issuer == "cmr"
    assert statement.extraction_provider == "codex-pdf-text"
    assert statement.extraction_prompt_id == "deterministic:pymupdf:cmr"
    assert statement.extraction_model_name == "pymupdf"
    assert len(lines) == 1
    assert lines[0].amount_minor == 55_036
    assert lines[0].installment == "03/03"


@pytest.mark.asyncio
async def test_auto_worker_falls_back_to_gemini_when_routing_is_unsupported(
    engine, tmp_path, monkeypatch
):
    monkeypatch.setattr(settings, "statement_provider", "auto")
    raw = _layout_pdf_bytes(
        marker="Unknown bank statement",
        rows=[
            [
                (90, "20/05/2026"),
                (140, "Unknown"),
                (190, "merchant"),
                (400, "$12.345"),
            ]
        ],
    )
    statement_id = await _insert_statement(engine, tmp_path, raw=raw)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr(statement_worker, "async_session", factory)
    calls = {"count": 0}

    async def fake_profile(evidence: dict):
        calls["count"] += 1
        assert evidence["input_mode"] == "profile-rows"
        assert evidence["status"] == "readable"
        assert evidence["candidate_row_count"] >= 1
        assert evidence["schema_version"] == "statement-compact-evidence.v1"
        assert any("words" in row for row in evidence["rows"])
        return StatementLayoutProfileAgentResult(
            layout_profile=StatementLayoutProfile(
                transaction_row_ranges=[StatementRowRange(start_row=2, end_row=2)],
                date_column=StatementColumnProfile(x_min=80, x_max=130, confidence=0.9),
                description_column=StatementColumnProfile(x_min=130, x_max=300, confidence=0.9),
                amount_column=StatementColumnProfile(x_min=350, x_max=450, confidence=0.9),
                default_currency="CLP",
                confidence=0.86,
            ),
            usage=StatementExtractionUsage(input_tokens=10, output_tokens=5, latency_ms=1.0),
            prompt_id="statement-layout-profile-current",
            prompt_version="test",
            model_name="google-gla:test",
        )

    monkeypatch.setattr(
        statement_extraction_module,
        "infer_statement_layout_profile_with_gemini",
        fake_profile,
    )
    monkeypatch.setattr(
        statement_extraction_module,
        "extract_statement_with_gemini",
        lambda *_args, **_kwargs: pytest.fail("direct PDF Gemini should not run"),
    )

    assert await process_statement(statement_id) is True

    async with factory() as session:
        statement = await session.get(Statement, statement_id)
        line = await session.scalar(
            sa.select(StatementLine).where(StatementLine.statement_id == statement_id)
        )

    assert calls["count"] == 1
    assert statement is not None
    assert statement.status == StatementStatus.COMPLETED
    assert statement.extraction_provider == "gemini"
    assert statement.extraction_input_mode == "profile-rows"
    assert statement.extraction_llm_input_tokens == 10
    assert statement.extraction_llm_output_tokens == 5
    assert statement.extraction_llm_cost_usd == Decimal("0E-9")
    assert statement.extraction_fallback_reason == "deterministic_quality_or_routing_failed"
    assert statement.extraction_cache_status == "runtime_no_cache"
    assert statement.extraction_evidence_row_count is not None
    assert statement.extraction_evidence_candidate_row_count is not None
    assert "deterministic_fallback_to_gemini" in statement.warnings
    assert "gemini_input_mode_profile_rows" in statement.warnings
    assert line is not None
    assert line.description == "Unknown merchant"
    assert line.amount_minor == 12_345


@pytest.mark.asyncio
async def test_auto_worker_gemini_failure_sets_failed_without_persisting_lines(
    engine, tmp_path, monkeypatch
):
    monkeypatch.setattr(settings, "statement_provider", "auto")
    raw = _layout_pdf_bytes(
        marker="Unknown bank statement",
        rows=[
            [
                (90, "20/05/2026"),
                (140, "Unknown"),
                (190, "merchant"),
                (400, "$12.345"),
            ]
        ],
    )
    statement_id = await _insert_statement(engine, tmp_path, raw=raw)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr(statement_worker, "async_session", factory)

    async def fail_profile(_evidence: dict):
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr(
        statement_extraction_module,
        "infer_statement_layout_profile_with_gemini",
        fail_profile,
    )
    monkeypatch.setattr(
        statement_extraction_module,
        "extract_statement_with_gemini",
        lambda *_args, **_kwargs: pytest.fail("direct PDF Gemini should not run"),
    )

    assert await process_statement(statement_id) is True

    async with factory() as session:
        statement = await session.get(Statement, statement_id)
        line_count = await session.scalar(
            sa.select(sa.func.count())
            .select_from(StatementLine)
            .where(StatementLine.statement_id == statement_id)
        )

    assert statement is not None
    assert statement.status == StatementStatus.FAILED
    assert statement.pdf_status == "extraction_failed"
    assert statement.error_code == "EXTRACTION_FAILED"
    assert statement.warnings == ["provider_error"]
    assert line_count == 0
