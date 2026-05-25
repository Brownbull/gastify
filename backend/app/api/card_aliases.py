"""Alias-only card CRUD endpoints."""

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import Auth
from app.db import get_db
from app.models.statement import CardAlias
from app.schemas.card_alias import CardAliasCreate, CardAliasResponse, CardAliasUpdate

router = APIRouter(prefix="/card-aliases", tags=["card aliases"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[CardAliasResponse])
async def list_card_aliases(
    auth: Auth,
    db: DB,
    include_archived: bool = Query(default=False),
) -> list[CardAliasResponse]:
    query = (
        select(CardAlias)
        .where(CardAlias.ownership_scope_id == auth.ownership_scope_id)
        .order_by(CardAlias.created_at, CardAlias.id)
    )
    if not include_archived:
        query = query.where(CardAlias.archived_at.is_(None))

    result = await db.execute(query)
    return [CardAliasResponse.model_validate(alias) for alias in result.scalars().all()]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CardAliasResponse)
async def create_card_alias(
    body: CardAliasCreate,
    auth: Auth,
    db: DB,
) -> CardAliasResponse:
    await _assert_active_name_available(db, auth.ownership_scope_id, body.name)
    alias = CardAlias(ownership_scope_id=auth.ownership_scope_id, name=body.name)
    db.add(alias)
    await db.commit()
    await db.refresh(alias)
    return CardAliasResponse.model_validate(alias)


@router.get("/{alias_id}", response_model=CardAliasResponse)
async def get_card_alias(
    alias_id: UUID,
    auth: Auth,
    db: DB,
) -> CardAliasResponse:
    alias = await _get_owned_alias(db, auth.ownership_scope_id, alias_id)
    return CardAliasResponse.model_validate(alias)


@router.patch("/{alias_id}", response_model=CardAliasResponse)
async def update_card_alias(
    alias_id: UUID,
    body: CardAliasUpdate,
    auth: Auth,
    db: DB,
) -> CardAliasResponse:
    alias = await _get_owned_alias(db, auth.ownership_scope_id, alias_id)
    if alias.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card alias not found")

    update_data = body.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] is not None:
        await _assert_active_name_available(
            db,
            auth.ownership_scope_id,
            update_data["name"],
            exclude_id=alias.id,
        )
        alias.name = update_data["name"]

    await db.commit()
    await db.refresh(alias)
    return CardAliasResponse.model_validate(alias)


@router.delete("/{alias_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_card_alias(
    alias_id: UUID,
    auth: Auth,
    db: DB,
) -> None:
    alias = await _get_owned_alias(db, auth.ownership_scope_id, alias_id)
    if alias.archived_at is None:
        alias.archived_at = datetime.now(UTC)
        await db.commit()


async def _get_owned_alias(
    db: AsyncSession,
    ownership_scope_id: UUID,
    alias_id: UUID,
) -> CardAlias:
    result = await db.execute(
        select(CardAlias).where(
            CardAlias.id == alias_id,
            CardAlias.ownership_scope_id == ownership_scope_id,
        )
    )
    alias = result.scalar_one_or_none()
    if alias is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card alias not found")
    return alias


async def _assert_active_name_available(
    db: AsyncSession,
    ownership_scope_id: UUID,
    name: str,
    *,
    exclude_id: UUID | None = None,
) -> None:
    query = select(CardAlias.id).where(
        CardAlias.ownership_scope_id == ownership_scope_id,
        CardAlias.archived_at.is_(None),
        func.lower(CardAlias.name) == name.lower(),
    )
    if exclude_id is not None:
        query = query.where(CardAlias.id != exclude_id)

    existing = await db.execute(query)
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Card alias name already exists",
        )
