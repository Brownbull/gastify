"""Unit tests for the DB role-split bootstrap (P43).

The full provisioning + RLS-isolation path is proven against a live Postgres in
test_rls_postgres.py and the deploy runbook. These tests cover the guard rails
that run without a database: the no-op skip paths and the unsafe-identifier
rejection.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.bootstrap_db import _current_db, ensure_app_role


@pytest.mark.asyncio
async def test_noop_without_admin_url() -> None:
    """No admin URL (local/dev/CI) — bootstrap is a clean no-op, never connects."""
    with patch("app.bootstrap_db.settings") as s, patch("asyncpg.connect") as connect:
        s.database_admin_url = None
        s.app_db_role = "gastify_app"
        s.app_db_password = "pw"
        await ensure_app_role()
        connect.assert_not_called()


@pytest.mark.asyncio
async def test_noop_with_sqlite_admin_url() -> None:
    """A non-postgres admin URL also skips (defensive)."""
    with patch("app.bootstrap_db.settings") as s, patch("asyncpg.connect") as connect:
        s.database_admin_url = "sqlite+aiosqlite:///x.db"
        s.app_db_role = "gastify_app"
        s.app_db_password = "pw"
        await ensure_app_role()
        connect.assert_not_called()


@pytest.mark.asyncio
async def test_noop_without_app_role() -> None:
    """Admin URL set but no app role configured — still a no-op."""
    with patch("app.bootstrap_db.settings") as s, patch("asyncpg.connect") as connect:
        s.database_admin_url = "postgresql://postgres@host:5432/db"
        s.app_db_role = None
        s.app_db_password = None
        await ensure_app_role()
        connect.assert_not_called()


@pytest.mark.asyncio
async def test_rejects_unsafe_role_identifier() -> None:
    """Role names are interpolated into DDL — reject anything not alnum/underscore."""
    with patch("app.bootstrap_db.settings") as s, patch("asyncpg.connect") as connect:
        s.database_admin_url = "postgresql://postgres@host:5432/db"
        s.app_db_role = "evil; DROP TABLE users;--"
        s.app_db_password = "pw"
        with pytest.raises(ValueError, match="Unsafe app_db_role"):
            await ensure_app_role()
        connect.assert_not_called()


def test_current_db_parses_name() -> None:
    assert _current_db("postgresql://u:p@host:5432/gastify") == "gastify"
    assert _current_db("postgresql://u:p@host:5432/gastify?sslmode=require") == "gastify"
