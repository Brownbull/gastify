"""Statement-specific prompt-lab cache keys."""

from __future__ import annotations

import hashlib
import json
from typing import TYPE_CHECKING, Any, cast

from app.prompt_lab.paths import CACHE_ROOT
from app.prompts import get_prompt, prompt_text_hash

if TYPE_CHECKING:
    from pathlib import Path

    from app.prompts.definitions import PromptKind

STATEMENT_PROMPT_LAB_SCHEMA_VERSION = "statement-prompt-lab.v1"


def build_statement_cache_key(
    *,
    raw_pdf_hash: str,
    provider_pdf_hash: str,
    gemini_input_mode: str = "pdf",
    evidence_hash: str | None = None,
    model: str,
    prompt_id: str,
    prompt_kind: PromptKind = "statement-extraction",
    encrypted_input: bool,
    decrypted_for_provider: bool,
    expected_fixture_hash: str | None,
    expected_fixture_id: str | None,
) -> str:
    prompt = get_prompt(prompt_id, kind=prompt_kind)
    payload = {
        "schema_version": STATEMENT_PROMPT_LAB_SCHEMA_VERSION,
        "cache_stage": "statement-gemini-pdf-extraction",
        "gemini_input_mode": gemini_input_mode,
        "raw_pdf_hash": raw_pdf_hash,
        "provider_pdf_hash": provider_pdf_hash,
        "evidence_hash": evidence_hash,
        "model": model,
        "prompt_id": prompt.id,
        "prompt_kind": prompt.kind,
        "prompt_hash": prompt_text_hash(prompt),
        "encrypted_state": {
            "encrypted_input": encrypted_input,
            "decrypted_for_provider": decrypted_for_provider,
        },
        "expected_fixture": {
            "id": expected_fixture_id,
            "sha256": expected_fixture_hash,
        },
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


def statement_cache_path(cache_key: str, root: Path = CACHE_ROOT) -> Path:
    return root / "statements" / f"{cache_key}.json"


def read_statement_cache(cache_key: str, root: Path = CACHE_ROOT) -> dict[str, Any] | None:
    path = statement_cache_path(cache_key, root=root)
    if not path.exists():
        return None
    return cast("dict[str, Any]", json.loads(path.read_text(encoding="utf-8")))


def write_statement_cache(
    cache_key: str,
    payload: dict[str, Any],
    root: Path = CACHE_ROOT,
) -> Path:
    path = statement_cache_path(cache_key, root=root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    return path


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
