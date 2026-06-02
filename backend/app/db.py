import time
from collections.abc import AsyncGenerator

import structlog
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Session

from app.config import LOCAL_ENVIRONMENTS, Settings, settings
from app.observability import metrics

logger = structlog.get_logger()

engine = create_async_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_size=5,
    max_overflow=10,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Key under which a request's ownership scope is stashed on the session, so the
# per-transaction GUC event below can re-establish it after mid-request commits.
SCOPE_INFO_KEY = "ownership_scope_id"


@event.listens_for(Session, "after_begin")
def _reapply_ownership_scope_guc(session: Session, transaction: object, connection: object) -> None:
    """Re-establish app.ownership_scope_id at the start of EVERY transaction (P43).

    The RLS scope GUC is transaction-local (set_config ..., is_local=true). Any
    endpoint that commit()s mid-request and then runs another query would lose it,
    leaving RLS with no scope. This event sets it whenever a new transaction
    begins on the request's session — so the value survives across commits.
    Postgres only; the scope is read from session.info (set by the auth dep).
    """
    scope = session.info.get(SCOPE_INFO_KEY)
    if scope is None:
        return
    if connection.dialect.name != "postgresql":  # type: ignore[attr-defined]
        return
    connection.execute(  # type: ignore[attr-defined]
        text("SELECT set_config('app.ownership_scope_id', :sid, true)"),
        {"sid": str(scope)},
    )


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    start = time.monotonic()
    async with async_session() as session:
        wait_ms = (time.monotonic() - start) * 1000
        metrics.observe("db_pool_checkout_wait_ms", wait_ms)
        yield session


async def set_session_ownership_scope(session: AsyncSession, scope_id: object) -> None:
    """Establish the RLS scope GUC on a session created OUTSIDE the request flow.

    Background workers (e.g. the scan worker) open their own async_session() and
    never pass through the auth dependency, so they have no app.ownership_scope_id
    set — every INSERT into a scope-bound table is then rejected by the RLS
    WITH CHECK policy under the least-privilege role (P43). Call this with the
    known scope before writing. Stashes the scope on session.info so the
    after_begin event re-applies it across commits; Postgres only.
    """
    session.info[SCOPE_INFO_KEY] = scope_id
    if session.bind is not None and session.bind.dialect.name == "postgresql":
        await session.execute(
            text("SELECT set_config('app.ownership_scope_id', :sid, true)"),
            {"sid": str(scope_id)},
        )


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
