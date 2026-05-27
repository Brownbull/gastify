"""Recurrence and fixed-term helpers for scan and statement transactions."""

from __future__ import annotations

import re
from decimal import Decimal
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.schemas.recurrence import RecurrenceHint, RecurrenceSource

_INSTALLMENT_FRACTION_RE = re.compile(r"\b(\d{1,3})\s*/\s*(\d{1,3})\b")
_INSTALLMENT_TOTAL_RE = re.compile(r"(?i)\b(\d{1,3})\s*(?:cuotas?|months?|meses|payments?)\b")
_MONTHLY_TEXT_RE = re.compile(
    r"(?i)\b(monthly|mensual|mensualmente|subscription|suscripci[oó]n|internet|plan)\b"
)


def default_recurrence_fields() -> dict[str, Any]:
    return {
        "recurrence_kind": "none",
        "recurrence_interval": None,
        "term_current": None,
        "term_total": None,
        "recurrence_label": None,
        "recurrence_source": "none",
        "recurrence_confidence": None,
    }


def recurrence_fields_from_statement_installment(installment: str | None) -> dict[str, Any]:
    """Map a visible statement installment marker to transaction recurrence fields."""
    label = _clean_label(installment)
    if not label:
        return default_recurrence_fields()

    term_current, term_total = _parse_installment_label(label)
    if term_total is None or term_total <= 1:
        return default_recurrence_fields()
    return {
        "recurrence_kind": "fixed_term",
        "recurrence_interval": "monthly",
        "term_current": term_current,
        "term_total": term_total,
        "recurrence_label": label,
        "recurrence_source": "statement",
        "recurrence_confidence": Decimal("0.90"),
    }


def recurrence_fields_from_hint(
    hint: RecurrenceHint | None,
    *,
    source: RecurrenceSource,
) -> dict[str, Any]:
    """Normalize a provider recurrence hint into transaction fields."""
    if hint is None or hint.kind == "none":
        return default_recurrence_fields()

    label = _clean_label(hint.label)
    term_current = hint.term_current
    term_total = hint.term_total
    if label and (term_current is None or term_total is None):
        parsed_current, parsed_total = _parse_installment_label(label)
        term_current = term_current if term_current is not None else parsed_current
        term_total = term_total if term_total is not None else parsed_total

    kind = hint.kind
    interval = hint.interval
    if kind == "fixed_term" and term_total is None:
        kind = "unknown"
    if kind == "fixed_term" and interval is None:
        interval = "monthly"
    if kind == "recurring" and interval is None:
        interval = "monthly" if label and _MONTHLY_TEXT_RE.search(label) else "unknown"

    return {
        "recurrence_kind": kind,
        "recurrence_interval": interval,
        "term_current": term_current,
        "term_total": term_total,
        "recurrence_label": label,
        "recurrence_source": source,
        "recurrence_confidence": (
            Decimal(str(hint.confidence)) if hint.confidence is not None else None
        ),
    }


def validate_recurrence_fields(
    *,
    recurrence_kind: str,
    term_current: int | None,
    term_total: int | None,
) -> None:
    if recurrence_kind == "fixed_term" and term_total is None:
        raise ValueError("fixed-term recurrence requires term_total")
    if term_current is not None and term_total is not None and term_current > term_total:
        raise ValueError("term_current must be less than or equal to term_total")


def _parse_installment_label(label: str) -> tuple[int | None, int | None]:
    fraction_match = _INSTALLMENT_FRACTION_RE.search(label)
    if fraction_match:
        return int(fraction_match.group(1)), int(fraction_match.group(2))
    total_match = _INSTALLMENT_TOTAL_RE.search(label)
    if total_match:
        return None, int(total_match.group(1))
    return None, None


def _clean_label(label: str | None) -> str | None:
    if label is None:
        return None
    cleaned = " ".join(label.strip().split())
    return cleaned or None
