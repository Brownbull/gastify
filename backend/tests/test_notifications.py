"""Notifications API tests — user-global feed (Phase 7, GET/PATCH/POST/DELETE
/api/v1/notifications, D78).

Covers create-on-event (the scan terminal hook resolving the personal-scope owner
and inserting), list newest-first, the unread filter, mark-read, mark-all-read,
unread-count, delete (204), cursor pagination, and the user-scoping: user A never
sees user B's notifications, and marking a foreign notification read is 404
(anti-enumeration). SQLite has no RLS; cross-tenant ISOLATION is proven generically
in test_rls_postgres.py — here the app-layer ``user_id == auth.user_id`` filter is
the SQLite-provable analog (and what produces the 404).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.notification import Notification
from app.services import notifications as notif_service
from tests.conftest import TEST_SCOPE_ID, TEST_USER_ID
from tests.test_groups import _acting_as, _make_auth, _seed_user

_BASE = datetime(2026, 6, 1, 12, 0, 0, tzinfo=UTC)


def _sf(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture
def user_a(engine):
    """User A (id=TEST_USER_ID, scope=TEST_SCOPE_ID) is already seeded by conftest's
    engine fixture, so notifications FK resolves and owner-resolution
    (users.ownership_scope_id → user) finds them. This fixture just names the
    dependency for readability."""
    return TEST_USER_ID, TEST_SCOPE_ID


async def _seed_notification(
    engine,
    *,
    user_id=TEST_USER_ID,
    scope_id=TEST_SCOPE_ID,
    kind="scan_complete",
    title="Boleta escaneada",
    body=None,
    data=None,
    read_at=None,
    created_at=_BASE,
) -> uuid.UUID:
    async with _sf(engine)() as s:
        n = Notification(
            ownership_scope_id=scope_id,
            user_id=user_id,
            kind=kind,
            title=title,
            body=body,
            data=data,
            read_at=read_at,
            created_at=created_at,
        )
        s.add(n)
        await s.flush()
        nid = n.id
        await s.commit()
        return nid


async def _all(engine) -> list[Notification]:
    async with _sf(engine)() as s:
        rows = await s.execute(select(Notification).order_by(Notification.created_at))
        return list(rows.scalars().all())


# --- create-on-event (the scan terminal hook) ---


async def test_notify_scan_terminal_creates_for_scope_owner(client, engine, user_a):
    """notify_scan_terminal resolves the personal-scope owner and inserts; the feed
    then lists it. Drives the hook via the service fn (not a full scan)."""
    with patch.object(notif_service, "async_session", _sf(engine)):
        await notif_service.notify_scan_terminal(
            ownership_scope_id=TEST_SCOPE_ID,
            scan_id=uuid.uuid4(),
            transaction_id=uuid.uuid4(),
            needs_review=False,
        )
        await notif_service.notify_scan_terminal(
            ownership_scope_id=TEST_SCOPE_ID,
            scan_id=uuid.uuid4(),
            transaction_id=uuid.uuid4(),
            needs_review=True,
        )

    rows = await _all(engine)
    assert {n.kind for n in rows} == {"scan_complete", "scan_needs_review"}
    assert all(n.user_id == TEST_USER_ID and n.read_at is None for n in rows)
    assert all(n.data and "transaction_id" in n.data for n in rows)

    resp = await client.get("/api/v1/notifications")
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"][0]["kind"] in {"scan_complete", "scan_needs_review"}


async def test_notify_unknown_scope_owner_is_skipped_not_raised(client, engine, user_a):
    """A scope with no personal owner (e.g. a group context) is skipped, not an error."""
    with patch.object(notif_service, "async_session", _sf(engine)):
        await notif_service.notify_scan_terminal(
            ownership_scope_id=uuid.uuid4(),  # no users row points here
            scan_id=uuid.uuid4(),
            transaction_id=uuid.uuid4(),
            needs_review=False,
        )
    assert await _all(engine) == []


# --- list / order / filter ---


async def test_lists_newest_first(client, engine, user_a):
    await _seed_notification(engine, title="old", created_at=_BASE)
    await _seed_notification(engine, title="new", created_at=_BASE + timedelta(hours=2))

    data = (await client.get("/api/v1/notifications")).json()["data"]
    assert [n["title"] for n in data] == ["new", "old"]
    assert all(n["read_at"] is None for n in data)


async def test_unread_filter(client, engine, user_a):
    await _seed_notification(engine, title="read", read_at=_BASE)
    await _seed_notification(engine, title="unread", created_at=_BASE + timedelta(hours=1))

    data = (await client.get("/api/v1/notifications", params={"unread": True})).json()["data"]
    assert [n["title"] for n in data] == ["unread"]


async def test_cursor_pagination(client, engine, user_a):
    for i in range(3):
        await _seed_notification(engine, title=f"n{i}", created_at=_BASE + timedelta(hours=i))

    page1 = (await client.get("/api/v1/notifications", params={"limit": 2})).json()
    assert len(page1["data"]) == 2 and page1["has_more"] is True
    page2 = (
        await client.get("/api/v1/notifications", params={"limit": 2, "cursor": page1["cursor"]})
    ).json()
    assert len(page2["data"]) == 1 and page2["has_more"] is False
    seen = {n["title"] for n in page1["data"]} | {n["title"] for n in page2["data"]}
    assert seen == {"n0", "n1", "n2"}


async def test_malformed_cursor_degrades_to_first_page(client, engine, user_a):
    """An opaque cursor is server-issued; a corrupted/stale one returns the first
    page (200), never a 500 (datetime.fromisoformat / UUID would otherwise raise)."""
    await _seed_notification(engine, title="only")
    for bad in ("garbage", "garbage|garbage", "2026|not-a-uuid"):
        resp = await client.get("/api/v1/notifications", params={"cursor": bad})
        assert resp.status_code == 200, f"cursor={bad!r} -> {resp.status_code}"
        assert [n["title"] for n in resp.json()["data"]] == ["only"]


# --- mutations ---


async def test_mark_read(client, engine, user_a):
    nid = await _seed_notification(engine)
    resp = await client.patch(f"/api/v1/notifications/{nid}/read")
    assert resp.status_code == 200, resp.text
    assert resp.json()["read_at"] is not None
    # now excluded from the unread filter
    unread = (await client.get("/api/v1/notifications", params={"unread": True})).json()
    assert unread["data"] == []


async def test_mark_all_read(client, engine, user_a):
    await _seed_notification(engine, created_at=_BASE)
    await _seed_notification(engine, created_at=_BASE + timedelta(hours=1))

    resp = await client.post("/api/v1/notifications/mark-all-read")
    assert resp.status_code == 200
    assert resp.json()["count"] == 2
    assert (await client.get("/api/v1/notifications", params={"unread": True})).json()["data"] == []


async def test_unread_count(client, engine, user_a):
    await _seed_notification(engine, read_at=_BASE)
    await _seed_notification(engine, created_at=_BASE + timedelta(hours=1))
    await _seed_notification(engine, created_at=_BASE + timedelta(hours=2))

    assert (await client.get("/api/v1/notifications/unread-count")).json()["count"] == 2


async def test_delete_returns_204(client, engine, user_a):
    nid = await _seed_notification(engine)
    resp = await client.delete(f"/api/v1/notifications/{nid}")
    assert resp.status_code == 204
    assert (await client.get("/api/v1/notifications")).json()["data"] == []


# --- user scoping (the SQLite-provable analog of RLS isolation) ---


async def test_user_a_cannot_see_user_b_notifications(client, engine, user_a):
    b_user, b_scope = await _seed_user(engine, "b")
    await _seed_notification(engine, user_id=b_user, scope_id=b_scope, title="B-only")
    await _seed_notification(engine, title="A-only")

    a_titles = {n["title"] for n in (await client.get("/api/v1/notifications")).json()["data"]}
    assert a_titles == {"A-only"}

    with _acting_as(_make_auth(b_user, b_scope)):
        b_titles = {n["title"] for n in (await client.get("/api/v1/notifications")).json()["data"]}
    assert b_titles == {"B-only"}


async def test_mark_read_foreign_notification_is_404(client, engine, user_a):
    b_user, b_scope = await _seed_user(engine, "b")
    b_nid = await _seed_notification(engine, user_id=b_user, scope_id=b_scope)

    # A (the client) tries to mark B's notification read → 404, not 403.
    assert (await client.patch(f"/api/v1/notifications/{b_nid}/read")).status_code == 404
    assert (await client.delete(f"/api/v1/notifications/{b_nid}")).status_code == 404
