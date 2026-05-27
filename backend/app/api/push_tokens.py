"""Mobile push-token registration endpoints."""

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Annotated, Any, cast

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import Auth
from app.db import get_db
from app.models.user import MobilePushToken
from app.schemas.push_tokens import (
    PushTokenRegistration,
    PushTokenResponse,
    PushTokenUnregister,
    PushTokenUnregisterResponse,
)

router = APIRouter(prefix="/push-tokens", tags=["push tokens"])

DB = Annotated[AsyncSession, Depends(get_db)]

if TYPE_CHECKING:
    from sqlalchemy.engine import CursorResult


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PushTokenResponse)
async def register_push_token(
    body: PushTokenRegistration,
    auth: Auth,
    db: DB,
) -> PushTokenResponse:
    now = datetime.now(UTC)
    await db.execute(
        update(MobilePushToken)
        .where(
            MobilePushToken.token == body.token,
            MobilePushToken.user_id != auth.user_id,
            MobilePushToken.enabled.is_(True),
        )
        .values(enabled=False, revoked_at=now, updated_at=now)
    )

    result = await db.execute(
        select(MobilePushToken).where(
            MobilePushToken.user_id == auth.user_id,
            MobilePushToken.token == body.token,
        )
    )
    token = result.scalar_one_or_none()

    if token is None:
        token = MobilePushToken(
            ownership_scope_id=auth.ownership_scope_id,
            user_id=auth.user_id,
            token=body.token,
            provider=body.provider,
            platform=body.platform,
            device_id=body.device_id,
            app_environment=body.app_environment,
            app_version=body.app_version,
            permission_status=body.permission_status,
            enabled=True,
            registered_at=now,
            last_seen_at=now,
        )
        db.add(token)
    else:
        token.provider = body.provider
        token.platform = body.platform
        token.device_id = body.device_id
        token.app_environment = body.app_environment
        token.app_version = body.app_version
        token.permission_status = body.permission_status
        token.enabled = True
        token.last_seen_at = now
        token.revoked_at = None

    await db.commit()
    await db.refresh(token)
    return PushTokenResponse.model_validate(token)


@router.post("/unregister", response_model=PushTokenUnregisterResponse)
async def unregister_push_token(
    body: PushTokenUnregister,
    auth: Auth,
    db: DB,
) -> PushTokenUnregisterResponse:
    now = datetime.now(UTC)
    query = (
        update(MobilePushToken)
        .where(
            MobilePushToken.user_id == auth.user_id,
            MobilePushToken.enabled.is_(True),
        )
        .values(enabled=False, revoked_at=now, updated_at=now)
    )
    if body.token is not None:
        query = query.where(MobilePushToken.token == body.token)

    result = cast("CursorResult[Any]", await db.execute(query))
    await db.commit()

    return PushTokenUnregisterResponse(revoked_count=result.rowcount or 0)
