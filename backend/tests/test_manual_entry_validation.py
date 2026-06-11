"""Manual-entry validation contracts (hardening plan, Phase 1 — user spec).

Names: letters (incl. accents), digits, spaces, dots — NOTHING else. Quantities:
whole numbers >= 0. Prices: non-negative minor-unit integers. Dates: typed (FastAPI
422s malformed input). Applies to the API create path only — the scan/statement
pipelines construct models internally and are regression-covered elsewhere.
"""

import pytest


def _payload(**overrides):
    base = {
        "merchant": "Almacén Doña Rosa 2.0",
        "transaction_date": "2026-06-05",
        "total_minor": 4500,
        "currency": "CLP",
        "receipt_type": "manual",
        "items": [],
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_valid_manual_create_with_accents_digits_spaces_dots(client):
    resp = await client.post("/api/v1/transactions", json=_payload())
    assert resp.status_code == 201
    created_id = resp.json()["id"]
    detail = await client.get(f"/api/v1/transactions/{created_id}")
    assert detail.json()["merchant"] == "Almacén Doña Rosa 2.0"


@pytest.mark.parametrize(
    "bad_merchant",
    ["Bad<script>", "Tienda; DROP TABLE", "Store @home", "Caf€ Lastarria", "a_b", "  "],
)
@pytest.mark.asyncio
async def test_merchant_whitelist_rejections(client, bad_merchant):
    resp = await client.post("/api/v1/transactions", json=_payload(merchant=bad_merchant))
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_item_name_whitelist_and_integer_qty(client):
    ok = await client.post(
        "/api/v1/transactions",
        json=_payload(
            items=[
                {
                    "name": "Pan Hallulla No. 5",
                    "qty": 3,
                    "total_price_minor": 1500,
                    "is_flagged": False,
                    "sort_order": 0,
                }
            ]
        ),
    )
    assert ok.status_code == 201

    bad_name = await client.post(
        "/api/v1/transactions",
        json=_payload(
            items=[
                {"name": "Pan! #5", "total_price_minor": 1, "is_flagged": False, "sort_order": 0}
            ]
        ),
    )
    assert bad_name.status_code == 422

    fractional_qty = await client.post(
        "/api/v1/transactions",
        json=_payload(
            items=[
                {
                    "name": "Queso",
                    "qty": 1.5,
                    "total_price_minor": 1,
                    "is_flagged": False,
                    "sort_order": 0,
                }
            ]
        ),
    )
    assert fractional_qty.status_code == 422


@pytest.mark.parametrize(
    "field,value",
    [("total_minor", -1), ("transaction_date", "not-a-date"), ("transaction_date", "31/12/2026")],
)
@pytest.mark.asyncio
async def test_negative_amounts_and_malformed_dates_rejected(client, field, value):
    resp = await client.post("/api/v1/transactions", json=_payload(**{field: value}))
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_negative_item_price_rejected(client):
    resp = await client.post(
        "/api/v1/transactions",
        json=_payload(
            items=[{"name": "Pan", "total_price_minor": -5, "is_flagged": False, "sort_order": 0}]
        ),
    )
    assert resp.status_code == 422
