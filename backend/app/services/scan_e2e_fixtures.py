"""Deterministic scan fixtures for physical-device E2E.

This module is active for fixture-backed E2E and local mock runs.
The mobile app still exercises the native picker, real multipart upload, scan
row creation, and WebSocket progress stream; only the Gemini calls are replaced.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING, Literal

from app.agents.categorization import CategorizationOutput, CategorizationUsage
from app.agents.extraction import ExtractionResult, ExtractionUsage
from app.config import settings
from app.schemas.scan import (
    CategorizationResult,
    CategoryAssignment,
    GeminiExtractionResult,
    LineItemExtraction,
)
from app.services.scan_errors import ScanErrorCode

if TYPE_CHECKING:
    from pathlib import Path

UPLOAD_HASH_MARKER_FILENAME = "upload.sha256"

E2E_SCAN_FIXTURE_HASHES = {
    "happy": "c82975efa61b7f5a46278757123b03d96e5c012f8a69546525b0b92f291ba472",
    "review": "f691004bc1f00b325816866122af6e7c9d68b33b519b6baf00564129e264d616",
    "failure": "712f91c8902213a37eaf4f7b1df2589ff9e6a71436f06cb45cf3467cec624a34",
    # Android Photo Picker can return a transformed copy of the selected media.
    # Keep these hashes tied to the physical S23 gallery path so fixture lookup
    # still uses uploaded bytes instead of mobile test-only controls.
    "happy_android_picker_s23": (
        "6924ec7cb3c8847498b2dd356be172d9e669734ef9b184c195e246679a945b90"
    ),
    "review_android_picker_s23": (
        "15703306509338bc4e4be1f991596832c17a88e86dfa47051dc787703621bc92"
    ),
    "failure_android_picker_s23": (
        "8c57770a343bd74745b777e8f46b45ac4a3161550667240574135bfb04800904"
    ),
}


@dataclass(frozen=True)
class E2EScanFixtureCase:
    key: str
    outcome: Literal["success", "failure"]
    extraction: ExtractionResult | None = None
    categorization: CategorizationOutput | None = None
    failure_code: str | None = None
    failure_message: str | None = None


def upload_sha256(raw_bytes: bytes) -> str:
    return hashlib.sha256(raw_bytes).hexdigest()


def write_upload_hash_marker(scan_dir: Path, raw_bytes: bytes) -> None:
    if not _fixture_mode_enabled():
        return
    (scan_dir / UPLOAD_HASH_MARKER_FILENAME).write_text(
        f"{upload_sha256(raw_bytes)}\n",
        encoding="utf-8",
    )


def fixture_case_for_scan_image(image_path: Path) -> E2EScanFixtureCase | None:
    marker = image_path.with_name(UPLOAD_HASH_MARKER_FILENAME)
    if not marker.exists():
        return None
    try:
        digest = marker.read_text(encoding="utf-8").strip()
    except OSError:
        return None
    return fixture_case_for_hash(digest)


def fixture_case_for_hash(digest: str) -> E2EScanFixtureCase | None:
    return _CASES_BY_HASH.get(digest)


def fixture_case_by_key(key: str) -> E2EScanFixtureCase | None:
    normalized = key.strip().lower()
    for case in _CASES_BY_HASH.values():
        if case.key == normalized:
            return case
    return None


def _fixture_mode_enabled() -> bool:
    return getattr(settings, "e2e_scan_fixtures_enabled", False) is True or getattr(
        settings, "scan_provider", "gemini"
    ) in {"fixture", "mock"}


def _extraction(
    *,
    merchant_name: str,
    total_amount: str,
    confidence_score: float,
    items: list[tuple[str, str]],
) -> ExtractionResult:
    return ExtractionResult(
        extraction=GeminiExtractionResult(
            merchant_name=merchant_name,
            transaction_date="2026-05-18",
            currency_code="CLP",
            total_amount=Decimal(total_amount),
            line_items=[
                LineItemExtraction(name=name, total_price=Decimal(total)) for name, total in items
            ],
            confidence_score=confidence_score,
        ),
        usage=ExtractionUsage(input_tokens=0, output_tokens=0, latency_ms=0),
    )


def _categorization(category_keys: list[str]) -> CategorizationOutput:
    return CategorizationOutput(
        result=CategorizationResult(
            assignments=[
                CategoryAssignment(
                    line_item_index=index,
                    category_key=category_key,
                    confidence=0.99,
                )
                for index, category_key in enumerate(category_keys)
            ]
        ),
        usage=CategorizationUsage(input_tokens=0, output_tokens=0, latency_ms=0),
    )


_HAPPY_CASE = E2EScanFixtureCase(
    key="happy",
    outcome="success",
    extraction=_extraction(
        merchant_name="Supermercado Jumbo",
        total_amount="3280",
        confidence_score=0.94,
        items=[
            ("Leche Entera Colun 1L", "1290"),
            ("Pan Hallulla x6", "1990"),
        ],
    ),
    categorization=_categorization(["DairyEggs", "BreadPastry"]),
)

_REVIEW_CASE = E2EScanFixtureCase(
    key="review",
    outcome="success",
    extraction=_extraction(
        merchant_name="Unknown",
        total_amount="1500",
        confidence_score=0.42,
        items=[("Mystery receipt item", "1500")],
    ),
    categorization=_categorization(["OtherItem"]),
)

_FAILURE_CASE = E2EScanFixtureCase(
    key="failure",
    outcome="failure",
    failure_code=ScanErrorCode.INVALID_IMAGE.value,
    failure_message="E2E fixture requested deterministic scan failure",
)

_CASES_BY_HASH = {
    E2E_SCAN_FIXTURE_HASHES["happy"]: _HAPPY_CASE,
    E2E_SCAN_FIXTURE_HASHES["happy_android_picker_s23"]: _HAPPY_CASE,
    E2E_SCAN_FIXTURE_HASHES["review"]: _REVIEW_CASE,
    E2E_SCAN_FIXTURE_HASHES["review_android_picker_s23"]: _REVIEW_CASE,
    E2E_SCAN_FIXTURE_HASHES["failure"]: _FAILURE_CASE,
    E2E_SCAN_FIXTURE_HASHES["failure_android_picker_s23"]: _FAILURE_CASE,
}
