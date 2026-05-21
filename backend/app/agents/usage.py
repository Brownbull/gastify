"""Compatibility helpers for PydanticAI result usage objects."""

from __future__ import annotations

from typing import Any


def result_usage(result: object) -> Any:
    """Return usage from PydanticAI results across property/method API shapes."""
    usage = result.usage  # type: ignore[attr-defined]
    if callable(usage) and not hasattr(usage, "input_tokens"):
        return usage()
    return usage
