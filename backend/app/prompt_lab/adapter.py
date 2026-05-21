"""Legacy Boletapp baseline adapter for Gastify receipt prompt scoring."""

from __future__ import annotations

import json
import re
from decimal import Decimal, InvalidOperation
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from pathlib import Path

ZERO_EXP_CURRENCIES = {"CLP", "JPY", "KRW", "VND", "ISK", "UGX", "RWF", "DJF", "GNF"}


class ExpectedLineItem(BaseModel):
    name: str
    total_minor: int
    unit_minor: int | None = None
    quantity: Decimal | None = None
    discount_minor: int | None = None
    discount_label: str | None = None
    legacy_category: str | None = None
    gastify_category_key: str | None = None


class ScanContext(BaseModel):
    currency: str | None = None
    receipt_type: str | None = Field(default=None, alias="receiptType")


class ExpectedReceipt(BaseModel):
    case_id: str
    merchant: str
    transaction_date: str
    currency: str
    total_minor: int
    discount_total_minor: int | None = None
    items: list[ExpectedLineItem] = Field(default_factory=list)
    confidence: float | None = None
    scan_context: dict[str, Any] = Field(default_factory=dict)
    unscored_fields: dict[str, Any] = Field(default_factory=dict)


def load_expected_receipt(path: Path, *, case_id: str) -> ExpectedReceipt:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return adapt_legacy_payload(payload, case_id=case_id)


def adapt_legacy_payload(payload: dict[str, Any], *, case_id: str) -> ExpectedReceipt:
    source = _source_payload(payload)
    source = _apply_corrections(source, payload.get("corrections") or {})

    currency = str(
        source.get("currency")
        or payload.get("input", {}).get("currency")
        or payload.get("currency")
        or "CLP"
    ).upper()
    metadata = source.get("aiMetadata") or source.get("metadata") or {}
    items, discount_total_minor = _adapt_items(source.get("items", []), currency=currency)

    return ExpectedReceipt(
        case_id=case_id,
        merchant=str(source.get("merchant") or source.get("merchant_name") or "Unknown"),
        transaction_date=str(source.get("date") or source.get("transaction_date") or ""),
        currency=currency,
        total_minor=_money_to_minor(source.get("total") or source.get("total_amount"), currency),
        discount_total_minor=discount_total_minor,
        items=items,
        confidence=_optional_float(metadata.get("confidence")),
        scan_context=dict(payload.get("input") or {}),
        unscored_fields=_unscored(source),
    )


def _source_payload(payload: dict[str, Any]) -> dict[str, Any]:
    for key in ("aiExtraction", "expectedAfterCoercion", "expected", "fixture"):
        value = payload.get(key)
        if isinstance(value, dict):
            return dict(value)
    return dict(payload)


def _apply_corrections(source: dict[str, Any], corrections: dict[str, Any]) -> dict[str, Any]:
    result = dict(source)
    for key in ("merchant", "date", "total", "currency", "category"):
        if key in corrections:
            result[key] = corrections[key]
    return result


def _adapt_items(
    source_items: list[dict[str, Any]],
    *,
    currency: str,
) -> tuple[list[ExpectedLineItem], int | None]:
    items: list[ExpectedLineItem] = []
    discount_total = 0
    for item in source_items:
        total_minor = _money_to_minor(
            item.get("totalPrice") or item.get("total_price") or item.get("amount"),
            currency,
        )
        if total_minor < 0:
            discount = abs(total_minor)
            discount_total += discount
            continue
        items.append(_adapt_item(item, currency=currency, total_minor=total_minor))
    return items, discount_total or None


def _adapt_item(
    item: dict[str, Any],
    *,
    currency: str,
    total_minor: int,
) -> ExpectedLineItem:
    category = item.get("category")
    return ExpectedLineItem(
        name=str(item.get("name") or "Unknown"),
        total_minor=total_minor,
        unit_minor=(
            _money_to_minor(item.get("unitPrice") or item.get("unit_price"), currency)
            if item.get("unitPrice") is not None or item.get("unit_price") is not None
            else None
        ),
        quantity=_optional_decimal(item.get("quantity") or item.get("qty")),
        legacy_category=str(category) if category is not None else None,
        gastify_category_key=None,
    )


def _money_to_minor(value: Any, currency: str) -> int:
    if value is None:
        return 0
    if isinstance(value, str):
        value = _parse_money_string(value, currency)
    elif not isinstance(value, Decimal):
        value = Decimal(str(value))

    if currency in ZERO_EXP_CURRENCIES:
        return int(value.to_integral_value())
    if value == value.to_integral_value():
        return int(value)
    return int((value * Decimal("100")).to_integral_value())


def _parse_money_string(value: str, currency: str) -> Decimal:
    normalized = value.strip()
    if currency in ZERO_EXP_CURRENCIES:
        sign = "-" if normalized.startswith("-") else ""
        digits = re.sub(r"\D", "", normalized)
        return Decimal(f"{sign}{digits or '0'}")
    normalized = normalized.replace(",", "")
    try:
        return Decimal(normalized)
    except InvalidOperation:
        return Decimal(re.sub(r"[^0-9.-]", "", normalized) or "0")


def _optional_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


def _optional_float(value: Any) -> float | None:
    if value is None:
        return None
    return float(value)


def _unscored(source: dict[str, Any]) -> dict[str, Any]:
    scored = {"merchant", "merchant_name", "date", "transaction_date", "currency", "total"}
    scored |= {"total_amount", "items", "aiMetadata", "metadata"}
    return {key: value for key, value in source.items() if key not in scored}
