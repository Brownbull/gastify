from collections.abc import AsyncGenerator

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import LOCAL_ENVIRONMENTS, Settings, settings

logger = structlog.get_logger()

engine = create_async_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_size=5,
    max_overflow=10,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


def role_can_bypass_rls(rolsuper: bool, rolbypassrls: bool) -> bool:
    """True when a Postgres role ignores row-level-security entirely.

    Superusers and roles with BYPASSRLS are not subject to RLS policies even with
    FORCE ROW LEVEL SECURITY — so the app's tenant-isolation policies would be
    silently inert if the runtime connects as such a role (P43).
    """
    return bool(rolsuper or rolbypassrls)


async def assert_least_privilege_role(
    db_engine: AsyncEngine | None = None,
    app_settings: Settings | None = None,
) -> None:
    """Refuse to boot if the runtime DB role can bypass RLS (durable guard, P43).

    Skips the local lane and any non-Postgres (SQLite) backend, where roles/RLS
    don't apply. For Postgres in a deployed environment it queries pg_roles for
    the connected role and RAISES if it is superuser or has BYPASSRLS — so a
    misconfigured GASTIFY_DATABASE_URL (e.g. pointed back at `postgres`) can never
    silently re-disable RLS.
    """
    db_engine = db_engine or engine
    app_settings = app_settings or settings

    if app_settings.environment in LOCAL_ENVIRONMENTS:
        logger.info("rls_guard_skipped", reason="local_environment")
        return
    if db_engine.url.get_backend_name().startswith("sqlite"):
        logger.info("rls_guard_skipped", reason="sqlite_backend")
        return

    async with db_engine.connect() as conn:
        row = (
            await conn.execute(
                text(
                    "SELECT current_user, rolsuper, rolbypassrls "
                    "FROM pg_roles WHERE rolname = current_user"
                )
            )
        ).one()

    current_user, rolsuper, rolbypassrls = row[0], bool(row[1]), bool(row[2])
    if role_can_bypass_rls(rolsuper, rolbypassrls):
        raise RuntimeError(
            f"Runtime DB role '{current_user}' bypasses RLS "
            f"(rolsuper={rolsuper}, rolbypassrls={rolbypassrls}) — point "
            "GASTIFY_DATABASE_URL at a least-privilege role (P43)."
        )
    logger.info("rls_guard_passed", role=current_user)
