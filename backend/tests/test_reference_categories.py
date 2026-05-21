import pytest

from app.reference.categories import (
    SPANISH_TO_ENGLISH_CATEGORY_KEYS,
    V4_CATEGORY_KEYS,
    V4_ITEM_CATEGORY_TAXONOMY,
    V4_STORE_CATEGORY_KEYS,
    V4_STORE_CATEGORY_TAXONOMY,
    render_v4_store_taxonomy_prompt,
    render_v4_taxonomy_prompt,
)
from app.schemas.scan import CategoryAssignment, StoreCategorizationResult


def test_v4_category_keys_are_english_canonical_identifiers():
    old_spanish_keys = set(SPANISH_TO_ENGLISH_CATEGORY_KEYS)

    assert len(V4_CATEGORY_KEYS) == 42
    assert not old_spanish_keys.intersection(V4_CATEGORY_KEYS)
    assert {"Pantry", "BreadPastry", "PreparedFood", "ServiceCharge", "OtherItem"}.issubset(
        V4_CATEGORY_KEYS
    )
    assert "Supermarket" not in V4_CATEGORY_KEYS


def test_store_category_keys_are_l2_english_canonical_identifiers():
    assert len(V4_STORE_CATEGORY_KEYS) == 44
    assert {"Pantry", "BreadPastry", "PreparedFood", "OtherItem"}.isdisjoint(V4_STORE_CATEGORY_KEYS)
    assert {"Supermarket", "Restaurant", "GasStation", "Transport"}.issubset(V4_STORE_CATEGORY_KEYS)


def test_category_translations_include_english_and_spanish_labels():
    pantry = next(category for category in V4_ITEM_CATEGORY_TAXONOMY if category.key == "Pantry")
    supermarket = next(
        category for category in V4_STORE_CATEGORY_TAXONOMY if category.key == "Supermarket"
    )

    assert pantry.display_labels["en"] == "Pantry"
    assert pantry.display_labels["es"] == "Despensa"
    assert supermarket.display_labels["es"] == "Supermercado"


def test_prompt_taxonomy_renders_english_keys_with_spanish_label_context():
    prompt = render_v4_taxonomy_prompt()

    assert "L3 Family FreshFood" in prompt
    assert "Pantry (es: Despensa)" in prompt
    assert "Supermarket (es: Supermercado)" not in prompt
    assert "L1 Alimentacion" not in prompt
    assert "Miscelaneo" not in prompt


def test_store_prompt_taxonomy_renders_l1_l2_only():
    prompt = render_v4_store_taxonomy_prompt()

    assert "L1 Industry SupermarketsIndustry" in prompt
    assert "Supermarket (es: Supermercado)" in prompt
    assert "Pantry (es: Despensa)" not in prompt


def test_category_assignment_accepts_l4_item_keys_only():
    assert (
        CategoryAssignment(line_item_index=0, category_key="Pantry", confidence=0.9).category_key
        == "Pantry"
    )

    with pytest.raises(ValueError, match="valid L4 item category key"):
        CategoryAssignment(line_item_index=0, category_key="Supermarket", confidence=0.9)


def test_store_categorization_accepts_l2_store_keys_only():
    assert (
        StoreCategorizationResult(category_key="Supermarket", confidence=0.9).category_key
        == "Supermarket"
    )

    with pytest.raises(ValueError, match="valid L2 store category key"):
        StoreCategorizationResult(category_key="Pantry", confidence=0.9)
