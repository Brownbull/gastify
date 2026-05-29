import uuid
from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.models.reference import ItemCategory, StoreCategory
from app.models.transaction import Transaction, TransactionItem, TransactionItemFlag
from app.models.user import OwnershipScope
from app.reference.categories import V4_ITEM_CATEGORY_TAXONOMY, V4_STORE_CATEGORY_TAXONOMY
from app.services.insights import (
    MonthlyInsightsCache,
    build_monthly_insights_from_seed,
    get_monthly_insights,
)
from app.services.insights_fixtures import (
    P6_INSIGHTS_SEED_CORPUS,
    P6_MARCH_EXPECTED_INSIGHTS,
    P6_PRIMARY_SCOPE_ID,
)
from tests.conftest import TEST_USER_ID

_API_SCOPE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
_API_OTHER_SCOPE_ID = uuid.UUID("00000000-0000-0000-0000-000000006102")
_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def _store_id(key: str) -> uuid.UUID:
    return uuid.uuid5(_NS, f"test.p6.store.{key}")


def _item_id(key: str) -> uuid.UUID:
    return uuid.uuid5(_NS, f"test.p6.item.{key}")


def test_seed_engine_matches_locked_march_expected_insights():
    response = build_monthly_insights_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=date(2026, 3, 1),
    )

    assert response == P6_MARCH_EXPECTED_INSIGHTS


def test_seed_engine_returns_empty_period_without_false_gravity_centers():
    response = build_monthly_insights_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=date(2026, 4, 1),
    )

    assert response.total_spend_minor == 0
    assert response.transaction_count == 0
    assert response.item_count == 0
    assert response.top_transaction_categories == []
    assert response.top_item_categories == []
    assert response.gravity_centers == []


def test_seed_engine_keeps_secondary_scope_out_of_primary_rollups():
    response = build_monthly_insights_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=date(2026, 3, 1),
    )

    assert response.top_transaction_categories[0].category_key == "Supermarket"
    assert response.top_transaction_categories[0].total_minor == 180_000
    assert all(row.total_minor < 999_999 for row in response.top_transaction_categories)


@pytest.mark.asyncio
async def test_monthly_insights_api_returns_owner_scoped_seeded_rollups(client, engine):
    await _seed_p6_database(engine)

    response = await client.get("/api/v1/insights/monthly?period=2026-03&currency=CLP")

    assert response.status_code == 200
    payload = response.json()
    assert payload["schema_version"] == "monthly-insights.v1"
    assert payload["period_start"] == "2026-03-01"
    assert payload["period_end"] == "2026-03-31"
    assert payload["total_spend_minor"] == 276_500
    assert payload["transaction_count"] == 7
    assert [row["category_key"] for row in payload["top_transaction_categories"]] == [
        "Supermarket",
        "Restaurant",
        "GasStation",
        "SubscriptionService",
        "BookStore",
    ]
    assert [row["category_key"] for row in payload["top_item_categories"]] == [
        "MeatSeafood",
        "Snacks",
        "PreparedFood",
        "Pantry",
        "Produce",
    ]
    assert [(row["category_key"], row["direction"]) for row in payload["gravity_centers"]] == [
        ("Supermarket", "growth"),
        ("Snacks", "growth"),
        ("ServiceCharge", "shrink"),
    ]
    assert payload["excluded_items"] == [
        {"flag_kind": "special_case", "total_minor": 35_000, "currency": "CLP", "item_count": 1}
    ]


@pytest.mark.asyncio
async def test_item_flag_api_excludes_item_from_monthly_insights(client, engine):
    await _seed_p6_database(engine)
    transaction_id, item_id = await _march_restaurant_item_ids(engine)

    flag_response = await client.put(
        f"/api/v1/transactions/{transaction_id}/items/{item_id}/flags",
        json={"flags": ["special_case"]},
    )
    assert flag_response.status_code == 200
    flagged_item = flag_response.json()["items"][0]
    assert flagged_item["flags"] == ["special_case"]
    assert flagged_item["is_flagged"] is True

    response = await client.get("/api/v1/insights/monthly?period=2026-03&currency=CLP")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_spend_minor"] == 231_500
    assert payload["excluded_items"] == [
        {"flag_kind": "special_case", "total_minor": 80_000, "currency": "CLP", "item_count": 2}
    ]
    assert "PreparedFood" not in [row["category_key"] for row in payload["top_item_categories"]]


@pytest.mark.asyncio
async def test_monthly_insights_excludes_urgency_flagged_item(engine):
    """Urgency flags exclude an item under their own flag_kind, not special_case.

    Engine-level (fresh cache) so this does not collide with the module-global
    insights cache used by the special_case API test in the same process.
    """
    await _seed_p6_database(engine)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as db:
        row = await db.execute(
            select(Transaction)
            .options(selectinload(Transaction.items))
            .where(
                Transaction.merchant == "La Picada",
                Transaction.transaction_date == date(2026, 3, 11),
            )
            .limit(1)
        )
        transaction = row.scalar_one()
        db.add(
            TransactionItemFlag(
                ownership_scope_id=_API_SCOPE_ID,
                transaction_item_id=transaction.items[0].id,
                user_id=TEST_USER_ID,
                flag_kind="urgency",
            )
        )
        await db.commit()

        result = await get_monthly_insights(
            db,
            ownership_scope_id=_API_SCOPE_ID,
            user_id=TEST_USER_ID,
            period_start=date(2026, 3, 1),
            currency="CLP",
            cache=MonthlyInsightsCache(),
        )

    assert result.total_spend_minor == 231_500
    excluded = {row.flag_kind: row for row in result.excluded_items}
    assert excluded["urgency"].total_minor == 45_000
    assert excluded["urgency"].item_count == 1
    # The legacy is_flagged pharmacy item stays excluded under special_case.
    assert excluded["special_case"].total_minor == 35_000
    assert excluded["special_case"].item_count == 1
    assert "PreparedFood" not in [row.category_key for row in result.top_item_categories]


@pytest.mark.asyncio
async def test_monthly_insights_cache_fingerprint_reflects_transaction_changes(engine):
    await _seed_p6_database(engine)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    cache = MonthlyInsightsCache()

    async with factory() as db:
        initial = await get_monthly_insights(
            db,
            ownership_scope_id=_API_SCOPE_ID,
            period_start=date(2026, 3, 1),
            currency="CLP",
            cache=cache,
        )
        row = await db.execute(
            select(Transaction)
            .options(selectinload(Transaction.items))
            .where(
                Transaction.merchant == "La Picada",
                Transaction.transaction_date == date(2026, 3, 11),
            )
            .limit(1)
        )
        transaction = row.scalar_one()
        transaction.total_minor += 5_000
        transaction.items[0].total_price_minor += 5_000
        await db.commit()

        updated = await get_monthly_insights(
            db,
            ownership_scope_id=_API_SCOPE_ID,
            period_start=date(2026, 3, 1),
            currency="CLP",
            cache=cache,
        )

    assert initial.total_spend_minor == 276_500
    assert updated.total_spend_minor == 281_500
    assert updated.top_transaction_categories[1].category_key == "Restaurant"
    assert updated.top_transaction_categories[1].total_minor == 50_000


@pytest.mark.asyncio
async def test_monthly_insights_cache_fingerprint_reflects_item_flag_changes(engine):
    await _seed_p6_database(engine)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    cache = MonthlyInsightsCache()

    async with factory() as db:
        initial = await get_monthly_insights(
            db,
            ownership_scope_id=_API_SCOPE_ID,
            user_id=TEST_USER_ID,
            period_start=date(2026, 3, 1),
            currency="CLP",
            cache=cache,
        )
        row = await db.execute(
            select(Transaction)
            .options(selectinload(Transaction.items))
            .where(
                Transaction.merchant == "La Picada",
                Transaction.transaction_date == date(2026, 3, 11),
            )
            .limit(1)
        )
        transaction = row.scalar_one()
        db.add(
            TransactionItemFlag(
                ownership_scope_id=_API_SCOPE_ID,
                transaction_item_id=transaction.items[0].id,
                user_id=TEST_USER_ID,
                flag_kind="special_case",
            )
        )
        await db.commit()

        updated = await get_monthly_insights(
            db,
            ownership_scope_id=_API_SCOPE_ID,
            user_id=TEST_USER_ID,
            period_start=date(2026, 3, 1),
            currency="CLP",
            cache=cache,
        )

    assert initial.total_spend_minor == 276_500
    assert updated.total_spend_minor == 231_500
    assert updated.excluded_items[0].total_minor == 80_000


async def _march_restaurant_item_ids(engine) -> tuple[uuid.UUID, uuid.UUID]:
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        row = await db.execute(
            select(Transaction)
            .options(selectinload(Transaction.items))
            .where(
                Transaction.merchant == "La Picada",
                Transaction.transaction_date == date(2026, 3, 11),
            )
            .limit(1)
        )
        transaction = row.scalar_one()
        return transaction.id, transaction.items[0].id


async def _seed_p6_database(engine) -> None:
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        db.add(OwnershipScope(id=_API_OTHER_SCOPE_ID, scope_type="individual"))
        await _seed_reference_categories(db)
        await db.flush()
        await _seed_fixture_transactions(db)
        await db.commit()


async def _seed_reference_categories(db: AsyncSession) -> None:
    for category in V4_STORE_CATEGORY_TAXONOMY:
        db.add(
            StoreCategory(
                id=_store_id(category.key),
                key=category.key,
                level=category.level,
                parent_id=_store_id(category.parent_key) if category.parent_key else None,
                display_labels=dict(category.display_labels),
                is_sensitive=category.is_sensitive,
                sort_order=category.sort_order,
            )
        )
    for category in V4_ITEM_CATEGORY_TAXONOMY:
        db.add(
            ItemCategory(
                id=_item_id(category.key),
                key=category.key,
                level=category.level,
                parent_id=_item_id(category.parent_key) if category.parent_key else None,
                display_labels=dict(category.display_labels),
                is_sensitive=category.is_sensitive,
                sort_order=category.sort_order,
            )
        )


async def _seed_fixture_transactions(db: AsyncSession) -> None:
    for row in P6_INSIGHTS_SEED_CORPUS:
        scope_id = (
            _API_SCOPE_ID if row.ownership_scope_id == P6_PRIMARY_SCOPE_ID else _API_OTHER_SCOPE_ID
        )
        transaction = Transaction(
            id=uuid.uuid5(_NS, f"test.p6.transaction.{row.fixture_id}"),
            ownership_scope_id=scope_id,
            transaction_date=row.transaction_date,
            merchant=row.merchant,
            store_category_id=_store_id(row.store_category_key),
            store_category_source=row.store_category_source,
            total_minor=row.analytics_total_minor,
            currency=row.reporting_currency,
            amount_usd_minor=row.amount_usd_minor,
            receipt_type=row.receipt_type,
        )
        db.add(transaction)
        for index, item in enumerate(row.items):
            db.add(
                TransactionItem(
                    id=uuid.uuid5(_NS, f"test.p6.item-row.{row.fixture_id}.{index}"),
                    transaction_id=transaction.id,
                    name=item.name,
                    total_price_minor=item.analytics_total_minor,
                    item_category_id=_item_id(item.item_category_key),
                    category_source="user" if item.flag_kind else "ai",
                    is_flagged=item.flag_kind is not None,
                    sort_order=index,
                )
            )
