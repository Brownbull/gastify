"""Drill-down tree engine tests (D69 — GET /insights/tree).

The 4-level store cross-walk (Industry -> Store-type -> Item-family -> Item) and
the 2-level item tree are cross-checked against the locked monthly engine so leaf
totals roll up to the same post-exclusion ``total_spend_minor`` as the dashboard.
March 2026 of the P6 fixture corpus is fully itemized, so the cross-walk children
reconcile exactly to their store-type parents.
"""

from dataclasses import replace
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.reference.categories import V4_ITEM_CATEGORY_TAXONOMY, V4_STORE_CATEGORY_TAXONOMY
from app.schemas.insights import InsightsTreeNode
from app.services.insights import (
    _TAXONOMY_VERSION_TOKEN,
    _database_fingerprint,
    _taxonomy_fingerprint,
    build_insights_tree_from_seed,
    build_monthly_insights_from_seed,
)
from app.services.insights_fixtures import (
    P6_INSIGHTS_SEED_CORPUS,
    P6_PRIMARY_SCOPE_ID,
    P6_SECONDARY_SCOPE_ID,
)
from tests.conftest import TEST_SCOPE_ID
from tests.test_insights_engine import _seed_p6_database

_MARCH = date(2026, 3, 1)


def _store_tree():
    return build_insights_tree_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=_MARCH,
        dimension="transaction_category",
    )


def _item_tree():
    return build_insights_tree_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=_MARCH,
        dimension="item_category",
    )


def _child(node: InsightsTreeNode, key: str) -> InsightsTreeNode:
    for child in node.children:
        if child.key == key:
            return child
    raise AssertionError(f"{key!r} not among {[child.key for child in node.children]}")


def test_store_tree_roots_are_industries_summing_to_total():
    tree = _store_tree()

    assert tree.schema_version == "insights-tree.v1"
    assert tree.dimension == "transaction_category"
    assert tree.currency == "CLP"
    assert tree.period_start == date(2026, 3, 1)
    assert tree.period_end == date(2026, 3, 31)
    assert tree.total_spend_minor == 276_500

    assert all(node.level == 1 for node in tree.roots)
    assert {node.key for node in tree.roots} == {
        "SupermarketsIndustry",
        "RestaurantsIndustry",
        "ServicesFinanceIndustry",
        "TransportVehicleIndustry",
        "SpecialtyStoresIndustry",
    }
    # Roots cover every CLP peso of included spend.
    assert sum(node.total_minor for node in tree.roots) == tree.total_spend_minor
    # Ranked by spend, descending.
    assert [node.total_minor for node in tree.roots] == sorted(
        (node.total_minor for node in tree.roots), reverse=True
    )

    top = tree.roots[0]
    assert top.key == "SupermarketsIndustry"
    assert top.label == "Supermarkets"
    assert top.total_minor == 180_000
    assert str(top.share_of_total_percent) == "65.10"
    assert top.parent_key is None


def test_store_cross_walk_nests_item_families_under_store_type():
    tree = _store_tree()
    supermarket = _child(tree.roots[0], "Supermarket")

    assert supermarket.level == 2
    assert supermarket.parent_key == "SupermarketsIndustry"
    assert supermarket.label == "Supermarket"
    assert supermarket.total_minor == 180_000
    assert supermarket.transaction_count == 2
    assert supermarket.item_count == 4

    # L3 item families are nested under the store-type (the cross-walk edge),
    # ordered by spend then label (the 90k tie breaks on "Fresh Food").
    assert [child.key for child in supermarket.children] == ["FreshFood", "PackagedFood"]
    fresh = _child(supermarket, "FreshFood")
    packaged = _child(supermarket, "PackagedFood")
    assert fresh.level == 3
    assert fresh.parent_key == "Supermarket"
    assert fresh.label == "Fresh Food"
    assert fresh.total_minor == 90_000  # Produce 30k + Meat and Seafood 60k
    assert packaged.total_minor == 90_000  # Snacks 50k + Pantry 40k
    # Fully itemized month: L3 children reconcile exactly to the L2 store-type.
    assert sum(child.total_minor for child in supermarket.children) == supermarket.total_minor

    # L4 items under FreshFood, ranked, carrying the family as their tree parent.
    assert [
        (child.key, child.total_minor, child.level, child.parent_key) for child in fresh.children
    ] == [
        ("MeatSeafood", 60_000, 4, "FreshFood"),
        ("Produce", 30_000, 4, "FreshFood"),
    ]
    assert [(child.key, child.total_minor) for child in packaged.children] == [
        ("Snacks", 50_000),
        ("Pantry", 40_000),
    ]


def test_store_tree_store_totals_match_monthly_transaction_rollups():
    tree = _store_tree()
    monthly = build_monthly_insights_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=_MARCH,
    )

    store_totals = {
        store.key: store.total_minor for industry in tree.roots for store in industry.children
    }
    for rollup in monthly.top_transaction_categories:
        assert store_totals[rollup.category_key] == rollup.total_minor


def test_item_tree_is_two_levels_family_to_item():
    tree = _item_tree()

    assert tree.dimension == "item_category"
    assert tree.total_spend_minor == 276_500
    assert all(node.level == 3 for node in tree.roots)
    assert all(child.level == 4 for node in tree.roots for child in node.children)
    assert sum(node.total_minor for node in tree.roots) == tree.total_spend_minor

    by_key = {node.key: node for node in tree.roots}
    fresh = by_key["FreshFood"]
    assert fresh.total_minor == 90_000
    assert [(child.key, child.total_minor) for child in fresh.children] == [
        ("MeatSeafood", 60_000),
        ("Produce", 30_000),
    ]
    services = by_key["ServicesFeesFamily"]
    assert services.total_minor == 42_000  # Subscription 18k + Service Charge 24k
    assert [(child.key, child.total_minor) for child in services.children] == [
        ("ServiceCharge", 24_000),
        ("Subscription", 18_000),
    ]


def test_flagged_items_are_excluded_from_the_tree():
    store_tree = _store_tree()
    item_tree = _item_tree()

    # Pharmacy's only item (Medications, special_case) is excluded, so the whole
    # health branch is absent and the 35,000 peso medication is not in the total.
    assert "HealthWellnessIndustry" not in {node.key for node in store_tree.roots}
    assert "HealthPersonalCareFamily" not in {node.key for node in item_tree.roots}
    assert store_tree.total_spend_minor == 276_500


def test_tree_isolates_ownership_scopes_both_directions():
    primary = _store_tree()
    secondary = build_insights_tree_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_SECONDARY_SCOPE_ID,
        period_start=_MARCH,
        dimension="transaction_category",
    )

    # The secondary scope's lone 999,999 March supermarket row must not leak in,
    # and the secondary tree must contain only its own row.
    assert primary.total_spend_minor == 276_500
    assert secondary.total_spend_minor == 999_999
    assert {node.key for node in secondary.roots} == {"SupermarketsIndustry"}


def test_non_reporting_currency_returns_an_empty_tree():
    tree = build_insights_tree_from_seed(
        P6_INSIGHTS_SEED_CORPUS,
        ownership_scope_id=P6_PRIMARY_SCOPE_ID,
        period_start=_MARCH,
        currency="USD",  # seed reporting currency is CLP
        dimension="transaction_category",
    )

    assert tree.currency == "USD"
    assert tree.total_spend_minor == 0
    assert tree.roots == []


def test_taxonomy_fingerprint_is_order_independent_and_remap_sensitive():
    full = (*V4_STORE_CATEGORY_TAXONOMY, *V4_ITEM_CATEGORY_TAXONOMY)

    assert _taxonomy_fingerprint(full) == _TAXONOMY_VERSION_TOKEN
    # Order-independent: reordering the taxonomy does not bust the cache.
    assert _taxonomy_fingerprint(tuple(reversed(full))) == _TAXONOMY_VERSION_TOKEN
    # A genuine remap (re-parenting one category) changes the token (D69 HIGH).
    remapped = (replace(full[0], parent_key="DeliberatelyDifferentParent"), *full[1:])
    assert _taxonomy_fingerprint(remapped) != _TAXONOMY_VERSION_TOKEN


async def test_database_fingerprint_carries_the_taxonomy_token(engine):
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        fingerprint = await _database_fingerprint(
            db,
            ownership_scope_id=TEST_SCOPE_ID,
            user_id=None,
            start_date=date(2026, 3, 1),
            end_date=date(2026, 3, 31),
        )

    assert fingerprint.endswith(_TAXONOMY_VERSION_TOKEN)


async def test_tree_api_returns_owner_scoped_store_cross_walk(engine, client):
    await _seed_p6_database(engine)

    response = await client.get(
        "/api/v1/insights/tree",
        params={"period": "2026-03", "dimension": "transaction_category", "currency": "CLP"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["schema_version"] == "insights-tree.v1"
    assert body["dimension"] == "transaction_category"
    assert body["total_spend_minor"] == 276_500

    roots = {node["key"]: node for node in body["roots"]}
    industry = roots["SupermarketsIndustry"]
    assert industry["total_minor"] == 180_000
    # Decimal share is serialized as a JSON string (the web/mobile clients parse it).
    assert isinstance(industry["share_of_total_percent"], str)

    supermarket = next(child for child in industry["children"] if child["key"] == "Supermarket")
    fresh = next(child for child in supermarket["children"] if child["key"] == "FreshFood")
    meat = next(child for child in fresh["children"] if child["key"] == "MeatSeafood")
    assert meat["total_minor"] == 60_000
    assert meat["level"] == 4
    assert meat["parent_key"] == "FreshFood"
    assert meat["children"] == []


async def test_tree_api_item_dimension_is_two_levels(engine, client):
    await _seed_p6_database(engine)

    response = await client.get(
        "/api/v1/insights/tree",
        params={"period": "2026-03", "dimension": "item_category", "currency": "CLP"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["dimension"] == "item_category"
    roots = {node["key"]: node for node in body["roots"]}
    assert roots["FreshFood"]["level"] == 3
    assert roots["FreshFood"]["total_minor"] == 90_000
    assert all(child["level"] == 4 for child in roots["FreshFood"]["children"])
