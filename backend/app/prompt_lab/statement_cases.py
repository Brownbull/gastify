"""Statement prompt-lab corpus import, discovery, and PDF text extraction."""

from __future__ import annotations

import hashlib
import json
import shutil
from dataclasses import asdict, dataclass
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel
from pypdf import PdfReader
from pypdf.errors import FileNotDecryptedError, PdfReadError

from app.prompt_lab.paths import (
    LATEST_RESULTS_ROOT,
    STATEMENT_MANIFEST_PATH,
    STATEMENT_PRIVATE_ROOT,
    STATEMENT_TEST_CASES_ROOT,
    ensure_workspace,
)
from app.schemas.statement import (
    StatementExtractionOutput,
    StatementInfo,
    StatementPdfMetadata,
    StatementProcessingMetadata,
)

if TYPE_CHECKING:
    from pathlib import Path

PDF_SUFFIX = ".pdf"
EXPECTED_SUFFIX = ".expected.json"
CREDENTIAL_FILENAME = "credentials.json"


@dataclass(frozen=True)
class StatementCase:
    id: str
    issuer: str
    pdf_path: Path
    relative_path: str
    expected_path: Path | None = None

    @property
    def baseline_status(self) -> str:
        return "baselined" if self.expected_path else "unbaselined"


@dataclass(frozen=True)
class StatementInventoryRecord:
    issuer: str
    filename: str
    case_id: str
    fixture_path: str
    sha256: str
    size_bytes: int
    page_count: int | None
    is_encrypted: bool
    password_source_exists: bool
    status: str


class StatementTextEvidence(BaseModel):
    raw_text: str
    pages: list[str]


class StatementPromptLabExtractionPacket(BaseModel):
    """Prompt-lab-only wrapper for private raw text evidence."""

    extraction: StatementExtractionOutput
    source_text: StatementTextEvidence | None = None


def ensure_statement_workspace() -> None:
    ensure_workspace()
    STATEMENT_TEST_CASES_ROOT.mkdir(parents=True, exist_ok=True)
    STATEMENT_PRIVATE_ROOT.mkdir(parents=True, exist_ok=True)


def import_statement_corpus(source: Path, *, force: bool = False) -> dict[str, Any]:
    """Copy legacy statement PDFs into ignored local storage and write a sanitized manifest."""
    ensure_statement_workspace()
    source = source.expanduser().resolve()
    if not source.exists():
        raise FileNotFoundError(source)

    imported = 0
    skipped = 0
    records: list[StatementInventoryRecord] = []

    for path in sorted(p for p in source.rglob(f"*{PDF_SUFFIX}") if p.is_file()):
        issuer = path.parent.name.strip().lower()
        destination = STATEMENT_PRIVATE_ROOT / issuer / path.name
        if destination.exists() and not force:
            skipped += 1
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, destination)
            imported += 1

        password = load_issuer_password(path.parent)
        metadata = inspect_pdf(destination, password=password)
        records.append(
            StatementInventoryRecord(
                issuer=issuer,
                filename=path.name,
                case_id=f"{issuer}/{path.stem}",
                fixture_path=destination.relative_to(STATEMENT_TEST_CASES_ROOT).as_posix(),
                sha256=metadata.sha256,
                size_bytes=metadata.size_bytes,
                page_count=metadata.page_count,
                is_encrypted=metadata.is_encrypted,
                password_source_exists=metadata.password_source_exists,
                status=metadata.status,
            )
        )

    summary = {
        "total_pdfs": len(records),
        "imported": imported,
        "skipped_existing": skipped,
        "encrypted": sum(1 for record in records if record.is_encrypted),
        "unencrypted": sum(1 for record in records if not record.is_encrypted),
        "password_sources": sum(1 for record in records if record.password_source_exists),
        "issuers": _issuer_counts(records),
    }
    manifest = {
        "schema_version": 1,
        "document_family": "credit_card_statement",
        "privacy": {
            "raw_pdfs_committed": False,
            "credentials_committed": False,
            "manifest_contains_secrets": False,
        },
        "summary": summary,
        "records": [asdict(record) for record in records],
    }
    STATEMENT_MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return manifest


def list_statement_cases(root: Path = STATEMENT_PRIVATE_ROOT) -> list[StatementCase]:
    if not root.exists():
        return []
    cases: list[StatementCase] = []
    for pdf_path in sorted(path for path in root.rglob(f"*{PDF_SUFFIX}") if path.is_file()):
        issuer = pdf_path.parent.name.strip().lower()
        relative_path = pdf_path.relative_to(STATEMENT_TEST_CASES_ROOT).as_posix()
        cases.append(
            StatementCase(
                id=f"{issuer}/{pdf_path.stem}",
                issuer=issuer,
                pdf_path=pdf_path,
                relative_path=relative_path,
                expected_path=_first_existing(
                    pdf_path.with_name(f"{pdf_path.stem}{EXPECTED_SUFFIX}")
                ),
            )
        )
    return cases


def get_statement_case(case_id: str, root: Path = STATEMENT_PRIVATE_ROOT) -> StatementCase:
    normalized = case_id.strip().removesuffix(PDF_SUFFIX)
    for case in list_statement_cases(root):
        if case.id == normalized or case.relative_path == case_id:
            return case
    raise KeyError(f"Unknown statement prompt case: {case_id}")


def inspect_pdf(path: Path, *, password: str | None = None) -> StatementPdfMetadata:
    """Read PDF metadata without returning raw statement contents."""
    sha256 = _sha256(path)
    size_bytes = path.stat().st_size
    issuer = path.parent.name.strip().lower()
    password_source_exists = bool(password)
    try:
        reader = PdfReader(str(path))
    except PdfReadError:
        return StatementPdfMetadata(
            issuer=issuer,
            filename=path.name,
            sha256=sha256,
            size_bytes=size_bytes,
            page_count=None,
            is_encrypted=False,
            password_source_exists=password_source_exists,
            status="extraction_failed",
        )

    is_encrypted = reader.is_encrypted
    if is_encrypted:
        if not password:
            return StatementPdfMetadata(
                issuer=issuer,
                filename=path.name,
                sha256=sha256,
                size_bytes=size_bytes,
                page_count=None,
                is_encrypted=True,
                password_source_exists=False,
                status="password_required",
            )
        if not reader.decrypt(password):
            return StatementPdfMetadata(
                issuer=issuer,
                filename=path.name,
                sha256=sha256,
                size_bytes=size_bytes,
                page_count=None,
                is_encrypted=True,
                password_source_exists=True,
                status="password_invalid",
            )

    try:
        page_count = len(reader.pages)
    except (FileNotDecryptedError, PdfReadError):
        page_count = None

    return StatementPdfMetadata(
        issuer=issuer,
        filename=path.name,
        sha256=sha256,
        size_bytes=size_bytes,
        page_count=page_count,
        is_encrypted=is_encrypted,
        password_source_exists=password_source_exists,
        status="readable" if page_count is not None else "extraction_failed",
    )


def extract_statement_text(
    case: StatementCase,
    *,
    password: str | None = None,
    credentials_root: Path | None = None,
    include_source_text: bool = True,
) -> StatementPromptLabExtractionPacket:
    """Extract statement PDF text with pypdf for ignored prompt-lab evidence."""
    resolved_password = password or _password_from_credentials_root(case.issuer, credentials_root)
    metadata = inspect_pdf(case.pdf_path, password=resolved_password)
    if metadata.status != "readable":
        warning = _status_warning(metadata.status)
        return StatementPromptLabExtractionPacket(
            extraction=StatementExtractionOutput(
                pdf_status=metadata.status,
                statement=StatementInfo(issuer=case.issuer),
                lines=[],
                processing=StatementProcessingMetadata(
                    page_count=metadata.page_count,
                    warnings=[warning],
                ),
            ),
            source_text=None,
        )

    reader = PdfReader(str(case.pdf_path))
    if reader.is_encrypted and resolved_password:
        reader.decrypt(resolved_password)

    pages = [page.extract_text() or "" for page in reader.pages]
    raw_text = "\n".join(pages)
    raw_text_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()
    text_lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    warnings = ["codex_text_only_no_line_normalization"]
    if not text_lines:
        warnings.append("empty_pdf_text")

    return StatementPromptLabExtractionPacket(
        extraction=StatementExtractionOutput(
            pdf_status="readable",
            statement=StatementInfo(issuer=case.issuer),
            lines=[],
            processing=StatementProcessingMetadata(
                page_count=len(reader.pages),
                raw_text_sha256=raw_text_hash,
                text_char_count=len(raw_text),
                text_line_count=len(text_lines),
                warnings=warnings,
            ),
        ),
        source_text=(
            StatementTextEvidence(raw_text=raw_text, pages=pages) if include_source_text else None
        ),
    )


def write_statement_extraction_packet(
    case: StatementCase,
    packet: StatementPromptLabExtractionPacket,
    *,
    output_root: Path = LATEST_RESULTS_ROOT,
    run_id: str = "statement-codex-preflight",
) -> dict[str, Any]:
    """Write ignored Codex text-extraction evidence without printing or committing private text."""
    case_dir = output_root / "statements" / run_id / case.id.replace("/", "-")
    case_dir.mkdir(parents=True, exist_ok=True)
    extraction_path = case_dir / "codex_extraction.json"
    extraction_path.write_text(
        packet.model_dump_json(indent=2),
        encoding="utf-8",
    )
    extraction = packet.extraction
    manifest = {
        "case_id": case.id,
        "issuer": case.issuer,
        "status": extraction.pdf_status,
        "packet_status": "written",
        "document_type": extraction.document_type,
        "processing": extraction.processing.model_dump(mode="json"),
        "extraction_path": str(extraction_path),
        "contains_raw_statement_text": packet.source_text is not None,
    }
    manifest_path = case_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
    return manifest


def load_issuer_password(issuer_dir: Path) -> str | None:
    credential_path = issuer_dir / CREDENTIAL_FILENAME
    if not credential_path.exists():
        return None
    data = json.loads(credential_path.read_text(encoding="utf-8"))
    value = data.get("pdfPassword")
    return value if isinstance(value, str) and value else None


def _password_from_credentials_root(issuer: str, credentials_root: Path | None) -> str | None:
    if credentials_root is None:
        local_private = STATEMENT_PRIVATE_ROOT / issuer
        return load_issuer_password(local_private)
    return load_issuer_password(credentials_root.expanduser().resolve() / issuer)


def _issuer_counts(records: list[StatementInventoryRecord]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for record in records:
        counts[record.issuer] = counts.get(record.issuer, 0) + 1
    return dict(sorted(counts.items()))


def _first_existing(*paths: Path) -> Path | None:
    return next((path for path in paths if path.exists()), None)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _status_warning(status: str) -> str:
    if status == "password_required":
        return "password_required"
    if status == "password_invalid":
        return "password_invalid"
    return "pdf_text_extraction_failed"
