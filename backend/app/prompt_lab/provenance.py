"""Field provenance for prompt-lab raw and processed receipt outputs."""

from __future__ import annotations

import re
from collections.abc import Mapping
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from app.services.coalesce import find_visible_total_candidates, has_visible_total_conflict

if TYPE_CHECKING:
    from app.schemas.scan import (
        CategorizationResult,
        GeminiExtractionResult,
        MathReconciliationVerdict,
        RawGeminiExtractionResult,
    )

PROMPT_LAB_PROVENANCE_SCHEMA_VERSION = "prompt-lab-field-provenance.v1"

_ROOT_EXTRACTION_FIELDS = (
    "merchant_name",
    "transaction_date",
    "currency_code",
    "total_amount",
    "tax_amount",
    "discount_amount",
    "confidence_score",
)
_ITEM_FIELDS = (
    "name",
    "qty",
    "unit_price",
    "total_price",
    "discount_amount",
    "discount_label",
    "discount_attribution_confidence",
    "source_lines",
)
_EXPLICIT_QUANTITY_MARKER_PATTERN = re.compile(r"(?i)\b(?:qt[eé]|qty|cant\.?|cantidad)\b.*[xX@]")
_LINE_START_QUANTITY_PATTERN = re.compile(r"(?i)^\s*[0-9]{1,3}\s*[xX@]")
_N_FOR_PRICE_PATTERN = re.compile(r"(?i)\b[0-9]{1,3}\s*(?:for|por)\s*[0-9][0-9.,]*\b")
_PACKAGE_SIZE_PATTERN = re.compile(
    r"(?i)\b[0-9]{1,3}\s*[xX]\s*[0-9][0-9.,]*\s*(?:g|gr|kg|ml|l|lt|oz|lb)\b"
)
_INFORMATIONAL_SAVINGS_PATTERN = re.compile(
    r"(?i)\b(you\s+saved|your\s+savings|savings?\s+summary|special\s+price\s+savings)\b"
)


def build_field_provenance(
    *,
    raw_extraction: RawGeminiExtractionResult | None,
    processed_extraction: GeminiExtractionResult | None,
    categorization: CategorizationResult | None = None,
    verdict: MathReconciliationVerdict | None = None,
    score: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Classify prompt-created fields vs deterministic post-prompt fields."""
    fields: list[dict[str, Any]] = []
    if raw_extraction is not None or processed_extraction is not None:
        fields.extend(_extraction_fields(raw_extraction, processed_extraction))
        fields.extend(_line_item_fields(raw_extraction, processed_extraction))
        fields.extend(_discount_source_fields(raw_extraction, processed_extraction))
        fields.extend(_adjustment_fields(raw_extraction, processed_extraction))
    if categorization is not None:
        fields.extend(_categorization_fields(categorization))
    if verdict is not None:
        fields.extend(_verdict_fields(verdict))
    if score is not None:
        fields.extend(_score_fields(score))

    summary: dict[str, int] = {}
    for field in fields:
        stage = str(field["origin_stage"])
        summary[stage] = summary.get(stage, 0) + 1

    return {
        "schema_version": PROMPT_LAB_PROVENANCE_SCHEMA_VERSION,
        "summary": summary,
        "fields": fields,
    }


def _extraction_fields(
    raw: RawGeminiExtractionResult | None,
    processed: GeminiExtractionResult | None,
) -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = []
    for name in _ROOT_EXTRACTION_FIELDS:
        raw_value = getattr(raw, name, None) if raw else None
        final_value = getattr(processed, name, None) if processed else None
        fields.append(
            _compare_field(
                field_path=f"extraction.{name}",
                raw_value=raw_value,
                final_value=final_value,
                notes=_root_field_notes(name, raw_value, final_value, raw, processed),
            )
        )
    if raw is not None:
        candidates = find_visible_total_candidates(
            raw.source_lines,
            raw.currency_code.strip().upper() if raw.currency_code else "CLP",
        )
        if candidates:
            fields.append(
                _record(
                    field_path="raw_extraction.visible_total_candidates",
                    raw_value=candidates,
                    final_value=processed.total_amount if processed else None,
                    origin_stage="extraction_prompt",
                    operation="raw_evidence_only",
                    notes=(
                        "Visible total candidates were copied by the prompt; "
                        "post-processing decides whether they are safe to use."
                    ),
                )
            )
        if has_visible_total_conflict(raw, processed):
            fields.append(
                _record(
                    field_path="extraction.total_amount.visible_total_conflict",
                    raw_value=raw.total_amount,
                    final_value=processed.total_amount if processed else None,
                    origin_stage="postprocess",
                    operation="conflict_unresolved",
                    notes=(
                        "Visible total evidence conflicts with the prompt total, but the "
                        "relationship was not an exact zero-decimal x100 scale error."
                    ),
                )
            )
    return fields


def _line_item_fields(
    raw: RawGeminiExtractionResult | None,
    processed: GeminiExtractionResult | None,
) -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = []
    raw_items = raw.line_items if raw else []
    processed_items = processed.line_items if processed else []
    comparable = max(len(raw_items), len(processed_items))

    if raw is not None and not raw_items and processed_items:
        for index, item in enumerate(processed_items):
            fields.append(
                _record(
                    field_path=f"extraction.line_items[{index}]",
                    raw_value=None,
                    final_value=item.model_dump(mode="json"),
                    origin_stage="postprocess",
                    operation="synthesized",
                    notes=(
                        "Created deterministic service line because the receipt had a "
                        "positive total and no prompt-created items."
                    ),
                )
            )
        return fields

    for index in range(comparable):
        raw_item = raw_items[index] if index < len(raw_items) else None
        processed_item = processed_items[index] if index < len(processed_items) else None
        if raw_item is not None and raw_item.total_price < 0:
            fields.append(
                _record(
                    field_path=f"extraction.line_items[{index}]",
                    raw_value=raw_item.model_dump(mode="json"),
                    final_value=None,
                    origin_stage="postprocess",
                    operation="removed",
                    notes=(
                        "Negative visible discount row was removed from product items "
                        "and folded into discount metadata when valid."
                    ),
                )
            )
            continue
        for name in _ITEM_FIELDS:
            raw_value = getattr(raw_item, name, None) if raw_item is not None else None
            final_value = (
                getattr(processed_item, name, None) if processed_item is not None else None
            )
            fields.append(
                _compare_field(
                    field_path=f"extraction.line_items[{index}].{name}",
                    raw_value=raw_value,
                    final_value=final_value,
                    notes=_item_field_notes(name, raw_value, final_value),
                )
            )
        if raw_item is not None and getattr(raw_item, "modifier_lines", None):
            fields.append(
                _record(
                    field_path=f"raw_extraction.line_items[{index}].modifier_lines",
                    raw_value=raw_item.modifier_lines,
                    final_value=None,
                    origin_stage="extraction_prompt",
                    operation="raw_evidence_only",
                    notes=(
                        "Modifier lines are prompt evidence consumed by post-processing "
                        "and not persisted as public line-item fields."
                    ),
                )
            )
        fields.extend(_quantity_evidence_fields(index, raw_item, processed_item))
    return fields


def _quantity_evidence_fields(
    index: int,
    raw_item: Any,
    processed_item: Any,
) -> list[dict[str, Any]]:
    if raw_item is None:
        return []
    evidence = [
        *list(getattr(raw_item, "source_lines", []) or []),
        *list(getattr(raw_item, "modifier_lines", []) or []),
        getattr(raw_item, "name", ""),
    ]
    evidence_text = "\n".join(line for line in evidence if line)
    fields: list[dict[str, Any]] = []
    if _PACKAGE_SIZE_PATTERN.search(evidence_text):
        fields.append(
            _record(
                field_path=f"raw_extraction.line_items[{index}].quantity_evidence.package_size",
                raw_value=evidence,
                final_value=getattr(processed_item, "qty", None),
                origin_stage="postprocess",
                operation="multiplier_rejected",
                notes=("A product package-size token was not treated as quantity x unit price."),
            )
        )
    if _has_accepted_quantity_multiplier(evidence):
        fields.append(
            _record(
                field_path=f"raw_extraction.line_items[{index}].quantity_evidence.multiplier",
                raw_value=evidence,
                final_value=getattr(processed_item, "qty", None),
                origin_stage="postprocess",
                operation="multiplier_accepted",
                notes=(
                    "A visible quantity marker or line-start multiplier informed "
                    "deterministic quantity/unit-price handling."
                ),
            )
        )
    if _N_FOR_PRICE_PATTERN.search(evidence_text):
        fields.append(
            _record(
                field_path=f"raw_extraction.line_items[{index}].quantity_evidence.n_for_price",
                raw_value=evidence,
                final_value=getattr(processed_item, "qty", None),
                origin_stage="postprocess",
                operation="n_for_price_parsed",
                notes=("`N FOR amount` evidence was parsed as quantity N and a total promo price."),
            )
        )
    return fields


def _has_accepted_quantity_multiplier(evidence: list[str]) -> bool:
    if _EXPLICIT_QUANTITY_MARKER_PATTERN.search("\n".join(evidence)):
        return True
    return any(
        _LINE_START_QUANTITY_PATTERN.search(line) and not _PACKAGE_SIZE_PATTERN.search(line)
        for line in evidence
    )


def _adjustment_fields(
    raw: RawGeminiExtractionResult | None,
    processed: GeminiExtractionResult | None,
) -> list[dict[str, Any]]:
    if raw is None:
        return []
    fields: list[dict[str, Any]] = []
    final_discount = processed.discount_amount if processed else None
    for index, adjustment in enumerate(raw.adjustment_lines):
        amount = abs(adjustment.amount)
        adjustment_text = "\n".join([adjustment.label, *adjustment.source_lines])
        if _INFORMATIONAL_SAVINGS_PATTERN.search(adjustment_text):
            operation = "ignored_informational_savings"
        elif final_discount is not None and amount <= final_discount:
            operation = "visible_adjustment_total"
        else:
            operation = "ignored_by_postprocess"
        fields.append(
            _record(
                field_path=f"raw_extraction.adjustment_lines[{index}]",
                raw_value=adjustment.model_dump(mode="json"),
                final_value=str(final_discount) if final_discount is not None else None,
                origin_stage="postprocess",
                operation=operation,
                notes=(
                    "Adjustment evidence is prompt-created, but deterministic post-processing "
                    "decides whether it is a valid discount or non-discount settlement/tax noise."
                ),
            )
        )
    return fields


def _discount_source_fields(
    raw: RawGeminiExtractionResult | None,
    processed: GeminiExtractionResult | None,
) -> list[dict[str, Any]]:
    if raw is None:
        return []
    raw_discount = raw.discount_amount
    final_discount = processed.discount_amount if processed else None
    if raw_discount is None:
        return [
            _record(
                field_path="raw_extraction.discount_source",
                raw_value=None,
                final_value=final_discount,
                origin_stage="postprocess",
                operation="none" if final_discount is None else "visible_adjustment_total",
                notes=(
                    "Receipt discount source is selected at transaction level; item-level "
                    "discount attribution is deprecated."
                ),
            )
        ]
    return [
        _record(
            field_path="raw_extraction.discount_source",
            raw_value=raw_discount,
            final_value=final_discount,
            origin_stage="postprocess",
            operation="explicit_receipt_discount"
            if final_discount is not None
            else "ignored_by_postprocess",
            notes=(
                "Explicit receipt-level discount evidence was evaluated as the canonical "
                "transaction discount candidate."
            ),
        )
    ]


def _categorization_fields(categorization: CategorizationResult) -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = []
    for index, assignment in enumerate(categorization.assignments):
        for name, value in assignment.model_dump(mode="json").items():
            fields.append(
                _record(
                    field_path=f"categorization.assignments[{index}].{name}",
                    raw_value=None,
                    final_value=value,
                    origin_stage="item_categorization_prompt",
                    operation="created",
                    notes=(
                        "Created by the item categorization prompt after extraction "
                        "post-processing."
                    ),
                )
            )
    return fields


def _verdict_fields(verdict: MathReconciliationVerdict) -> list[dict[str, Any]]:
    fields = [
        _record(
            field_path=f"verdict.{name}",
            raw_value=None,
            final_value=value,
            origin_stage="deterministic_math_gate",
            operation="created",
            notes="Created by deterministic math reconciliation outside the prompt.",
        )
        for name, value in verdict.model_dump(mode="json").items()
    ]
    if verdict.severity == "major_warning":
        fields.append(
            _record(
                field_path="verdict.reconstruction_warning",
                raw_value=None,
                final_value=verdict.discrepancy_ratio,
                origin_stage="deterministic_math_gate",
                operation="major_reconstruction_warning",
                notes=(
                    "Reconstructed item math differs from the canonical receipt total by "
                    "more than 25%."
                ),
            )
        )
    return fields


def _score_fields(score: Mapping[str, Any]) -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = []
    for path, value in _flatten_mapping(score):
        fields.append(
            _record(
                field_path=f"score.{path}",
                raw_value=None,
                final_value=value,
                origin_stage="scoring",
                operation="created",
                notes="Created by prompt-lab scoring outside the prompt.",
            )
        )
    return fields


def _compare_field(
    *,
    field_path: str,
    raw_value: Any,
    final_value: Any,
    notes: str,
) -> dict[str, Any]:
    raw_json = _jsonable(raw_value)
    final_json = _jsonable(final_value)
    if raw_json is None and final_json is not None:
        return _record(
            field_path=field_path,
            raw_value=raw_json,
            final_value=final_json,
            origin_stage="postprocess",
            operation="created",
            notes=notes,
        )
    if raw_json is not None and final_json is None:
        return _record(
            field_path=field_path,
            raw_value=raw_json,
            final_value=final_json,
            origin_stage="postprocess",
            operation="removed",
            notes=notes,
        )
    if raw_json != final_json:
        return _record(
            field_path=field_path,
            raw_value=raw_json,
            final_value=final_json,
            origin_stage="postprocess",
            operation="normalized",
            notes=notes,
        )
    return _record(
        field_path=field_path,
        raw_value=raw_json,
        final_value=final_json,
        origin_stage="extraction_prompt",
        operation="preserved",
        notes="Prompt-created value was preserved after deterministic post-processing.",
    )


def _root_field_notes(
    name: str,
    raw_value: Any,
    final_value: Any,
    raw: RawGeminiExtractionResult | None,
    processed: GeminiExtractionResult | None,
) -> str:
    if name == "tax_amount" and raw_value is not None and final_value is None:
        return (
            "Tax was suppressed by deterministic reconciliation because it appeared "
            "included or reporting-only."
        )
    if name == "discount_amount" and raw_value != final_value:
        return "Discount was normalized or replaced by deterministic discount reconciliation."
    if name == "total_amount" and raw_value != final_value:
        if raw is not None and processed is not None:
            candidates = find_visible_total_candidates(
                raw.source_lines,
                raw.currency_code.strip().upper() if raw.currency_code else "CLP",
            )
            if processed.total_amount in candidates:
                return (
                    "Total was corrected from explicit visible total evidence after detecting "
                    "an exact zero-decimal x100 scale error."
                )
        return "Money amount was normalized to integer minor units."
    return "Root extraction field compared between raw prompt output and processed output."


def _item_field_notes(name: str, raw_value: Any, final_value: Any) -> str:
    if name in {"qty", "unit_price"} and raw_value != final_value:
        return (
            "Quantity or unit price was defaulted, parsed from evidence, or derived "
            "deterministically."
        )
    if name == "discount_amount" and raw_value != final_value:
        return (
            "Deprecated item-level discount value was discarded; receipt discounts are "
            "transaction-level."
        )
    if name == "total_price" and raw_value != final_value:
        return "Money amount was normalized to integer minor units."
    return "Line-item field compared between raw prompt output and processed output."


def _record(
    *,
    field_path: str,
    raw_value: Any,
    final_value: Any,
    origin_stage: str,
    operation: str,
    notes: str,
) -> dict[str, Any]:
    return {
        "field_path": field_path,
        "raw_value": _jsonable(raw_value),
        "final_value": _jsonable(final_value),
        "origin_stage": origin_stage,
        "operation": operation,
        "notes": notes,
    }


def _jsonable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    if isinstance(value, tuple):
        return [_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    return value


def _flatten_mapping(mapping: Mapping[str, Any], prefix: str = "") -> list[tuple[str, Any]]:
    flattened: list[tuple[str, Any]] = []
    for key, value in mapping.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, Mapping):
            flattened.extend(_flatten_mapping(value, path))
        else:
            flattened.append((path, value))
    return flattened
