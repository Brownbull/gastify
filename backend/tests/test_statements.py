"""Tests for statement upload endpoints."""

from __future__ import annotations

import io
import uuid
from unittest.mock import AsyncMock, patch

import pytest
import sqlalchemy as sa
from pypdf import PdfWriter
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import settings
from app.models.statement import Statement, StatementStatus


def _pdf_bytes(*, password: str | None = None) -> bytes:
    buffer = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    if password:
        writer.encrypt(password)
    writer.write(buffer)
    return buffer.getvalue()


class TestStatementUploadEndpoint:
    @pytest.fixture(autouse=True)
    def _statement_settings(self, monkeypatch):
        monkeypatch.setattr(settings, "statement_provider", "codex-pdf-text")

    @pytest.fixture(autouse=True)
    def _mock_worker(self):
        with patch("app.api.statements.process_statement", new_callable=AsyncMock) as worker:
            yield worker

    @pytest.mark.asyncio
    async def test_upload_valid_pdf_queues_statement(self, client, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "statement_storage_dir", str(tmp_path))
        raw = _pdf_bytes()

        response = await client.post(
            "/api/v1/statements",
            files={"file": ("statement.pdf", raw, "application/pdf")},
        )

        assert response.status_code == 201
        body = response.json()
        assert body["duplicate"] is False
        assert body["queued"] is True
        assert body["password_required"] is False
        statement = body["statement"]
        assert statement["status"] == "queued"
        assert statement["original_filename"] == "statement.pdf"
        assert statement["content_type"] == "application/pdf"
        assert statement["file_size_bytes"] == len(raw)
        assert statement["pdf_status"] == "readable"
        assert statement["page_count"] == 1
        assert next(tmp_path.rglob("statement.pdf")).read_bytes() == raw

    @pytest.mark.asyncio
    async def test_upload_rejects_non_pdf_content_type(self, client):
        response = await client.post(
            "/api/v1/statements",
            files={"file": ("statement.txt", b"not a pdf", "text/plain")},
        )

        assert response.status_code == 422
        assert "application/pdf required" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_upload_rejects_empty_pdf(self, client):
        response = await client.post(
            "/api/v1/statements",
            files={"file": ("empty.pdf", b"", "application/pdf")},
        )

        assert response.status_code == 422
        assert response.json()["detail"] == "Empty file"

    @pytest.mark.asyncio
    async def test_upload_rejects_invalid_pdf_without_storing_record(
        self, client, engine, tmp_path, monkeypatch
    ):
        monkeypatch.setattr(settings, "statement_storage_dir", str(tmp_path))

        response = await client.post(
            "/api/v1/statements",
            files={"file": ("bad.pdf", b"%PDF-broken", "application/pdf")},
        )

        assert response.status_code == 422
        assert "could not be processed as a PDF" in response.json()["detail"]

        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with factory() as session:
            count = await session.scalar(sa.select(sa.func.count()).select_from(Statement))
        assert count == 0
        assert not list(tmp_path.rglob("bad.pdf"))

    @pytest.mark.asyncio
    async def test_upload_encrypted_pdf_without_password_returns_password_required(
        self, client, tmp_path, monkeypatch
    ):
        monkeypatch.setattr(settings, "statement_storage_dir", str(tmp_path))
        raw = _pdf_bytes(password="correct")

        response = await client.post(
            "/api/v1/statements",
            files={"file": ("encrypted.pdf", raw, "application/pdf")},
        )

        assert response.status_code == 201
        body = response.json()
        assert body["queued"] is False
        assert body["password_required"] is True
        assert body["statement"]["status"] == "password_required"
        assert body["statement"]["pdf_status"] == "password_required"
        assert body["statement"]["is_encrypted"] is True
        assert body["statement"]["error_code"] == "PASSWORD_REQUIRED"

    @pytest.mark.asyncio
    async def test_upload_encrypted_pdf_with_wrong_password_returns_password_invalid(
        self, client, tmp_path, monkeypatch
    ):
        monkeypatch.setattr(settings, "statement_storage_dir", str(tmp_path))
        raw = _pdf_bytes(password="correct")

        response = await client.post(
            "/api/v1/statements",
            data={"password": "wrong"},
            files={"file": ("encrypted.pdf", raw, "application/pdf")},
        )

        assert response.status_code == 201
        body = response.json()
        assert body["queued"] is False
        assert body["statement"]["status"] == "password_invalid"
        assert body["statement"]["pdf_status"] == "password_invalid"
        assert body["statement"]["error_code"] == "PASSWORD_INVALID"

    @pytest.mark.asyncio
    async def test_duplicate_upload_returns_existing_statement(self, client, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "statement_storage_dir", str(tmp_path))
        raw = _pdf_bytes()

        first = await client.post(
            "/api/v1/statements",
            files={"file": ("one.pdf", raw, "application/pdf")},
        )
        second = await client.post(
            "/api/v1/statements",
            files={"file": ("two.pdf", raw, "application/pdf")},
        )

        assert first.status_code == 201
        assert second.status_code == 200
        assert second.json()["duplicate"] is True
        assert second.json()["statement"]["id"] == first.json()["statement"]["id"]

    @pytest.mark.asyncio
    async def test_duplicate_encrypted_upload_with_password_queues_existing_statement(
        self, client, tmp_path, monkeypatch
    ):
        monkeypatch.setattr(settings, "statement_storage_dir", str(tmp_path))
        raw = _pdf_bytes(password="correct")

        first = await client.post(
            "/api/v1/statements",
            files={"file": ("encrypted.pdf", raw, "application/pdf")},
        )
        second = await client.post(
            "/api/v1/statements",
            data={"password": "correct"},
            files={"file": ("encrypted.pdf", raw, "application/pdf")},
        )

        assert first.status_code == 201
        assert first.json()["password_required"] is True
        assert second.status_code == 200
        assert second.json()["duplicate"] is True
        assert second.json()["queued"] is True
        assert second.json()["password_required"] is False
        assert second.json()["statement"]["id"] == first.json()["statement"]["id"]
        assert second.json()["statement"]["status"] == "queued"

    @pytest.mark.asyncio
    async def test_get_statement_and_lines_are_scope_bound(
        self, client, engine, tmp_path, monkeypatch
    ):
        monkeypatch.setattr(settings, "statement_storage_dir", str(tmp_path))
        raw = _pdf_bytes()
        response = await client.post(
            "/api/v1/statements",
            files={"file": ("statement.pdf", raw, "application/pdf")},
        )
        statement_id = response.json()["statement"]["id"]

        get_response = await client.get(f"/api/v1/statements/{statement_id}")
        lines_response = await client.get(f"/api/v1/statements/{statement_id}/lines")

        assert get_response.status_code == 200
        assert lines_response.status_code == 200
        assert lines_response.json() == []

        other_id = uuid.uuid4()
        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with factory() as session:
            await session.execute(
                sa.text("INSERT INTO ownership_scopes (id, scope_type) VALUES (:id, 'individual')"),
                {"id": other_id.hex},
            )
            session.add(
                Statement(
                    ownership_scope_id=other_id,
                    status=StatementStatus.QUEUED,
                    original_filename="other.pdf",
                    file_path="/tmp/other.pdf",
                    file_sha256="a" * 64,
                    content_type="application/pdf",
                    file_size_bytes=1,
                    currency="CLP",
                    pdf_status="readable",
                    is_encrypted=False,
                )
            )
            await session.commit()
            other_statement = await session.scalar(
                sa.select(Statement.id).where(Statement.ownership_scope_id == other_id)
            )

        missing_response = await client.get(f"/api/v1/statements/{other_statement}")
        assert missing_response.status_code == 404
