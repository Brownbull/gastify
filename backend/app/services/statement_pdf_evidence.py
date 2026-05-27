"""Generic PyMuPDF statement evidence extraction for Gemini fallback."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Literal

import fitz  # type: ignore[import-untyped]

if TYPE_CHECKING:
    from pathlib import Path

StatementPdfEvidenceStatus = Literal[
    "readable",
    "password_required",
    "password_invalid",
    "extraction_failed",
    "insufficient_text_layer",
]

STATEMENT_PDF_EVIDENCE_SCHEMA_VERSION = "statement-pdf-evidence.v1"


@dataclass(frozen=True)
class StatementPdfEvidence:
    status: StatementPdfEvidenceStatus
    is_encrypted: bool
    page_count: int | None
    raw_text_sha256: str | None
    text_char_count: int
    text_line_count: int
    word_count: int
    row_count: int
    warnings: tuple[str, ...]
    text_layer: dict[str, Any]
    layout_words: dict[str, Any]
    row_groups: dict[str, Any]

    @property
    def evidence_sha256(self) -> str:
        payload = self.provider_payload()
        return hashlib.sha256(
            json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
        ).hexdigest()

    def provider_payload(self) -> dict[str, Any]:
        return {
            "schema_version": STATEMENT_PDF_EVIDENCE_SCHEMA_VERSION,
            "input_mode": "pymupdf-evidence",
            "status": self.status,
            "is_encrypted": self.is_encrypted,
            "page_count": self.page_count,
            "raw_text_sha256": self.raw_text_sha256,
            "text_char_count": self.text_char_count,
            "text_line_count": self.text_line_count,
            "word_count": self.word_count,
            "row_count": self.row_count,
            "warnings": list(self.warnings),
            "text_layer": self.text_layer,
            "layout_words": self.layout_words,
            "row_groups": self.row_groups,
            "privacy": {
                "raw_pdf_bytes_included": False,
                "passwords_included": False,
                "decrypted_pdf_written": False,
            },
        }

    def summary(self) -> dict[str, Any]:
        return {
            "schema_version": STATEMENT_PDF_EVIDENCE_SCHEMA_VERSION,
            "input_mode": "pymupdf-evidence",
            "status": self.status,
            "is_encrypted": self.is_encrypted,
            "page_count": self.page_count,
            "raw_text_sha256": self.raw_text_sha256,
            "text_char_count": self.text_char_count,
            "text_line_count": self.text_line_count,
            "word_count": self.word_count,
            "row_count": self.row_count,
            "evidence_sha256": self.evidence_sha256,
            "warnings": list(self.warnings),
        }


def extract_statement_pdf_evidence(
    path: Path,
    *,
    password: str | None = None,
) -> StatementPdfEvidence:
    """Extract generic text, word, and row evidence from any readable PDF."""
    try:
        document = fitz.open(path)
    except Exception:
        return _empty_evidence(
            status="extraction_failed",
            warnings=["invalid_pdf"],
            is_encrypted=False,
        )

    try:
        is_encrypted = bool(document.needs_pass)
        if is_encrypted:
            if not password:
                return _empty_evidence(
                    status="password_required",
                    warnings=["password_required"],
                    is_encrypted=True,
                )
            if not document.authenticate(password):
                return _empty_evidence(
                    status="password_invalid",
                    warnings=["password_invalid"],
                    is_encrypted=True,
                )

        page_payloads: list[dict[str, Any]] = []
        words: list[dict[str, Any]] = []
        for page_index, page in enumerate(document, start=1):
            text = page.get_text("text", sort=True) or ""
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            page_payloads.append(
                {
                    "page": page_index,
                    "text": text,
                    "text_sha256": _sha256_text(text),
                    "char_count": len(text),
                    "line_count": len(lines),
                }
            )
            for item in page.get_text("words", sort=True):
                x0, y0, x1, y1, word_text, block, line, word = item
                words.append(
                    {
                        "page": page_index,
                        "x0": round(float(x0), 2),
                        "y0": round(float(y0), 2),
                        "x1": round(float(x1), 2),
                        "y1": round(float(y1), 2),
                        "text": str(word_text),
                        "block": int(block),
                        "line": int(line),
                        "word": int(word),
                    }
                )

        raw_text = "\n".join(str(page["text"]) for page in page_payloads)
        text_lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        row_groups = _row_groups(words)
        warnings: list[str] = ["pymupdf_generic_evidence_extraction"]
        status: StatementPdfEvidenceStatus = "readable"
        if not text_lines and not words:
            status = "insufficient_text_layer"
            warnings.append("insufficient_text_layer")

        return StatementPdfEvidence(
            status=status,
            is_encrypted=is_encrypted,
            page_count=document.page_count,
            raw_text_sha256=_sha256_text(raw_text),
            text_char_count=len(raw_text),
            text_line_count=len(text_lines),
            word_count=len(words),
            row_count=len(row_groups["rows"]),
            warnings=tuple(sorted(set(warnings))),
            text_layer={
                "extractor": "pymupdf",
                "page_count": document.page_count,
                "raw_text_sha256": _sha256_text(raw_text),
                "text_char_count": len(raw_text),
                "text_line_count": len(text_lines),
                "pages": page_payloads,
            },
            layout_words={
                "extractor": "pymupdf",
                "page_count": document.page_count,
                "word_count": len(words),
                "words": words,
            },
            row_groups=row_groups,
        )
    except Exception:
        return _empty_evidence(
            status="extraction_failed",
            warnings=["pymupdf_evidence_extraction_failed"],
            is_encrypted=False,
        )
    finally:
        document.close()


def _row_groups(words: list[dict[str, Any]]) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    current: list[dict[str, Any]] = []
    current_page: int | None = None
    current_y: float | None = None
    for word in sorted(words, key=lambda item: (item["page"], item["y0"], item["x0"])):
        if (
            current_page != word["page"]
            or current_y is None
            or abs(float(word["y0"]) - current_y) > 3.0
        ):
            if current:
                rows.append(_row_payload(len(rows) + 1, current))
            current = [word]
            current_page = int(word["page"])
            current_y = float(word["y0"])
            continue
        current.append(word)
        current_y = (current_y + float(word["y0"])) / 2
    if current:
        rows.append(_row_payload(len(rows) + 1, current))
    return {
        "extractor": "pymupdf",
        "row_grouping": "page_and_y_coordinate_tolerance_3pt",
        "row_count": len(rows),
        "rows": rows,
    }


def _row_payload(index: int, row_words: list[dict[str, Any]]) -> dict[str, Any]:
    sorted_words = sorted(row_words, key=lambda item: float(item["x0"]))
    return {
        "row_index": index,
        "page": sorted_words[0]["page"] if sorted_words else 0,
        "y0": min((float(word["y0"]) for word in sorted_words), default=0.0),
        "y1": max((float(word["y1"]) for word in sorted_words), default=0.0),
        "text": " ".join(str(word["text"]) for word in sorted_words),
        "words": [
            {
                "text": word["text"],
                "x0": word["x0"],
                "x1": word["x1"],
                "block": word["block"],
                "line": word["line"],
                "word": word["word"],
            }
            for word in sorted_words
        ],
    }


def _empty_evidence(
    *,
    status: StatementPdfEvidenceStatus,
    warnings: list[str],
    is_encrypted: bool,
) -> StatementPdfEvidence:
    return StatementPdfEvidence(
        status=status,
        is_encrypted=is_encrypted,
        page_count=None,
        raw_text_sha256=None,
        text_char_count=0,
        text_line_count=0,
        word_count=0,
        row_count=0,
        warnings=tuple(sorted(set(warnings))),
        text_layer={"extractor": "pymupdf", "pages": []},
        layout_words={"extractor": "pymupdf", "words": []},
        row_groups={"extractor": "pymupdf", "rows": [], "row_count": 0},
    )


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
