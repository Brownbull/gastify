"""Sortable prompt-lab run identifiers."""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path


def next_serial_run_id(
    parent: Path,
    label: str,
    *,
    now: datetime | None = None,
) -> str:
    """Return a lexicographically sortable run id unique within ``parent``.

    Format: ``YYYYMMDDTHHMMSSZ-001-label``. The timestamp keeps runs grouped by
    creation time, while the serial handles several runs launched in the same
    second under the same artifact parent.
    """
    timestamp = (now or datetime.now(UTC)).astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")
    serial = _next_serial(parent, timestamp)
    return f"{timestamp}-{serial:03d}-{slug_run_id(label)}"


def slug_run_id(value: str) -> str:
    """Normalize user-facing labels for filesystem run folder names."""
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-") or "run"


def _next_serial(parent: Path, timestamp: str) -> int:
    if not parent.exists():
        return 1
    pattern = re.compile(rf"^{re.escape(timestamp)}-(\d{{3,}})(?:-|$)")
    serials = [
        int(match.group(1))
        for child in parent.iterdir()
        if child.is_dir() and (match := pattern.match(child.name))
    ]
    return max(serials, default=0) + 1
