"""Tests for /api/v1/transactions endpoints."""

import uuid

import pytest
from httpx import AsyncClient


@pytest.fixture
async def seed_transaction(client: AsyncClient) -> str:
    """Create a transaction and return its ID."""
    resp = await client.post(
        "/api/v1/transactions",
        json={
            "transaction_date": "2026-05-04",
            "transaction_time": "14:30:00",
            "merchant": "Supermercado Líder",
            "total_minor": 15990,
            "currency": "CLP",
            "receipt_type": "manual",
            "country": "CL",
            "city": "Santiago",
            "items": [
                {
                    "name": "Leche Colun 1L",
                    "qty": 2.0,
                    "unit_price_minor": 1290,
                    "total_price_minor": 2580,
                    "category_source": "user",
                }
            ],
            "image_urls": ["https://example.com/receipt.jpg"],
        },
    )
    assert resp.status_code == 201
    return resp.json()["id"]


class TestCreateTransaction:
    async def test_create_minimal(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Café Central",
                "total_minor": 3500,
                "currency": "CLP",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data
        uuid.UUID(data["id"])

    async def test_create_with_items(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Líder",
                "total_minor": 5000,
                "currency": "CLP",
                "items": [
                    {"name": "Pan", "total_price_minor": 2000},
                    {"name": "Leche", "total_price_minor": 3000, "qty": 1.5},
                ],
            },
        )
        assert resp.status_code == 201

    async def test_create_with_images(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Farmacia",
                "total_minor": 8900,
                "currency": "CLP",
                "image_urls": [
                    "https://storage.example.com/img1.jpg",
                    "https://storage.example.com/img2.jpg",
                ],
            },
        )
        assert resp.status_code == 201


class TestGetTransaction:
    async def test_get_existing(self, client: AsyncClient, seed_transaction: str) -> None:
        resp = await client.get(f"/api/v1/transactions/{seed_transaction}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == seed_transaction
        assert data["merchant"] == "Supermercado Líder"
        assert data["total_minor"] == 15990
        assert data["currency"] == "CLP"
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "Leche Colun 1L"
        assert len(data["images"]) == 1
        assert data["images"][0]["is_thumbnail"] is True

    async def test_get_nonexistent(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.get(f"/api/v1/transactions/{fake_id}")
        assert resp.status_code == 404


class TestListTransactions:
    async def test_list_empty(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/transactions")
        assert resp.status_code == 200
        data = resp.json()
        assert data["data"] == []
        assert data["has_more"] is False

    async def test_list_with_data(self, client: AsyncClient, seed_transaction: str) -> None:
        resp = await client.get("/api/v1/transactions")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["id"] == seed_transaction
        assert data["data"][0]["item_count"] == 1

    async def test_list_pagination(self, client: AsyncClient) -> None:
        for i in range(3):
            await client.post(
                "/api/v1/transactions",
                json={
                    "transaction_date": f"2026-05-0{i + 1}",
                    "merchant": f"Store {i}",
                    "total_minor": 1000 * (i + 1),
                    "currency": "CLP",
                },
            )
        resp = await client.get("/api/v1/transactions?limit=2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 2
        assert data["has_more"] is True
        assert data["cursor"] is not None


class TestUpdateTransaction:
    async def test_update_merchant(self, client: AsyncClient, seed_transaction: str) -> None:
        resp = await client.patch(
            f"/api/v1/transactions/{seed_transaction}",
            json={"merchant": "Líder Express"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["merchant"] == "Líder Express"
        assert data["merchant_user_edited_at"] is not None

    async def test_update_items(self, client: AsyncClient, seed_transaction: str) -> None:
        get_resp = await client.get(f"/api/v1/transactions/{seed_transaction}")
        item_id = get_resp.json()["items"][0]["id"]

        resp = await client.patch(
            f"/api/v1/transactions/{seed_transaction}",
            json={
                "items": [{"id": item_id, "name": "Leche Soprole 1L", "total_price_minor": 1490}]
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"][0]["name"] == "Leche Soprole 1L"
        assert data["items"][0]["total_price_minor"] == 1490
        assert data["items"][0]["name_user_edited_at"] is not None

    async def test_update_nonexistent(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.patch(
            f"/api/v1/transactions/{fake_id}",
            json={"merchant": "Nope"},
        )
        assert resp.status_code == 404


class TestDeleteTransaction:
    async def test_delete_existing(self, client: AsyncClient, seed_transaction: str) -> None:
        resp = await client.delete(f"/api/v1/transactions/{seed_transaction}")
        assert resp.status_code == 204

        get_resp = await client.get(f"/api/v1/transactions/{seed_transaction}")
        assert get_resp.status_code == 404

    async def test_delete_nonexistent(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.delete(f"/api/v1/transactions/{fake_id}")
        assert resp.status_code == 404


class TestBatchOperations:
    async def test_batch_delete(self, client: AsyncClient) -> None:
        ids = []
        for i in range(3):
            resp = await client.post(
                "/api/v1/transactions",
                json={
                    "transaction_date": "2026-05-04",
                    "merchant": f"Store {i}",
                    "total_minor": 1000,
                    "currency": "CLP",
                },
            )
            ids.append(resp.json()["id"])

        resp = await client.post(
            "/api/v1/transactions/batch-delete",
            json={"transaction_ids": ids[:2]},
        )
        assert resp.status_code == 200
        assert resp.json()["count"] == 2

        list_resp = await client.get("/api/v1/transactions")
        assert len(list_resp.json()["data"]) == 1

    async def test_batch_update(self, client: AsyncClient) -> None:
        ids = []
        for i in range(2):
            resp = await client.post(
                "/api/v1/transactions",
                json={
                    "transaction_date": "2026-05-04",
                    "merchant": f"Store {i}",
                    "total_minor": 1000,
                    "currency": "CLP",
                },
            )
            ids.append(resp.json()["id"])

        resp = await client.post(
            "/api/v1/transactions/batch-update",
            json={
                "transaction_ids": ids,
                "updates": {"merchant": "Updated Store"},
            },
        )
        assert resp.status_code == 200
        assert resp.json()["count"] == 2
