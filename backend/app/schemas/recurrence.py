"""Shared recurrence and fixed-term transaction contracts."""

from typing import Literal, cast

from pydantic import BaseModel, Field, model_validator

RecurrenceKind = Literal["none", "fixed_term", "recurring", "unknown"]
RecurrenceInterval = Literal["monthly", "weekly", "biweekly", "annual", "custom", "unknown"]
RecurrenceSource = Literal["statement", "receipt", "user", "inferred", "none"]

RECURRENCE_KINDS = frozenset({"none", "fixed_term", "recurring", "unknown"})
RECURRENCE_INTERVALS = frozenset({"monthly", "weekly", "biweekly", "annual", "custom", "unknown"})
RECURRENCE_SOURCES = frozenset({"statement", "receipt", "user", "inferred", "none"})


def as_recurrence_kind(value: str) -> RecurrenceKind:
    if value not in RECURRENCE_KINDS:
        raise ValueError(f"invalid recurrence kind: {value}")
    return cast("RecurrenceKind", value)


def as_recurrence_interval(value: str | None) -> RecurrenceInterval | None:
    if value is None:
        return None
    if value not in RECURRENCE_INTERVALS:
        raise ValueError(f"invalid recurrence interval: {value}")
    return cast("RecurrenceInterval", value)


def as_recurrence_source(value: str) -> RecurrenceSource:
    if value not in RECURRENCE_SOURCES:
        raise ValueError(f"invalid recurrence source: {value}")
    return cast("RecurrenceSource", value)


class RecurrenceHint(BaseModel):
    """AI/provider hint for a transaction recurrence or fixed-term payment."""

    kind: RecurrenceKind = "none"
    interval: RecurrenceInterval | None = None
    term_current: int | None = Field(default=None, ge=1)
    term_total: int | None = Field(default=None, ge=1)
    label: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)

    @model_validator(mode="after")
    def _validate_term_order(self) -> "RecurrenceHint":
        if (
            self.term_current is not None
            and self.term_total is not None
            and self.term_current > self.term_total
        ):
            raise ValueError("term_current must be less than or equal to term_total")
        return self
