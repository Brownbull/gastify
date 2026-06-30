from app.prompts import (
    V4_CATEGORY_KEYS,
    active_prompt_version,
    get_prompt,
    list_prompts,
    prompt_text_hash,
)
from app.prompts.receipt.extraction import RECEIPT_STRUCTURE_CURRENT
from app.prompts.receipt.item_categorization import ITEM_CATEGORIZATION_CURRENT


def test_registry_exposes_current_production_prompts():
    extraction = get_prompt("receipt-extraction-current", kind="receipt-extraction")
    categorization = get_prompt("item-categorization-current", kind="item-categorization")
    store = get_prompt("store-categorization-current", kind="store-categorization")
    statement_profile = get_prompt(
        "statement-layout-profile-current",
        kind="statement-layout-profile",
    )

    assert extraction.status == "production"
    assert categorization.status == "production"
    assert store.status == "production"
    assert statement_profile.status == "candidate"
    assert "receipt" in extraction.system_prompt.lower()
    assert "V4" in categorization.system_prompt
    assert "L2 Business Type" in store.system_prompt
    assert "layout profile" in statement_profile.system_prompt
    assert "amount_columns" in statement_profile.system_prompt
    assert "Do not output final transaction values" in statement_profile.system_prompt
    assert "several precise ranges" in statement_profile.system_prompt
    assert "Reference numbers" in statement_profile.system_prompt
    assert "foreign-currency debt" in statement_profile.system_prompt
    assert "continuation transaction details" in statement_profile.system_prompt
    assert "Include every movement section" in statement_profile.system_prompt
    assert prompt_text_hash(extraction) != prompt_text_hash(categorization)
    assert prompt_text_hash(store) != prompt_text_hash(categorization)


def test_active_prompt_version_contains_both_prompts_and_model():
    version = active_prompt_version(
        extraction_prompt_id="receipt-extraction-current",
        categorization_prompt_id="item-categorization-current",
        store_categorization_prompt_id="store-categorization-current",
        model="gemini-2.5-flash-lite",
    )

    assert "receipt-extraction-current@2026-06-29.0" in version
    assert "item-categorization-current@2026-05-18.1" in version
    assert "store-categorization-current@2026-05-19.1" in version
    assert "gemini-2.5-flash-lite" in version


def test_dev_only_prompt_slots_are_not_default_production_prompts():
    dev_prompts = [prompt for prompt in list_prompts() if prompt.status == "dev-only"]

    assert {prompt.id for prompt in dev_prompts} == {
        "receipt-extraction-dev-scratch",
        "receipt-extraction-v2-evidence",
        "item-categorization-dev-scratch",
    }


def test_v2_receipt_prompt_keeps_general_quantity_tax_and_discount_rules():
    prompt = get_prompt("receipt-extraction-v2-evidence", kind="receipt-extraction")

    assert prompt.version == "2026-05-26.v2-dev.10"
    assert "implicit single item, unit multiplier, or" in prompt.system_prompt
    assert "subtotal + tax = grand total" in prompt.system_prompt
    assert "price-history labels such as markdown/was/save" in prompt.system_prompt
    assert "adjustment_lines are discount evidence only" in prompt.system_prompt
    assert "Do not infer discounts from totals alone" in prompt.system_prompt
    assert "do not append cents or zeroes" in prompt.system_prompt
    assert "Prefer one receipt-level discount evidence set" in prompt.system_prompt
    assert "2 FOR 5.00" in prompt.system_prompt
    assert "Never return total_amount 0" in prompt.system_prompt
    assert "quantity x unit_price" in prompt.system_prompt
    assert "2.000 X 1.090" in prompt.system_prompt
    assert "Total Descuentos" in prompt.system_prompt
    assert "Do not turn weight, quantity, package-size" in prompt.system_prompt
    assert "recurrence_hint" in prompt.system_prompt


def test_prompt_bodies_and_values_have_separate_modules():
    assert "receipt data extraction system" in RECEIPT_STRUCTURE_CURRENT
    assert "V4 taxonomy" in ITEM_CATEGORIZATION_CURRENT
    assert "Pantry" in V4_CATEGORY_KEYS
    assert "OtherItem" in V4_CATEGORY_KEYS
    assert "Supermarket" not in V4_CATEGORY_KEYS
