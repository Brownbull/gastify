"""Tests for RLS policies and credit balance initialization.

RLS policies are PostgreSQL-only (SQLite tests verify app-level scope filtering).
These tests verify:
1. App-level scope isolation with real cross-scope data (not phantom UUIDs)
2. Credit balance initialization on JIT provision
"""

import uuid

import pytest
import sqlalchemy as sa
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

SECOND_SCOPE_ID = uuid.UUID("00000000-0000-0000-0000-000000000099")


@pytest.fixture
async def other_scope_txn_id(engine) -> uuid.UUID:
    """Seed a second ownership scope with a real transaction."""
    txn_id = uuid.uuid4()
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        await session.execute(
            sa.text("INSERT INTO ownership_scopes (id, scope_type) VALUES (:sid, 'individual')"),
            {"sid": SECOND_SCOPE_ID.hex},
        )
        await session.execute(
            sa.text(
                "INSERT INTO transactions "
                "(id, ownership_scope_id, transaction_date, merchant, total_minor, currency) "
                "VALUES (:id, :scope, '2026-05-04', 'Other Scope Store', 5000, 'CLP')"
            ),
            {"id": txn_id.hex, "scope": SECOND_SCOPE_ID.hex},
        )
        await session.commit()
    return txn_id


class TestScopeIsolation:
    """Verify app-level ownership scope filtering with real cross-scope data."""

    async def test_transaction_scoped_to_owner(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "My Store",
                "total_minor": 5000,
                "currency": "CLP",
            },
        )
        assert resp.status_code == 201
        txn_id = resp.json()["id"]

        get_resp = await client.get(f"/api/v1/transactions/{txn_id}")
        assert get_resp.status_code == 200

    async def test_cannot_read_other_scope_transaction(
        self, client: AsyncClient, other_scope_txn_id: uuid.UUID
    ) -> None:
        """Scope A cannot read scope B's real transaction."""
        resp = await client.get(f"/api/v1/transactions/{other_scope_txn_id}")
        assert resp.status_code == 404

    async def test_cannot_update_other_scope_transaction(
        self, client: AsyncClient, other_scope_txn_id: uuid.UUID
    ) -> None:
        resp = await client.patch(
            f"/api/v1/transactions/{other_scope_txn_id}",
            json={"merchant": "Hacked"},
        )
        assert resp.status_code == 404

    async def test_cannot_delete_other_scope_transaction(
        self, client: AsyncClient, other_scope_txn_id: uuid.UUID
    ) -> None:
        resp = await client.delete(f"/api/v1/transactions/{other_scope_txn_id}")
        assert resp.status_code == 404

    async def test_batch_delete_ignores_other_scope(
        self, client: AsyncClient, other_scope_txn_id: uuid.UUID
    ) -> None:
        own_resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "My Store",
                "total_minor": 1000,
                "currency": "CLP",
            },
        )
        own_id = own_resp.json()["id"]

        resp = await client.post(
            "/api/v1/transactions/batch-delete",
            json={"transaction_ids": [own_id, str(other_scope_txn_id)]},
        )
        assert resp.status_code == 200
        assert resp.json()["count"] == 1

    async def test_batch_update_ignores_other_scope(
        self, client: AsyncClient, other_scope_txn_id: uuid.UUID
    ) -> None:
        own_resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "My Store",
                "total_minor": 1000,
                "currency": "CLP",
            },
        )
        own_id = own_resp.json()["id"]

        resp = await client.post(
            "/api/v1/transactions/batch-update",
            json={
                "transaction_ids": [own_id, str(other_scope_txn_id)],
                "updates": {"merchant": "Updated"},
            },
        )
        assert resp.status_code == 200
        assert resp.json()["count"] == 1

    async def test_list_excludes_other_scope(
        self, client: AsyncClient, other_scope_txn_id: uuid.UUID
    ) -> None:
        """Listing transactions should only return scope A's data."""
        resp = await client.get("/api/v1/transactions")
        assert resp.status_code == 200
        ids = [t["id"] for t in resp.json()["data"]]
        assert str(other_scope_txn_id) not in ids


class TestCreditBalanceInit:
    """Verify credit balance is created on JIT user provision."""

    async def test_jit_creates_credit_balance(self, jit_client: AsyncClient, engine) -> None:
        resp = await jit_client.get("/api/v1/transactions")
        assert resp.status_code == 200

        factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with factory() as session:
            result = await session.execute(
                sa.text("SELECT scan_credits FROM credit_balances LIMIT 1")
            )
            row = result.first()
            assert row is not None
            assert row[0] == 50

    async def test_jit_idempotent_provision(self, jit_client: AsyncClient) -> None:
        await jit_client.get("/api/v1/transactions")
        await jit_client.get("/api/v1/transactions")
        resp = await jit_client.get("/api/v1/transactions")
        assert resp.status_code == 200
