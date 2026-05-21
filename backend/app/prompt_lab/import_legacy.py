"""Whitelist importer for legacy Boletapp receipt prompt-testing assets."""

from __future__ import annotations

import hashlib
import json
import shutil
from dataclasses import asdict, dataclass
from typing import TYPE_CHECKING, Any

from app.prompt_lab.paths import IMPORT_MANIFEST_PATH, TEST_CASES_ROOT, ensure_workspace

if TYPE_CHECKING:
    from pathlib import Path


IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
JSON_SUFFIXES = (
    ".expected.json",
    ".expected.v2.json",
    ".fixture.json",
    ".input.json",
)
EXCLUDED_PARTS = {"creditcard", "credit-card", "statement"}
EXCLUDED_FILENAMES = {"credentials.json"}
EXCLUDED_SUFFIXES = {".pdf"}


@dataclass(frozen=True)
class ImportRecord:
    source: str
    destination: str | None
    sha256: str | None
    document_type: str
    baseline_status: str
    status: str
    reason: str | None = None


def import_legacy_cases(source: Path, *, force: bool = False) -> dict[str, Any]:
    """Import only receipt images and whitelisted JSON from a legacy test-case tree."""
    ensure_workspace()
    source = source.expanduser().resolve()
    if not source.exists():
        raise FileNotFoundError(source)

    imported: list[ImportRecord] = []
    skipped: list[ImportRecord] = []

    for path in sorted(p for p in source.rglob("*") if p.is_file()):
        rel = path.relative_to(source)
        reason = _skip_reason(path, rel)
        if reason:
            skipped.append(_record(path, None, "skipped", reason=reason))
            continue

        destination = TEST_CASES_ROOT / rel
        if destination.exists() and not force:
            skipped.append(_record(path, destination, "skipped", reason="destination exists"))
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)
        imported.append(_record(path, destination, "imported"))

    manifest = {
        "source_root": str(source),
        "destination_root": str(TEST_CASES_ROOT),
        "imported": [asdict(record) for record in imported],
        "skipped": [asdict(record) for record in skipped],
        "summary": {
            "imported": len(imported),
            "skipped": len(skipped),
            "document_type": "receipt",
        },
    }
    IMPORT_MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return manifest


def _skip_reason(path: Path, rel: Path) -> str | None:
    rel_parts = {part.lower() for part in rel.parts}
    if rel_parts & EXCLUDED_PARTS:
        return "excluded document family"
    if path.name.lower() in EXCLUDED_FILENAMES:
        return "excluded credential file"
    if path.suffix.lower() in EXCLUDED_SUFFIXES:
        return "excluded file type"
    if path.suffix.lower() in IMAGE_SUFFIXES:
        return None
    if path.suffix.lower() == ".json" and path.name.endswith(JSON_SUFFIXES):
        return None
    return "unsupported file type"


def _record(
    source: Path,
    destination: Path | None,
    status: str,
    *,
    reason: str | None = None,
) -> ImportRecord:
    return ImportRecord(
        source=str(source),
        destination=str(destination) if destination else None,
        sha256=_sha256(source) if source.exists() else None,
        document_type="receipt",
        baseline_status=_baseline_status(source),
        status=status,
        reason=reason,
    )


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _baseline_status(path: Path) -> str:
    name = path.name
    if name.endswith((".expected.json", ".expected.v2.json")):
        return "legacy-expected"
    if name.endswith(".fixture.json"):
        return "legacy-fixture"
    if name.endswith(".input.json"):
        return "legacy-input"
    return "unbaselined"
