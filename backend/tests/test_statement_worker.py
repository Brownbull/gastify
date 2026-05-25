"""Tests for the statement extraction worker."""

from __future__ import annotations

import io
import uuid
from decimal import Decimal

import pytest
import sqlalchemy as sa
from pypdf import PdfWriter
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import settings
from app.models.statement import Statement, StatementLine, StatementStatus
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

    assert statement is not None
    assert statement.status == StatementStatus.EXTRACTED
    assert statement.issuer == "fixture-bank"
    assert statement.period_start is not None
    assert statement.payment_due_minor == 19_990
    assert statement.extraction_provider == "fixture"
    assert statement.confidence == Decimal("1.000")
    assert len(lines) == 2
    assert [line.source_order for line in lines] == [1, 2]
    assert lines[0].description == "SUPERMERCADO FIXTURE"
    assert lines[0].amount_minor == 19_990
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
