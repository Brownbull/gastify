"""Shared recurrence and fixed-term transaction contracts."""

from typing import Literal

from pydantic import BaseModel, Field, model_validator

RecurrenceKind = Literal["none", "fixed_term", "recurring", "unknown"]
RecurrenceInterval = Literal["monthly", "weekly", "biweekly", "annual", "custom", "unknown"]
RecurrenceSource = Literal["statement", "receipt", "user", "inferred", "none"]


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
