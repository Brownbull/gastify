from pathlib import Path
from typing import Annotated

from alembic.config import Config
from alembic.script import ScriptDirectory
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import DEPLOYED_ENVIRONMENTS, settings
from app.db import get_db

router = APIRouter(tags=["health"])

DB = Annotated[AsyncSession, Depends(get_db)]


def _compute_alembic_head() -> str | None:
    try:
        backend_dir = Path(__file__).resolve().parents[2]
        alembic_config = Config(str(backend_dir / "alembic.ini"))
        alembic_config.set_main_option("script_location", str(backend_dir / "alembic"))
        return ScriptDirectory.from_config(alembic_config).get_current_head()
    except Exception:
        return None


_ALEMBIC_HEAD: str | None = _compute_alembic_head()


@router.get("/health")
async def liveness() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness(db: DB) -> dict[str, str | None]:
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        return {
            "status": "unhealthy",
            "database": "unreachable",
            "migration_status": None,
            "migration_current": None,
            "migration_head": None,
        }

    migration_current, migration_head = await _migration_versions(db)
    migration_status = _migration_status(migration_current, migration_head)
    if settings.environment in DEPLOYED_ENVIRONMENTS and migration_status != "current":
        return {
            "status": "unhealthy",
            "database": "connected",
            "migration_status": migration_status,
            "migration_current": migration_current,
            "migration_head": migration_head,
        }

    return {
        "status": "ok",
        "database": "connected",
        "migration_status": migration_status,
        "migration_current": migration_current,
        "migration_head": migration_head,
    }


async def _migration_versions(db: AsyncSession) -> tuple[str | None, str | None]:
    current: str | None = None
    try:
        result = await db.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
        current = result.scalar_one_or_none()
    except Exception:
        current = None

    return current, _ALEMBIC_HEAD


def _migration_status(current: str | None, head: str | None) -> str:
    if current is None:
        return "not_configured"
    if head is None:
        return "unknown"
    return "current" if current == head else "behind"
