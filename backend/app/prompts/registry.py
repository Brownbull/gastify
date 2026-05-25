"""Thin prompt registry for production agents and prompt-lab runs."""

from __future__ import annotations

import hashlib
from typing import TYPE_CHECKING

from app.prompts.item_categorization import PROMPTS as ITEM_CATEGORIZATION_PROMPTS
from app.prompts.receipt_structure import PROMPTS as RECEIPT_STRUCTURE_PROMPTS
from app.prompts.statement_extraction import PROMPTS as STATEMENT_EXTRACTION_PROMPTS
from app.prompts.store_categorization import PROMPTS as STORE_CATEGORIZATION_PROMPTS

if TYPE_CHECKING:
    from app.prompts.definitions import PromptDefinition, PromptKind

PROMPTS: tuple[PromptDefinition, ...] = (
    *RECEIPT_STRUCTURE_PROMPTS,
    *STATEMENT_EXTRACTION_PROMPTS,
    *ITEM_CATEGORIZATION_PROMPTS,
    *STORE_CATEGORIZATION_PROMPTS,
)

_PROMPTS_BY_ID = {prompt.id: prompt for prompt in PROMPTS}


def list_prompts(kind: PromptKind | None = None) -> list[PromptDefinition]:
    if kind is None:
        return list(PROMPTS)
    return [prompt for prompt in PROMPTS if prompt.kind == kind]


def get_prompt(prompt_id: str, *, kind: PromptKind | None = None) -> PromptDefinition:
    normalized = prompt_id.strip()
    prompt = _PROMPTS_BY_ID.get(normalized)
    if prompt is None:
        raise KeyError(f"Unknown prompt id: {prompt_id}")
    if kind is not None and prompt.kind != kind:
        raise KeyError(f"Prompt {prompt_id} is {prompt.kind}, not {kind}")
    return prompt


def is_prompt_id_known(prompt_id: str, *, kind: PromptKind | None = None) -> bool:
    try:
        get_prompt(prompt_id, kind=kind)
    except KeyError:
        return False
    return True


def is_prompt_id_allowed(
    prompt_id: str,
    *,
    environment: str,
    kind: PromptKind | None = None,
) -> bool:
    prompt = get_prompt(prompt_id, kind=kind)
    return not (environment == "production" and prompt.status == "dev-only")


def prompt_text_hash(prompt: PromptDefinition) -> str:
    return hashlib.sha256(prompt.text_for_hash.encode("utf-8")).hexdigest()


def active_prompt_version(
    *,
    extraction_prompt_id: str,
    categorization_prompt_id: str,
    store_categorization_prompt_id: str | None = None,
    model: str,
) -> str:
    extraction = get_prompt(extraction_prompt_id, kind="receipt-extraction")
    categorization = get_prompt(categorization_prompt_id, kind="item-categorization")
    version = (
        f"{extraction.id}@{extraction.version}+"
        f"{categorization.id}@{categorization.version}+model:{model}"
    )
    if store_categorization_prompt_id:
        store = get_prompt(store_categorization_prompt_id, kind="store-categorization")
        version += f"+{store.id}@{store.version}"
    return version
