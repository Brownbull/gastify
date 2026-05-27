"""Statement prompt-lab field provenance artifacts."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.schemas.statement import StatementExtractionOutput


def build_statement_field_provenance(
    *,
    raw: StatementExtractionOutput | None,
    processed: StatementExtractionOutput | None,
    source: str,
) -> dict[str, Any]:
    line_sources: list[dict[str, Any]] = []
    if processed is not None:
        for line in processed.lines:
            normalization = _line_normalization(raw, line.source_order, line.amount_minor)
            line_sources.append(
                {
                    "source_order": line.source_order,
                    "date_source": source,
                    "description_source": source,
                    "amount_source": (
                        "statement_coalesce_current_installment_candidate"
                        if normalization.get("amount_minor_changed")
                        else source
                    ),
                    "amount_selection_reason_source": source,
                    "amount_candidate_count": len(line.amount_candidates),
                    "currency_source": source,
                    "line_type_source": source,
                    "amount_correction_source": (
                        "statement_coalesce_candidate"
                        if normalization.get("amount_minor_changed")
                        else None
                    ),
                    "normalization": normalization,
                }
            )
    return {
        "document_type": "credit_card_statement",
        "source": source,
        "raw_available": raw is not None,
        "processed_available": processed is not None,
        "statement_fields": {
            "issuer": source,
            "period_start": source,
            "period_end": source,
            "closing_date": source,
            "due_date": source,
            "currency": source,
            "totals": source,
            "card_alias_candidate": source,
        },
        "line_sources": line_sources,
        "privacy": {
            "raw_statement_text_included": False,
            "raw_pdf_bytes_included": False,
            "passwords_included": False,
            "decrypted_pdf_written": False,
        },
    }


def _line_normalization(
    raw: StatementExtractionOutput | None,
    source_order: int,
    processed_amount_minor: int,
) -> dict[str, Any]:
    if raw is None or source_order > len(raw.lines):
        return {"source_order_changed": None, "amount_minor_changed": None}
    raw_line = raw.lines[source_order - 1]
    return {
        "source_order_changed": raw_line.source_order != source_order,
        "raw_source_order": raw_line.source_order,
        "amount_minor_changed": raw_line.amount_minor != processed_amount_minor,
        "raw_amount_minor": raw_line.amount_minor,
        "processed_amount_minor": processed_amount_minor,
    }
