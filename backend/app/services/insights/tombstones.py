"""Group-stat tombstone reads + writes — void (never recompute) group-period
aggregates whose underlying shared data was erased (D82).

The insights entry points call :func:`voided_periods` before display and short-
circuit to a void notice when a requested month is tombstoned; the erasure /
group-leave-delete flows call :func:`tombstone_group_period` to mark a group-period
void. A voided figure is gone, not adjusted — the underlying group copies are left
in place (D74 content-lock) but their statistics are shut down.
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import select

from app.models.group_stat_tombstone import GROUP_STAT_VOID_REASONS, GroupStatTombstone

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession


def period_key(value: date) -> str:
    """Canonical zero-padded ``YYYY-MM`` month key for a date."""
    return f"{value.year:04d}-{value.month:02d}"


def months_in_range(start: date, end: date) -> list[str]:
    """Every ``YYYY-MM`` month key touched by ``[start, end]`` inclusive."""
    keys: list[str] = []
    cursor = date(start.year, start.month, 1)
    last = date(end.year, end.month, 1)
    while cursor <= last:
        keys.append(period_key(cursor))
        cursor = (
            date(cursor.year + 1, 1, 1)
            if cursor.month == 12
            else date(cursor.year, cursor.month + 1, 1)
        )
    return keys


async def voided_periods(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> dict[str, str]:
    """``{"YYYY-MM": reason}`` for every tombstone in ``[start_date, end_date]``.

    Empty for personal scopes (they are never tombstoned). ``period`` is a zero-
    padded month string, so a lexicographic range over the month keys is the same
    as a chronological one.
    """
    start_key = period_key(start_date)
    end_key = period_key(end_date)
    rows = await db.execute(
        select(GroupStatTombstone.period, GroupStatTombstone.reason).where(
            GroupStatTombstone.ownership_scope_id == ownership_scope_id,
            GroupStatTombstone.period >= start_key,
            GroupStatTombstone.period <= end_key,
        )
    )
    return {period: reason for period, reason in rows}


def void_reason_for(voided: dict[str, str]) -> str | None:
    """The single reason to surface for a (possibly multi-month) void.

    ``account_deleted`` dominates ``member_removed_data`` — a total-erasure void is
    the stronger statement. ``None`` when nothing is voided.
    """
    if not voided:
        return None
    reasons = set(voided.values())
    if "account_deleted" in reasons:
        return "account_deleted"
    return sorted(reasons)[0]


async def tombstone_group_period(
    db: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
    period: str,
    reason: str,
) -> bool:
    """Mark one ``(group scope, month)`` VOID — idempotent.

    Returns ``True`` if a new tombstone was inserted, ``False`` if the group-period
    was already tombstoned (the existing reason wins). Does NOT commit. The caller
    owns the RLS GUC: under Postgres FORCE RLS the session must already be swapped
    to ``ownership_scope_id`` so the insert's ``WITH CHECK`` matches the GUC.
    """
    if reason not in GROUP_STAT_VOID_REASONS:
        raise ValueError(f"invalid group-stat void reason: {reason!r}")
    existing = await db.scalar(
        select(GroupStatTombstone.id).where(
            GroupStatTombstone.ownership_scope_id == ownership_scope_id,
            GroupStatTombstone.period == period,
        )
    )
    if existing is not None:
        return False
    db.add(
        GroupStatTombstone(
            ownership_scope_id=ownership_scope_id,
            period=period,
            reason=reason,
        )
    )
    await db.flush()
    return True
