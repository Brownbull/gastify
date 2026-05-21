"""Tests for mobile push-token registration endpoints."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.user import MobilePushToken, OwnershipScope, User

TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


async def _tokens(engine) -> list[MobilePushToken]:
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        result = await session.execute(select(MobilePushToken).order_by(MobilePushToken.created_at))
        return list(result.scalars().all())


async def test_register_push_token_creates_scoped_enabled_token(client, engine):
    resp = await client.post(
        "/api/v1/push-tokens",
        json={
            "token": "ExponentPushToken[phase4]",
            "platform": "android",
            "provider": "expo",
            "permission_status": "granted",
            "device_id": "s23-rfcw90n4byp",
            "app_environment": "staging-e2e",
            "app_version": "0.0.0",
        },
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["token"] == "ExponentPushToken[phase4]"
    assert data["platform"] == "android"
    assert data["enabled"] is True

    rows = await _tokens(engine)
    assert len(rows) == 1
    assert rows[0].device_id == "s23-rfcw90n4byp"
    assert rows[0].app_environment == "staging-e2e"


async def test_register_push_token_upserts_existing_user_token(client, engine):
    body = {
        "token": "ExponentPushToken[phase4]",
        "platform": "android",
        "provider": "expo",
        "permission_status": "granted",
        "app_environment": "local",
    }
    first = await client.post("/api/v1/push-tokens", json=body)
    assert first.status_code == 201

    second = await client.post(
        "/api/v1/push-tokens",
        json={**body, "permission_status": "denied", "app_environment": "staging"},
    )

    assert second.status_code == 201
    assert second.json()["permission_status"] == "denied"
    rows = await _tokens(engine)
    assert len(rows) == 1
    assert rows[0].app_environment == "staging"
    assert rows[0].enabled is True


async def test_register_push_token_revokes_same_device_token_for_other_user(client, engine):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    other_scope_id = uuid.uuid4()
    other_user_id = uuid.uuid4()
    shared_token = "ExponentPushToken[shared-device]"
    now = datetime.now(UTC)
    async with session_factory() as session:
        session.add(OwnershipScope(id=other_scope_id, scope_type="individual"))
        session.add(
            User(
                id=other_user_id,
                firebase_uid="other-firebase-uid",
                email="other@example.com",
                display_name="Other User",
                ownership_scope_id=other_scope_id,
                default_currency="CLP",
                locale="es",
                created_at=now,
                updated_at=now,
            )
        )
        await session.flush()
        session.add(
            MobilePushToken(
                ownership_scope_id=other_scope_id,
                user_id=other_user_id,
                token=shared_token,
                platform="android",
                provider="expo",
                permission_status="granted",
                app_environment="staging-e2e",
                enabled=True,
                registered_at=now,
                last_seen_at=now,
            )
        )
        await session.commit()

    resp = await client.post(
        "/api/v1/push-tokens",
        json={
            "token": shared_token,
            "platform": "android",
            "provider": "expo",
            "permission_status": "granted",
        },
    )

    assert resp.status_code == 201
    async with session_factory() as session:
        result = await session.execute(
            select(MobilePushToken).where(MobilePushToken.token == shared_token)
        )
        rows = {row.user_id: row for row in result.scalars().all()}

    assert rows[TEST_USER_ID].enabled is True
    assert rows[other_user_id].enabled is False
    assert rows[other_user_id].revoked_at is not None


async def test_unregister_push_token_revokes_current_user_token(client, engine):
    await client.post(
        "/api/v1/push-tokens",
        json={
            "token": "ExponentPushToken[phase4]",
            "platform": "ios",
            "provider": "expo",
            "permission_status": "granted",
        },
    )

    resp = await client.post(
        "/api/v1/push-tokens/unregister",
        json={"token": "ExponentPushToken[phase4]"},
    )

    assert resp.status_code == 200
    assert resp.json() == {"revoked_count": 1}
    rows = await _tokens(engine)
    assert rows[0].enabled is False
    assert rows[0].revoked_at is not None


async def test_unregister_without_token_revokes_all_current_user_tokens(client):
    for token in ["ExponentPushToken[a]", "ExponentPushToken[b]"]:
        await client.post(
            "/api/v1/push-tokens",
            json={
                "token": token,
                "platform": "android",
                "provider": "expo",
                "permission_status": "granted",
            },
        )

    resp = await client.post("/api/v1/push-tokens/unregister", json={})

    assert resp.status_code == 200
    assert resp.json() == {"revoked_count": 2}


async def test_register_push_token_rejects_unknown_platform(client):
    resp = await client.post(
        "/api/v1/push-tokens",
        json={
            "token": "ExponentPushToken[phase4]",
            "platform": "web",
            "provider": "expo",
            "permission_status": "granted",
        },
    )

    assert resp.status_code == 422
