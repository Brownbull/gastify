"""P1 exit-signal smoke test — proves all P1 REQs integrate end-to-end.

Assertion chain (per PLAN.md Phase 6 / ROADMAP §Phase-1):
  JIT sign-in → user + ownership_scope-of-one provisioned
  → write transaction in CLP (non-primary currency)
  → USD shadow computed via lazy FX fetch
  → read back amount_usd_minor + fx_rate_to_usd + fx_captured_at
  → consent-audit endpoint returns ≥1 record
"""

from decimal import Decimal

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_p1_exit_signal(jit_client: AsyncClient) -> None:
    # Step 1: JIT sign-in — first request provisions user + scope-of-one.
    resp = await jit_client.get("/api/v1/transactions")
    assert resp.status_code == 200
    assert resp.json()["data"] == []

    # Step 2: Grant consent — creates an audit event for the scope.
    consent_resp = await jit_client.post(
        "/api/v1/consent/receipt_scanning/grant",
        json={"jurisdiction": "CL", "consent_version": "1.0"},
    )
    assert consent_resp.status_code == 201
    assert consent_resp.json()["purpose"] == "receipt_scanning"
    assert consent_resp.json()["status"] == "granted"

    # Step 3: Create transaction in CLP (non-primary currency).
    # Triggers lazy FX fetch (mocked at 0.00105 CLP→USD) + USD shadow compute.
    txn_resp = await jit_client.post(
        "/api/v1/transactions",
        json={
            "transaction_date": "2026-05-07",
            "merchant": "Supermercado Líder",
            "total_minor": 15990,
            "currency": "CLP",
        },
    )
    assert txn_resp.status_code == 201
    txn_id = txn_resp.json()["id"]

    # Step 4: Read back transaction — verify USD shadow fields.
    detail_resp = await jit_client.get(f"/api/v1/transactions/{txn_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    assert detail["currency"] == "CLP"
    assert detail["total_minor"] == 15990

    assert detail["amount_usd_minor"] is not None
    assert detail["amount_usd_minor"] > 0
    # 15990 CLP × 0.00105 × 10^(2-0) = 1678.95 → 1679 cents
    assert detail["amount_usd_minor"] == 1679

    assert detail["fx_rate_to_usd"] is not None
    assert Decimal(detail["fx_rate_to_usd"]) == Decimal("0.00105")

    assert detail["fx_captured_at"] is not None

    # Step 5: Consent-audit returns ≥1 record (the grant from Step 2).
    audit_resp = await jit_client.get("/api/v1/consent/audit")
    assert audit_resp.status_code == 200
    events = audit_resp.json()["events"]
    assert len(events) >= 1
    assert any(e["event_type"] == "consent_granted" for e in events)
