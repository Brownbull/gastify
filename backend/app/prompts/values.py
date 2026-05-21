"""Reusable values referenced by receipt prompts and prompt-lab scoring."""

from __future__ import annotations

from app.reference.categories import (
    SPANISH_TO_ENGLISH_CATEGORY_KEYS,
    V4_CATEGORY_KEYS,
    V4_INDUSTRY_KEYS,
    V4_ITEM_CATEGORY_TAXONOMY,
    V4_ITEM_FAMILY_KEYS,
    V4_STORE_CATEGORY_KEYS,
    V4_STORE_CATEGORY_TAXONOMY,
    render_v4_item_taxonomy_prompt,
    render_v4_store_taxonomy_prompt,
    render_v4_taxonomy_prompt,
)

SUPPORTED_RECEIPT_CURRENCY_CODES: tuple[str, ...] = (
    "CLP",
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "KRW",
    "MXN",
    "BRL",
    "CAD",
    "AUD",
)
PRIMARY_RECEIPT_CURRENCY_CODES: tuple[str, ...] = ("USD", "EUR", "GBP", "CLP", "JPY")
ZERO_DECIMAL_RECEIPT_CURRENCY_CODES: tuple[str, ...] = ("CLP", "JPY", "KRW")
DECIMAL_RECEIPT_CURRENCY_CODES: tuple[str, ...] = ("USD", "EUR", "GBP")

V4_TAXONOMY_PROMPT = render_v4_taxonomy_prompt()
V4_ITEM_TAXONOMY_PROMPT = render_v4_item_taxonomy_prompt()
V4_STORE_TAXONOMY_PROMPT = render_v4_store_taxonomy_prompt()

__all__ = [
    "DECIMAL_RECEIPT_CURRENCY_CODES",
    "PRIMARY_RECEIPT_CURRENCY_CODES",
    "SPANISH_TO_ENGLISH_CATEGORY_KEYS",
    "SUPPORTED_RECEIPT_CURRENCY_CODES",
    "V4_CATEGORY_KEYS",
    "V4_INDUSTRY_KEYS",
    "V4_ITEM_CATEGORY_TAXONOMY",
    "V4_ITEM_FAMILY_KEYS",
    "V4_ITEM_TAXONOMY_PROMPT",
    "V4_STORE_CATEGORY_KEYS",
    "V4_STORE_CATEGORY_TAXONOMY",
    "V4_STORE_TAXONOMY_PROMPT",
    "V4_TAXONOMY_PROMPT",
    "ZERO_DECIMAL_RECEIPT_CURRENCY_CODES",
]
