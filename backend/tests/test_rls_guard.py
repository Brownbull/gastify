"""Unit tests for the RLS least-privilege boot guard (P43; Gustify D32 parity).

The Postgres raise-path (real superuser/non-super roles) is integration-verified
against a live Postgres in test_rls_postgres.py and on staging. These tests cover
the pure decision function + the no-database skip paths.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.db import assert_least_privilege_role, role_can_bypass_rls


class TestRoleCanBypassRls:
    def test_plain_role_does_not_bypass(self) -> None:
        assert role_can_bypass_rls(False, False) is False

    def test_superuser_bypasses(self) -> None:
        assert role_can_bypass_rls(True, False) is True

    def test_bypassrls_attr_bypasses(self) -> None:
        assert role_can_bypass_rls(False, True) is True

    def test_both_bypasses(self) -> None:
        assert role_can_bypass_rls(True, True) is True


def _settings(environment: str) -> MagicMock:
    s = MagicMock()
    s.environment = environment
    return s


def _engine(backend: str) -> MagicMock:
    eng = MagicMock()
    eng.url.get_backend_name.return_value = backend
    return eng


@pytest.mark.asyncio
async def test_guard_skips_local_environment() -> None:
    """Local lane has no DB roles — guard is a no-op and never touches the engine."""
    eng = _engine("postgresql")
    await assert_least_privilege_role(eng, _settings("local"))
    eng.connect.assert_not_called()


@pytest.mark.asyncio
async def test_guard_skips_sqlite_backend() -> None:
    """SQLite (tests/dev) has no roles/RLS — skip without querying."""
    eng = _engine("sqlite")
    await assert_least_privilege_role(eng, _settings("staging"))
    eng.connect.assert_not_called()
