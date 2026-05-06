from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db

router = APIRouter(tags=["health"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/health")
async def liveness() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness(db: DB) -> dict[str, str]:
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        return {"status": "unhealthy", "database": "unreachable"}
    return {"status": "ok", "database": "connected"}
