"""Shared test fixtures — in-process async SQLite for isolation."""

import uuid
from collections.abc import AsyncGenerator
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth.deps import AuthContext, get_auth_context
from app.auth.firebase import FirebaseUser, get_current_user
from app.db import Base, get_db
from app.main import app
from app.models import *  # noqa: F401,F403 — register all models

TEST_SCOPE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


@pytest.fixture
async def engine():
    eng = create_async_engine("sqlite+aiosqlite://", echo=False)

    @event.listens_for(eng.sync_engine, "connect")
    def _enable_fk(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()

    async with eng.begin() as conn:
        await conn.run_sync(_create_tables)
        await conn.execute(
            sa.text(
                "INSERT INTO currencies (code, exponent, display_labels) VALUES "
                "('CLP', 0, '{\"es\": \"Peso Chileno\"}'), "
                "('USD', 2, '{\"es\": \"Dólar\"}'), "
                "('EUR', 2, '{\"es\": \"Euro\"}')"
            )
        )
        await conn.execute(
            sa.text(
                "INSERT INTO ownership_scopes (id, scope_type) VALUES (:scope_id, 'individual')"
            ),
            {"scope_id": TEST_SCOPE_ID.hex},
        )

    yield eng
    await eng.dispose()


def _create_tables(connection):
    """Create tables without server defaults that SQLite can't handle."""
    for table in Base.metadata.sorted_tables:
        for col in table.columns:
            if col.server_default is not None:
                sd = col.server_default
                if (
                    hasattr(sd, "arg")
                    and hasattr(sd.arg, "name")
                    and "gen_random_uuid" in str(sd.arg)
                ):
                    col.server_default = None
    Base.metadata.create_all(connection)


@event.listens_for(Base, "init", propagate=True)
def _auto_uuid(target, args, kwargs):
    """Auto-generate UUIDs for primary keys when not provided."""
    from sqlalchemy import inspect as sa_inspect

    mapper = sa_inspect(type(target))
    for col in mapper.columns:
        if col.primary_key and col.type.__class__.__name__ == "Uuid":
            attr_name = col.key
            if (attr_name not in kwargs or kwargs[attr_name] is None) and getattr(
                target, attr_name, None
            ) is None:
                setattr(target, attr_name, uuid.uuid4())


@pytest.fixture(autouse=True)
def _mock_external_fx():
    """Prevent real FX API calls in tests. Individual tests can override."""
    with patch(
        "app.services.fx._fetch_external_rate",
        new_callable=AsyncMock,
        return_value=Decimal("0.00105"),
    ):
        yield


@pytest.fixture
def mock_auth_context() -> AuthContext:
    from app.models.user import User

    user = User(
        id=TEST_USER_ID,
        firebase_uid="test-firebase-uid",
        email="test@example.com",
        display_name="Test User",
        ownership_scope_id=TEST_SCOPE_ID,
        default_currency="CLP",
        locale="es",
    )
    return AuthContext(user=user, ownership_scope_id=TEST_SCOPE_ID)


@pytest.fixture
async def client(engine, mock_auth_context) -> AsyncGenerator[AsyncClient, None]:
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    async def override_auth() -> AuthContext:
        return mock_auth_context

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_auth_context] = override_auth

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def jit_client(engine) -> AsyncGenerator[AsyncClient, None]:
    """Client that exercises the real auth JIT path with a mocked Firebase user."""
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    async def mock_firebase_user() -> FirebaseUser:
        return FirebaseUser(uid="jit-test-uid", email="jit@example.com", name="JIT User")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = mock_firebase_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
