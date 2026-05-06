"""Tests for auth JIT user provisioning."""

from httpx import AsyncClient


class TestJITProvisioning:
    async def test_first_request_creates_user_and_scope(self, jit_client: AsyncClient) -> None:
        resp = await jit_client.get("/api/v1/transactions")
        assert resp.status_code == 200

    async def test_second_request_reuses_existing_user(self, jit_client: AsyncClient) -> None:
        resp1 = await jit_client.get("/api/v1/transactions")
        assert resp1.status_code == 200

        resp2 = await jit_client.get("/api/v1/transactions")
        assert resp2.status_code == 200

    async def test_jit_user_can_create_transaction(self, jit_client: AsyncClient) -> None:
        resp = await jit_client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Café Test",
                "total_minor": 3500,
                "currency": "CLP",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data

        list_resp = await jit_client.get("/api/v1/transactions")
        assert list_resp.status_code == 200
        assert len(list_resp.json()["data"]) == 1
