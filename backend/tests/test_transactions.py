"""Tests for /api/v1/transactions endpoints."""

import uuid
from datetime import date
from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.transaction import Transaction, TransactionItem, TransactionItemFlag
from app.models.user import OwnershipScope, User

TEST_SCOPE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
OTHER_SCOPE_ID = uuid.UUID("00000000-0000-0000-0000-000000000102")
OTHER_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000202")


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
                    {"name": "Leche", "total_price_minor": 3000, "qty": 2},
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

    async def test_create_with_fixed_term_recurrence(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Installment Store",
                "total_minor": 12000,
                "currency": "CLP",
                "recurrence_kind": "fixed_term",
                "recurrence_interval": "monthly",
                "term_current": 3,
                "term_total": 12,
                "recurrence_label": "03/12 cuotas",
                "recurrence_source": "statement",
                "recurrence_confidence": "0.90",
            },
        )
        assert resp.status_code == 201

        detail = await client.get(f"/api/v1/transactions/{resp.json()['id']}")
        assert detail.status_code == 200
        data = detail.json()
        assert data["recurrence_kind"] == "fixed_term"
        assert data["recurrence_interval"] == "monthly"
        assert data["term_current"] == 3
        assert data["term_total"] == 12
        assert data["recurrence_label"] == "03/12 cuotas"
        assert data["recurrence_source"] == "statement"
        assert data["recurrence_confidence"] == "0.90"
        assert data["recurrence_user_edited_at"] is None


class TestGetTransaction:
    async def test_get_existing(self, client: AsyncClient, seed_transaction: str) -> None:
        resp = await client.get(f"/api/v1/transactions/{seed_transaction}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == seed_transaction
        assert data["merchant"] == "Supermercado Líder"
        assert data["total_minor"] == 15990
        assert data["currency"] == "CLP"
        assert data["scan_review_level"] == "none"
        assert data["scan_review_signals"] == []
        assert data["recurrence_kind"] == "none"
        assert data["recurrence_source"] == "none"
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "Leche Colun 1L"
        assert len(data["images"]) == 1
        assert data["images"][0]["is_thumbnail"] is True

    async def test_get_nonexistent(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.get(f"/api/v1/transactions/{fake_id}")
        assert resp.status_code == 404

    async def test_get_exposes_persisted_scan_review_signals(
        self,
        client: AsyncClient,
        engine,
    ) -> None:
        signal = {
            "code": "item_structure_changed",
            "severity": "warning",
            "source_stage": "postprocess",
            "message": "Post-processing changed the receipt item structure.",
            "details": {"raw_item_count": 1, "processed_item_count": 2},
        }
        session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        async with session_factory() as session:
            txn = Transaction(
                ownership_scope_id=TEST_SCOPE_ID,
                transaction_date=date(2026, 5, 20),
                merchant="Scan Store",
                total_minor=5000,
                currency="CLP",
                receipt_type="scan",
                scan_review_level="warning",
                scan_review_signals=[signal],
            )
            session.add(txn)
            await session.commit()
            txn_id = str(txn.id)

        detail = await client.get(f"/api/v1/transactions/{txn_id}")
        assert detail.status_code == 200
        assert detail.json()["scan_review_level"] == "warning"
        assert detail.json()["scan_review_signals"] == [signal]

        listing = await client.get("/api/v1/transactions")
        assert listing.status_code == 200
        assert listing.json()["data"][0]["scan_review_level"] == "warning"


class TestCreateTransactionUSD:
    async def test_create_usd_no_fx(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Amazon US",
                "total_minor": 4999,
                "currency": "USD",
            },
        )
        assert resp.status_code == 201
        txn_id = resp.json()["id"]

        get_resp = await client.get(f"/api/v1/transactions/{txn_id}")
        data = get_resp.json()
        assert data["amount_usd_minor"] == 4999
        assert data["fx_rate_to_usd"] is None

    async def test_create_unknown_currency(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Store XYZ",
                "total_minor": 1000,
                "currency": "ZZZ",
            },
        )
        assert resp.status_code == 422
        assert "Unknown currency" in resp.json()["detail"]


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
        assert data["data"][0]["scan_review_level"] == "none"

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

    async def test_list_cursor_page_two(self, client: AsyncClient) -> None:
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
        page1 = await client.get("/api/v1/transactions?limit=2")
        cursor = page1.json()["cursor"]
        assert cursor is not None

        page2 = await client.get(f"/api/v1/transactions?limit=2&cursor={cursor}")
        assert page2.status_code == 200
        data = page2.json()
        assert len(data["data"]) == 1
        assert data["has_more"] is False

    async def test_list_filter_date_from(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-01",
                "merchant": "Old Store",
                "total_minor": 1000,
                "currency": "CLP",
            },
        )
        await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-05",
                "merchant": "New Store",
                "total_minor": 2000,
                "currency": "CLP",
            },
        )
        resp = await client.get("/api/v1/transactions?date_from=2026-05-03")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["merchant"] == "New Store"

    async def test_list_filter_date_to(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-01",
                "merchant": "Early Store",
                "total_minor": 1000,
                "currency": "CLP",
            },
        )
        await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-10",
                "merchant": "Late Store",
                "total_minor": 2000,
                "currency": "CLP",
            },
        )
        resp = await client.get("/api/v1/transactions?date_to=2026-05-05")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["merchant"] == "Early Store"

    async def test_list_filter_merchant(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Supermercado Líder",
                "total_minor": 1000,
                "currency": "CLP",
            },
        )
        await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Farmacia Cruz Verde",
                "total_minor": 2000,
                "currency": "CLP",
            },
        )
        resp = await client.get("/api/v1/transactions?merchant=Líder")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 1

    async def test_list_filter_currency(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Store CLP",
                "total_minor": 1000,
                "currency": "CLP",
            },
        )
        await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Store USD",
                "total_minor": 2000,
                "currency": "USD",
            },
        )
        resp = await client.get("/api/v1/transactions?currency=USD")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["merchant"] == "Store USD"

    async def test_list_filter_card_alias(self, client: AsyncClient, engine) -> None:
        session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        async with session_factory() as session:
            session.add_all(
                [
                    Transaction(
                        ownership_scope_id=TEST_SCOPE_ID,
                        transaction_date=date(2026, 5, 4),
                        merchant="Card Store",
                        total_minor=1000,
                        currency="CLP",
                        alias="Santander Visa",
                    ),
                    Transaction(
                        ownership_scope_id=TEST_SCOPE_ID,
                        transaction_date=date(2026, 5, 4),
                        merchant="Cash Store",
                        total_minor=2000,
                        currency="CLP",
                        alias="Banco Estado Debit",
                    ),
                ]
            )
            await session.commit()

        resp = await client.get("/api/v1/transactions?card_alias=visa")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["merchant"] == "Card Store"


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

    async def test_update_money_fields_fx_recalc(
        self, client: AsyncClient, seed_transaction: str
    ) -> None:
        resp = await client.patch(
            f"/api/v1/transactions/{seed_transaction}",
            json={"total_minor": 20000},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_minor"] == 20000
        assert data["amount_usd_minor"] is not None

    async def test_update_to_usd_clears_fx(self, client: AsyncClient) -> None:
        create_resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Store",
                "total_minor": 5000,
                "currency": "CLP",
            },
        )
        txn_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/api/v1/transactions/{txn_id}",
            json={"currency": "USD", "total_minor": 5000},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["amount_usd_minor"] == 5000
        assert data["fx_rate_to_usd"] is None

    async def test_update_multiple_fields(self, client: AsyncClient, seed_transaction: str) -> None:
        resp = await client.patch(
            f"/api/v1/transactions/{seed_transaction}",
            json={
                "merchant": "New Name",
                "receipt_type": "scan",
                "country": "US",
                "city": "Miami",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["merchant"] == "New Name"
        assert data["receipt_type"] == "scan"
        assert data["country"] == "US"
        assert data["city"] == "Miami"

    async def test_update_transaction_date(
        self, client: AsyncClient, seed_transaction: str
    ) -> None:
        resp = await client.patch(
            f"/api/v1/transactions/{seed_transaction}",
            json={"transaction_date": "2026-06-01"},
        )
        assert resp.status_code == 200
        assert resp.json()["transaction_date"] == "2026-06-01"

    async def test_update_recurrence_marks_user_source(
        self, client: AsyncClient, seed_transaction: str
    ) -> None:
        resp = await client.patch(
            f"/api/v1/transactions/{seed_transaction}",
            json={
                "recurrence_kind": "recurring",
                "recurrence_interval": "monthly",
                "recurrence_label": "Internet mensual",
                "recurrence_confidence": "0.75",
            },
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["recurrence_kind"] == "recurring"
        assert data["recurrence_interval"] == "monthly"
        assert data["recurrence_label"] == "Internet mensual"
        assert data["recurrence_source"] == "user"
        assert data["recurrence_user_edited_at"] is not None


class TestTransactionItemFlags:
    async def test_update_item_flags_are_visible_and_clearable(
        self,
        client: AsyncClient,
        seed_transaction: str,
    ) -> None:
        get_resp = await client.get(f"/api/v1/transactions/{seed_transaction}")
        assert get_resp.status_code == 200
        item_id = get_resp.json()["items"][0]["id"]
        assert get_resp.json()["items"][0]["flags"] == []
        assert get_resp.json()["items"][0]["is_flagged"] is False

        flag_resp = await client.put(
            f"/api/v1/transactions/{seed_transaction}/items/{item_id}/flags",
            json={"flags": ["special_case"]},
        )
        assert flag_resp.status_code == 200
        flagged_item = flag_resp.json()["items"][0]
        assert flagged_item["flags"] == ["special_case"]
        assert flagged_item["is_flagged"] is True

        detail_resp = await client.get(f"/api/v1/transactions/{seed_transaction}")
        assert detail_resp.status_code == 200
        assert detail_resp.json()["items"][0]["flags"] == ["special_case"]

        replace_resp = await client.put(
            f"/api/v1/transactions/{seed_transaction}/items/{item_id}/flags",
            json={"flags": ["urgency", "urgency"]},
        )
        assert replace_resp.status_code == 200
        assert replace_resp.json()["items"][0]["flags"] == ["urgency"]

        clear_resp = await client.put(
            f"/api/v1/transactions/{seed_transaction}/items/{item_id}/flags",
            json={"flags": []},
        )
        assert clear_resp.status_code == 200
        cleared_item = clear_resp.json()["items"][0]
        assert cleared_item["flags"] == []
        assert cleared_item["is_flagged"] is False

    async def test_update_item_flags_rejects_unknown_item(
        self,
        client: AsyncClient,
        seed_transaction: str,
    ) -> None:
        response = await client.put(
            f"/api/v1/transactions/{seed_transaction}/items/{uuid.uuid4()}/flags",
            json={"flags": ["special_case"]},
        )

        assert response.status_code == 404

    async def test_update_item_flags_is_owner_scoped(self, client: AsyncClient, engine) -> None:
        session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        async with session_factory() as session:
            session.add(OwnershipScope(id=OTHER_SCOPE_ID, scope_type="individual"))
            await session.flush()
            transaction = Transaction(
                ownership_scope_id=OTHER_SCOPE_ID,
                transaction_date=date(2026, 5, 4),
                merchant="Other Scope Store",
                total_minor=1000,
                currency="CLP",
            )
            session.add(transaction)
            await session.flush()
            item = TransactionItem(
                transaction_id=transaction.id,
                name="Other scope item",
                total_price_minor=1000,
            )
            session.add(item)
            await session.commit()
            transaction_id = transaction.id
            item_id = item.id

        response = await client.put(
            f"/api/v1/transactions/{transaction_id}/items/{item_id}/flags",
            json={"flags": ["special_case"]},
        )

        assert response.status_code == 404

    async def test_detail_only_exposes_current_users_item_flags(
        self,
        client: AsyncClient,
        engine,
        seed_transaction: str,
    ) -> None:
        get_resp = await client.get(f"/api/v1/transactions/{seed_transaction}")
        assert get_resp.status_code == 200
        item_id = uuid.UUID(get_resp.json()["items"][0]["id"])

        session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        async with session_factory() as session:
            session.add(
                User(
                    id=OTHER_USER_ID,
                    firebase_uid="other-flag-user",
                    email="other@example.com",
                    display_name="Other User",
                    default_currency="CLP",
                    locale="es",
                    ownership_scope_id=TEST_SCOPE_ID,
                )
            )
            await session.flush()
            session.add(
                TransactionItemFlag(
                    ownership_scope_id=TEST_SCOPE_ID,
                    transaction_item_id=item_id,
                    user_id=OTHER_USER_ID,
                    flag_kind="special_case",
                )
            )
            await session.commit()

        other_flag_detail = await client.get(f"/api/v1/transactions/{seed_transaction}")
        assert other_flag_detail.status_code == 200
        assert other_flag_detail.json()["items"][0]["flags"] == []
        assert other_flag_detail.json()["items"][0]["is_flagged"] is False

        own_flag_resp = await client.put(
            f"/api/v1/transactions/{seed_transaction}/items/{item_id}/flags",
            json={"flags": ["urgency"]},
        )
        assert own_flag_resp.status_code == 200
        assert own_flag_resp.json()["items"][0]["flags"] == ["urgency"]

        # Write-path isolation: the caller's flag replace must NOT touch a
        # co-scope member's private flags on the same item.
        async with session_factory() as session:
            surviving = await session.execute(
                select(TransactionItemFlag).where(
                    TransactionItemFlag.transaction_item_id == item_id,
                    TransactionItemFlag.user_id == OTHER_USER_ID,
                )
            )
            other_flags = surviving.scalars().all()
        assert [flag.flag_kind for flag in other_flags] == ["special_case"]

    def test_item_flags_migration_defines_rls_for_scope_bound_table(self) -> None:
        migration = Path("alembic/versions/022_transaction_item_user_flags.py")
        content = migration.read_text(encoding="utf-8")

        assert "transaction_item_flags" in content
        assert "ENABLE ROW LEVEL SECURITY" in content
        assert "FORCE ROW LEVEL SECURITY" in content
        assert "current_setting('app.ownership_scope_id')::uuid" in content


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
    async def test_batch_delete_empty(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/transactions/batch-delete",
            json={"transaction_ids": []},
        )
        assert resp.status_code == 200
        assert resp.json()["count"] == 0

    async def test_batch_update_empty_ids(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/transactions/batch-update",
            json={"transaction_ids": [], "updates": {"merchant": "X"}},
        )
        assert resp.status_code == 200
        assert resp.json()["count"] == 0

    async def test_batch_update_empty_updates(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Store",
                "total_minor": 1000,
                "currency": "CLP",
            },
        )
        txn_id = resp.json()["id"]
        resp = await client.post(
            "/api/v1/transactions/batch-update",
            json={"transaction_ids": [txn_id], "updates": {}},
        )
        assert resp.status_code == 200
        assert resp.json()["count"] == 0

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
