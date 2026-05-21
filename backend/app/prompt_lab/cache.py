"""Gemini response cache for receipt prompt lab runs."""

from __future__ import annotations

import hashlib
import json
from typing import TYPE_CHECKING, Any

from app.prompt_lab.paths import CACHE_ROOT
from app.prompts import get_prompt, prompt_text_hash

if TYPE_CHECKING:
    from pathlib import Path

PROMPT_LAB_SCHEMA_VERSION = "receipt-prompt-lab.v2"
PREPROCESSING_VERSION = "compress_receipt_image:1200x1600-jpeg80"
POSTPROCESSING_VERSION = "money-qty-item-discount-v9"


def build_cache_key(
    *,
    raw_image_hash: str,
    processed_image_hash: str,
    model: str,
    extraction_prompt_id: str,
    categorization_prompt_id: str,
    scan_context: dict[str, Any] | None = None,
) -> str:
    return build_processed_cache_key(
        raw_image_hash=raw_image_hash,
        processed_image_hash=processed_image_hash,
        model=model,
        extraction_prompt_id=extraction_prompt_id,
        categorization_prompt_id=categorization_prompt_id,
        scan_context=scan_context,
    )


def build_raw_cache_key(
    *,
    raw_image_hash: str,
    processed_image_hash: str,
    model: str,
    extraction_prompt_id: str,
    scan_context: dict[str, Any] | None = None,
) -> str:
    extraction_prompt = get_prompt(extraction_prompt_id, kind="receipt-extraction")
    payload = {
        "cache_stage": "raw-extraction",
        "raw_image_hash": raw_image_hash,
        "processed_image_hash": processed_image_hash,
        "model": model,
        "extraction_prompt_id": extraction_prompt.id,
        "extraction_prompt_hash": prompt_text_hash(extraction_prompt),
        "schema_version": PROMPT_LAB_SCHEMA_VERSION,
        "preprocessing_version": PREPROCESSING_VERSION,
        "scan_context_hash": _context_hash(scan_context or {}),
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


def build_processed_cache_key(
    *,
    raw_image_hash: str,
    processed_image_hash: str,
    model: str,
    extraction_prompt_id: str,
    categorization_prompt_id: str,
    scan_context: dict[str, Any] | None = None,
) -> str:
    extraction_prompt = get_prompt(extraction_prompt_id, kind="receipt-extraction")
    categorization_prompt = get_prompt(categorization_prompt_id, kind="item-categorization")
    raw_cache_key = build_raw_cache_key(
        raw_image_hash=raw_image_hash,
        processed_image_hash=processed_image_hash,
        model=model,
        extraction_prompt_id=extraction_prompt_id,
        scan_context=scan_context,
    )
    payload = {
        "cache_stage": "processed-replay",
        "raw_cache_key": raw_cache_key,
        "model": model,
        "extraction_prompt_id": extraction_prompt.id,
        "extraction_prompt_hash": prompt_text_hash(extraction_prompt),
        "categorization_prompt_id": categorization_prompt.id,
        "categorization_prompt_hash": prompt_text_hash(categorization_prompt),
        "schema_version": PROMPT_LAB_SCHEMA_VERSION,
        "preprocessing_version": PREPROCESSING_VERSION,
        "postprocessing_version": POSTPROCESSING_VERSION,
        "scan_context_hash": _context_hash(scan_context or {}),
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


def cache_path(cache_key: str, root: Path = CACHE_ROOT) -> Path:
    return root / f"{cache_key}.json"


def read_cache(cache_key: str, root: Path = CACHE_ROOT) -> dict[str, Any] | None:
    path = cache_path(cache_key, root=root)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_cache(cache_key: str, payload: dict[str, Any], root: Path = CACHE_ROOT) -> Path:
    root.mkdir(parents=True, exist_ok=True)
    path = cache_path(cache_key, root=root)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    return path


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _context_hash(context: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(context, sort_keys=True).encode("utf-8")).hexdigest()
